#include "moonlight_wasm.hpp"

#include <condition_variable>
#include <functional>
#include <mutex>

#include <h264_stream.h>

#include <assert.h>
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

static uint32_t s_VideoFormat = 0;
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
static bool s_FramePacingEnabled = false;

MoonlightInstance::SourceListener::SourceListener(
  MoonlightInstance* instance
) : m_Instance(instance) {}

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

MoonlightInstance::AudioTrackListener::AudioTrackListener(
  MoonlightInstance* instance
) : m_Instance(instance) {}

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

MoonlightInstance::VideoTrackListener::VideoTrackListener(
  MoonlightInstance* instance
) : m_Instance(instance) {}

void MoonlightInstance::VideoTrackListener::OnTrackOpen() {
  ClLogMessage("VIDEO ElementaryMediaTrack::OnTrackOpen\n");
  std::unique_lock<std::mutex> lock(m_Instance->m_Mutex);
  m_Instance->m_VideoStarted = true;
  m_Instance->m_EmssVideoStateChanged.notify_all();
  LiRequestIdrFrame();
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
    samsung::wasm::ChannelLayout channelLayout; // Selected audio channel layout from audio config
    switch (CHANNEL_COUNT_FROM_AUDIO_CONFIGURATION(g_Instance->m_AudioConfig)) {
      case 2:
        channelLayout = samsung::wasm::ChannelLayout::kStereo; // Audio Channel: Stereo
        ClLogMessage("Selected channel layout for Stereo audio\n");
        break;
      case 6:
        channelLayout = samsung::wasm::ChannelLayout::k5_1; // Audio Channel: 5.1 Surround Sound
        ClLogMessage("Selected channel layout for 5.1 Surround audio\n");
        break;
      case 8:
        channelLayout = samsung::wasm::ChannelLayout::k7_1; // Audio Channel: 7.1 Surround Sound
        ClLogMessage("Selected channel layout for 7.1 Surround audio\n");
        break;
      default:
        ClLogMessage("Unable to select channel layout from audio configuration\n");
        break;
    }

    auto add_track_result = g_Instance->m_Source.AddTrack(
      samsung::wasm::ElementaryAudioTrackConfig {
        "audio/webm; codecs=\"pcm\"", // Audio Codec: Pulse Code Modulation (PCM) Profile
        {}, // Extradata: Empty
        samsung::wasm::DecodingMode::kHardware, // Decoding mode: Hardware
        samsung::wasm::SampleFormat::kS16, // Sample Format: 16-bit signed integer (S16)
        channelLayout, // Channel Layout: Stereo (2-CH), 5.1 Surround (6-CH), 7.1 Surround (8-CH)
        kSampleRate, // Sample Rate: 48 kHz (48000 Hz)
      }
    );
    if (add_track_result) {
      g_Instance->m_AudioTrack = std::move(*add_track_result);
      g_Instance->m_AudioTrack.SetListener(&g_Instance->m_AudioTrackListener);
    }
  }

  {
    const char *mimetype = "video/mp4"; // MIME-type: Video MP4 Container
    if (videoFormat & VIDEO_FORMAT_H264) {
      mimetype = "video/mp4; codecs=\"avc1.640033\""; // Video Codec: H.264 High Level 5.1 Profile
      ClLogMessage("Selected mime type for H.264 codec\n");
    } else if (videoFormat & VIDEO_FORMAT_H265) {
      mimetype = "video/mp4; codecs=\"hev1.1.6.L153.B0\""; // Video Codec: HEVC Main Level 5.1 Profile
      ClLogMessage("Selected mime type for HEVC codec\n");
    } else if (videoFormat & VIDEO_FORMAT_H265_MAIN10) {
      mimetype = "video/mp4; codecs=\"hev1.2.4.L153.B0\""; // Video Codec: HEVC Main10 Level 5.1 Profile
      ClLogMessage("Selected mime type for HEVC Main10 codec\n");
    } else if (videoFormat & VIDEO_FORMAT_AV1_MAIN8) {
      mimetype = "video/mp4; codecs=\"av01.0.13M.08\""; // Video Codec: AV1 Main Level 5.1 Profile
      ClLogMessage("Selected mime type for AV1 codec\n");
    } else if (videoFormat & VIDEO_FORMAT_AV1_MAIN10) {
      mimetype = "video/mp4; codecs=\"av01.0.13M.10\""; // Video Codec: AV1 Main10 Level 5.1 Profile
      ClLogMessage("Selected mime type for AV1 Main10 codec\n");
    } else {
      ClLogMessage("Cannot select mime type for videoFormat=0x%x\n", videoFormat);
      return -1;
    }

    ClLogMessage("Using mimeType %s\n", mimetype);
    auto add_track_result = g_Instance->m_Source.AddTrack(
      samsung::wasm::ElementaryVideoTrackConfig {
        mimetype, // MIME-type: Selected Video Format
        {}, // Extradata: Empty
        samsung::wasm::DecodingMode::kHardware, // Decoding mode: Hardware
        static_cast<uint32_t>(width), // Video resolution: Width
        static_cast<uint32_t>(height), // Video resolution: Height
        static_cast<uint32_t>(redrawRate), // Framerate: Numerator
        1, // Framerate: Denominator
      }
    );
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
  ClLogMessage("Video decoding setup has started.\n");

  // Resize the decode buffer based on initial decode buffer length
  s_DecodeBuffer.resize(INITIAL_DECODE_BUFFER_LEN);

  // Set the video format, video resolution and video frame rate based on the input parameters
  s_VideoFormat = videoFormat;
  s_Width = width;
  s_Height = height;
  s_Framerate = redrawRate;

  // Calculate frame duration from the frame rate
  s_frameDuration = TimeStamp(1.0 / redrawRate);

  // Initialize packet timestamp to zero
  s_pktPts = 0s;

  // Flag indicating whether this is the first frame of video to be decoded
  s_hasFirstFrame = false;

  // Initialize the last second timestamp to zero
  s_lastSec = 0s;

  // Initialize the timestamp difference to zero
  s_ptsDiff = 0s;

  // Set the frame pacing flag based on instance configuration
  s_FramePacingEnabled = g_Instance->m_FramePacingEnabled;

  // Ensure that StartupVidDecSetup is called only once regardless of how many times VidDecSetup is invoked
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

  // Declare variables for entry data, offset, and total length
  PLENTRY entry;
  unsigned int offset;
  unsigned int totalLength;

  // Build one packet from multiple data chunks
  totalLength = decodeUnit->fullLength;

  // Ensure the decode buffer is large enough to hold the full packet
  if (totalLength > s_DecodeBuffer.size()) {
    // Resize decode buffer to accommodate the larger data
    s_DecodeBuffer.resize(totalLength);
  }

  // Initialize the entry pointer to the start of the buffer list
  entry = decodeUnit->bufferList;

  // Initialize the offset to 0 before starting to copy data
  offset = 0;

  // Iterate through the buffer list of video data entries
  while (entry != NULL) {
    // Copy the data of the current entry to the decode buffer at the specified offset
    memcpy(&s_DecodeBuffer[offset], entry->data, entry->length);
    // Update the offset based on the length of the copied data
    offset += entry->length;
    // Move to the next entry in the buffer list
    entry = entry->next;
  }

  // Get the current time
  auto now = std::chrono::steady_clock::now();

  // Check if this is the first video frame
  if (!s_hasFirstFrame) {
    // Record the time of the first frame
    s_firstAppend = std::chrono::steady_clock::now();
    // Update the flag to indicate that the first frame has been processed
    s_hasFirstFrame = true;
  } else if (s_FramePacingEnabled) { // Check if the frame pacing is enabled
    // Calculate the time elapsed since the first frame
    TimeStamp fromStart = now - s_firstAppend;
    // Wait until the packet timestamp is within the frame time margin
    while (s_pktPts > fromStart - s_ptsDiff + kFrameTimeMargin) {
      // Update the current time and recalculate the elapsed time
      now = std::chrono::steady_clock::now();
      fromStart = now - s_firstAppend;
    }
    // Synchronize packet presentation timing every time window
    if (fromStart > s_lastSec + kTimeWindow) {
      // Update the last second to the current time plus the time window
      s_lastSec += kTimeWindow;
      // Update the time difference to synchronize with the packet presentation time
      s_ptsDiff = fromStart - s_pktPts;
    }
  }

  // Update the timestamp of the last packet append
  s_lastTime = now;

  // Create an ElementaryMediaPacket and start decoding with the decoded video data
  samsung::wasm::ElementaryMediaPacket pkt {
    s_pktPts, // presentation timestamp
    s_pktPts, // decoding timestamp
    s_frameDuration, // packet duration
    decodeUnit->frameType == FRAME_TYPE_IDR, // packet of frame type
    offset, // packet size
    s_DecodeBuffer.data(), // pointer to packet payload
    s_Width, // packet of width
    s_Height, // packet of height
    s_Framerate, // packet of framerate numerator
    1, // packet of framerate denominator
    g_Instance->m_VideoSessionId.load() // session identifier
  };

  // Attempt to append the packet to the video track for rendering
  if (g_Instance->m_VideoTrack.AppendPacket(pkt)) {
    s_pktPts += s_frameDuration;
  } else {
    ClLogMessage("Append video packet failed\n");
    return DR_NEED_IDR;
  }

  return DR_OK;
}

