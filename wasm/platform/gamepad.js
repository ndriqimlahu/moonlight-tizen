const Controller = (function() {
  let pollingInterval = null;
  const gamepads = {};

  class Button {
    constructor(button) {
      this.value = button.value;
      this.pressed = button.pressed;
    }
  }

  class Gamepad {
    constructor(gamepad) {
      // Store initial button and axis states
      this.buttons = gamepad.buttons.map((button) => new Button(button));
      this.axes = gamepad.axes.slice();
    }

    analyzeButtonsAndAxes(newButtons, newAxes) {
      if (this.buttons.length !== newButtons.length || this.axes.length !== newAxes.length) {
        console.error('%c[gamepad.js, analyzeButtonsAndAxes]', 'color: gray;', 'Error: New buttons or axes layout does not match the saved one!');
        return;
      }

      const changes = [];

      // Check for button state changes
      for (let i = 0; i < newButtons.length; ++i) {
        if (this.buttons[i].pressed !== newButtons[i].pressed) {
          changes.push({
            type: 'button',
            index: i,
            pressed: newButtons[i].pressed,
          });
        }
      }

      // Check for axis value changes
      for (let i = 0; i < newAxes.length; i++) {
        if (this.axes[i] !== newAxes[i]) {
          changes.push({
            type: 'axis',
            index: i,
            value: newAxes[i]
          });
        }
      }

      // If there are any changes detected, dispatch an event
      if (changes.length > 0) {
        // Dispatch a custom event with the detected changes
        window.dispatchEvent(new CustomEvent('gamepadinputchanged', {
            detail: { changes },
          })
        );
      }

      // Update stored button and axis states
      this.buttons = newButtons.map((button) => new Button(button));
      this.axes = newAxes.slice();
    }
  }

  function gamepadConnected(gamepad) {
    // Add the connected gamepad to the registry
    gamepads[gamepad.index] = new Gamepad(gamepad);
  }

  function gamepadDisconnected(gamepad) {
    // Remove the disconnected gamepad from the registry
    delete gamepads[gamepad.index];
  }

  function analyzeGamepad(gamepad) {
    const index = gamepad.index;
    const pGamepad = gamepads[index];

    // If the gamepad is registered, analyze its buttons and axes
    if (pGamepad) {
      pGamepad.analyzeButtonsAndAxes(gamepad.buttons, gamepad.axes);
    }
  }

  function pollGamepads() {
    // Retrieve the list of connected gamepads
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
    // Analyze each connected gamepad
    for (const gamepad of gamepads) {
      // Check if the gamepad is valid
      if (gamepad) {
        // Analyze only valid gamepads
        analyzeGamepad(gamepad);
      }
    }
  }

  function startWatching() {
    // Start polling only if not already started
    if (!pollingInterval) {
      console.log('%c[gamepad.js, startWatching]', 'color: gray;', 'Starting gamepad polling...');
      // Listen for gamepad connection and disconnection events
      window.addEventListener('gamepadconnected', function(e) {
        gamepadConnected(e.gamepad);
      });
      window.addEventListener('gamepaddisconnected', function(e) {
        gamepadDisconnected(e.gamepad);
      });
      // Start polling at regular intervals (every 5 ms)
      pollingInterval = setInterval(pollGamepads, 5);
    }
  }

  function stopWatching() {
    // Stop polling if it is currently active
    if (pollingInterval) {
      console.log('%c[gamepad.js, stopWatching]', 'color: gray;', 'Stopping gamepad polling...');
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

  return {
    startWatching,
    stopWatching 
  };
})();
