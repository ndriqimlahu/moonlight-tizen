#include "moonlight_wasm.hpp"

#include <chrono>

#include "samsung/wasm/elementary_media_packet.h"

using std::chrono_literals::operator""s;
using std::chrono_literals::operator""ms;
using TimeStamp = samsung::wasm::Seconds;

#define MAX_CHANNEL_COUNT 2
#define FRAME_SIZE 240

static constexpr TimeStamp kAudioBufferMargin = 100ms;

static std::vector<opus_int16> s_DecodeBuffer;

static TimeStamp s_frameDuration;
static TimeStamp s_pktPts;
static TimeStamp s_estimatedAudioEnd;

static std::chrono::time_point<std::chrono::steady_clock> s_firstAppend;

static bool s_hasFirstFrame = false;
static bool s_AudioSyncEnabled = false;

static inline TimeStamp FrameDuration(double samplesPerFrame, double sampleRate) {
  // Calculate the duration of a frame based on the number of samples per frame and the sample rate
  return TimeStamp(samplesPerFrame / sampleRate);
}

static void DecodeAndAppendPacket(samsung::wasm::ElementaryMediaTrack* track, samsung::wasm::SessionId session_id,
  OpusMSDecoder* decoder, const unsigned char* sampleData, int sampleLength) {
  int decodeLen;
  
  // Decode the incoming audio packet using Opus decoder
  decodeLen = opus_multistream_decode(
    decoder, sampleData, sampleLength,
    s_DecodeBuffer.data(), FRAME_SIZE, 0
  );

  // Check if decoding failed
  if (decodeLen <= 0) {
    // Reset the buffer contents to zero when decoding fails
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

int MoonlightInstance::AudDecInit(int audioConfiguration, POPUS_MULTISTREAM_CONFIGURATION opusConfig, void* context, int arFlags) {
  int rc;

  ClLogMessage("MoonlightInstance::AudDecInit\n");

  // Initialize packet timestamp to zero
  s_pktPts = 0s;

  // Resize the decode buffer based on frame size and max channels
  s_DecodeBuffer.resize(FRAME_SIZE * MAX_CHANNEL_COUNT);

  // Calculate the frame duration based on the samples per frame and sample rate
  s_frameDuration = FrameDuration(opusConfig->samplesPerFrame, opusConfig->sampleRate);

  // Create the Opus decoder with the provided configuration parameters
  g_Instance->m_OpusDecoder = opus_multistream_decoder_create(
    opusConfig->sampleRate, opusConfig->channelCount,
    opusConfig->streams, opusConfig->coupledStreams,
    opusConfig->mapping, &rc
  );

  // Initialize the estimated audio end time
  s_estimatedAudioEnd = 0s;

  // Flag indicating whether this is the first frame of audio to be decoded
  s_hasFirstFrame = false;

  // Set the audio synchronization flag based on instance configuration
  s_AudioSyncEnabled = g_Instance->m_AudioSyncEnabled;

  return 0;
}

void MoonlightInstance::AudDecCleanup(void) {
  // Clear the decode buffer
  s_DecodeBuffer.clear();

  // Shrink the decode buffer to fit its contents
  s_DecodeBuffer.shrink_to_fit();
}

void MoonlightInstance::AudDecDecodeAndPlaySample(char* sampleData, int sampleLength) {
  // Check if audio playback has not started
  if (!g_Instance->m_AudioStarted) {
    return;
  }

  // Check if this is the first audio frame
  if (!s_hasFirstFrame) {
    // Record the time of the first frame
    s_firstAppend = std::chrono::steady_clock::now();
    // Update the flag to indicate that the first frame has been processed
    s_hasFirstFrame = true;
  }

  // Get the current time and calculate the time elapsed since the first frame
  auto now = std::chrono::steady_clock::now();
  TimeStamp ntp = now - s_firstAppend;

  // Check if audio synchronization is enabled and if dropping a packet is needed to avoid overflow
  if (s_AudioSyncEnabled && ntp + kAudioBufferMargin < s_estimatedAudioEnd) {
    ClLogMessage("Dropping audio packet to avoid overflow: PTS: %.03f NTP: %.03f\n", s_pktPts.count(), ntp.count());
    return;
  }

  // Decode and append the audio packet to the audio track
  DecodeAndAppendPacket(&g_Instance->m_AudioTrack,
    g_Instance->m_AudioSessionId.load(), g_Instance->m_OpusDecoder,
    reinterpret_cast<unsigned char*>(sampleData), sampleLength
  );

  // Update the estimated audio end time to prevent future overflow
  s_estimatedAudioEnd = std::max(s_estimatedAudioEnd, ntp) + s_frameDuration;
}

AUDIO_RENDERER_CALLBACKS MoonlightInstance::s_ArCallbacks = {
  .init = MoonlightInstance::AudDecInit,
  .cleanup = MoonlightInstance::AudDecCleanup,
  .decodeAndPlaySample = MoonlightInstance::AudDecDecodeAndPlaySample,
  .capabilities = CAPABILITY_DIRECT_SUBMIT,
};