void MoonlightInstance::AddVideoStats(VIDEO_STATS& src, VIDEO_STATS& dst) {
  // Accumulate video stats from src into dst for aggregated metrics
  dst.receivedFrames += src.receivedFrames;
  dst.decodedFrames += src.decodedFrames;
  dst.renderedFrames += src.renderedFrames;
  dst.totalFrames += src.totalFrames;
  dst.networkDroppedFrames += src.networkDroppedFrames;
  dst.pacerDroppedFrames += src.pacerDroppedFrames;
  dst.totalReassemblyTime += src.totalReassemblyTime;
  dst.totalDecodeTime += src.totalDecodeTime;
  dst.totalPacerTime += src.totalPacerTime;
  dst.totalRenderTime += src.totalRenderTime;

  // Update minimum host processing latency if it's not set or if the source has a valid smaller value
  if (dst.minHostProcessingLatency == 0) {
    dst.minHostProcessingLatency = src.minHostProcessingLatency;
  } else if (src.minHostProcessingLatency != 0) {
    dst.minHostProcessingLatency = MIN(dst.minHostProcessingLatency, src.minHostProcessingLatency);
  }

  // Update the maximum host processing latency if the current source value is higher
  dst.maxHostProcessingLatency = MAX(dst.maxHostProcessingLatency, src.maxHostProcessingLatency);
  dst.totalHostProcessingLatency += src.totalHostProcessingLatency;
  dst.framesWithHostProcessingLatency += src.framesWithHostProcessingLatency;

  // Attempt to retrieve the latest estimated RTT and variance
  if (!LiGetEstimatedRttInfo(&dst.lastRtt, &dst.lastRttVariance)) {
    // Set RTTs to 0 if unavailable
    dst.lastRtt = 0;
    dst.lastRttVariance = 0;
  } else {
    // Our logic to determine if RTT is valid depends on us never
    // getting an RTT of 0. ENet currently ensures RTTs are >= 1.
    assert(dst.lastRtt > 0);
  }

  // Get the current time in milliseconds
  auto now = LiGetMillis();

  // Initialize the measurement start point if this is the first video stat window
  if (!dst.measurementStartTimestamp) {
    dst.measurementStartTimestamp = src.measurementStartTimestamp;
  }

  // Ensure the global measurement timestamp has already started first
  assert(dst.measurementStartTimestamp <= src.measurementStartTimestamp);

  // Compute frames per second metrics for various stages of the video pipeline
  dst.totalFps = (float)dst.totalFrames / ((float)(now - dst.measurementStartTimestamp) / 1000);
  dst.receivedFps = (float)dst.receivedFrames / ((float)(now - dst.measurementStartTimestamp) / 1000);
  dst.decodedFps = (float)dst.decodedFrames / ((float)(now - dst.measurementStartTimestamp) / 1000);
  dst.renderedFps = (float)dst.renderedFrames / ((float)(now - dst.measurementStartTimestamp) / 1000);
}

