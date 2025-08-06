#include "moonlight_wasm.hpp"

#include <pthread.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>

#include <pairing.h>
#include <iostream>

#include <emscripten.h>
#include <emscripten/html5.h>

#include <openssl/evp.h>
#include <openssl/rand.h>

#include <netinet/in.h>
#include <sys/socket.h>
#include <arpa/inet.h>

// Requests the Wasm module to connect to the specified server
#define MSG_START_REQUEST "startRequest"
// Requests the Wasm module to stop streaming
#define MSG_STOP_REQUEST "stopRequest"
// Sent by the Wasm module when streaming has stopped, whether requested by the user or not
#define MSG_STREAM_TERMINATED "streamTerminated: "
// Requests the Wasm module to open the specified URL
#define MSG_OPENURL "openUrl"

MoonlightInstance* g_Instance;

MoonlightInstance::MoonlightInstance()
  : m_OpusDecoder(NULL),
    m_MouseLocked(false),
    m_MouseLastPosX(-1),
    m_MouseLastPosY(-1),
    m_WaitingForAllModifiersUp(false),
    m_AccumulatedTicks(0),
    m_MouseDeltaX(0),
    m_MouseDeltaY(0),
    m_HttpThreadPoolSequence(0),
    m_Dispatcher("Curl"),
    m_Mutex(),
    m_EmssStateChanged(),
    m_EmssAudioStateChanged(),
    m_EmssVideoStateChanged(),
    m_EmssReadyState(EmssReadyState::kDetached),
    m_AudioStarted(false),
    m_VideoStarted(false),
    m_AudioSessionId(0),
    m_VideoSessionId(0),
    m_MediaElement("wasm_module"),
    m_Source(
      samsung::wasm::ElementaryMediaStreamSource::LatencyMode::kUltraLow,
      samsung::wasm::ElementaryMediaStreamSource::RenderingMode::kMediaElement),
    m_SourceListener(this),
    m_AudioTrackListener(this),
    m_VideoTrackListener(this),
    m_AudioTrack(),
    m_VideoTrack() {
      m_Dispatcher.start();
      m_Source.SetListener(&m_SourceListener);
    }

MoonlightInstance::~MoonlightInstance() { 
  m_Dispatcher.stop();
}

void MoonlightInstance::OnConnectionStarted(uint32_t unused) {
  // Tell the front end
  PostToJs(std::string("Connection Established"));
}

void MoonlightInstance::OnConnectionStopped(uint32_t error) {
  // Not running anymore
  m_Running = false;

  // Unlock the mouse
  UnlockMouse();

  // Notify the JS code that the stream has ended
  PostToJs(std::string(MSG_STREAM_TERMINATED + std::to_string((int)error)));
}

void MoonlightInstance::StopConnection() {
  pthread_t t;

  // Stopping needs to happen in a separate thread to avoid a potential deadlock
  // caused by us getting a callback to the main thread while inside
  // LiStopConnection.
  pthread_create(&t, NULL, MoonlightInstance::StopThreadFunc, NULL);

  // We'll need to call the listener ourselves since our connection terminated
  // callback won't be invoked for a manually requested termination.
  OnConnectionStopped(0);
}

void* MoonlightInstance::StopThreadFunc(void* context) {
  // We must join the connection thread first, because LiStopConnection must
  // not be invoked during LiStartConnection.
  pthread_join(g_Instance->m_ConnectionThread, NULL);

  // Force raise all modifier keys to avoid leaving them down after disconnecting
  LiSendKeyboardEvent(0xA0, KEY_ACTION_UP, 0);
  LiSendKeyboardEvent(0xA1, KEY_ACTION_UP, 0);
  LiSendKeyboardEvent(0xA2, KEY_ACTION_UP, 0);
  LiSendKeyboardEvent(0xA3, KEY_ACTION_UP, 0);
  LiSendKeyboardEvent(0xA4, KEY_ACTION_UP, 0);
  LiSendKeyboardEvent(0xA5, KEY_ACTION_UP, 0);

  // Not running anymore
  g_Instance->m_Running = false;

  // We also need to stop this thread after the connection thread, because it
  // depends on being initialized there.
  pthread_join(g_Instance->m_InputThread, NULL);

  // Stop the connection
  LiStopConnection();
  return NULL;
}

