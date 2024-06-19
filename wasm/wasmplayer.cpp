#include "moonlight_wasm.hpp"

#include <condition_variable>
#include <functional>
#include <mutex>

#include <h264_stream.h>

#include <pthread.h>

#include "samsung/wasm/elementary_audio_track_config.h"
#include "samsung/wasm/elementary_media_packet.h"
#include "samsung/wasm/elementary_video_track_config.h"
#include "samsung/html/html_media_element_listener.h"
#include "samsung/wasm/operation_result.h"

#define INITIAL_DECODE_BUFFER_LEN 128 * 1024

using std::chrono_literals::operator""s;
using std::chrono_literals::operator""ms;

using EmssReadyState = samsung::wasm::ElementaryMediaStreamSource::ReadyState;
using EmssOperationResult = samsung::wasm::OperationResult;
using EmssAsyncResult = samsung::wasm::OperationResult;
using HTMLAsyncResult = samsung::wasm::OperationResult;
using TimeStamp = samsung::wasm::Seconds;

static constexpr TimeStamp kFrameTimeMargin = 0.5ms;
static constexpr TimeStamp kTimeWindow = 1s;
static constexpr uint32_t kSampleRate = 48000;

static bool s_FramePacingEnabled = false;

static uint32_t s_Width = 0;
static uint32_t s_Height = 0;
static uint32_t s_Framerate = 0;

static std::vector<unsigned char> s_DecodeBuffer;

static TimeStamp s_frameDuration;
static TimeStamp s_pktPts;

static TimeStamp s_ptsDiff;
static TimeStamp s_lastSec;

static std::chrono::time_point<std::chrono::steady_clock> s_firstAppend;
static std::chrono::time_point<std::chrono::steady_clock> s_lastTime;

static bool s_hasFirstFrame = false;

MoonlightInstance::SourceListener::SourceListener(MoonlightInstance* instance) : m_Instance(instance) {}

void MoonlightInstance::SourceListener::OnSourceOpen() {
  ClLogMessage("EMSS::OnOpen\n");
  std::unique_lock<std::mutex> lock(m_Instance->m_Mutex);
  m_Instance->m_EmssReadyState = EmssReadyState::kOpen;
  m_Instance->m_EmssStateChanged.notify_all();
}

void MoonlightInstance::SourceListener::OnSourceOpenPending() {
  ClLogMessage("EMSS::OnOpenPending\n");
  std::unique_lock<std::mutex> lock(m_Instance->m_Mutex);
  m_Instance->m_EmssReadyState = EmssReadyState::kOpenPending;
  m_Instance->m_EmssStateChanged.notify_all();
}

void MoonlightInstance::SourceListener::OnSourceClosed() {
  ClLogMessage("EMSS::OnClosed\n");
  std::unique_lock<std::mutex> lock(m_Instance->m_Mutex);
  m_Instance->m_EmssReadyState = EmssReadyState::kClosed;
  m_Instance->m_EmssStateChanged.notify_all();
}

MoonlightInstance::AudioTrackListener::AudioTrackListener(MoonlightInstance* instance) : m_Instance(instance) {}

void MoonlightInstance::AudioTrackListener::OnTrackOpen() {
  ClLogMessage("AUDIO ElementaryMediaTrack::OnTrackOpen\n");
  std::unique_lock<std::mutex> lock(m_Instance->m_Mutex);
  m_Instance->m_AudioStarted = true;
  m_Instance->m_EmssAudioStateChanged.notify_all();
}

void MoonlightInstance::AudioTrackListener::OnTrackClosed(samsung::wasm::ElementaryMediaTrack::CloseReason) {
  ClLogMessage("AUDIO ElementaryMediaTrack::OnTrackClosed\n");
  std::unique_lock<std::mutex> lock(m_Instance->m_Mutex);
  m_Instance->m_AudioStarted = false;
}

void MoonlightInstance::AudioTrackListener::OnSessionIdChanged(samsung::wasm::SessionId new_session_id) {
  ClLogMessage("AUDIO ElementaryMediaTrack::OnSessionIdChanged\n");
  std::unique_lock<std::mutex> lock(m_Instance->m_Mutex);
  m_Instance->m_AudioSessionId.store(new_session_id);
}

MoonlightInstance::VideoTrackListener::VideoTrackListener(MoonlightInstance* instance) : m_Instance(instance) {}

void MoonlightInstance::VideoTrackListener::OnTrackOpen() {
  ClLogMessage("VIDEO ElementaryMediaTrack::OnTrackOpen\n");
  std::unique_lock<std::mutex> lock(m_Instance->m_Mutex);
  m_Instance->m_VideoStarted = true;
  LiRequestIdrFrame();
  m_Instance->m_EmssVideoStateChanged.notify_all();
}

void MoonlightInstance::VideoTrackListener::OnTrackClosed(samsung::wasm::ElementaryMediaTrack::CloseReason) {
  ClLogMessage("VIDEO ElementaryMediaTrack::OnTrackClosed\n");
  std::unique_lock<std::mutex> lock(m_Instance->m_Mutex);
  m_Instance->m_VideoStarted = false;
}

