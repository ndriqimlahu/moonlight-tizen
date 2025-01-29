function guuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0,
      v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function uniqueid() {
  return 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, function(c) {
    var r = Math.random() * 16 | 0;
    return r.toString(16);
  });
}

function generateRemoteInputKey() {
  var array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
}

function generateRemoteInputKeyId() {
  // Value must be signed 32-bit int for correct behavior
  var array = new Int32Array(1);
  window.crypto.getRandomValues(array);
  return array[0];
}

// Based on OpenBSD arc4random_uniform()
function cryptoRand(upper_bound) {
  var min = (Math.pow(2, 32) - upper_bound) % upper_bound;
  var array = new Uint32Array(1);

  do {
    window.crypto.getRandomValues(array);
  } while (array[0] < min);

  return array[0] % upper_bound;
}

function getConnectedGamepadMask() {
  var count = 0;
  var mask = 0;
  var gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

  for (var i = 0; i < gamepads.length; i++) {
    var gamepad = gamepads[i];
    if (gamepad) {
      // See logic in gamepad.cpp
      // These must stay in sync!

      if (!gamepad.connected) {
        // Not connected
        continue;
      }

      if (gamepad.timestamp == 0) {
        // On some platforms, Tizen returns "connected" gamepads that really 
        // aren't, so timestamp stays at zero. To work around this, we'll only
        // count gamepads that have a non-zero timestamp in our controller index.
        continue;
      }

      mask |= 1 << count++;
    }
  }

  console.log('%c[utils.js, getConnectedGamepadMask]', 'color: gray;', 'Detected: ' + count + ' gamepads.');
  return mask;
}

String.prototype.toHex = function() {
  var hex = '';
  for (var i = 0; i < this.length; i++) {
    hex += '' + this.charCodeAt(i).toString(16);
  }
  return hex;
}

function NvHTTP(address, clientUid, userEnteredAddress = '', macAddress) {
  console.log('%c[utils.js, NvHTTP]', 'color: gray;', 'NvHTTP Object: \n' + this);
  this.hostname = address;
  this.address = address;
  this.userEnteredAddress = userEnteredAddress; // if the user entered an address, we keep it on hand to try when polling
  this.externalIP = '';
  this.macAddress = macAddress;
  this.clientUid = clientUid;
  this.serverUid = '';
  this.ppkstr = null;
  this._pollCount = 0;
  this._consecutivePollFailures = 0;
  this._pollCompletionCallbacks = [];
  this.paired = false;
  this.online = false;
  this.numofapps = 0;
  this.currentGame = 0;
  this.appVersion = '';
  this.gfeVersion = '';
  this.serverMajorVersion = 0;
  this.gputype = '';
  this.supportedDisplayModes = {}; // key: y-resolution:x-resolution, value: array of supported framerates

  _self = this;
};

