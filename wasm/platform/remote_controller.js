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
    case tvKey.KEY_REMOTE_ENTER:
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
    case tvKey.KEY_RED:
      // Terminate the connection
      Module.stopStream();
      break;
    default:
      break;
  }
}
