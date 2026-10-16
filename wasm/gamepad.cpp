#include "moonlight_wasm.hpp"

#include <iostream>
#include <array>
#include <utility>
#include <sstream>
#include <chrono>
#include <thread>
#include <cmath>
#include <map>
#include <cstring>
#include <cctype>
#include <string>
#include <algorithm>
#include <vector>

#include <Limelight.h>
#include <emscripten/emscripten.h>

// Maximum number of controllers supported by the Moonlight protocol
static constexpr int kMaxControllers = 16;

// Bitmask for gamepad combo buttons to stop the streaming session
const short STOP_STREAM_BUTTONS = BACK_FLAG | PLAY_FLAG | LB_FLAG | RB_FLAG;

// Bitmask for gamepad combo buttons to toggle the performance stats overlay
const short PERF_STATS_BUTTONS = BACK_FLAG | LB_FLAG | RB_FLAG | X_FLAG;

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

// Per-slot state used for Tizen placeholder filtering, id tracking and arrival announcements
struct ControllerSlotState {
  bool seenTimestamp = false; // true once a non-zero timestamp was observed for this id
  bool announced = false; // true after LiSendControllerArrivalEvent succeeded
  std::string id; // last known Gamepad.id (used to detect replacements)
};

static ControllerSlotState slotState[kMaxControllers];

// Detect controller family from Gamepad.id (PS / Xbox / Nintendo / Unknown)
static uint8_t GetControllerType(const char* id) {
  // Guard against null or empty id strings
  if (!id || !*id) {
    return LI_CTYPE_UNKNOWN;
  }

  // Lower-case the id once so all substring checks are case-insensitive
  std::string lower(id);
  for (char& c : lower) {
    c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
  }

  // Helper for simple substring search on the lower-cased id
  const auto contains = [&](const char* needle) {
    return lower.find(needle) != std::string::npos;
  };

  // PlayStation (DualSense, DualShock, Sony vendor 054c)
  if (contains("vendor: 054c") || contains("vendor:054c") ||
      lower.find("054c-") == 0 ||
      contains("dualsense") || contains("dualshock") ||
      contains("playstation") ||
      contains("sony interactive entertainment") ||
      contains("sony computer entertainment")) {
    return LI_CTYPE_PS;
  }

  // Xbox (vendor 045e)
  if (contains("vendor: 045e") || contains("vendor:045e") ||
      lower.find("045e-") == 0 || contains("xbox")) {
    return LI_CTYPE_XBOX;
  }

  // Nintendo (vendor 057e, Joy-Con, Pro Controller)
  if (contains("vendor: 057e") || contains("vendor:057e") ||
      lower.find("057e-") == 0 ||
      contains("nintendo") || contains("joy-con")) {
    return LI_CTYPE_NINTENDO;
  }

  return LI_CTYPE_UNKNOWN;
}

// Build the supported-buttons mask advertised in the arrival event (respects face-button flips)
static uint32_t GetSupportedButtons(int numButtons, bool flipAB, bool flipXY) {
  // Standard Gamepad layout; triggers are analog so they contribute no flags
  static constexpr uint32_t kButtons[] = {
    A_FLAG, B_FLAG, X_FLAG, Y_FLAG,
    LB_FLAG, RB_FLAG,
    0, 0, // triggers are analog, not flags
    BACK_FLAG, PLAY_FLAG,
    LS_CLK_FLAG, RS_CLK_FLAG,
    UP_FLAG, DOWN_FLAG, LEFT_FLAG, RIGHT_FLAG,
    SPECIAL_FLAG
  };

  uint32_t flags = 0;
  const int limit = std::min(numButtons, 17);

  // Iterate through the buttons and set the appropriate flags
  for (int i = 0; i < limit; ++i) {
    auto flag = kButtons[i];
    // Mirror the same swaps used by GetButtonFlags()
    if (flipAB && i < 2) {
      flag = kButtons[1 - i];       // swap A ↔ B
    } else if (flipXY && i >= 2 && i < 4) {
      flag = kButtons[5 - i];       // swap X ↔ Y
    }
    flags |= flag;
  }

  return flags;
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
    0 /* LT */, 0 /* RT */,
    BACK_FLAG, PLAY_FLAG,
    LS_CLK_FLAG, RS_CLK_FLAG,
    UP_FLAG, DOWN_FLAG, LEFT_FLAG, RIGHT_FLAG,
    SPECIAL_FLAG,
  };
  // Define button mapping with A/B swapped
  static const int buttonMasksAB[] = {
    B_FLAG, A_FLAG, X_FLAG, Y_FLAG,
    LB_FLAG, RB_FLAG,
    0 /* LT */, 0 /* RT */,
    BACK_FLAG, PLAY_FLAG,
    LS_CLK_FLAG, RS_CLK_FLAG,
    UP_FLAG, DOWN_FLAG, LEFT_FLAG, RIGHT_FLAG,
    SPECIAL_FLAG,
  };
  // Define button mapping with X/Y swapped
  static const int buttonMasksXY[] = {
    A_FLAG, B_FLAG, Y_FLAG, X_FLAG,
    LB_FLAG, RB_FLAG,
    0 /* LT */, 0 /* RT */,
    BACK_FLAG, PLAY_FLAG,
    LS_CLK_FLAG, RS_CLK_FLAG,
    UP_FLAG, DOWN_FLAG, LEFT_FLAG, RIGHT_FLAG,
    SPECIAL_FLAG,
  };
  // Define default button mapping
  static const int buttonMasksDefault[] = {
    A_FLAG, B_FLAG, X_FLAG, Y_FLAG,
    LB_FLAG, RB_FLAG,
    0 /* LT */, 0 /* RT */,
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

  // Iterate through the gamepad buttons and set the corresponding flags
  for (int i = 0; i < gamepad.numButtons && i < buttonMasksSize; ++i) {
    if (gamepad.digitalButton[i] == EM_TRUE) {
      result |= buttonMasks[i];
    }
  }

  return result;
}

