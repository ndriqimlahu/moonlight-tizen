// Safely wraps IPv6 addresses in brackets for URL construction.
// IPv4 addresses and DNS hostnames do not contain colons, so they are untouched.
function formatAddressForUrl(address) {
  if (address && address.indexOf(':') !== -1 && address.indexOf('[') === -1) {
    return '[' + address + ']';
  }
  return address;
}

/**
 * Checks if a MAC address is locally administered (likely randomized).
 * Per IEEE 802, the second-least-significant bit (U/L bit) of the first octet
 * indicates a locally administered address when set to 1.
 * This means the second hex character of the MAC is one of: 2, 6, A, E.
 */
function isRandomMacAddress(macAddress) {
  if (!macAddress || macAddress === '00:00:00:00:00:00') {
    console.error('%c[utils.js, refreshServerInfo]', 'color: gray;', 'Error: Invalid MAC address: empty or all zeros');
    return false;
  }
  var firstOctet = parseInt(macAddress.split(':')[0], 16);
  if (isNaN(firstOctet)) {
    console.error('%c[utils.js, refreshServerInfo]', 'color: gray;', 'Error: Invalid MAC address format: ' + macAddress);
    return false;
  }
  // Check the U/L bit (bit 1) — if set, address is locally administered
  return (firstOctet & 0x02) !== 0;
}

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

// This map tracks gamepad IDs for each browser slot to avoid false
// positives from placeholder gamepads that report as "connected"
// but have never sent any input (timestamp = 0).
var _realGamepads = new Map();

