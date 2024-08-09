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

// Bitmask for gamepad buttons to stop the streaming session
const short STOP_STREAM_BUTTONS_FLAGS = BACK_FLAG | PLAY_FLAG | LB_FLAG | RB_FLAG;

// Flag for gamepad to track controller rumble state
bool rumbleFeedbackSwitch = false;

// Flags for gamepad to track mouse emulation state
bool mouseEmulationSwitch = false;
bool mouseEmulationActive = false;

// Flags for gamepad to track face buttons state
bool flipABfaceButtonsSwitch = false;
bool flipXYfaceButtonsSwitch = false;

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

  const int* buttonMasks = nullptr;
  int buttonMasksSize = 0;

  // Define button mapping with A/B and X/Y swapped
  static const int buttonMasksABXY[] = {
    B_FLAG, A_FLAG, Y_FLAG, X_FLAG,
    LB_FLAG, RB_FLAG,
    0 /* LT_FLAG */, 0 /* RT_FLAG */,
    BACK_FLAG, PLAY_FLAG,
    LS_CLK_FLAG, RS_CLK_FLAG,
    UP_FLAG, DOWN_FLAG, LEFT_FLAG, RIGHT_FLAG,
    SPECIAL_FLAG,
  };
  // Define button mapping with A/B swapped
  static const int buttonMasksAB[] = {
    B_FLAG, A_FLAG, X_FLAG, Y_FLAG,
    LB_FLAG, RB_FLAG,
    0 /* LT_FLAG */, 0 /* RT_FLAG */,
    BACK_FLAG, PLAY_FLAG,
    LS_CLK_FLAG, RS_CLK_FLAG,
    UP_FLAG, DOWN_FLAG, LEFT_FLAG, RIGHT_FLAG,
    SPECIAL_FLAG,
  };
  // Define button mapping with X/Y swapped
  static const int buttonMasksXY[] = {
    A_FLAG, B_FLAG, Y_FLAG, X_FLAG,
    LB_FLAG, RB_FLAG,
    0 /* LT_FLAG */, 0 /* RT_FLAG */,
    BACK_FLAG, PLAY_FLAG,
    LS_CLK_FLAG, RS_CLK_FLAG,
    UP_FLAG, DOWN_FLAG, LEFT_FLAG, RIGHT_FLAG,
    SPECIAL_FLAG,
  };
  // Define default button mapping
  static const int buttonMasksDefault[] = {
    A_FLAG, B_FLAG, X_FLAG, Y_FLAG,
    LB_FLAG, RB_FLAG,
    0 /* LT_FLAG */, 0 /* RT_FLAG */,
    BACK_FLAG, PLAY_FLAG,
    LS_CLK_FLAG, RS_CLK_FLAG,
    UP_FLAG, DOWN_FLAG, LEFT_FLAG, RIGHT_FLAG,
    SPECIAL_FLAG,
  };

  // Check if the A/B or X/Y face buttons switches are checked
  if (flipABfaceButtonsSwitch && flipXYfaceButtonsSwitch) {
    // Swap both A/B and X/Y buttons
    buttonMasks = buttonMasksABXY;
    buttonMasksSize = sizeof(buttonMasksABXY) / sizeof(buttonMasksABXY[0]);
  } else if (flipABfaceButtonsSwitch) { // Check if the A/B face buttons switch is checked
    // Swap A and B buttons
    buttonMasks = buttonMasksAB;
    buttonMasksSize = sizeof(buttonMasksAB) / sizeof(buttonMasksAB[0]);
  } else if (flipXYfaceButtonsSwitch) { // Check if the X/Y face buttons switch is checked
    // Swap X and Y buttons
    buttonMasks = buttonMasksXY;
    buttonMasksSize = sizeof(buttonMasksXY) / sizeof(buttonMasksXY[0]);
  } else {
    // Default buttons layout
    buttonMasks = buttonMasksDefault;
    buttonMasksSize = sizeof(buttonMasksDefault) / sizeof(buttonMasksDefault[0]);
  }

  short result = 0;
  
  for (int i = 0; i < gamepad.numButtons && i < buttonMasksSize; ++i) {
    if (gamepad.digitalButton[i] == EM_TRUE) {
      result |= buttonMasks[i];
    }
  }

  return result;
}

