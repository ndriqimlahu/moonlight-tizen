function remoteControllerHandler(e) {
  const keyCode = e.keyCode;

  switch (keyCode) {
    case tvKey.KEY_UP:
      // Navigate in the up direction
      Navigation.up();
      break;
    case tvKey.KEY_DOWN:
      // Navigate in the down direction
      Navigation.down();
      break;
    case tvKey.KEY_LEFT:
      // Navigate in the left direction
      Navigation.left();
      break;
    case tvKey.KEY_RIGHT:
      // Navigate in the right direction
      Navigation.right();
      break;
    case tvKey.KEY_ENTER:
      // Select the current item
      Navigation.select();
      break;
    case tvKey.KEY_RETURN:
      // Go back or cancel the operation
      Navigation.back();
      break;
    case tvKey.KEY_VOLUME_UP:
      // Increase the volume
      tizen.tvaudiocontrol.setVolumeUp();
      break;
    case tvKey.KEY_VOLUME_DOWN:
      // Decrease the volume
      tizen.tvaudiocontrol.setVolumeDown();
      break;
    case tvKey.KEY_VOLUME_MUTE:
      // Mute the volume
      tizen.tvaudiocontrol.setMute();
      break;
    case tvKey.KEY_CHANNEL_UP:
      // Triggers the press action
      Navigation.press();
      break;
    case tvKey.KEY_CHANNEL_DOWN:
      // Triggers the switch action
      Navigation.switch();
      break;
    case tvKey.KEY_RED:
      // Terminate the connection
      if (isInGame === true) {
        Module.stopStream();
      }
      break;
    case tvKey.KEY_YELLOW:
      // Toggle performance stats overlay
      if (isInGame === true) {
        Module.toggleStats();
      }
      break;
    default:
      break;
  }
}