void MoonlightInstance::VideoTrackListener::OnSessionIdChanged(samsung::wasm::SessionId new_session_id) {
  ClLogMessage("VIDEO ElementaryMediaTrack::OnSessionIdChanged\n");
  std::unique_lock<std::mutex> lock(m_Instance->m_Mutex);
  m_Instance->m_VideoSessionId.store(new_session_id);
}

void MoonlightInstance::DidChangeFocus(bool got_focus) {
  // Request an IDR frame to dump the frame queue that may have
  // built up from the GL pipeline being stalled.
  if (got_focus) {
    LiRequestIdrFrame();
  }
}

bool MoonlightInstance::InitializeRenderingSurface(int width, int height) {
  return true;
}

int MoonlightInstance::StartupVidDecSetup(int videoFormat, int width, int height, int redrawRate, void* context, int drFlags) {
  g_Instance->m_MediaElement.SetSrc(&g_Instance->m_Source);
  ClLogMessage("Waiting to close\n");
  g_Instance->WaitFor(&g_Instance->m_EmssStateChanged, [] {
    return g_Instance->m_EmssReadyState == EmssReadyState::kClosed;
  });
  ClLogMessage("Closed\n");

  {
    auto add_track_result = g_Instance->m_Source.AddTrack(
      samsung::wasm::ElementaryAudioTrackConfig {
        "audio/webm; codecs=\"pcm\"",                            // Audio Codec: Pulse Code Modulation (PCM) Profile
        {},                                                      // Extradata: Empty
        samsung::wasm::SampleFormat::kS16,                       // Sample Format: 16-bit signed integer (S16)
        samsung::wasm::ChannelLayout::kStereo,                   // Channel Layout: Stereo (2 channels)
        kSampleRate,                                             // Sample Rate: 48 kHz (48000 Hz)
      });
    if (add_track_result) {
      g_Instance->m_AudioTrack = std::move(*add_track_result);
      g_Instance->m_AudioTrack.SetListener(&g_Instance->m_AudioTrackListener);
    }
  }

  {
    const char *mimetype = "video/mp4";                          // MIME-type: Video MP4 Container
    if (videoFormat & VIDEO_FORMAT_H264) {
      mimetype = "video/mp4; codecs=\"avc1.640033\"";            // Video Codec: H.264 High Level 5.1 Profile
    } else if (videoFormat & VIDEO_FORMAT_H265) {
      mimetype = "video/mp4; codecs=\"hev1.1.6.L153.B0\"";       // Video Codec: HEVC Main Level 5.1 Profile
    } else if (videoFormat & VIDEO_FORMAT_H265_MAIN10) {
      mimetype = "video/mp4; codecs=\"hev1.2.4.L153.B0\"";       // Video Codec: HEVC Main10 Level 5.1 Profile
    } else if (videoFormat & VIDEO_FORMAT_AV1_MAIN8) {
      mimetype = "video/mp4; codecs=\"av01.0.13M.08\"";          // Video Codec: AV1 Main Level 5.1 Profile
    } else if (videoFormat & VIDEO_FORMAT_AV1_MAIN10) {
      mimetype = "video/mp4; codecs=\"av01.0.13M.10\"";          // Video Codec: AV1 Main10 Level 5.1 Profile
    } else {
      ClLogMessage("Cannot select mimeType for videoFormat=0x%x\n", videoFormat);
      return -1;
    }

    ClLogMessage("Using mimeType %s\n", mimetype);
    auto add_track_result = g_Instance->m_Source.AddTrack(
      samsung::wasm::ElementaryVideoTrackConfig {
        mimetype,                                                // MIME-type: Auto-Detect Video Codec
        {},                                                      // Extradata: Empty
        static_cast<uint32_t>(width),                            // Width: Video in Pixels
        static_cast<uint32_t>(height),                           // Height: Video in Pixels
        static_cast<uint32_t>(redrawRate),                       // Framerate: Numerator
        1,                                                       // Framerate: Denominator
      });
    if (add_track_result) {
      g_Instance->m_VideoTrack = std::move(*add_track_result);
      g_Instance->m_VideoTrack.SetListener(&g_Instance->m_VideoTrackListener);
    }
  }

  ClLogMessage("Inb4 source open\n");
  g_Instance->m_Source.Open([](EmssOperationResult){});
  g_Instance->WaitFor(&g_Instance->m_EmssStateChanged, [] {
    return g_Instance->m_EmssReadyState == EmssReadyState::kOpenPending;
  });
  ClLogMessage("Source ready to open\n");
  g_Instance->m_MediaElement.Play([](EmssOperationResult err) {
    if (err != EmssOperationResult::kSuccess) {
      ClLogMessage("Play error\n");
    } else {
      ClLogMessage("Play success\n");
    }
  });

  ClLogMessage("Waiting to start\n");
  g_Instance->WaitFor(&g_Instance->m_EmssAudioStateChanged, [] {
    return g_Instance->m_AudioStarted.load();
  });

  g_Instance->WaitFor(&g_Instance->m_EmssVideoStateChanged, [] {
    return g_Instance->m_VideoStarted.load();
  });
  ClLogMessage("Started\n");
  return 0;
}