void* MoonlightInstance::InputThreadFunc(void* context) {
  MoonlightInstance* me = (MoonlightInstance*)context;

  while (me->m_Running) {
    me->PollGamepads();
    me->ReportMouseMovement();

    // Poll every 5 ms
    usleep(5 * 1000);
  }

  return NULL;
}

void* MoonlightInstance::ConnectionThreadFunc(void* context) {
  MoonlightInstance* me = (MoonlightInstance*)context;
  int err;
  SERVER_INFORMATION serverInfo;

  // Post a status update before we begin
  PostToJs(std::string("Starting connection to ") + me->m_Host);

  // Populate the server information
  LiInitializeServerInformation(&serverInfo);
  serverInfo.address = me->m_Host.c_str();
  serverInfo.serverInfoAppVersion = me->m_AppVersion.c_str();
  serverInfo.serverInfoGfeVersion = me->m_GfeVersion.c_str();
  serverInfo.rtspSessionUrl = me->m_RtspUrl.c_str();

  // Initialize the server codec mode support with default value
  serverInfo.serverCodecModeSupport = 0;
  // Handle setting of server codec mode support values ​​based on the selected video format
  if (me->m_StreamConfig.supportedVideoFormats & VIDEO_FORMAT_H264) { // H.264
    // Apply the appropriate value for the H.264 server codec
    serverInfo.serverCodecModeSupport |= SCM_H264;
    PostToJs("Selecting the server code mode to: SCM_H264");
  }
  if (me->m_StreamConfig.supportedVideoFormats & VIDEO_FORMAT_H265) { // HEVC
    // Apply the appropriate value for the HEVC server codec
    serverInfo.serverCodecModeSupport |= SCM_HEVC;
    PostToJs("Selecting the server code mode to: SCM_HEVC");
  }
  if (me->m_StreamConfig.supportedVideoFormats & VIDEO_FORMAT_H265_MAIN10) { // HEVC Main10
    // Apply the appropriate value for the HEVC Main10 server codec
    serverInfo.serverCodecModeSupport |= SCM_HEVC_MAIN10;
    PostToJs("Selecting the server code mode to: SCM_HEVC_MAIN10");
  }
  if (me->m_StreamConfig.supportedVideoFormats & VIDEO_FORMAT_AV1_MAIN8) { // AV1
    // Apply the appropriate value for the AV1 server codec
    serverInfo.serverCodecModeSupport |= SCM_AV1_MAIN8;
    PostToJs("Selecting the server code mode to: SCM_AV1_MAIN8");
  }
  if (me->m_StreamConfig.supportedVideoFormats & VIDEO_FORMAT_AV1_MAIN10) { // AV1 Main10
    // Apply the appropriate value for the AV1 Main10 server codec
    serverInfo.serverCodecModeSupport |= SCM_AV1_MAIN10;
    PostToJs("Selecting the server code mode to: SCM_AV1_MAIN10");
  }
  // Handle fall back logic for server codec mode support
  if (serverInfo.serverCodecModeSupport == 0) { // Unset
    // Fallback to H.264 if no server codec was selected
    serverInfo.serverCodecModeSupport = SCM_H264;
    PostToJs("Selecting the fallback server code mode to: SCM_H264");
  }

  err = LiStartConnection(&serverInfo, &me->m_StreamConfig, &MoonlightInstance::s_ClCallbacks,
    &MoonlightInstance::s_DrCallbacks, &MoonlightInstance::s_ArCallbacks, NULL, 0, NULL, 0);
  if (err != 0) {
    // Notify the JS code that the stream has ended!
    // NB: We pass error code 0 here to avoid triggering a "Connection terminated" warning message.
    PostToJs(MSG_STREAM_TERMINATED + std::to_string(0));
    return NULL;
  }

  // Set running state before starting connection-specific threads
  me->m_Running = true;

  pthread_create(&me->m_InputThread, NULL, MoonlightInstance::InputThreadFunc, me);

  return NULL;
}

static void HexStringToBytes(const char* str, char* output) {
  for (size_t i = 0; i < strlen(str); i += 2) {
    sscanf(&str[i], "%2hhx", &output[i / 2]);
  }
}

