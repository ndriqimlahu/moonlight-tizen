#include "moonlight_wasm.hpp"

#include <iostream>
#include <array>
#include <utility>
#include <sstream>
#include <chrono>
#include <thread>
#include <cmath>

#include <Limelight.h>
#include <emscripten/emscripten.h>

// Define a combination of buttons on the gamepad to stop streaming session
const short STOP_STREAM_BUTTONS_FLAGS = BACK_FLAG | PLAY_FLAG | LB_FLAG | RB_FLAG;

// Define a flag to track whether mouse emulation is currently active
bool isMouseEmulationActive = false;

// For explanation on ordering, see: https://www.w3.org/TR/gamepad/#remapping
// Enumeration for gamepad buttons
enum GamepadButton {
  A, B, X, Y,
  LeftBumper, RightBumper,
  LeftTrigger, RightTrigger,
  Back, Play,
  LeftStick, RightStick,
  Up, Down, Left, Right,
  Special,
  Count,
};

// For explanation on ordering, see: https://www.w3.org/TR/gamepad/#remapping
// Enumeration for gamepad axis
enum GamepadAxis {
  LeftX = 0,
  LeftY = 1,
  RightX = 2,
  RightY = 3,
};

// Function to create a mask for active gamepads
static short GetActiveGamepadMask(int numGamepads) {
  short result = 0;
  
  for (int i = 0; i < numGamepads; ++i) {
    result |= (1 << i);
  }
  
  return result;
}

// Function to map gamepad buttons to flags
static short GetButtonFlags(const EmscriptenGamepadEvent& gamepad) {
  // Triggers are considered analog buttons in the "Emscripten API", however they need
  // to be passed in separate arguments for "Limelight" (it even lacks flags for them).

  // Define button mappings
  static const int buttonMasks[] {
    A_FLAG, B_FLAG, X_FLAG, Y_FLAG,
    LB_FLAG, RB_FLAG,
    0 /* LT_FLAG */, 0 /* RT_FLAG */,
    BACK_FLAG, PLAY_FLAG,
    LS_CLK_FLAG, RS_CLK_FLAG,
    UP_FLAG, DOWN_FLAG, LEFT_FLAG, RIGHT_FLAG,
    SPECIAL_FLAG,
  };
  
  static const int buttonMasksSize = static_cast<int>(sizeof(buttonMasks) / sizeof(buttonMasks[0]));

  short result = 0;
  
  for (int i = 0; i < gamepad.numButtons && i < buttonMasksSize; ++i) {
    if (gamepad.digitalButton[i] == EM_TRUE) {
      result |= buttonMasks[i];
    }
  }

  return result;
}