int MoonlightInstance::VidDecSetup(int videoFormat, int width, int height, int redrawRate, void* context, int drFlags) {
  ClLogMessage("MoonlightInstance::VidDecSetup\n");

  // Resize the decode buffer
  s_DecodeBuffer.resize(INITIAL_DECODE_BUFFER_LEN);

  s_Width = width;
  s_Height = height;
  s_Framerate = redrawRate;

  s_frameDuration = TimeStamp(1.0 / redrawRate);
  s_pktPts = 0s;
  s_hasFirstFrame = false;
  s_lastSec = 0s;
  s_ptsDiff = 0s;

  // Set the frame pacing flag
  s_FramePacingEnabled = g_Instance->m_FramePacingEnabled;

  static std::once_flag once_flag;
  std::call_once(once_flag, &MoonlightInstance::StartupVidDecSetup, videoFormat, width, height, redrawRate, context, drFlags);

  return DR_OK;
}

void MoonlightInstance::VidDecCleanup(void) {
  // Clear the decode buffer
  s_DecodeBuffer.clear();

  // Shrink the decode buffer to fit its contents
  s_DecodeBuffer.shrink_to_fit();
}

int MoonlightInstance::VidDecSubmitDecodeUnit(PDECODE_UNIT decodeUnit) {
  // Check if video playback has not started
  if (!g_Instance->m_VideoStarted) {
    return DR_OK;
  }

  PLENTRY entry;
  unsigned int offset;
  unsigned int totalLength;
  
  // Build one packet from multiple data chunks
  totalLength = decodeUnit->fullLength;

  // Check if the total length of the video data exceeds the current size of the decode buffer
  if (totalLength > s_DecodeBuffer.size()) {
    // If so, resize the decode buffer to accommodate the larger data
    s_DecodeBuffer.resize(totalLength);
  }

  // Initialize the entry pointer to the start of the linked list
  entry = decodeUnit->bufferList;

  // Initialize the offset to 0 before starting to copy data
  offset = 0;

  // Iterate through the linked list of video data entries
  while (entry != NULL) {
    // Copy the data of the current entry to the decode buffer at the specified offset
    memcpy(&s_DecodeBuffer[offset], entry->data, entry->length);
    
    // Update the offset based on the length of the copied data
    offset += entry->length;

    // Move to the next entry in the linked list
    entry = entry->next;
  }

  // Get the current time
  auto now = std::chrono::steady_clock::now();

  // Check if it's the first video frame
  if (!s_hasFirstFrame) {
    // Record the time of the first frame
    s_firstAppend = std::chrono::steady_clock::now();

    // Update the flag to indicate that the first frame has been processed
    s_hasFirstFrame = true;
  } else if (s_FramePacingEnabled) {
    // Calculate the time elapsed from the start
    TimeStamp fromStart = now - s_firstAppend;

    // Wait until the packet presentation timestamp is within the frame time margin
    while (s_pktPts > fromStart - s_ptsDiff + kFrameTimeMargin) {
      // Update the current time and recalculate the elapsed time
      now = std::chrono::steady_clock::now();

      // Calculate the time elapsed from the start of the frame presentation
      fromStart = now - s_firstAppend;
    }
    
    // If the elapsed time exceeds the last second plus the time window
    if (fromStart > s_lastSec + kTimeWindow) {
      // Update the last second to the current time plus the time window
      s_lastSec += kTimeWindow;

      // Update the time difference to synchronize with the packet presentation time
      s_ptsDiff = fromStart - s_pktPts;
    }
  }

  // Update the last time to the current time
  s_lastTime = now;

  // Create an ElementaryMediaPacket with the decoded video data
  samsung::wasm::ElementaryMediaPacket pkt {
    s_pktPts, // presentation timestamp
    s_pktPts, // decoding timestamp
    s_frameDuration, // packet duration
    decodeUnit->frameType == FRAME_TYPE_IDR, // packet of frame type
    offset, // packet offset
    s_DecodeBuffer.data(), // pointer to packet data payload
    s_Width, // packet of width
    s_Height, // packet of height
    s_Framerate, // packet of framerate numerator
    1, // packet of framerate denominator
    g_Instance->m_VideoSessionId.load() // current session id
  };

  // Attempt to append the packet to the ElementaryMediaTrack
  if (g_Instance->m_VideoTrack.AppendPacket(pkt)) {
    s_pktPts += s_frameDuration;
  } else {
    ClLogMessage("Append video packet failed\n");
    return DR_NEED_IDR;
  }

  return DR_OK;
}

void MoonlightInstance::WaitFor(std::condition_variable* variable, std::function<bool()> condition) {
  std::unique_lock<std::mutex> lock(m_Mutex);
  variable->wait(lock, condition);
}

DECODER_RENDERER_CALLBACKS MoonlightInstance::s_DrCallbacks = {
  .setup = MoonlightInstance::VidDecSetup,
  .cleanup = MoonlightInstance::VidDecCleanup,
  .submitDecodeUnit = MoonlightInstance::VidDecSubmitDecodeUnit,
  .capabilities = CAPABILITY_SLICES_PER_FRAME(4),
};