MessageResult MoonlightInstance::StartStream(std::string host, std::string width, std::string height, std::string fps, std::string bitrate,
  std::string rikey, std::string rikeyid, std::string appversion, std::string gfeversion, std::string rtspurl, int serverCodecModeSupport,
  bool framePacing, bool optimizeGames, bool playHostAudio, bool rumbleFeedback, bool mouseEmulation, bool flipABfaceButtons, bool flipXYfaceButtons,
  std::string audioConfig, bool audioSync, std::string videoCodec, bool hdrMode, bool fullRange, bool disableWarnings, bool performanceStats) {
  PostToJs("Setting the Host address to: " + host);
  PostToJs("Setting the Video resolution to: " + width + "x" + height);
  PostToJs("Setting the Video frame rate to: " + fps + " FPS");
  PostToJs("Setting the Video bitrate to: " + bitrate + " Kbps");
  PostToJs("Setting the Remote input key to: " + rikey);
  PostToJs("Setting the Remote input key ID to: " + rikeyid);
  PostToJs("Setting the App version to: " + appversion);
  PostToJs("Setting the GFE version to: " + gfeversion);
  PostToJs("Setting the RTSP session URL to: " + rtspurl);
  PostToJs("Setting the Server codec mode support to: " + std::to_string(serverCodecModeSupport));
  PostToJs("Setting the Video frame pacing to: " + std::to_string(framePacing));
  PostToJs("Setting the Optimize game settings to: " + std::to_string(optimizeGames));
  PostToJs("Setting the Play host audio to: " + std::to_string(playHostAudio));
  PostToJs("Setting the Rumble feedback to: " + std::to_string(rumbleFeedback));
  PostToJs("Setting the Mouse emulation to: " + std::to_string(mouseEmulation));
  PostToJs("Setting the Flip A/B face buttons to: " + std::to_string(flipABfaceButtons));
  PostToJs("Setting the Flip X/Y face buttons to: " + std::to_string(flipXYfaceButtons));
  PostToJs("Setting the Audio configuration to: " + audioConfig);
  PostToJs("Setting the Audio synchronization to: " + std::to_string(audioSync));
  PostToJs("Setting the Video codec to: " + videoCodec);
  PostToJs("Setting the Video HDR mode to: " + std::to_string(hdrMode));
  PostToJs("Setting the Full color range to: " + std::to_string(fullRange));
  PostToJs("Setting the Disable connection warnings to: " + std::to_string(disableWarnings));
  PostToJs("Setting the Performance statistics to: " + std::to_string(performanceStats));

  // Populate the stream configuration
  LiInitializeStreamConfiguration(&m_StreamConfig);
  m_StreamConfig.width = stoi(width);
  m_StreamConfig.height = stoi(height);
  m_StreamConfig.fps = stoi(fps);
  m_StreamConfig.bitrate = stoi(bitrate); // kilobits per second
  m_StreamConfig.packetSize = 1392;
  m_StreamConfig.streamingRemotely = STREAM_CFG_AUTO;

  // Initialize the audio configuration with default value
  m_StreamConfig.audioConfiguration = 0;
  // Handle setting of audio configuration values ​​based on the selected audio
  if (audioConfig == "Stereo") { // Stereo
    // Apply the appropriate value for the Stereo audio
    m_StreamConfig.audioConfiguration |= AUDIO_CONFIGURATION_STEREO;
    PostToJs("Selecting the audio config to: AUDIO_CONFIGURATION_STEREO");
  } else if (audioConfig == "51Surround") { // 5.1 Surround
    // Apply the appropriate value for the 5.1 Surround audio
    m_StreamConfig.audioConfiguration |= AUDIO_CONFIGURATION_51_SURROUND;
    PostToJs("Selecting the audio config to: AUDIO_CONFIGURATION_51_SURROUND");
  } else if (audioConfig == "71Surround") { // 7.1 Surround
    // Apply the appropriate value for the 7.1 Surround audio
    m_StreamConfig.audioConfiguration |= AUDIO_CONFIGURATION_71_SURROUND;
    PostToJs("Selecting the audio config to: AUDIO_CONFIGURATION_71_SURROUND");
  } else { // Unknown
    // Default case for unsupported audio selection
    ClLogMessage("Unsupported audio config '%s' detected! Reverting to the default audio...\n", audioConfig.c_str());
  }
  // Handle fall back logic for audio configuration
  if (m_StreamConfig.audioConfiguration == 0) { // Unset
    // Fallback to Stereo if no audio was selected
    m_StreamConfig.audioConfiguration = AUDIO_CONFIGURATION_STEREO;
    PostToJs("Selecting the fallback audio config to: AUDIO_CONFIGURATION_STEREO");
  }
  // Store the audio configuration value from the stream configurations
  m_AudioConfig = m_StreamConfig.audioConfiguration;

  // Initialize the supported video format with default value
  m_StreamConfig.supportedVideoFormats = 0;
  // Handle setting of supported video format values ​​based on the selected codec
  if (videoCodec == "H264") { // H.264
    // Apply the appropriate value for the H.264 codec
    m_StreamConfig.supportedVideoFormats |= VIDEO_FORMAT_H264;
    PostToJs("Selecting the video format to: VIDEO_FORMAT_H264");
  } else if (videoCodec == "HEVC") { // HEVC
    // Apply the desired HDR or SDR profile ​for the HEVC codec based on the HDR toggle switch state
    m_StreamConfig.supportedVideoFormats |= hdrMode ? VIDEO_FORMAT_H265_MAIN10 : VIDEO_FORMAT_H265;
    PostToJs(hdrMode ? "Selecting the video format to: VIDEO_FORMAT_H265_MAIN10" : "Selecting the video format to: VIDEO_FORMAT_H265");
  } else if (videoCodec == "AV1") { // AV1
    // Apply the desired HDR or SDR profile ​for the AV1 codec based on the HDR toggle switch state
    m_StreamConfig.supportedVideoFormats |= hdrMode ? VIDEO_FORMAT_AV1_MAIN10 : VIDEO_FORMAT_AV1_MAIN8;
    PostToJs(hdrMode ? "Selecting the video format to: VIDEO_FORMAT_AV1_MAIN10" : "Selecting the video format to: VIDEO_FORMAT_AV1_MAIN8");
  } else { // Unknown
    // Default case for unsupported codec selection
    ClLogMessage("Unsupported video codec '%s' detected! Reverting to the default codec...\n", videoCodec.c_str());
  }
  // Handle fall back logic for supported video formats
  if (m_StreamConfig.supportedVideoFormats == 0) { // Unset
    // Fallback to H.264 if no codec was selected
    m_StreamConfig.supportedVideoFormats = VIDEO_FORMAT_H264;
    PostToJs("Selecting the fallback video format to: VIDEO_FORMAT_H264");
  }

  // Initialize the color range with default value
  m_StreamConfig.colorRange = 0;
  // Apply the desired color range ​based on the toggle switch state
  m_StreamConfig.colorRange |= fullRange ? COLOR_RANGE_FULL : COLOR_RANGE_LIMITED;

  // Limit encryption to devices that do not support AES instructions
  m_StreamConfig.encryptionFlags = ENCFLG_NONE;

  // Load the rikey and rikeyid into the stream configuration
  HexStringToBytes(rikey.c_str(), m_StreamConfig.remoteInputAesKey);
  int rikeyiv = htonl(stoi(rikeyid));
  memcpy(m_StreamConfig.remoteInputAesIv, &rikeyiv, sizeof(rikeyiv));

  // Manage gamepad input states based on selected settings
  HandleGamepadInputState(rumbleFeedback, mouseEmulation, flipABfaceButtons, flipXYfaceButtons);

  // Store the parameters from the start message
  m_Host = host;
  m_AppVersion = appversion;
  m_GfeVersion = gfeversion;
  m_RtspUrl = rtspurl;
  m_ServerCodecModeSupport = serverCodecModeSupport;
  m_FramePacingEnabled = framePacing;
  m_OptimizeGamesEnabled = optimizeGames;
  m_PlayHostAudioEnabled = playHostAudio;
  m_RumbleFeedbackEnabled = rumbleFeedback;
  m_MouseEmulationEnabled = mouseEmulation;
  m_FlipABfaceButtonsEnabled = flipABfaceButtons;
  m_FlipXYfaceButtonsEnabled = flipXYfaceButtons;
  m_AudioSyncEnabled = audioSync;
  m_HdrModeEnabled = hdrMode;
  m_FullRangeEnabled = fullRange;
  m_DisableWarningsEnabled = disableWarnings;
  m_PerformanceStatsEnabled = performanceStats;

  // Initialize the rendering surface before starting the connection
  if (InitializeRenderingSurface(m_StreamConfig.width, m_StreamConfig.height)) {
    // Start the worker thread to establish the connection
    pthread_create(&m_ConnectionThread, NULL, MoonlightInstance::ConnectionThreadFunc, this);
  } else {
    // Failed to initialize renderer
    OnConnectionStopped(0);
  }

  return MessageResult::Resolve();
}