function _arrayBufferToBase64(buffer) {
  var binary = '';
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function _base64ToArrayBuffer(base64) {
  var binary_string = window.atob(base64);
  var len = binary_string.length;
  var bytes = new Uint8Array(len);
  for (var i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

NvHTTP.prototype = {
  refreshServerInfo: function() {
    if (this.ppkstr == null) {
      return sendMessage('openUrl', [
        this._baseUrlHttp + '/serverinfo?' + this._buildUidStr(), this.ppkstr, false
      ]).then(function(retHttp) {
        this._parseServerInfo(retHttp);
      }.bind(this));
    }
    // Try HTTPS first
    return sendMessage('openUrl', [
      this._baseUrlHttps + '/serverinfo?' + this._buildUidStr(), this.ppkstr, false
    ]).then(function(ret) {
      if (!this._parseServerInfo(ret)) { // If that fails
        // Try HTTP as a failover. Useful to clients who aren't paired yet
        return sendMessage('openUrl', [
          this._baseUrlHttp + '/serverinfo?' + this._buildUidStr(), this.ppkstr, false
        ]).then(function(retHttp) {
          this._parseServerInfo(retHttp);
        }.bind(this));
      }
    }.bind(this), function(error) {
      if (error == -100) { // GS_CERT_MISMATCH
        // Retry over HTTP
        console.warn('%c[utils.js, refreshServerInfo]', 'color: gray;', 'Warning: Certificate mismatch. Retrying over HTTP...', this);
        return sendMessage('openUrl', [
          this._baseUrlHttp + '/serverinfo?' + this._buildUidStr(), this.ppkstr, false
        ]).then(function(retHttp) {
          this._parseServerInfo(retHttp);
        }.bind(this));
      }
    }.bind(this));
  },

  // Refreshes the server info using a given address. This is useful for testing whether we can successfully ping a host at a given address
  refreshServerInfoAtAddress: function(givenAddress) {
    if (this.ppkstr == null) {
      // Use HTTP if we have no pinned cert
      return sendMessage('openUrl', [
        'http://' + givenAddress + ':47989' + '/serverinfo?' + this._buildUidStr(), this.ppkstr, false
      ]).then(function(retHttp) {
        return this._parseServerInfo(retHttp);
      }.bind(this));
    }
    // Try HTTPS first
    return sendMessage('openUrl', [
      'https://' + givenAddress + ':47984' + '/serverinfo?' + this._buildUidStr(), this.ppkstr, false
    ]).then(function(ret) {
      if (!this._parseServerInfo(ret)) { // If that fails
        console.error('%c[utils.js, refreshServerInfoAtAddress]', 'color: gray;', 'Error: Failed to parse server info from HTTPS, falling back to HTTP...');
        // Try HTTP as a failover. Useful to clients who aren't paired yet
        return sendMessage('openUrl', [
          'http://' + givenAddress + ':47989' + '/serverinfo?' + this._buildUidStr(), this.ppkstr, false
        ]).then(function(retHttp) {
          return this._parseServerInfo(retHttp);
        }.bind(this));
      }
    }.bind(this), function(error) {
      if (error == -100) { // GS_CERT_MISMATCH
        // Retry over HTTP
        console.warn('%c[utils.js, refreshServerInfoAtAddress]', 'color: gray;', 'Warning: Certificate mismatch. Retrying over HTTP...', this);
        return sendMessage('openUrl', [
          'http://' + givenAddress + ':47989' + '/serverinfo?' + this._buildUidStr(), this.ppkstr, false
        ]).then(function(retHttp) {
          return this._parseServerInfo(retHttp);
        }.bind(this));
      }
    }.bind(this));
  },

  // Called every few seconds to poll the server for updated info
  pollServer: function(onComplete) {
    // Pend this callback on completion
    this._pollCompletionCallbacks.push(onComplete);

    // Check if a poll was already in progress
    if (this._pollCompletionCallbacks.length > 1) {
      // Don't start another, because the one in progress will alert our caller too
      return;
    }

    this.selectServerAddress(function(successfulAddress) {
      // Successfully determined server address. Update base URL
      this.address = successfulAddress;
      this._baseUrlHttps = 'https://' + successfulAddress + ':47984';
      this._baseUrlHttp = 'http://' + successfulAddress + ':47989';

      // Poll for updated mac address only on first successful server info poll
      if (this.paired && this._pollCount === 0) {
        updateMacAddress(this);
      }

      // Poll for the app list every 10 successful server info polls
      // Not including the first one to avoid PCs taking a while to show as online initially
      if (this.paired && this._pollCount++ % 10 == 1) {
        this.getAppListWithCacheFlush();
      }

      this._consecutivePollFailures = 0;
      this.online = true;

      // Call all pending completion callbacks
      var completion;
      while ((completion = this._pollCompletionCallbacks.pop())) {
        completion(this);
      }
    }.bind(this), function() {
      if (++this._consecutivePollFailures >= 2) {
        this.online = false;
      }

      // Call all pending completion callbacks
      var completion;
      while ((completion = this._pollCompletionCallbacks.pop())) {
        completion(this);
      }
    }.bind(this));
  },

  // Initially pings the server to try and figure out if it's routable by any means
  selectServerAddress: function(onSuccess, onFailure) {
    // TODO: Deduplicate the addresses
    this.refreshServerInfoAtAddress(this.address).then(function(successPrevAddr) {
      onSuccess(this.address);
    }.bind(this), function(successPrevAddr) {
      this.refreshServerInfoAtAddress(this.hostname + '.local').then(function(successLocal) {
        onSuccess(this.hostname + '.local');
      }.bind(this), function(failureLocal) {
        this.refreshServerInfoAtAddress(this.externalIP).then(function(successExternal) {
          onSuccess(this.externalIP);
        }.bind(this), function(failureExternal) {
          this.refreshServerInfoAtAddress(this.userEnteredAddress).then(function(successUserEntered) {
            onSuccess(this.userEnteredAddress);
          }.bind(this), function(failureUserEntered) {
            console.error('%c[utils.js, selectServerAddress]', 'color: gray;', 'Error: Failed to contact the ' + this.hostname + '!', this);
            onFailure();
          }.bind(this));
        }.bind(this));
      }.bind(this));
    }.bind(this));
  },

  toString: function() {
    var string = '';
    string += 'host name: ' + this.hostname + '\r\n';
    string += 'host address: ' + this.address + '\r\n';
    string += 'mac address: ' + this.macAddress + '\r\n';
    string += 'client UID: ' + this.clientUid + '\r\n';
    string += 'server UID: ' + this.serverUid + '\r\n';
    string += 'is paired: ' + this.paired + '\r\n';
    string += 'is online: ' + this.online + '\r\n';
    string += 'number of apps: ' + this.numofapps + '\r\n';
    string += 'current game: ' + this.currentGame + '\r\n';
    string += 'app version: ' + this.appVersion + '\r\n';
    string += 'gfe version: ' + this.gfeVersion + '\r\n';
    string += 'server major version: ' + this.serverMajorVersion + '\r\n';
    string += 'gpu type: ' + this.gputype + '\r\n';
    string += 'supported display modes: ' + '\r\n';

    for (var displayMode in this.supportedDisplayModes) {
      string += '\t' + displayMode + ': ' + this.supportedDisplayModes[displayMode] + '\r\n';
    }

    return string;
  },

  _parseServerInfo: function(xmlStr) {
    $xml = this._parseXML(xmlStr);
    $root = $xml.find('root');

    if ($root.attr('status_code') != 200) {
      return false;
    }

    if (this.serverUid != $root.find('uniqueid').text().trim() && this.serverUid != "") {
      // If we received a UID that isn't the one we expected, fail
      return false;
    }

    console.log('%c[utils.js, _parseServerInfo]', 'color: gray;', 'Parsing server info: ', $root);

    this.paired = $root.find('PairStatus').text().trim() == 1;
    this.currentGame = parseInt($root.find('currentgame').text().trim(), 10);
    this.appVersion = $root.find('appversion').text().trim();
    this.serverMajorVersion = parseInt(this.appVersion.substring(0, 1), 10);
    this.serverUid = $root.find('uniqueid').text().trim();
    this.hostname = $root.find('hostname').text().trim();
    this.macAddress = $root.find('mac').text().trim();

    // Convert the value from ServerCodecModeSupport to a hexadecimal string
    var serverCodecModeSupport = '0x' + parseInt($root.find('ServerCodecModeSupport').text().trim(), 10).toString(16).padStart(8, '0');

    // Mapping of codecMode values to serverCodecMode values
    const codecMap = {
      '0x0001': '0x00000001', // H.264
      '0x0100': '0x00000100', // HEVC
      '0x0200': '0x00000200', // HEVC Main10
      '0x1000': '0x00010000', // AV1
      '0x2000': '0x00020000'  // AV1 Main10
    };

    // Retrieve the selected codec value from the data attribute of the selected menu item
    var selectedCodecMode = $('#selectCodec').data('value').toString();
    var selectedServerCodecMode = codecMap[selectedCodecMode];

    // Check if the selected codec exists in codecMap
    if (codecMap.hasOwnProperty(selectedCodecMode)) {
      // Set serverCodecMode to either serverCodecModeSupport or selectedServerCodecMode based on the match
      this.serverCodecMode = selectedServerCodecMode === serverCodecModeSupport ? serverCodecModeSupport : selectedServerCodecMode;
    } else {
      console.error('%c[utils.js, _parseServerInfo]', 'color: gray;', 'Error: Failed to select server codec mode value!');
    }

    var externIP = $root.find('ExternalIP').text().trim();
    if (externIP) {
      // New versions of GFE don't have this field, so don't overwrite the one we found via STUN
      this.externalIP = externIP;
    }

    try { // These aren't critical for functionality, and don't necessarily exist in older GFE versions
      this.gfeVersion = $root.find('GfeVersion').text().trim();
      this.gputype = $root.find('gputype').text().trim();
      this.numofapps = $root.find('numofapps').text().trim();
      // Now for the hard part: parsing the supported streaming
      $root.find('DisplayMode').each(function(index, value) { // For each resolution: FPS object
        var yres = parseInt($(value).find('Height').text());
        var xres = parseInt($(value).find('Width').text());
        var fps = parseInt($(value).find('RefreshRate').text());
        if (!this.supportedDisplayModes[yres + ':' + xres]) {
          this.supportedDisplayModes[yres + ':' + xres] = [];
        }
        if (!this.supportedDisplayModes[yres + ':' + xres].includes(fps)) {
          this.supportedDisplayModes[yres + ':' + xres].push(fps);
        }
      }.bind(this));
    } catch (err) {
      // We don't need this data, so no error handling necessary
    }

    // GFE 2.8 started keeping current game set to the last game played. As a result, it no longer
    // has the semantics that its name would indicate. To contain the effects of this change as much
    // as possible, we'll force the current game to zero if the server isn't in a streaming session.
    if (!$root.find('state').text().trim().endsWith('_SERVER_BUSY')) {
      this.currentGame = 0;
    }

    return true;
  },

  getAppById: function(appId) {
    return this.getAppList().then(function(list) {
      var retApp = null;

      list.some(function(app) {
        if (app.id == appId) {
          retApp = app;
          return true;
        }
        return false;
      });

      return retApp;
    });
  },

  getAppByName: function(appName) {
    return this.getAppList().then(function(list) {
      var retApp = null;

      list.some(function(app) {
        if (app.title == appName) {
          retApp = app;
          return true;
        }
        return false;
      });

      return retApp;
    });
  },

  getAppListWithCacheFlush: function() {
    return sendMessage('openUrl', [
      this._baseUrlHttps + '/applist?' + this._buildUidStr(), this.ppkstr, false
    ]).then(function(ret) {
      $xml = this._parseXML(ret);
      $root = $xml.find('root');

      if ($root.attr('status_code') != 200) {
        // TODO: Bubble up an error here
        console.error('%c[utils.js, getAppListWithCacheFlush]', 'color: gray;', 'Error: Failed to request app list: ', $root.attr('status_code'));
        return [];
      }

      var rootElement = $xml.find('root')[0];
      var appElements = rootElement.getElementsByTagName('App');
      var appList = [];

      for (var i = 0, len = appElements.length; i < len; i++) {
        appList.push({
          id: parseInt(appElements[i].getElementsByTagName('ID')[0].innerHTML.trim(), 10),
          title: appElements[i].getElementsByTagName('AppTitle')[0].innerHTML.trim(),
        });
      }

      this._memCachedApplist = appList;
      console.log('%c[utils.js, getAppListWithCacheFlush]', 'color: gray;', 'App list requested successfully.');

      return appList;
    }.bind(this));
  },

  getAppList: function() {
    if (this._memCachedApplist) {
      return new Promise(function(resolve, reject) {
        console.log('%c[utils.js, getAppList]', 'color: gray;', 'Returning memory-cached apps list.');
        resolve(this._memCachedApplist);
        return;
      }.bind(this));
    }

    return this.getAppListWithCacheFlush();
  },

  // Returns the box art based on the the given appId
  // Three layers of response time are possible: memory-cached (in JavaScript), storage-cached (in tizen.filesystem), and network-fetched (host sends binary over the network)
  // For explanations on the file system, see: https://developer.samsung.com/smarttv/develop/api-references/tizen-web-device-api-references/filesystem-api.html
  getBoxArt: function(appId) {
    return new Promise(function(resolve, reject) {
      var boxArtFileName = 'boxart-' + appId;
      var boxArtDir = 'wgt-private/' + this.hostname; // Widget private storage directory is r/w (read/write)

      // Read the cached box art from the storage
      try {
        var fileHandleRead = tizen.filesystem.openFile(boxArtDir + '/' + boxArtFileName, 'r');
        var fileContentInBlob = fileHandleRead.readBlob();
        fileHandleRead.close();
        console.log('%c[utils.js, getBoxArt]', 'color: gray;', 'Returning storage-cached box art: ', appId);

        var reader = new FileReader();
        reader.onloadend = function() {
          var dataUrl = reader.result;
          resolve(dataUrl);
        };
        reader.readAsDataURL(fileContentInBlob);
      } catch (readError) {
        console.warn('%c[utils.js, getBoxArt]', 'color: gray;', 'Warning: Cannot find or read box art from internal storage: ', readError);
        // Fetch the new box art from the network
        return sendMessage('openUrl', [
          this._baseUrlHttps + '/appasset?' + this._buildUidStr() + '&appid=' + appId + '&AssetType=2&AssetIdx=0', this.ppkstr, true
        ]).then(function(boxArtBuffer) {
          var reader = new FileReader();
          reader.onloadend = function() {
            var dataUrl = reader.result;
            try {
              // Save the new box art file to the storage
              var fileHandleWrite = tizen.filesystem.openFile(boxArtDir + '/' + boxArtFileName, 'w');
              fileHandleWrite.writeData(boxArtBuffer);
              fileHandleWrite.close();
              console.log('%c[utils.js, getBoxArt]', 'color: gray;', 'Returning network-fetched box art: ', appId);
              resolve(dataUrl);
            } catch (writeError) {
              console.error('%c[utils.js, getBoxArt]', 'color: gray;', 'Error: Unable to save or write box art to internal storage: ', writeError);
              reject(writeError);
            }
          };
          var blob = new Blob([boxArtBuffer], {
            type: 'image/png'
          });
          reader.readAsDataURL(blob);
        }.bind(this), function(error) {
          console.error('%c[utils.js, getBoxArt]', 'color: gray;', 'Error: Failed to retrieve box art from network: ', error);
          reject(error);
        }.bind(this));
      }
    }.bind(this));
  },

  clearBoxArt: function() {
    return new Promise(function(resolve, reject) {
      var boxArtDir = 'wgt-private/' + this.hostname; // Widget private storage directory is r/w (read/write)

      // Delete the cached box art directory from the storage
      try {
        tizen.filesystem.deleteDirectory(boxArtDir);
        console.log('%c[utils.js, clearBoxArt]', 'color: gray;', 'Clearing the box art files from ' + boxArtDir);
        resolve();
      } catch (error) {
        console.error('%c[utils.js, clearBoxArt]', 'color: gray;', 'Error: Failed to clear box art files: ', error);
        reject(error);
      }
    }.bind(this));
  },

  launchApp: function(appId, mode, sops, rikey, rikeyid, localAudio, surroundAudioInfo, gamepadMask) {
    return sendMessage('openUrl', [
      this._baseUrlHttps + '/launch?' + this._buildUidStr() + '&appid=' + appId + '&mode=' + mode +
      '&additionalStates=1&sops=' + sops + '&rikey=' + rikey + '&rikeyid=' + rikeyid + '&localAudioPlayMode=' + localAudio +
      '&surroundAudioInfo=' + surroundAudioInfo + '&remoteControllersBitmap=' + gamepadMask + '&gcmap=' + gamepadMask, this.ppkstr, false
    ]);
  },

  resumeApp: function(rikey, rikeyid, surroundAudioInfo) {
    return sendMessage('openUrl', [
      this._baseUrlHttps + '/resume?' + this._buildUidStr() + '&rikey=' + rikey +
      '&rikeyid=' + rikeyid + '&surroundAudioInfo=' + surroundAudioInfo, this.ppkstr, false
    ]);
  },

  quitApp: function() {
    // Refresh server info after quitting because it may silently fail if the session belongs to a different client
    return sendMessage('openUrl', [
      this._baseUrlHttps + '/cancel?' + this._buildUidStr(), this.ppkstr, false
    ]).then(this.refreshServerInfo());
    // TODO: We should probably bubble this up to our caller.
  },

  updateExternalAddressIP4: function() {
    console.log('%c[utils.js, updateExternalAddressIP4]', 'color: gray;', 'Looking for the external IPv4 address of ' + this.hostname + '...');
    return sendMessage('STUN').then(function(addr) {
      if (addr) {
        this.externalIP = addr;
        console.log('%c[utils.js, updateExternalAddressIP4]', 'color: gray;', 'External IPv4 address of ' + this.hostname + ' is ' + this.externalIP);
      } else {
        console.error('%c[utils.js, updateExternalAddressIP4]', 'color: gray;', 'Error: External IPv4 address lookup failed!');
      }
    }.bind(this))
  },

  pair: function(randomNumber) {
    return this.refreshServerInfo().then(function() {
      if (this.paired && this.ppkstr) {
        return true;
      }
      return sendMessage('pair', [
        this.serverMajorVersion.toString(), this.address, randomNumber
      ]).then(function(ppkstr) {
        this.ppkstr = ppkstr;
        return sendMessage('openUrl', [
          this._baseUrlHttps + '/pair?uniqueid=' + this.clientUid + '&devicename=roth&updateState=1&phrase=pairchallenge', this.ppkstr, false
        ]).then(function(ret) {
          $xml = this._parseXML(ret);
          this.paired = $xml.find('paired').html() == '1';
          return this.paired;
        }.bind(this));
      }.bind(this));
    }.bind(this));
  },

  sendWOL: function() {
    return sendMessage('wakeOnLan', [this.macAddress]);
  },

  _buildUidStr: function() {
    return 'uniqueid=' + this.clientUid + '&uuid=' + guuid();
  },

  _parseXML: function(xmlData) {
    return $($.parseXML(xmlData.toString()));
  },
};