void MoonlightInstance::FormatVideoStats(VIDEO_STATS& stats, char* output, int length) {
  int ret;
  int offset = 0;
  const char* codecString;

  // Start with an empty string
  output[offset] = 0;

  // Determine the video format being used and assign a readable string
  switch (s_VideoFormat) {
    case VIDEO_FORMAT_H264: // H.264 codec
      codecString = "H.264";
      break;
    case VIDEO_FORMAT_H265: // HEVC codec
      codecString = "HEVC";
      break;
    case VIDEO_FORMAT_H265_MAIN10: // HEVC Main10 codec
      if (LiGetCurrentHostDisplayHdrMode()) {
        codecString = "HEVC 10-bit HDR";
      } else {
        codecString = "HEVC 10-bit SDR";
      }
      break;
    case VIDEO_FORMAT_AV1_MAIN8: // AV1 codec
      codecString = "AV1";
      break;
    case VIDEO_FORMAT_AV1_MAIN10: // AV1 Main10 codec
      if (LiGetCurrentHostDisplayHdrMode()) {
        codecString = "AV1 10-bit HDR";
      } else {
        codecString = "AV1 10-bit SDR";
      }
      break;
    default: // Unknown codec
      assert(false);
      codecString = "UNKNOWN";
      break;
  }

  // If there is a meaningful received frame rate, print basic stream info
  if (stats.receivedFps > 0) {
    if (codecString != nullptr) {
      // Print video resolution, frame rate, and codec name
      ret = snprintf(
        &output[offset], length - offset,
        "Video stream: %dx%d %.2f FPS (Codec: %s)\n",
        s_Width, s_Height, stats.totalFps, codecString
      );
      // Abort if string formatting failed or buffer overflowed
      if (ret < 0 || ret >= length - offset) {
        assert(false);
        return;
      }
      offset += ret;
    }

    // Print frame rates at various stages of the pipeline
    ret = snprintf(
      &output[offset], length - offset,
      "Incoming frame rate from network: %.2f FPS\n"
      "Decoding frame rate: %.2f FPS\n"
      "Rendering frame rate: %.2f FPS\n"
      "Incoming bitrate from network: %.2f Mbps\n",
      stats.receivedFps, stats.decodedFps, stats.renderedFps, stats.receivedBitrate
    );
    // Abort if string formatting failed or buffer overflowed
    if (ret < 0 || ret >= length - offset) {
      assert(false);
      return;
    }
    offset += ret;
  }

  // Only display host processing latency if latency data exists
  if (stats.framesWithHostProcessingLatency > 0) {
    // Print min, max, and average host processing latency in milliseconds
    ret = snprintf(
      &output[offset], length - offset,
      "Host processing latency min/max/average: %.1f/%.1f/%.1f ms\n",
      (float)stats.minHostProcessingLatency / 10, (float)stats.maxHostProcessingLatency / 10,
      (float)stats.totalHostProcessingLatency / 10 / stats.framesWithHostProcessingLatency
    );
    // Abort if string formatting failed or buffer overflowed
    if (ret < 0 || ret >= length - offset) {
      assert(false);
      return;
    }
    offset += ret;
  }

  // Show remaining statistics only if some frames have been rendered
  if (stats.renderedFrames != 0) {
    char rttString[32];
    // Format the round-trip time string
    if (stats.lastRtt != 0) {
      // Print the last RTT including variance in milliseconds
      snprintf(
        rttString, sizeof(rttString),
        "%u ms (variance: %u ms)",
        stats.lastRtt, stats.lastRttVariance
      );
    } else {
      // Otherwise, print as "N/A" if RTT is unavailable
      snprintf(rttString, sizeof(rttString), "N/A");
    }

    // Print detailed drop rates and timing statistics
    ret = snprintf(
      &output[offset], length - offset,
      "Frames dropped by your network connection: %.2f%%\n"
      "Frames dropped due to network jitter: %.2f%%\n"
      "Average network latency: %s\n"
      "Average decoding time: %.2f ms\n"
      "Average frame queue delay: %.2f ms\n"
      "Average rendering time: %.2f ms\n",
      (float)stats.networkDroppedFrames / stats.totalFrames * 100,
      (float)stats.pacerDroppedFrames / stats.decodedFrames * 100,
      rttString,
      (float)stats.totalDecodeTime / stats.decodedFrames,
      (float)stats.totalPacerTime / stats.renderedFrames,
      (float)stats.totalRenderTime / stats.renderedFrames
    );
    // Abort if string formatting failed or buffer overflowed
    if (ret < 0 || ret >= length - offset) {
      assert(false);
      return;
    }
    offset += ret;
  }
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