MessageResult MoonlightInstance::StopStream() {
  // Begin connection teardown
  StopConnection();

  return MessageResult::Resolve();
}

void MoonlightInstance::STUN_private(int callbackId) {
  unsigned int wanAddr;
  char addrStr[128] = {};

  if (LiFindExternalAddressIP4("stun.moonlight-stream.org", 3478, &wanAddr) == 0) {
    inet_ntop(AF_INET, &wanAddr, addrStr, sizeof(addrStr));
    PostPromiseMessage(callbackId, "resolve", std::string(addrStr, strlen(addrStr)));
  } else {
    PostPromiseMessage(callbackId, "resolve", "");
  }
}

void MoonlightInstance::STUN(int callbackId) {
  m_Dispatcher.post_job(std::bind(&MoonlightInstance::STUN_private, this, callbackId), false);
}

void MoonlightInstance::Pair_private(int callbackId, std::string serverMajorVersion, std::string address, std::string randomNumber) {
  char* ppkstr;
  int err = gs_pair(atoi(serverMajorVersion.c_str()), address.c_str(), randomNumber.c_str(), &ppkstr);

  ClLogMessage("Paired host address: %s using PIN: %s with result: %d\n", address.c_str(), randomNumber.c_str(), err);
  if (err == 0) {
    free(ppkstr);
    PostPromiseMessage(callbackId, "resolve", ppkstr);
  } else {
    PostPromiseMessage(callbackId, "reject", std::to_string(err));
  }
}

