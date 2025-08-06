/* eslint-disable */

const SyncFunctions = {
  // no parameters
  'makeCert': (...args) => Module.makeCert(...args),
  // cert, privateKey, myUniqueid
  'httpInit': (...args) => Module.httpInit(...args),
  /* host, width, height, fps, bitrate, rikey, rikeyid, appversion, gfeversion, rtspurl, serverCodecModeSupport,
  framePacing, optimizeGames, playHostAudio, rumbleFeedback, mouseEmulation, flipABfaceButtons, flipXYfaceButtons,
  audioConfig, audioSync, videoCodec, hdrMode, fullRange, disableWarnings, performanceStats */
  'startRequest': (...args) => Module.startStream(...args),
  // no parameters
  'stopRequest': (...args) => Module.stopStream(...args),
};

const AsyncFunctions = {
  // url, ppk, binaryResponse
  'openUrl': (...args) => Module.openUrl(...args),
  // no parameters
  'STUN': (...args) => Module.STUN(...args),
  // serverMajorVersion, address, randomNumber
  'pair': (...args) => Module.pair(...args),
  // macAddress
  'wakeOnLan': (...args) => Module.wakeOnLan(...args),
};

var callbacks = {}
var callbacks_ids = 1;

/**
 * var sendMessage - Sends a message with arguments to the Wasm module
 *
 * @param  {String} method A named method
 * @param  {(String|Array)} params An array of options or a single string
 * @return {void}        The Wasm module calls back through the handleMessage method
 */
var sendMessage = function(method, params) {
  if (SyncFunctions[method]) {
    return new Promise(function(resolve, reject) {
      const ret = SyncFunctions[method](...params);
      if (ret.type === "resolve") {
        resolve(ret.ret);
      } else {
        reject(ret.ret);
      }
    });
  } else {
    return new Promise(function(resolve, reject) {
      const id = callbacks_ids++;
      callbacks[id] = {
        'resolve': resolve,
        'reject': reject
      };

      AsyncFunctions[method](id, ...params);
    });
  }
}

var handlePromiseMessage = function(callbackId, type, msg) {
  callbacks[callbackId][type](msg);
  delete callbacks[callbackId];
}

/**
 * handleMessage - Handles messages from the Wasm module
 *
 * @param  {Object} msg An object given by the Wasm module
 * @return {void}
 */
function handleMessage(msg) {
  console.log('%c[messages.js, handleMessage]', 'color: gray;', 'Message data: ', msg);
  // If it's a recognized event, notify the appropriate function
  if (msg.indexOf('streamTerminated: ') === 0) {
    // Remove the on-screen overlays
    $('#connection-warnings').css('display', 'none');
    // Remove the video stream now
    $('#listener').removeClass('fullscreen');
    $('#loadingSpinner').css('display', 'none');
    $('body').css('backgroundColor', '#282C38');
    $('#wasm_module').css('display', 'none');
    // Show a termination snackbar message if the termination was unexpected
    var errorCode = parseInt(msg.replace('streamTerminated: ', ''));
    switch (errorCode) {
      case 0: // ML_ERROR_GRACEFUL_TERMINATION
        break;
      case -100: // ML_ERROR_NO_VIDEO_TRAFFIC
        snackbarLogLong('No video received from host. Check the host PC\'s firewall and port forwarding rules.');
        break;
      case -101: // ML_ERROR_NO_VIDEO_FRAME
        snackbarLogLong('Your network connection isn\'t performing well. Reduce your video bitrate setting or try a faster connection.');
        break;
      case -102: // ML_ERROR_UNEXPECTED_EARLY_TERMINATION
        snackbarLogLong('Something went wrong on your host PC when starting the stream. Restart your host PC and try again.');
        break;
      case -103: // ML_ERROR_PROTECTED_CONTENT
        snackbarLogLong('An issue occurred on your host PC while starting the stream. Make sure you don\'t have any DRM-protected content open on your host PC.');
        break;
      case -104: // ML_ERROR_FRAME_CONVERSION
        snackbarLogLong('The host PC reported a fatal video encoding error. Try disabling HDR mode, changing the streaming resolution, or changing your host PC\'s display resolution.');
        break;
      default:
        snackbarLogLong('Connection terminated');
        break;
    }
    // Return to the app list with new current game
    showApps(api);
    setTimeout(() => {
      // Scroll to the current game row
      Navigation.switch();
      // Switch to Apps view
      Navigation.change(Views.Apps);
    }, 1500);
  } else if (msg === 'Connection Established') {
    // Prepare the screen for video stream
    $('#loadingSpinner').css('display', 'none');
    $('body').css('backgroundColor', 'transparent');
    $('#wasm_module').css('display', '');
    $('#wasm_module').focus();
  } else if (msg.indexOf('ProgressMsg: ') === 0) {
    // Show progress message under loading spinner
    $('#loadingSpinnerMessage').text(msg.replace('ProgressMsg: ', ''));
  } else if (msg.indexOf('TransientMsg: ') === 0) {
    // Show transient message as notification
    snackbarLogLong(msg.replace('TransientMsg: ', ''));
  } else if (msg.indexOf('DialogMsg: ') === 0) {
    // Show dialog message as notification
    // FIXME: Really use a dialog
    snackbarLogLong(msg.replace('DialogMsg: ', ''));
  } else if (msg === 'displayVideo') {
    // Show the video stream now
    $('#listener').addClass('fullscreen');
  } else if (msg.indexOf('NoWarningMsg: ') === 0) {
    // Hide the connection warnings overlay
    $('#connection-warnings').css('background', 'transparent');
    $('#connection-warnings').text('');
  } else if (msg.indexOf('WarningMsg: ') === 0) {
    // Show the connection warnings overlay
    $('#connection-warnings').css('background', 'rgba(0, 0, 0, 0.5)');
    $('#connection-warnings').text(msg.replace('WarningMsg: ', ''));
  } else if (msg.indexOf('controllerRumble: ') === 0) {
    const eventData = msg.split(' ')[1].split(',');
    const gamepadIdx = parseInt(eventData[0]);
    const weakMagnitude = parseFloat(eventData[1]);
    const strongMagnitude = parseFloat(eventData[2]);
    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[gamepadIdx];
    // Check if the gamepad exists and if it has a vibrationActuator associated with it
    if (gamepad && gamepad.vibrationActuator) {
      console.log('%c[messages.js, handleMessage]', 'color: gray;', 'Playing rumble on gamepad ' + gamepadIdx + ' with weak magnitude ' + weakMagnitude + ' and strong magnitude ' + strongMagnitude + '...');
      gamepad.vibrationActuator.playEffect('dual-rumble', {
        startDelay: 0,
        duration: 5000, // Moonlight should be sending another rumble event when stopping
        weakMagnitude: weakMagnitude,
        strongMagnitude: strongMagnitude,
      });
    } else {
      console.warn('%c[messages.js, handleMessage]', 'color: gray;', 'Warning: Gamepad ' + gamepadIdx + ' does not support the rumble feature!');
    }
  } else if (msg.indexOf('mouseEmulationOn') === 0) {
    // Show mouse emulation enable status as a notification
    snackbarLogLong('Mouse emulation is activated');
  } else if (msg.indexOf('mouseEmulationOff') === 0) {
    // Show mouse emulation disable status as notification
    snackbarLogLong('Mouse emulation is deactivated');
  }
}
