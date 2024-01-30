/* eslint-disable */

const SyncFunctions = {
  // no parameters
  'makeCert': (...args) => Module.makeCert(...args),
  // cert, privateKey, myUniqueid
  'httpInit': (...args) => Module.httpInit(...args),
  // host, width, height, fps, bitrate, rikey, rikeyid, appversion, gfeversion
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
};

var callbacks = {}
var callbacks_ids = 1;

/**
 * var sendMessage - Sends a message with arguments to the NaCl module
 *
 * @param  {String} method A named method
 * @param  {(String|Array)} params An array of options or a single string
 * @return {void}        The NaCl module calls back through the handleMessage method
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
 * handleMessage - Handles messages from the NaCl module
 *
 * @param  {Object} msg An object given by the NaCl module
 * @return {void}
 */
function handleMessage(msg) {
  console.log('%c[messages.js, handleMessage]', 'color:gray;', 'Message data: ', msg);
  if (msg.indexOf('streamTerminated: ') === 0) { // If it's a recognized event, notify the appropriate function
    // Show a termination snackbar message if the termination was unexpected
    var errorCode = parseInt(msg.replace('streamTerminated: ', ''));
    switch (errorCode) {
      case 0: // ML_ERROR_GRACEFUL_TERMINATION
        break;
      case -100: // ML_ERROR_NO_VIDEO_TRAFFIC
        snackbarLogLong("No video received from host. Check the host PC's firewall and port forwarding rules.");
        break;
      case -101: // ML_ERROR_NO_VIDEO_FRAME
        snackbarLogLong("Your network connection isn't performing well. Reduce your video bitrate setting or try a faster connection.");
        break;
      default:
        snackbarLogLong("Connection terminated");
        break;
    }

    api.refreshServerInfo().then(function(ret) {
      // Return to app list with new current game
      showApps(api);
    }, function() {
      // Return to app list anyway
      showApps(api);
    });
  } else if (msg === 'Connection Established') {
    $('#loadingSpinner').css('display', 'none');
    $('body').css('backgroundColor', 'transparent');
    $("#wasm_module").css("display", "");
    $("#wasm_module").focus();
  } else if (msg.indexOf('ProgressMsg: ') === 0) {
    $('#loadingMessage').text(msg.replace('ProgressMsg: ', ''));
  } else if (msg.indexOf('TransientMsg: ') === 0) {
    snackbarLog(msg.replace('TransientMsg: ', ''));
  } else if (msg.indexOf('DialogMsg: ') === 0) {
    // FIXME: Really use a dialog
    snackbarLogLong(msg.replace('DialogMsg: ', ''));
  } else if (msg === 'displayVideo') {
    // Show the video stream now
    $("#listener").addClass("fullscreen");
  } else if (msg.indexOf('controllerRumble: ' ) === 0) {
    const eventData = msg.split( ' ' )[1].split(',');
    const gamepadIdx = parseInt(eventData[0]);
    const weakMagnitude = parseFloat(eventData[1]);
    const strongMagnitude = parseFloat(eventData[2]);
    console.log("Playing rumble on gamepad " + gamepadIdx + " with weakMagnitude " + weakMagnitude + " and strongMagnitude " + strongMagnitude);
    // We may not actually have a gamepad at this index
    // Even if we do have a gamepad, it may not have a vibrationActuator associated with it
    navigator.getGamepads()[gamepadIdx].vibrationActuator.playEffect('dual-rumble', {
      startDelay: 0,
      duration: 5000, // Moonlight should be sending another rumble event when stopping
      weakMagnitude: weakMagnitude,
      strongMagnitude: strongMagnitude,
    });
  }
}
