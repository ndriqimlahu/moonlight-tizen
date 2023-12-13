#include "moonlight_wasm.hpp"

#include <chrono>

#include "samsung/wasm/elementary_media_packet.h"

using std::chrono_literals::operator""s;
using std::chrono_literals::operator""ms;

using TimeStamp = samsung::wasm::Seconds;

#define MAX_CHANNEL_COUNT 2
#define FRAME_SIZE 240

static constexpr TimeStamp kAudioBufferMargin = 0.5ms;
static constexpr TimeStamp kTimeWindow = 1s;

static bool s_AudioSyncEnabled = false;

static std::vector<opus_int16> s_DecodeBuffer;

static TimeStamp s_frameDuration;
static TimeStamp s_pktPts;

static TimeStamp s_ptsDiff;
static TimeStamp s_estimatedAudioEnd;

static std::chrono::time_point<std::chrono::steady_clock> s_firstAppend;
static std::chrono::time_point<std::chrono::steady_clock> s_lastTime;

static bool s_hasFirstFrame = false;

static inline TimeStamp FrameDuration(double samplesPerFrame, double sampleRate) {
  // Calculate the duration of a frame based on the number of samples per frame and the sample rate
  return TimeStamp(samplesPerFrame / sampleRate);
}

static void DecodeAndAppendPacket(samsung::wasm::ElementaryMediaTrack* track, samsung::wasm::SessionId session_id,
  OpusMSDecoder* decoder, const unsigned char* sampleData, int sampleLength) {
  int decodeLen;
  
  // Decode the incoming audio packet using Opus decoder
  decodeLen = opus_multistream_decode(decoder, sampleData, sampleLength, s_DecodeBuffer.data(), FRAME_SIZE, 0);

  if (decodeLen <= 0) {
    // Use a full memory barrier
    __sync_synchronize();
    
    // Clear the buffer only when decoding fails
    s_DecodeBuffer.assign(s_DecodeBuffer.size(), 0);
  }

  // Create an ElementaryMediaPacket with the decoded audio data
  samsung::wasm::ElementaryMediaPacket pkt {
    s_pktPts, // presentation timestamp
    s_pktPts, // decoding timestamp
    s_frameDuration, // packet duration
    true, // bool value indicating if packet is a keyframe
    s_DecodeBuffer.size() * sizeof(opus_int16), // size of the data payload in bytes
    s_DecodeBuffer.data(), // pointer to packet data payload
    0, 0, 0, 1, // packet of width, height, framerate numerator and framerate denominator
    session_id // current session id
  };

  // Attempt to append the packet to the ElementaryMediaTrack
  if (track->AppendPacket(pkt)) {
    // If successful, update the presentation timestamp for the next packet
    s_pktPts += s_frameDuration;
  } else {
    MoonlightInstance::ClLogMessage("Append audio packet failed\n");
  }
}

int MoonlightInstance::AudDecInit(int audioConfiguration, const POPUS_MULTISTREAM_CONFIGURATION opusConfig, void* context, int arFlags) {
  int error;

  ClLogMessage("MoonlightInstance::AudDecSetup\n");

  // Resize the decode buffer
  s_DecodeBuffer.resize(FRAME_SIZE * MAX_CHANNEL_COUNT);
  
  s_frameDuration = FrameDuration(opusConfig->samplesPerFrame, opusConfig->sampleRate);
  s_pktPts = 0s;
  s_hasFirstFrame = false;
  s_estimatedAudioEnd = 0s;
  s_ptsDiff = 0s;

  // Set the audio synchronization flag
  s_AudioSyncEnabled = g_Instance->m_AudioSyncEnabled;

  // Create the Opus decoder
  g_Instance->m_OpusDecoder = opus_multistream_decoder_create(opusConfig->sampleRate, opusConfig->channelCount, 
    opusConfig->streams, opusConfig->coupledStreams, opusConfig->mapping, &error);
  
  return 0;
}

void MoonlightInstance::AudDecCleanup(void) {
  // Clear the decode buffer
  s_DecodeBuffer.clear();
  
  // Shrink the decode buffer to fit its contents
  s_DecodeBuffer.shrink_to_fit();

  // Destroy the Opus decoder
  if (g_Instance->m_OpusDecoder) {
    opus_multistream_decoder_destroy(g_Instance->m_OpusDecoder);
  }
}

void MoonlightInstance::AudDecDecodeAndPlaySample(char* sampleData, int sampleLength) {
  // Check if audio playback has not started
  if (!g_Instance->m_AudioStarted) {
    return;
  }

  // Get the current time
  auto now = std::chrono::steady_clock::now();

  // Check if it's the first audio frame
  if (!s_hasFirstFrame) {
    // Record the time of the first frame
    s_firstAppend = std::chrono::steady_clock::now();

    // Update the flag to indicate that the first frame has been processed
    s_hasFirstFrame = true;
  } else if (s_AudioSyncEnabled) {
    // Calculate the time elapsed from the start
    TimeStamp fromStart = now - s_firstAppend;

    // Wait until the packet presentation timestamp is within the audio buffer margin
    while (s_pktPts > fromStart - s_ptsDiff + kAudioBufferMargin) {
      // Update the current time and recalculate the elapsed time
      now = std::chrono::steady_clock::now();

      // Calculate the time elapsed from the start of the frame presentation
      fromStart = now - s_firstAppend;
    }

    // If the elapsed time exceeds the estimated audio end plus the time window
    if (fromStart > s_estimatedAudioEnd + kTimeWindow) {
      // Update the estimated audio end to the current time plus the time window
      s_estimatedAudioEnd += kTimeWindow;

      // Update the time difference to synchronize with the packet presentation time
      s_ptsDiff = fromStart - s_pktPts;
    }
  }

  // Update the last time to the current time
  s_lastTime = now;

  // Decode and append the audio packet to the track
  DecodeAndAppendPacket(&g_Instance->m_AudioTrack, g_Instance->m_AudioSessionId.load(),
    g_Instance->m_OpusDecoder, reinterpret_cast<unsigned char*>(sampleData), sampleLength);
}

AUDIO_RENDERER_CALLBACKS MoonlightInstance::s_ArCallbacks = {
  .init = MoonlightInstance::AudDecInit,
  .cleanup = MoonlightInstance::AudDecCleanup,
  .decodeAndPlaySample = MoonlightInstance::AudDecDecodeAndPlaySample,
  .capabilities = CAPABILITY_DIRECT_SUBMIT,
};
