function remoteControllerHandler(e) {
  const keyCode = e.keyCode;

  switch (keyCode) {
    case tvKey.KEY_UP:
      // Navigate up
      Navigation.up();
      break;
    case tvKey.KEY_DOWN:
      // Navigate down
      Navigation.down();
      break;
    case tvKey.KEY_LEFT:
      // Navigate left
      Navigation.left();
      break;
    case tvKey.KEY_RIGHT:
      // Navigate right
      Navigation.right();
      break;
    case tvKey.KEY_ENTER:
    case tvKey.KEY_REMOTE_ENTER:
      // Select the item
      Navigation.select();
      break;
    case tvKey.KEY_RETURN:
      // Go back
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
  }
}