// Function to poll gamepad input
void MoonlightInstance::PollGamepads() {
  if (emscripten_sample_gamepad_data() != EMSCRIPTEN_RESULT_SUCCESS) {
    std::cerr << "Sample gamepad data failed!\n";
    return;
  }

  const auto numGamepads = emscripten_get_num_gamepads();
  if (numGamepads == EMSCRIPTEN_RESULT_NOT_SUPPORTED) {
    std::cerr << "Get num gamepads failed!\n";
    return;
  }

  // Create a mask for active gamepads
  const auto activeGamepadMask = GetActiveGamepadMask(numGamepads);

  // Iterate through connected gamepads and process their input
  for (int gamepadID = 0; gamepadID < numGamepads; ++gamepadID) {
    emscripten_sample_gamepad_data();
    EmscriptenGamepadEvent gamepad;
    // See logic in getConnectedGamepadMask() (utils.js)
    // These must stay in sync!

    const auto result = emscripten_get_gamepad_status(gamepadID, &gamepad);
    if (result != EMSCRIPTEN_RESULT_SUCCESS || !gamepad.connected) {
      // Not connected
      continue;
    }

    if (gamepad.timestamp == 0) {
      // On some platforms, Tizen returns "connected" gamepads that really 
      // aren't, so timestamp stays at zero. To work around this, we'll only
      // count gamepads that have a non-zero timestamp in our controller index.
      continue;
    }

    // Process input for active gamepad
    const auto buttonFlags = GetButtonFlags(gamepad);
    const auto leftTrigger = gamepad.analogButton[GamepadButton::LeftTrigger]
      * std::numeric_limits<unsigned char>::max();
    const auto rightTrigger = gamepad.analogButton[GamepadButton::RightTrigger]
      * std::numeric_limits<unsigned char>::max();
    const auto leftStickX = gamepad.axis[GamepadAxis::LeftX]
      * std::numeric_limits<short>::max();
    const auto leftStickY = -gamepad.axis[GamepadAxis::LeftY]
      * std::numeric_limits<short>::max();
    const auto rightStickX = gamepad.axis[GamepadAxis::RightX]
      * std::numeric_limits<short>::max();
    const auto rightStickY = -gamepad.axis[GamepadAxis::RightY]
      * std::numeric_limits<short>::max();

    // Check if the currently pressed gamepad buttons match the combination defined by "STOP_STREAM_BUTTONS_FLAGS" to stop streaming.
    // If it matches, call the "stopStream" function to stop the streaming session and return to the applications list.
    if (buttonFlags == STOP_STREAM_BUTTONS_FLAGS) {
      PostToJs(std::string("stopping stream, button flags are ") + std::to_string(buttonFlags));
      // Terminate the connection
      stopStream();
      return;
    }

    static auto activatePressTime = std::chrono::steady_clock::now();
    // Toggle mouse emulation on and off based on how long the PLAY/START button is pressed
    if (buttonFlags & PLAY_FLAG) {
      auto currentTime = std::chrono::steady_clock::now();
      // Calculate the duration in milliseconds since the PLAY/START button was pressed
      auto durationTime = std::chrono::duration_cast<std::chrono::milliseconds>(currentTime - activatePressTime).count();
      // If the button has been pressed for at least 1000 milliseconds (1 second)
      if (durationTime >= 1000) {
        // Toggle mouse emulation state
        if (!isMouseEmulationActive) {
          // Activate mouse emulation and notify the user
          isMouseEmulationActive = true;
          PostToJs("mouseEmulation enabled");
        } else {
          // Deactivate mouse emulation and notify the user
          isMouseEmulationActive = false;
          PostToJs("mouseEmulation disabled");
        }
        // Reset the PLAY/START press time to the current time after toggling
        activatePressTime = std::chrono::steady_clock::now();
      }
    } else {
      // If the PLAY/START button is not pressed, reset PLAY/START press time to the current time
      activatePressTime = std::chrono::steady_clock::now();
    }

    // If mouse emulation is enabled, then send mouse input to the desired handler (acts as a mouse)
    if (isMouseEmulationActive) {
      // Left Stick values are mapped to horizontal and vertical mouse movements
      const float baseMouseSpeed = 10.0f;
      const float leftStickMagnitude = std::sqrt(leftStickX * leftStickX + leftStickY * leftStickY) / std::numeric_limits<short>::max();
      const float mouseSpeed = baseMouseSpeed * leftStickMagnitude;
      const float mouseXDelta = static_cast<float>(leftStickX) / std::numeric_limits<short>::max() * mouseSpeed;
      const float mouseYDelta = -static_cast<float>(leftStickY) / std::numeric_limits<short>::max() * mouseSpeed;
      
      // Send a mouse move event with the specified delta values for both horizontal (X-axis) and vertical (Y-axis) coordinates
      LiSendMouseMoveEvent(static_cast<int>(mouseXDelta), static_cast<int>(mouseYDelta));

      // Right Stick values are mapped to horizontal and vertical mouse scrolls
      const float baseScrollSpeed = 1.0f;
      const float rightStickMagnitude = std::sqrt(rightStickX * rightStickX + rightStickY * rightStickY) / std::numeric_limits<short>::max();
      const float scrollSpeed = baseScrollSpeed * rightStickMagnitude;
      const float scrollXDelta = static_cast<float>(rightStickX) / std::numeric_limits<short>::max() * scrollSpeed;
      const float scrollYDelta = static_cast<float>(rightStickY) / std::numeric_limits<short>::max() * scrollSpeed;
      
      // Send mouse scroll events with the specified delta values for both horizontal (X-axis) and vertical (Y-axis) coordinates
      LiSendHScrollEvent(static_cast<int>(scrollXDelta));
      LiSendScrollEvent(static_cast<int>(scrollYDelta));
    } else {
      // If mouse emulation is disabled, then send gamepad input to the desired handler (acts as a gamepad)
      LiSendMultiControllerEvent(
        gamepadID, activeGamepadMask, buttonFlags, leftTrigger,
        rightTrigger, leftStickX, leftStickY, rightStickX, rightStickY);
    }
  }
}

// Send gamepad rumble for active gamepads
void MoonlightInstance::ClControllerRumble(unsigned short controllerNumber, unsigned short lowFreqMotor, unsigned short highFreqMotor) {
  const float weakMagnitude = static_cast<float>(highFreqMotor) / static_cast<float>(UINT16_MAX);
  const float strongMagnitude = static_cast<float>(lowFreqMotor) / static_cast<float>(UINT16_MAX);
  
  std::ostringstream ss;
  ss << controllerNumber << "," << weakMagnitude << "," << strongMagnitude;
  PostToJs(std::string("controllerRumble: ") + ss.str());
}