// Called when gamepad settings change; clears announced flags so arrival is re-sent with updated data
void MoonlightInstance::HandleGamepadInputState(bool rumbleFeedback, bool mouseEmulation, bool flipABfaceButtons, bool flipXYfaceButtons) {
  // Force re-announce on next poll so the host gets the updated button map / capabilities
  for (int i = 0; i < kMaxControllers; ++i) {
    slotState[i].announced = false;
  }

  // Store the new settings for use during polling
  rumbleFeedbackSwitch = rumbleFeedback;
  mouseEmulationSwitch = mouseEmulation;
  flipABfaceButtonsSwitch = flipABfaceButtons;
  flipXYfaceButtonsSwitch = flipXYfaceButtons;
}

// Function to poll gamepad input
void MoonlightInstance::PollGamepads() {
  // Guard check if sampling gamepad data is not successful
  if (emscripten_sample_gamepad_data() != EMSCRIPTEN_RESULT_SUCCESS) {
    ClLogMessage("Failed to sample gamepad data!\n");
    return;
  }

  // Query how many gamepad slots the browser currently exposes
  const auto numGamepads = emscripten_get_num_gamepads();
  // Guard check if retrieving the number of gamepads is not supported
  if (numGamepads == EMSCRIPTEN_RESULT_NOT_SUPPORTED) {
    ClLogMessage("Failed to get number of gamepads!\n");
    return;
  }

  // Prevent repeated trigger while the button combo is held down
  static std::map<int, bool> comboTriggered;

  // Snapshot slots, build physical-index mask, and collect removals / arrivals
  short activeGamepadMask = 0;
  std::vector<int> removed;
  std::vector<int> arrived;

  // Cap at the protocol maximum of 16 controllers
  const int limit = std::min(numGamepads, kMaxControllers);

  // Temporary storage for this poll's gamepad events and presence flags
  EmscriptenGamepadEvent events[kMaxControllers]{};
  bool slotPresent[kMaxControllers] = { false };

  // See matching logic in "[utils.js] getConnectedGamepadMask()" – these must stay in sync!

  // Read every browser slot once so later logic can work from a stable snapshot
  for (int i = 0; i < limit; ++i) {
    // Check if the gamepad status retrieval is successful for the current slot
    if (emscripten_get_gamepad_status(i, &events[i]) == EMSCRIPTEN_RESULT_SUCCESS) {
      slotPresent[i] = true;
    }
  }

  // Decide per slot: still real, removed, or newly arrived
  for (int i = 0; i < kMaxControllers; ++i) {
    ControllerSlotState& state = slotState[i];

    const bool connected = slotPresent[i] && events[i].connected; // slot exists and reports connected
    const char* currentId = (connected && events[i].id) ? events[i].id : ""; // current Gamepad.id (or empty)
    const double timestamp = connected ? events[i].timestamp : 0.0; // current timestamp (0 if disconnected)
    const bool sameDevice = (state.id == currentId); // true when the id has not changed

    // Real = connected and (non-zero timestamp, or previously seen real with same id)
    // This keeps the Tizen placeholder workaround while detecting replacements
    const bool real = connected && (timestamp != 0.0 || (sameDevice && state.seenTimestamp));

    // Previously announced but gone or replaced → queue removal
    if (state.announced && (!real || !sameDevice)) {
      removed.push_back(i);
      state.announced = false;
    }

    // Not a real controller (placeholder or disconnected) → clear state and skip
    if (!real) {
      state = {}; // clear so a future different device starts fresh
      continue;
    }

    // Record identity and mark this physical bit in the active mask
    state.id = currentId;
    state.seenTimestamp = true;
    activeGamepadMask |= static_cast<short>(1 << i);

    // Queue an arrival event if we have not announced this device yet
    if (!state.announced) {
      arrived.push_back(i);
    }
  }

  // Send zeroed events for removed / replaced controllers so the host cleans up
  for (int i : removed) {
    LiSendMultiControllerEvent(i, activeGamepadMask & ~(1 << i), 0, 0, 0, 0, 0, 0, 0);
  }

  // Announce new (or re-arrived) controllers so Sunshine can pick the right profile
  for (int i : arrived) {
    const auto& gamepad = events[i];
    const uint8_t type = GetControllerType(gamepad.id);
    const uint32_t buttons = GetSupportedButtons(gamepad.numButtons, flipABfaceButtonsSwitch, flipXYfaceButtonsSwitch);

    // Only advertise capabilities the browser actually provides
    uint16_t capabilities = (gamepad.numButtons > 7) ? LI_CCAP_ANALOG_TRIGGERS : 0;

    // The browser Gamepad API does not expose motion, battery, RGB or touchpad
    // data. Only advertise rumble when our existing feedback path can use it.
    if (rumbleFeedbackSwitch) {
      const int hasRumble = MAIN_THREAD_EM_ASM_INT({
        var gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        var gamepad = gamepads[$0];
        return !!(gamepad && gamepad.vibrationActuator && typeof gamepad.vibrationActuator.playEffect === 'function');
      }, i);
      // Advertise rumble only when the actuator is actually available
      if (hasRumble) {
        capabilities |= LI_CCAP_RUMBLE;
      }
    }

    // On failure leave un-announced; next poll will retry
    if (LiSendControllerArrivalEvent(i, activeGamepadMask, type, buttons, capabilities) == 0) {
      slotState[i].announced = true;
    }
  }

  // Process live input for every real, already-announced controller
  for (int gamepadID = 0; gamepadID < limit; ++gamepadID) {
    // Skip slots that are inactive or still waiting for a successful arrival
    if (!(activeGamepadMask & (1 << gamepadID)) || !slotState[gamepadID].announced) {
      continue;
    }

    const auto& gamepad = events[gamepadID];

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

    // Check if the current button flags match the defined button combination on the gamepad
    if (buttonFlags == STOP_STREAM_BUTTONS) {
      // Terminate the connection
      stopStream();
      return;
    } else if (buttonFlags == PERF_STATS_BUTTONS) {
      if (!comboTriggered[gamepadID]) {
        // Toggle performance stats overlay
        toggleStats();
        // Mark combo as triggered until buttons are released
        comboTriggered[gamepadID] = true;
      }
    } else {
      // Reset when buttons are released
      comboTriggered[gamepadID] = false;
    }

    // Check if the mouse emulation switch is checked
    if (mouseEmulationSwitch) {
      static std::map<int, std::chrono::time_point<std::chrono::steady_clock>> activatePressTimes;
      // Toggle mouse emulation on and off based on how long the PLAY/START button is pressed
      if (buttonFlags & PLAY_FLAG) {
        if (activatePressTimes.find(gamepadID) == activatePressTimes.end()) {
          activatePressTimes[gamepadID] = std::chrono::steady_clock::now();
        }
        auto currentTime = std::chrono::steady_clock::now();
        // Calculate the duration in milliseconds since the PLAY/START button was pressed
        auto durationTime = std::chrono::duration_cast<std::chrono::milliseconds>(currentTime - activatePressTimes[gamepadID]).count();
        // If the button has been pressed for at least 1000 milliseconds (1 second)
        if (durationTime >= 1000) {
          // Toggle mouse emulation state
          if (!mouseEmulationActive) {
            // Activate mouse emulation and notify the user
            mouseEmulationActive = true;
            PostToJs(std::string("mouseEmulationOn"));
          } else {
            // Deactivate mouse emulation and notify the user
            mouseEmulationActive = false;
            PostToJs(std::string("mouseEmulationOff"));
          }
          // Reset the PLAY/START press time to the current time after toggling
          activatePressTimes[gamepadID] = std::chrono::steady_clock::now();
        }
      } else {
        // If the PLAY/START button is not pressed, reset PLAY/START press time
        activatePressTimes[gamepadID] = std::chrono::steady_clock::now();
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
      if (buttonFlags & (X_FLAG | Y_FLAG)) {
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
