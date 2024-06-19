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
// argument of platformOnLoad. When handling button input, use values from tvKey.
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
  KEY_MINUS: 'Minus',
  KEY_REMOTE_ENTER: 'Enter',
  KEY_MENU: 'Menu',
  KEY_TOOLS: 'Tools',
  KEY_INFO: 'Info',
  KEY_SOURCE: 'Source',
  KEY_EXIT: 'Exit',
  KEY_CAPTION: 'Caption',
  KEY_MANUAL: 'E-Manual',
  KEY_3D: '3D',
  KEY_EXTRA: 'Extra',
  KEY_PICTURE_SIZE: 'PictureSize',
  KEY_SOCCER: 'Soccer',
  KEY_TELETEXT: 'Teletext',
  KEY_MTS: 'MTS',
  KEY_SEARCH: 'Search',
  KEY_GUIDE: 'Guide',
  KEY_RED: 'ColorF0Red',
  KEY_GREEN: 'ColorF1Green',
  KEY_YELLOW: 'ColorF2Yellow',
  KEY_BLUE: 'ColorF3Blue',
  KEY_PLAY_PAUSE: 'MediaPlayPause',
  KEY_REWIND: 'MediaRewind',
  KEY_FAST_FORWARD: 'MediaFastForward',
  KEY_PLAY: 'MediaPlay',
  KEY_PAUSE: 'MediaPause',
  KEY_STOP: 'MediaStop',
  KEY_RECORD: 'MediaRecord',
  KEY_TRACK_PREVIOUS: 'MediaTrackPrevious',
  KEY_TRACK_NEXT: 'MediaTrackNext',
  KEY_VOLUME_UP: 'VolumeUp',
  KEY_VOLUME_DOWN: 'VolumeDown',
  KEY_VOLUME_MUTE: 'VolumeMute',
  KEY_CHANNEL_UP: 'ChannelUp',
  KEY_CHANNEL_DOWN: 'ChannelDown',
  KEY_CHANNEL_LIST: 'ChannelList',
  KEY_PREVIOUS_CHANNEL: 'PreviousChannel',
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

// Dictionary containing key names for usage in input handler function. This variable is set by platformOnLoad.
var tvKey;
// For explanation on ordering, see: https://developer.samsung.com/smarttv/develop/guides/user-interaction/remote-control.html
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
    KEY_MINUS: 189,
    KEY_LEFT: 37,
    KEY_UP: 38,
    KEY_RIGHT: 39,
    KEY_DOWN: 40,
    KEY_ENTER: 13,
    KEY_REMOTE_ENTER: 32,
    KEY_RETURN: 10009,
    KEY_MENU: 18,
    KEY_TOOLS: 10135,
    KEY_INFO: 457,
    KEY_SOURCE: 10072,
    KEY_EXIT: 10182,
    KEY_CAPTION: 10221,
    KEY_MANUAL: 10146,
    KEY_3D: 10199,
    KEY_EXTRA: 10253,
    KEY_PICTURE_SIZE: 10140,
    KEY_SOCCER: 10228,
    KEY_TELETEXT: 10200,
    KEY_MTS: 10195,
    KEY_SEARCH: 10225,
    KEY_GUIDE: 458,
    KEY_RED: 403,
    KEY_GREEN: 404,
    KEY_YELLOW: 405,
    KEY_BLUE: 406,
    KEY_PLAY_PAUSE: 10252,
    KEY_REWIND: 412,
    KEY_FAST_FORWARD: 417,
    KEY_PLAY: 415,
    KEY_PAUSE: 19,
    KEY_STOP: 413,
    KEY_RECORD: 416,
    KEY_TRACK_PREVIOUS: 10232,
    KEY_TRACK_NEXT: 10233,
    KEY_VOLUME_UP: 447,
    KEY_VOLUME_DOWN: 448,
    KEY_VOLUME_MUTE: 449,
    KEY_CHANNEL_UP: 427,
    KEY_CHANNEL_DOWN: 428,
    KEY_CHANNEL_LIST: 10073,
    KEY_PREVIOUS_CHANNEL: 10190,
  };
  tvKey = tvKeyButtons;

  if (!handler) {
    console.error('%c[platform.js, platformOnLoad]', 'color: gray;', 'Error: Failed to load input handler');
    return;
  }

  if (handler.initFn) {
    handler.initFn();
  }

  if (handler.initRemoteController) {
    var event_anchor;
    if (handler.focusId) {
      event_anchor = document.getElementById(handler.focusId);
    } else {
      event_anchor = document.getElementById("eventAnchor");
    }
    if (event_anchor) {
      event_anchor.focus();
    }
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