// Function to handle the gamepad input state
void MoonlightInstance::HandleGamepadInputState(bool rumbleFeedback, bool mouseEmulation, bool flipABfaceButtons, bool flipXYfaceButtons) {
  rumbleFeedbackSwitch = rumbleFeedback;
  mouseEmulationSwitch = mouseEmulation;
  flipABfaceButtonsSwitch = flipABfaceButtons;
  flipXYfaceButtonsSwitch = flipXYfaceButtons;
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

    // Check if the current button flags match the stop stream buttons flags
    if (buttonFlags == STOP_STREAM_BUTTONS_FLAGS) {
      // Terminate the connection
      stopStream();
      return;
    }

    // Check if the mouse emulation switch is checked
    if (mouseEmulationSwitch) {
      static auto activatePressTime = std::chrono::steady_clock::now();
      // Toggle mouse emulation on and off based on how long the PLAY/START button is pressed
      if (buttonFlags & PLAY_FLAG) {
        auto currentTime = std::chrono::steady_clock::now();
        // Calculate the duration in milliseconds since the PLAY/START button was pressed
        auto durationTime = std::chrono::duration_cast<std::chrono::milliseconds>(currentTime - activatePressTime).count();
        // If the button has been pressed for at least 1000 milliseconds (1 second)
        if (durationTime >= 1000) {
          // Toggle mouse emulation state
          if (!mouseEmulationActive) {
            // Activate mouse emulation and notify the user
            mouseEmulationActive = true;
            PostToJs("mouseEmulation enabled");
          } else {
            // Deactivate mouse emulation and notify the user
            mouseEmulationActive = false;
            PostToJs("mouseEmulation disabled");
          }
          // Reset the PLAY/START press time to the current time after toggling
          activatePressTime = std::chrono::steady_clock::now();
        }
      } else {
        // If the PLAY/START button is not pressed, reset PLAY/START press time to the current time
        activatePressTime = std::chrono::steady_clock::now();
      }
    } else {
      // Deactivate mouse emulation if the mouse emulation switch is unchecked
      mouseEmulationActive = false;
    }

    // If mouse emulation is active, then send mouse input to the desired handler (acts as a mouse)
    if (mouseEmulationActive) {
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

      // Face Buttons values are mapped to control mouse buttons
      if (buttonFlags & (A_FLAG | LB_FLAG)) {
        // Send a mouse button press event for the left button
        LiSendMouseButtonEvent(BUTTON_ACTION_PRESS, BUTTON_LEFT);
      } else {
        // Send a mouse button release event for the left button
        LiSendMouseButtonEvent(BUTTON_ACTION_RELEASE, BUTTON_LEFT);
      }
      if (buttonFlags & (LS_CLK_FLAG | RS_CLK_FLAG)) {
        // Send a mouse button press event for the Middle button
        LiSendMouseButtonEvent(BUTTON_ACTION_PRESS, BUTTON_MIDDLE);
      } else {
        // Send a mouse button release event for the Middle button
        LiSendMouseButtonEvent(BUTTON_ACTION_RELEASE, BUTTON_MIDDLE);
      }
      if (buttonFlags & (B_FLAG | RB_FLAG)) {
        // Send a mouse button press event for the Right button
        LiSendMouseButtonEvent(BUTTON_ACTION_PRESS, BUTTON_RIGHT);
      } else {
        // Send a mouse button release event for the Right button
        LiSendMouseButtonEvent(BUTTON_ACTION_RELEASE, BUTTON_RIGHT);
      }
    } else {
      // If mouse emulation is inactive, then send gamepad input to the desired handler (acts as a gamepad)
      LiSendMultiControllerEvent(
        gamepadID, activeGamepadMask, buttonFlags, leftTrigger,
        rightTrigger, leftStickX, leftStickY, rightStickX, rightStickY);
    }
  }
}

// Function to send controller rumble feedback for gamepad
void MoonlightInstance::ClControllerRumble(unsigned short controllerNumber, unsigned short lowFreqMotor, unsigned short highFreqMotor) {
  const float weakMagnitude = static_cast<float>(highFreqMotor) / static_cast<float>(UINT16_MAX);
  const float strongMagnitude = static_cast<float>(lowFreqMotor) / static_cast<float>(UINT16_MAX);
  
  // Check if the rumble feedback switch is checked
  if (rumbleFeedbackSwitch) {
    std::ostringstream ss;
    ss << controllerNumber << "," << weakMagnitude << "," << strongMagnitude;
    PostToJs(std::string("controllerRumble: ") + ss.str());
  }
}
