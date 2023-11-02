// Copyright (c) 2015 Samsung Electronics. All rights reserved.
//
// This file provides a set of widget variables, common functions
// and enums for usage in widgets. It provides:
// - remote controller input,
// - platform, widget and build information,
// - common platform-specific widget initialization.
//
// Sample usage:
//
// To use remote controller you need 'RemoteController' privilege.
// For more info visit: https://www.tizen.org/tv/web_device_api/tvinputdevice
// Example of platform.js usage for remote controller:
//
// var remoteHandler = {
//   initRemoteController: true,
//   onKeydownListener: remoteDown
// }
//
// function pingApp(e) {
//   var keyCode = e.keyCode;
//
//   switch (keyCode) {
//     case tvKey.KEY_RED:
//       pingAppByAppId('c_app');
//       break;
//
//     case tvKey.KEY_GREEN:
//       clearAppMsg('c_app_msg');
//       break;
//   }
// }
//
// function appOnLoadFn() {
//   ...
// }
//
// var handler = {
//   initFn: appOnLoadFn,
//   initRemoteController: true,
//   onKeydownListener: pingApp,
//   buttonsToRegister: [     // See buttonsNames in this file.
//     buttonsNames.KEY_RED,
//     buttonsNames.KEY_GREEN,
//   ]
// };
//
// ...
//
// <body onload="platformOnLoad(handler)">

// Names used to register buttons used by widget. Useable in buttonsToRegister
// argument of platformOnLoad.
//
// When handling button input, use values from tvKey.
var buttonsNames = {
  KEY_0: '0',
  KEY_1: '1',
  KEY_2: '2',
  KEY_3: '3',
  KEY_4: '4',
  KEY_5: '5',
  KEY_6: '6',
  KEY_7: '7',
  KEY_8: '8',
  KEY_9: '9',
  KEY_GREEN: 'ColorF1Green',
  KEY_YELLOW: 'ColorF2Yellow',
  KEY_BLUE: 'ColorF3Blue',
  KEY_RED: 'ColorF0Red',
  KEY_PLAY: 'MediaPlay',
  KEY_PAUSE: 'MediaPause',
  KEY_PLAYPAUSE: 'MediaPlayPause',
  KEY_STOP: 'MediaStop',
  KEY_VOLUME_UP: 'VolumeUp',
  KEY_VOLUME_DOWN: 'VolumeDown',
  KEY_VOLUME_MUTE: 'VolumeMute',
  KEY_CHANNEL_UP: 'ChannelUp',
  KEY_CHANNEL_DOWN: 'ChannelDown',
  KEY_CHANNEL_LIST: 'ChannelList',
/*
  This keys are registered by default.
  There is no way to unregister them.
  Registration try will end with error.
  KEY_LEFT: 'ArrowLeft',
  KEY_UP: 'ArrowUp',
  KEY_RIGHT: 'ArrowRight',
  KEY_DOWN: 'ArrowDown',
  KEY_ENTER: 'Enter',
  KEY_RETURN: 'Return',
*/
};

// Dictionary containing key names for usage in input handler function. This
// variable is set by platformOnLoad.
var tvKey;

function platformOnLoad(handler) {
  var tvKeyButtons = {
    KEY_0: 48,
    KEY_1: 49,
    KEY_2: 50,
    KEY_3: 51,
    KEY_4: 52,
    KEY_5: 53,
    KEY_6: 54,
    KEY_7: 55,
    KEY_8: 56,
    KEY_9: 57,
    KEY_LEFT: 37,
    KEY_UP: 38,
    KEY_RIGHT: 39,
    KEY_DOWN: 40,
    KEY_ENTER: 13,
    KEY_REMOTE_ENTER: 32,
    KEY_RETURN: 10009,
    KEY_GREEN: 404,
    KEY_YELLOW: 405,
    KEY_BLUE: 406,
    KEY_RED: 403,
    KEY_PLAY: 415,
    KEY_PAUSE: 19,
    KEY_PLAYPAUSE: 10252,
    KEY_STOP: 413,
    KEY_VOLUME_UP: 447,
    KEY_VOLUME_DOWN: 448,
    KEY_VOLUME_MUTE: 449,
    KEY_CHANNEL_UP: 427,
    KEY_CHANNEL_DOWN: 428,
    KEY_CHANNEL_LIST: 10073,
  };
  tvKey = tvKeyButtons;

  if (!handler)
    return;

  if (handler.initFn) {
    handler.initFn();
  }

  if (handler.initRemoteController) {
    var event_anchor;
    if (handler.focusId)
      event_anchor = document.getElementById(handler.focusId);
    else
      event_anchor = document.getElementById("eventAnchor");
    if (event_anchor)
      event_anchor.focus();
  }
  if (handler.onKeydownListener) {
    document.addEventListener("keydown", handler.onKeydownListener);
  }
  if (handler.buttonsToRegister) {
    handler.buttonsToRegister.forEach(function (button) {
      tizen.tvinputdevice.registerKey(button);
    });
  }
}