// Returns a bitmask representing the connected gamepads in the browser
function getConnectedGamepadMask() {
  var count = 0;
  var mask = 0;
  var gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

  // Iterate through all possible gamepad slots (0-15) to detect connected gamepads
  // Maximum number of controllers supported by the Moonlight protocol is 16
  for (var i = 0; i < 16; i++) {
    var gamepad = gamepads[i];

    // Ignore empty or disconnected gamepads and clear any previous tracking for that slot
    if (!gamepad || !gamepad.connected) {
      _realGamepads.delete(i);
      continue;
    }

    // Check if the gamepad slot is occupied
    if (gamepad) {
      // See matching logic in "[gamepad.cpp] PollGamepads()" – these must stay in sync!

      // If the gamepad ID changed, treat it as a new one in this slot
      if (_realGamepads.get(i) !== gamepad.id) {
        _realGamepads.delete(i);
      }

      // Remember any pad that has ever reported a non-zero timestamp
      if (gamepad.timestamp !== 0) {
        _realGamepads.set(i, gamepad.id);
      }

      // Tizen often returns "connected" placeholder gamepads whose timestamp stays
      // at zero. Ignore them until they become real gamepads that report input.
      if (gamepad.timestamp === 0 && !_realGamepads.has(i)) {
        continue;
      }

      // Use the physical browser index so the mask matches C++
      mask |= 1 << i;
      count++;
    }
  }

  console.log('%c[utils.js, getConnectedGamepadMask]', 'color: gray;', 'Detected: ' + count + ' ' + (count === 1 ? 'gamepad' : 'gamepads'));
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
  // Constructor start
  this.hostname = address;
  this.address = address;
  this.userEnteredAddress = userEnteredAddress; // if the user entered an address, we keep it on hand to try when polling
  this.localAddress = '';
  this.externalIP = '';
  this.macAddress = macAddress;
  this.httpsPort = 0;
  this.httpPort = 0;
  this.externalPort = 0;
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
  this.serverState = '';
  this.isNvidiaServerSoftware = false;
  this.gputype = '';
  this.supportedDisplayModes = {}; // key: y-resolution:x-resolution, value: array of supported frame rates
  this.autoWolEnabled = false; // Per-host Auto Wake-on-LAN setting

  _self = this;
  console.log('%c[utils.js, NvHTTP]', 'color: gray;', 'NvHTTP Object: \n' + this);
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
  getUid: function() {
    return this.isNvidiaServerSoftware ? '0123456789ABCDEF' : this.clientUid;
  },

  _openUrlWithTimeout: function(url, ppkstr) {
    // Pre-flight check using native JS fetch to prevent dead IPs (like unreachable external IPs 
    // or unresolvable .local addresses) from permanently freezing the single-threaded C++ WASM network stack.
    var abortCtrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timeoutId = setTimeout(function() {
      if (abortCtrl) abortCtrl.abort();
    }, 3000); // 3s max wait to see if the IP is a black hole

    // Use HTTP /serverinfo for the preflight to guarantee a 200 OK response and eliminate ALL console spam (like 404s).
    // We only rewrite the URL if it targets the Sunshine HTTPS port, preserving this function for generic use.
    var preflightUrl = url;
    var portIndex = url.indexOf(':' + this.httpsPort);
    if (portIndex !== -1) {
      // Extract the protocol and IP (e.g. 'https://192.168.1.5') and swap to HTTP
      var baseUrl = url.substring(0, portIndex).replace('https://', 'http://');
      preflightUrl = baseUrl + ':' + this.httpPort + '/serverinfo';
    }

    return fetch(preflightUrl, abortCtrl ? { signal: abortCtrl.signal } : {})
      .then(function(res) {
        clearTimeout(timeoutId);
        // The IP is alive and responded! Hand it over to C++
        return sendMessage('openUrl', [url, ppkstr, false, 5000]).catch(error => {
          throw error;
        });
      })
      .catch(function(e) {
        clearTimeout(timeoutId);
        // If the fetch was forcefully aborted by our timeout, it means the IP is a black hole (silent drop).
        // We MUST skip it, otherwise handing it to C++ will irrevocably freeze the WASM thread for 120 seconds!
        if (e && e.name === 'AbortError') {
          console.warn('%c[utils.js, _openUrlWithTimeout]', 'color: orange;', 'Skipping dead/hanging URL to prevent C++ WASM freeze: ' + url);
          return Promise.reject(-1); // Instantly fail (GS_FAILED), don't pass to C++!
        } else {
          // Any other error (e.g. Cert Error, Connection Refused, CORS) means the IP actively responded quickly.
          // C++ will also fail quickly without hanging (or succeed if mTLS), so it's safe to hand it over.
          return sendMessage('openUrl', [url, ppkstr, false, 5000]).catch(error => {
            throw error;
          });
        }
      });
  },

  // Refreshes the server info using the base URL. This is useful for testing whether we can successfully ping a host at the base URL
  refreshServerInfo: function() {
    return this.refreshServerInfoAtAddress(this.address);
  },

  // Refreshes the server info using a given address. This is useful for testing whether we can successfully ping a host at a given address
  refreshServerInfoAtAddress: function(givenAddress) {
    var urlAddr = formatAddressForUrl(givenAddress);
    // Unpaired hosts have no established certificate trust, so HTTP is allowed.
    if (this.ppkstr == null) { // No pinned cert
      // Use HTTP if we have no pinned cert
      return this._openUrlWithTimeout('http://' + urlAddr + ':' + this.httpPort + '/serverinfo?' + this._buildUidStr(), this.ppkstr).then(function(retHttp) {
        var parsed = this._parseServerInfo(retHttp);
        if (!parsed) { // If that fails
          return Promise.reject("Failed to parse server info from HTTP");
        }
        return parsed;
      }.bind(this));
    }
    // Paired hosts must use HTTPS with the pinned certificate. Do not fall back to unauthenticated HTTP for server metadata.
    return this._openUrlWithTimeout('https://' + urlAddr + ':' + this.httpsPort + '/serverinfo?' + this._buildUidStr(), this.ppkstr).then(function(ret) {
      var parsed = this._parseServerInfo(ret);
      if (!parsed) { // If that fails
        console.warn('%c[utils.js, refreshServerInfoAtAddress]', 'color: gray;', 'Warning: Failed to parse server info from HTTPS. Please verify the host is reachable and re-pair the host if necessary!');
        return Promise.reject("Failed to parse server info from HTTPS");
      }
      return parsed;
    }.bind(this), function(error) {
      if (error == -100) { // GS_CERT_MISMATCH
        // Do not fall back to HTTP after a certificate mismatch. The endpoint must be re-paired before unauthenticated server metadata can be accepted.
        console.error('%c[utils.js, refreshServerInfoAtAddress]', 'color: gray;', 'Error: Certificate mismatch. Please re-pair the host!', this);
      }
      return Promise.reject(error);
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

    // Check if a stream session is already in progress
    if (isInGame === true) {
      // Drain callbacks to avoid permanently blocking the deduplication guard
      var completion;
      while ((completion = this._pollCompletionCallbacks.pop())) {
        completion(this); // Executes the callback so the caller isn't left hanging
      }
      // Do not initiate any server polls while a streaming session is already in progress
      return;
    }

    this.selectServerAddress(function(successfulAddress) {
      // Successfully determined server address. Update base URL
      var urlAddr = formatAddressForUrl(successfulAddress);
      this.address = successfulAddress;
      this._baseUrlHttps = 'https://' + urlAddr + ':' + this.httpsPort;
      this._baseUrlHttp = 'http://' + urlAddr + ':' + this.httpPort;

      // Poll for updated mac address only on first successful server info poll
      if (this.paired && this._pollCount === 0) {
        updateMacAddress(this);
      }

      // Poll for the app list every 10 successful server info polls
      // Not including the first one to avoid PCs taking a while to show as online initially
      if (this.paired && this._pollCount++ % 10 === 1) {
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
      // Set host to offline and clear the app list cache
      if (++this._consecutivePollFailures >= 2) {
        this.online = false;
        this._memCachedApplist = null;
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
    // Build a deduplicated, validated list of candidate addresses to try in order.
    var seen = {};
    var candidates = [];

    var addCandidate = function(addr) {
      if (addr && !seen[addr]) { // skip empty strings AND duplicates
        // Skip localhost addresses (127.0.0.1, ::1, etc.) as they're not routable from the client
        if (addr === '127.0.0.1' || addr === '::1' || addr.startsWith('127.') || addr === 'localhost') {
          return;
        }
        seen[addr] = true;
        candidates.push(addr);
      }
    };

    addCandidate(this.address);
    // Only append '.local' if the hostname doesn't already end with it
    var localSuffix = this.hostname.endsWith('.local') ? this.hostname : this.hostname + '.local';
    addCandidate(localSuffix);
    addCandidate(this.localAddress);
    addCandidate(this.externalIP);
    addCandidate(this.userEnteredAddress);

    var tryNext = function(index) {
      if (index >= candidates.length) {
        console.error('%c[utils.js, selectServerAddress]', 'color: gray;', 'Error: Failed to contact the ' + this.hostname + '!', this);
        onFailure();
        return;
      }
      var addr = candidates[index];
      this.refreshServerInfoAtAddress(addr).then(function() {
        onSuccess(addr);
      }.bind(this), function() {
        tryNext.call(this, index + 1);
      }.bind(this));
    }.bind(this);

    tryNext(0);
  },

  toString: function() {
    var string = '';
    string += 'host name: ' + this.hostname + '\r\n';
    string += 'host address: ' + this.address + '\r\n';
    string += 'local address: ' + this.localAddress + '\r\n';
    string += 'external IP: ' + this.externalIP + '\r\n';
    string += 'mac address: ' + this.macAddress + '\r\n';
    string += 'https port: ' + this.httpsPort + '\r\n';
    string += 'http port: ' + this.httpPort + '\r\n';
    string += 'external port: ' + this.externalPort + '\r\n';
    string += 'client UID: ' + this.clientUid + '\r\n';
    string += 'server UID: ' + this.serverUid + '\r\n';
    string += 'is paired: ' + this.paired + '\r\n';
    string += 'is online: ' + this.online + '\r\n';
    string += 'number of apps: ' + this.numofapps + '\r\n';
    string += 'current game: ' + this.currentGame + '\r\n';
    string += 'app version: ' + this.appVersion + '\r\n';
    string += 'gfe version: ' + this.gfeVersion + '\r\n';
    string += 'server major version: ' + this.serverMajorVersion + '\r\n';
    string += 'server state: ' + this.serverState + '\r\n';
    string += 'nvidia server software: ' + this.isNvidiaServerSoftware + '\r\n';
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

    if (this.serverUid != $root.find('uniqueid').text().trim() && this.serverUid != '') {
      // If we received a UUID that isn't the one we expected, fail
      return false;
    }

    console.log('%c[utils.js, _parseServerInfo]', 'color: gray;', 'Parsing server info: ', $root);

    // Retrieve the hostname and handle name validation
    var serverName = $root.find('hostname').text().trim();
    if (serverName != '') {
      this.hostname = serverName;
    } else {
      this.hostname = 'UNKNOWN';
    }

    // UUID is mandatory to determine which machine is responding
    this.serverUid = $root.find('uniqueid').text().trim();

    // Retrieve the local IP address and MAC address of the host
    this.localAddress = $root.find('LocalIP').text().trim();

    // Retrieve the MAC address of the host (required for Wake-on-LAN)
    var macAddr = $root.find('mac').text().trim();
    if (macAddr) {
      this.macAddress = macAddr;
    }

    // This is an extension which is not present in GFE. It is present for Sunshine to be able
    // to support dynamic HTTP WAN ports without requiring the user to manually enter the port.
    this.externalPort = parseInt($root.find('ExternalPort').text().trim(), 10);
    this.httpsPort = parseInt($root.find('HttpsPort').text().trim(), 10);

    // This is not present in newer GFE versions
    var externIP = $root.find('ExternalIP').text().trim();
    if (externIP) {
      // Don't overwrite the external IP we found via STUN
      this.externalIP = externIP;
    }

    // These are present in all supported GFE versions
    this.paired = $root.find('PairStatus').text().trim() == 1;
    this.appVersion = $root.find('appversion').text().trim();
    this.serverMajorVersion = parseInt(this.appVersion.substring(0, 1), 10);

    // This wasn't present on old GFE versions
    this.serverCodecModeSupport = parseInt($root.find('ServerCodecModeSupport').text().trim(), 10);

    try {
      // These aren't critical for functionality, and don't necessarily exist in older GFE versions
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

    var serverStatus = $root.find('state').text().trim();
    if (serverStatus) {
      this.serverState = serverStatus;
      // Detect GFE by its historical "MJOLNIR" codename, which was never used by any third-party server
      this.isNvidiaServerSoftware = serverStatus.includes('MJOLNIR');
    }

    // GFE 2.8 started keeping current game set to the last game played. As a result, it no longer
    // has the semantics that its name would indicate. To contain the effects of this change as much
    // as possible, we'll force the current game to zero if the server isn't in a streaming session.
    if (serverStatus.endsWith('_SERVER_BUSY')) {
      this.currentGame = parseInt($root.find('currentgame').text().trim(), 10);
    } else {
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
      this._baseUrlHttps + '/applist?' + this._buildUidStr(), this.ppkstr, false, 10000
    ]).catch(error => {
      throw error;
    }).then(function(ret) {
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
          id: parseInt(appElements[i].getElementsByTagName('ID')[0].textContent.trim(), 10),
          title: appElements[i].getElementsByTagName('AppTitle')[0].textContent.trim(),
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

  // Returns the original PNG box art based on the the given app Id and generates an optimized JPEG preview when Smart Hub Preview is supported.
  // The original PNG box art is stored in private storage, while the optimized JPEG preview is generated and stored asynchronously,
  // in the public documents directory so that the Smart Hub Preview background service process can access it directly.
  getBoxArt: function(appId, isSmartHubSupported) {
    return new Promise(function(resolve, reject) {
      // Store the original PNG box art in the private directory
      var boxArtDir = 'wgt-private/' + this.hostname;
      var boxArtFileName = 'boxart-' + appId + '.png';

      var self = this;
      
      var fetchBoxArt = function() {
        // Fetch the new box art from the network
        sendMessage('openUrl', [
          self._baseUrlHttps + '/appasset?' + self._buildUidStr() + '&appid=' + appId + '&AssetType=2&AssetIdx=0', self.ppkstr, true
        ]).then(function(boxArtBuffer) {
          // Convert the binary response into a Blob so it can be converted to a data URL
          var blob = new Blob([boxArtBuffer], { type: 'image/png' });
          var reader = new FileReader();

          // Convert the fetched PNG into a data URL for display and caching
          reader.onloadend = function() {
            var dataUrl = reader.result;
            // Always resolve for UI display regardless of caching outcome
            console.log('%c[utils.js, getBoxArt]', 'color: gray;', 'Returning network-fetched box art: ', appId);

            // Save the original PNG to private storage as true binary PNG for local HTTP server and future cache using modern Tizen API
            try {
              // Create the private directory if it does not already exist
              tizen.filesystem.createDirectory(boxArtDir, true);
              // Open the destination file for writing the original PNG data
              var fileHandleWrite = tizen.filesystem.openFile(boxArtDir + '/' + boxArtFileName, 'w');

              // Write the original PNG bytes to private storage and close the file
              fileHandleWrite.writeData(boxArtBuffer);
              fileHandleWrite.close();
              console.log('%c[utils.js, getBoxArt]', 'color: gray;', 'Saved original PNG box art: ' + boxArtFileName);
            } catch (error) {
              // Failure to cache the original PNG box art does not prevent the fetched box art from being returned
              console.error('%c[utils.js, getBoxArt]', 'color: gray;', 'Error: Failed to cache original box art in ' + boxArtDir + ' for app ID ' + appId + ': ' + error.message);
            }

            // Return the fetched box art directly when Smart Hub Preview is not supported
            if (!isSmartHubSupported) {
              resolve(dataUrl);
              return;
            }

            // Generate and save the optimized JPEG preview box art asynchronously from network.
            // The original PNG box art can be returned immediately without waiting for preview generation.
            var previewPromise = self.generatePreviewImage(dataUrl, appId).then(function(previewDataUrl) {
              if (previewDataUrl) {
                self.savePreviewImage(appId, previewDataUrl);
              }
            }, function(error) {
              console.warn('%c[utils.js, getBoxArt]', 'color: gray;', 'Warning: Failed to generate Smart Hub Preview box art from network for app ID ' + appId + ': ' + error);
            });

            if (!window.previewPromises) {
              window.previewPromises = [];
            }
            window.previewPromises.push(previewPromise);

            resolve(dataUrl);
          };

          reader.readAsDataURL(blob);
        }, function(error) {
          console.error('%c[utils.js, getBoxArt]', 'color: gray;', 'Error: Failed to retrieve original box art from network: ', error);
          reject(error);
        });
      };

      // Try to load the cached original box art from private storage
      try {
        // Open the cached original PNG box art for reading
        var fileHandleRead = tizen.filesystem.openFile(boxArtDir + '/' + boxArtFileName, 'r');
        // Read the binary PNG data from the file (returns Blob)
        var fileContentInBlob = fileHandleRead.readBlob();
        // Close the file after the binary data has been read
        fileHandleRead.close();
        
        // Guard against empty/corrupt cached files
        if (!fileContentInBlob || fileContentInBlob.size === 0) {
          throw new Error('Cached original box art file is empty.');
        }

        var processBoxArt = function() {
          var reader = new FileReader();
          reader.onloadend = function() {
            var dataUrl = reader.result;
            console.log('%c[utils.js, getBoxArt]', 'color: gray;', 'Returning storage-cached box art: ', appId);

            // Return the cached original box art directly when Smart Hub Preview is not supported
            if (!isSmartHubSupported) {
              resolve(dataUrl);
              return;
            }

            // Check whether an optimized Smart Hub Preview has already been cached
            var previewFileName = 'preview-' + appId + '.jpg';
            var previewFilePath = 'documents/' + previewFileName;

            // Try to open the cached preview box art to determine whether it already exists
            try {
              // Open the cached preview file to check whether it already exists
              var previewFileHandle = tizen.filesystem.openFile(previewFilePath, 'r');
              previewFileHandle.close();

              console.log('%c[utils.js, getBoxArt]', 'color: gray;', 'Smart Hub Preview box art file already cached: ' + previewFileName);
              // The preview already exists, so no additional processing is required
              resolve(dataUrl);
              return;
            } catch (previewReadError) {
              // The preview box art file does not exist, so generate it from the original box art
              console.log('%c[utils.js, getBoxArt]', 'color: gray;', 'Smart Hub Preview box art file not found, generating: ' + previewFileName);
            }

            // Generate and save the optimized JPEG preview box art asynchronously from storage.
            // The original PNG box art can be returned immediately without waiting for preview generation.
            var previewPromise = self.generatePreviewImage(dataUrl, appId).then(function(previewDataUrl) {
              if (previewDataUrl) {
                self.savePreviewImage(appId, previewDataUrl);
              }
            }, function(error) {
              console.warn('%c[utils.js, getBoxArt]', 'color: gray;', 'Warning: Failed to generate Smart Hub Preview box art from storage for app ID ' + appId + ': ' + error);
            });

            if (!window.previewPromises) {
              window.previewPromises = [];
            }
            window.previewPromises.push(previewPromise);

            resolve(dataUrl);
          };
          
          // Ensure proper MIME type so the data URL is recognized as an image
          var typedBlob = new Blob([fileContentInBlob], { type: 'image/png' });
          reader.readAsDataURL(typedBlob);
        };

        // Sunshine's default box.png hash
        var sunshineDefaultBoxArtHash = 'd9164ebd069b5f735eb8efc557801778498da37f572ef70e3d35604739e6c613';
        
        if (window.crypto && window.crypto.subtle && window.crypto.subtle.digest) {
          var hashReader = new FileReader();
          hashReader.onloadend = function() {
            var buffer = hashReader.result;
            window.crypto.subtle.digest('SHA-256', buffer).then(function(hashBuffer) {
              var hashArray = Array.from(new Uint8Array(hashBuffer));
              var hashHex = hashArray.map(function(b) { 
                var hex = b.toString(16);
                return hex.length === 1 ? '0' + hex : hex;
              }).join('');
              
              if (hashHex === sunshineDefaultBoxArtHash) {
                console.log('%c[utils.js, getBoxArt]', 'color: gray;', 'Detected Sunshine default box art. Forcing redownload for app ID ' + appId);
                try {
                  tizen.filesystem.deleteFile(boxArtDir + '/' + boxArtFileName);
                } catch(error) {
                  console.error('%c[utils.js, getBoxArt]', 'color: gray;', 'Error: Failed to delete original box art file ' + boxArtFileName + ': ' + error.message);
                }
                var previewFileName = 'preview-' + appId + '.jpg';
                try {
                  tizen.filesystem.deleteFile('documents/' + previewFileName);
                } catch(error) {
                  console.warn('%c[utils.js, getBoxArt]', 'color: gray;', 'Warning: Failed to delete cached preview box art file ' + previewFileName + ': ' + error.message);
                }
                fetchBoxArt();
              } else {
                processBoxArt();
              }
            }).catch(function(err) {
              console.warn('%c[utils.js, getBoxArt]', 'color: gray;', 'Warning: Hash computation failed, proceeding with cached file', err);
              processBoxArt();
            });
          };
          hashReader.readAsArrayBuffer(fileContentInBlob);
        } else {
          // If crypto.subtle is not available, just process the cached file
          processBoxArt();
        }

      } catch (readError) {
        // The original PNG box art is not available locally, so fetch it from the host
        console.warn('%c[utils.js, getBoxArt]', 'color: gray;', 'Warning: Could not read cached box art from internal storage!', readError.message);
        fetchBoxArt();
      }
    }.bind(this));
  },

  // Clears cached box art and preview images from local storage.
  // Removes the private box art directory and preview files from the public documents directory.
  clearBoxArt: function() {
    return new Promise(function(resolve, reject) {
      var boxArtDir = 'wgt-private/' + this.hostname; // Private storage directory for original box art
      var previewBoxArtDir = 'documents'; // Public storage directory so the background service can read it

      // Delete the original box art directory from private storage
      try {
        tizen.filesystem.deleteDirectory(boxArtDir, true);
        console.log('%c[utils.js, clearBoxArt]', 'color: gray;', 'Cleared original box art files from ' + boxArtDir);
      } catch (error) {
        // The directory may not exist if no original box art has been cached
        console.error('%c[utils.js, clearBoxArt]', 'color: gray;', 'Error: Failed to clear original box art files from ' + boxArtDir + ': ' + error.message);
      }

      // Delete the preview box art images from public storage
      try {
        // List the contents of the public documents directory before removing cached preview files.
        // Tizen 5.0+ listDirectory() returns an array of DOMString filenames.
        tizen.filesystem.listDirectory(previewBoxArtDir, function(files) {
          var deleteCount = 0;

          // Check each entry for a cached preview box art image
          if (files && files.length > 0) {
            // Iterate through all files in the public documents directory
            for (var i = 0; i < files.length; i++) {
              // Safely check if the directory entry is a valid string
              if (files[i] && typeof files[i] === 'string') {
                var filename = files[i];
                // Check if the filename matches the patterns for cached preview box art images
                if ((filename.startsWith('boxart-') && filename.endsWith('.png')) || (filename.startsWith('preview-') && filename.endsWith('.jpg'))) {
                  try {
                    // Delete the matching cached preview box art files from public storage
                    tizen.filesystem.deleteFile(previewBoxArtDir + '/' + filename);
                    deleteCount++;
                  } catch(error) {
                    console.warn('%c[utils.js, clearBoxArt]', 'color: gray;', 'Warning: Failed to delete cached preview box art file ' + filename + ': ' + error.message);
                  }
                }
              }
            }
          }
          console.log('%c[utils.js, clearBoxArt]', 'color: gray;', 'Cleared ' + deleteCount + ' cached preview box art files from ' + previewBoxArtDir);
          resolve();
        }.bind(this), function(error) {
          console.warn('%c[utils.js, clearBoxArt]', 'color: gray;', 'Warning: Could not list documents directory to clear cached preview box art files: ' + error.message);
          resolve();
        });
      } catch (error) {
        console.error('%c[utils.js, clearBoxArt]', 'color: gray;', 'Error: Failed to clear cached preview box art files: ' + error.message);
        reject(error);
      }
    }.bind(this));
  },

  // Generates a JPEG preview image from the original box art.
  // The image is progressively compressed and resized until it fits within the
  // maximum file size allowed for Smart Hub Preview, while preserving a minimum
  // image size for small source images.
  generatePreviewImage: function(dataUrl, appId) {
    return new Promise(function(resolve) {
      var MAX_FILE_SIZE = 350 * 1024;
      var MIN_QUALITY = 0.25;
      var QUALITY_STEP = 0.05;
      var SCALE_STEP = 0.9;
      var MIN_SCALE_WIDTH = 100;
      var MIN_SCALE_HEIGHT = 100;

      // Create an image element to decode the original box art
      var image = new Image();

      // Process the decoded image once it has finished loading
      image.onload = function() {
        try {
          // Get the source image dimensions
          var width = image.naturalWidth || image.width;
          var height = image.naturalHeight || image.height;

          // Ensure the image has valid dimensions before processing
          if (!width || !height) {
            console.error('%c[utils.js, generatePreviewImage]', 'color: gray;', 'Invalid image dimensions for app ID ' + appId);
            resolve(null);
            return;
          }

          // Create a canvas used to resize and convert the box art to JPEG
          var canvas = document.createElement('canvas');
          var context = canvas.getContext('2d');

          if (!context) {
            console.error('%c[utils.js, generatePreviewImage]', 'color: gray;', 'Unable to create canvas context for app ID ' + appId);
            resolve(null);
            return;
          }

          // Try progressively smaller images until the file size limit is met
          while (true) {
            canvas.width = width;
            canvas.height = height;

            // Draw the source box art at the current dimensions
            context.drawImage(image, 0, 0, width, height);

            // Try reducing JPEG quality before reducing the image dimensions
            var quality = 0.85;

            // Try progressively lower quality levels until the file size limit is met
            while (quality >= MIN_QUALITY) {
              var jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
              var base64Data = jpegDataUrl.split(',')[1];
              var fileSize = Math.floor(base64Data.length * 3 / 4); // Base64 represents 3 bytes per 4 characters

              // Return the first image that meets the file size limit
              if (fileSize <= MAX_FILE_SIZE) {
                console.log('%c[utils.js, generatePreviewImage]', 'color: gray;', 'Created preview image for app ID ' + 
                appId + ': ' + Math.round(fileSize / 1024) + ' KB (' + width + 'x' + height + ', quality ' + quality.toFixed(2) + ')');
                resolve(jpegDataUrl);
                return;
              }

              // Lower the JPEG quality before attempting to reduce the image dimensions
              quality -= QUALITY_STEP;
            }

            // Stop shrinking once the minimum scaling dimensions have been reached.
            // The current dimensions have already been tested at all supported
            // quality levels before exiting.
            if (width <= MIN_SCALE_WIDTH || height <= MIN_SCALE_HEIGHT) {
              break;
            }

            // Quality reduction was not enough, so reduce the dimensions and try again
            width = Math.round(width * SCALE_STEP);
            height = Math.round(height * SCALE_STEP);
          }

          console.error('%c[utils.js, generatePreviewImage]', 'color: gray;', 'Error: Unable to create preview image within the size limit for app ID ' + appId);
          resolve(null);
        } catch (error) {
          console.error('%c[utils.js, generatePreviewImage]', 'color: gray;', 'Error: Failed to generate preview image for app ID ' + appId + ': ' + error.message);
          resolve(null);
        }
      };

      // Handle failures when the original box art cannot be decoded
      image.onerror = function() {
        console.error('%c[utils.js, generatePreviewImage]', 'color: gray;', 'Error: Failed to decode box art for app ID ' + appId);
        resolve(null);
      };

      // Start loading the original box art from the provided data URL
      image.src = dataUrl;
    });
  },

  // Saves the generated JPEG preview image to the public documents directory.
  // The data URL is converted to binary data before being written to local storage.
  savePreviewImage: function(appId, previewDataUrl) {
    try {
      // Build the filename and path used by the local HTTP server
      var filename = 'preview-' + appId + '.jpg';
      var filePath = 'documents/' + filename;

      // Extract the Base64 payload from the data URL and convert it to binary data
      var base64Payload = previewDataUrl.split(',')[1];
      var binaryStr = atob(base64Payload);
      var bytes = new Uint8Array(binaryStr.length);

      // Convert the binary string into a byte array for the Tizen file API
      for (var i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      // Open the preview file for writing
      var fileHandle = tizen.filesystem.openFile(filePath, 'w');

      try {
        // Write the JPEG data to local storage
        fileHandle.writeData(bytes);
      } finally {
        // Always close the file handle, even if writing fails
        fileHandle.close();
      }

      console.log('%c[utils.js, savePreviewImage]', 'color: gray;', 'Saved preview image: ' + filePath + ' (' + Math.round(bytes.length / 1024) + ' KB)');
      return true;
    } catch (error) {
      console.warn('%c[utils.js, savePreviewImage]', 'color: gray;', 'Warning: Failed to save preview image: ' + error.message);
      return false;
    }
  },

  launchApp: function(appId, mode, sops, rikey, rikeyid, enableHdr, localAudio, surroundAudioInfo, gamepadMask) {
    return sendMessage('openUrl', [
      this._baseUrlHttps + '/launch?' + this._buildUidStr() + '&appid=' + appId + '&mode=' + mode +
      '&additionalStates=1&sops=' + sops + '&rikey=' + rikey + '&rikeyid=' + rikeyid + '&hdrMode=' + enableHdr +
      '&localAudioPlayMode=' + localAudio + '&surroundAudioInfo=' + surroundAudioInfo +
      '&remoteControllersBitmap=' + gamepadMask + '&gcmap=' + gamepadMask, this.ppkstr, false
    ]);
  },

  resumeApp: function(mode, sops, rikey, rikeyid, enableHdr, localAudio, surroundAudioInfo, gamepadMask) {
    return sendMessage('openUrl', [
      this._baseUrlHttps + '/resume?' + this._buildUidStr() + '&mode=' + mode +
      '&additionalStates=1&sops=' + sops + '&rikey=' + rikey + '&rikeyid=' + rikeyid + '&hdrMode=' + enableHdr +
      '&localAudioPlayMode=' + localAudio + '&surroundAudioInfo=' + surroundAudioInfo +
      '&remoteControllersBitmap=' + gamepadMask + '&gcmap=' + gamepadMask, this.ppkstr, false
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
    return sendMessage('STUN', []).then(function(addr) {
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
        this.serverMajorVersion.toString(), this.address, this.httpPort, randomNumber, this.getUid()
      ]).then(function(ppkstr) {
        this.ppkstr = ppkstr;
        return sendMessage('openUrl', [
          this._baseUrlHttps + '/pair?uniqueid=' + this.getUid() + '&devicename=roth&updateState=1&phrase=pairchallenge', this.ppkstr, false, 5000
        ]).catch(function(error) {
          throw error;
        }.bind(this)).then(function(ret) {
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
    return 'uniqueid=' + this.getUid() + '&uuid=' + guuid();
  },

  _parseXML: function(xmlData) {
    return $($.parseXML(xmlData.toString()));
  },
};
