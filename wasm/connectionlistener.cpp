#include "moonlight_wasm.hpp"

#include <cstdarg>
#include <cstring>
#include <string>

#include <emscripten.h>
#include <emscripten/threading.h>

void MoonlightInstance::ClStageStarting(int stage) {
  PostToJs(std::string("ProgressMsg: Starting ") + std::string(LiGetStageName(stage)) + std::string("..."));
}

void MoonlightInstance::ClStageFailed(int stage, int errorCode) {
  PostToJs(std::string("DialogMsg: ") + std::string(LiGetStageName(stage)) + std::string(" failed (error ") + std::to_string(errorCode) + std::string(")"));
}

void MoonlightInstance::ClConnectionStarted(void) {
  emscripten_sync_run_in_main_runtime_thread(EM_FUNC_SIG_V, onConnectionStarted);
}

void MoonlightInstance::ClConnectionTerminated(int errorCode) {
  // Teardown the connection
  LiStopConnection();

  emscripten_sync_run_in_main_runtime_thread(EM_FUNC_SIG_VI, onConnectionStopped, errorCode);
}

void MoonlightInstance::ClDisplayMessage(const char* message) {
  PostToJs(std::string("DialogMsg: ") + std::string(message));
}

void MoonlightInstance::ClDisplayTransientMessage(const char* message) {
  PostToJs(std::string("TransientMsg: ") + std::string(message));
}

void onConnectionStarted() {
  g_Instance->OnConnectionStarted(0);
}

void onConnectionStopped(int errorCode) {
  g_Instance->OnConnectionStopped(errorCode);
}

void MoonlightInstance::ClLogMessage(const char* format, ...) {
  va_list va;
  char message[1024];

  va_start(va, format);
  vsnprintf(message, sizeof(message), format, va);
  va_end(va);

  // fprintf(stderr, ...) processes message in parts, so logs from different
  // threads may interleave. Send whole message at once to minimize this.
  emscripten_log(EM_LOG_CONSOLE, "%s", message);
}

void MoonlightInstance::ClConnectionStatusUpdate(int connectionStatus) {
  if (g_Instance->m_DisableWarningsEnabled == false) {
    switch (connectionStatus) {
      case CONN_STATUS_OKAY:
        PostToJs(std::string("NoWarningMsg: ") + std::string("Connection to PC has been improved."));
        break;
      case CONN_STATUS_POOR:
        PostToJs(std::string("WarningMsg: ") + std::string("Slow connection to PC.\nReduce your bitrate!"));
        break;
      default:
        break;
    }
  }
}

CONNECTION_LISTENER_CALLBACKS MoonlightInstance::s_ClCallbacks = {
  .stageStarting = MoonlightInstance::ClStageStarting,
  .stageFailed = MoonlightInstance::ClStageFailed,
  .connectionStarted = MoonlightInstance::ClConnectionStarted,
  .connectionTerminated = MoonlightInstance::ClConnectionTerminated,
  .logMessage = MoonlightInstance::ClLogMessage,
  .rumble = MoonlightInstance::ClControllerRumble,
  .connectionStatusUpdate = MoonlightInstance::ClConnectionStatusUpdate,
};