void MoonlightInstance::Pair(int callbackId, std::string serverMajorVersion, std::string address, std::string randomNumber) {
  ClLogMessage("%s with host address: %s\n", __func__, address.c_str());
  m_Dispatcher.post_job(std::bind(&MoonlightInstance::Pair_private, this, callbackId, serverMajorVersion, address, randomNumber), false);
}

void MoonlightInstance::WakeOnLan(int callbackId, std::string macAddress) {
  unsigned char magicPacket[102];
  unsigned char mac[6];

  // Validate and parse the MAC address
  if (sscanf(macAddress.c_str(), "%hhx:%hhx:%hhx:%hhx:%hhx:%hhx", &mac[0], &mac[1], &mac[2], &mac[3], &mac[4], &mac[5]) != 6) {
    ClLogMessage("Invalid MAC address format: %s\n", macAddress.c_str());
    return;
  }

  // Fill magic packet with the MAC address
  for (int i = 0; i < 6; i++) {
    magicPacket[i] = 0xFF;
  }
  for (int i = 1; i <= 16; i++) {
    memcpy(&magicPacket[i * 6], &mac, 6 * sizeof(unsigned char));
  }

  // Create UDP socket
  int udpSocket = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
  if (udpSocket == -1) {
    ClLogMessage("Failed to create socket");
    return;
  }

  // Enable broadcasting
  int broadcast = 1;
  if (setsockopt(udpSocket, SOL_SOCKET, SO_BROADCAST, &broadcast, sizeof(broadcast)) == -1) {
    ClLogMessage("Failed to enable broadcast");
    close(udpSocket);
    return;
  }

  // Set up destination address for the magic packet
  struct sockaddr_in addr;
  memset(&addr, 0, sizeof(addr));
  addr.sin_family = AF_INET;
  addr.sin_addr.s_addr = INADDR_BROADCAST;
  addr.sin_port = htons(9); // Wake-on-LAN typically uses port 9

  // Send the magic packet
  if (sendto(udpSocket, magicPacket, sizeof(magicPacket), 0, (struct sockaddr*) &addr, sizeof(addr)) == -1) {
    ClLogMessage("Failed to send magic packet");
  } else {
    ClLogMessage("Magic packet sent successfully to MAC address: %s\n", macAddress.c_str());
  }

  // Close the socket
  close(udpSocket);
}

bool MoonlightInstance::Init(uint32_t argc, const char* argn[], const char* argv[]) {
  g_Instance = this;
  return true;
}

int main(int argc, char** argv) {
  g_Instance = new MoonlightInstance();

  emscripten_set_keyup_callback(kCanvasName, NULL, EM_TRUE, handleKeyUp);
  emscripten_set_keydown_callback(kCanvasName, NULL, EM_TRUE, handleKeyDown);
  emscripten_set_mousedown_callback(kCanvasName, NULL, EM_TRUE, handleMouseDown);
  emscripten_set_mouseup_callback(kCanvasName, NULL, EM_TRUE, handleMouseUp);
  emscripten_set_mousemove_callback(kCanvasName, NULL, EM_TRUE, handleMouseMove);
  emscripten_set_wheel_callback(kCanvasName, NULL, EM_TRUE, handleWheel);

  // As we want to setup callbacks on DOM document and
  // emscripten_set_pointerlock... calls use document.querySelector
  // method, passing first argument to it, I've workaround for it
  // When passing address 0x1, js glue code replace it with document object
  static const char* kDocument = reinterpret_cast<const char*>(0x1);
  emscripten_set_pointerlockchange_callback(kDocument, NULL, EM_TRUE, handlePointerLockChange);
  emscripten_set_pointerlockerror_callback(kDocument, NULL, EM_TRUE, handlePointerLockError);
  EM_ASM(Module['noExitRuntime'] = true);
  unsigned char buffer[128];
  int rc = RAND_bytes(buffer, sizeof(buffer));

  if (rc != 1) {
    std::cout << "RAND_bytes failed\n";
  }
  RAND_seed(buffer, 128);
}

MessageResult startStream(std::string host, std::string width, std::string height, std::string fps, std::string bitrate,
  std::string rikey, std::string rikeyid, std::string appversion, std::string gfeversion, std::string rtspurl, int serverCodecModeSupport,
  bool framePacing, bool optimizeGames, bool playHostAudio, bool rumbleFeedback, bool mouseEmulation, bool flipABfaceButtons, bool flipXYfaceButtons,
  std::string audioConfig, bool audioSync, std::string videoCodec, bool hdrMode, bool fullRange, bool disableWarnings, bool performanceStats) {
  PostToJs("Starting the streaming session...");
  return g_Instance->StartStream(host, width, height, fps, bitrate, rikey, rikeyid, appversion, gfeversion, rtspurl, serverCodecModeSupport,
  framePacing, optimizeGames, playHostAudio, rumbleFeedback, mouseEmulation, flipABfaceButtons, flipXYfaceButtons, audioConfig,
  audioSync, videoCodec, hdrMode, fullRange, disableWarnings, performanceStats);
}

MessageResult stopStream() {
  PostToJs("Stopping the streaming session...");
  return g_Instance->StopStream();
}

void stun(int callbackId) {
  g_Instance->STUN(callbackId);
}

void pair(int callbackId, std::string serverMajorVersion, std::string address, std::string randomNumber) {
  g_Instance->Pair(callbackId, serverMajorVersion, address, randomNumber);
}

void wakeOnLan(int callbackId, std::string macAddress) {
  g_Instance->WakeOnLan(callbackId, macAddress);
}

void PostToJs(std::string msg) {
  MAIN_THREAD_EM_ASM({
    const msg = UTF8ToString($0);
    handleMessage(msg);
  }, msg.c_str());
}

void PostToJsAsync(std::string msg) {
  MAIN_THREAD_ASYNC_EM_ASM({
    const msg = UTF8ToString($0);
    handleMessage(msg);
  }, msg.c_str());
}

void PostPromiseMessage(int callbackId, const std::string& type, const std::string& response) {
  MAIN_THREAD_EM_ASM({
    const type = UTF8ToString($1);
    const response = UTF8ToString($2);
    handlePromiseMessage($0, type, response);
  }, callbackId, type.c_str(), response.c_str());
}

void PostPromiseMessage(int callbackId, const std::string& type, const std::vector<uint8_t>& response) {
  MAIN_THREAD_EM_ASM({
    const type = UTF8ToString($1);
    const response = HEAPU8.slice($2, $2 + $3);
    handlePromiseMessage($0, type, response);
  }, callbackId, type.c_str(), response.data(), response.size());
}

EMSCRIPTEN_BINDINGS(handle_message) {
  emscripten::value_object<MessageResult>("MessageResult").field("type", &MessageResult::type).field("ret", &MessageResult::ret);
  emscripten::function("startStream", &startStream);
  emscripten::function("stopStream", &stopStream);
  emscripten::function("stun", &stun);
  emscripten::function("pair", &pair);
  emscripten::function("wakeOnLan", &wakeOnLan);
}
