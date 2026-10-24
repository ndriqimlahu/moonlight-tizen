// Initialize global variables and constants
var appInfo = tizen.application.getAppInfo(); // Retrieve the application information
var platformVer = tizen.systeminfo.getCapability("http://tizen.org/feature/platform.version"); // Retrieve the device platform version
var modelSeries = webapis.productinfo.getModel(); // Retrieve the device model series
var modelName = webapis.productinfo.getRealModel(); // Retrieve the device model name
var modelGroup = webapis.productinfo.getModelCode(); // Retrieve the device model group
var is4kPanel = typeof webapis.productinfo.isUdPanelSupported === 'function' && webapis.productinfo.isUdPanelSupported(); // Check if the device supports 4K panel
var is8kPanel = typeof webapis.productinfo.is8KPanelSupported === 'function' && webapis.productinfo.is8KPanelSupported(); // Check if the device supports 8K panel

var maxSupportedWidth = 1920;
var maxSupportedHeight = 1080;
try {
  if (is8kPanel) {
    maxSupportedWidth = 7680;
    maxSupportedHeight = 4320;
  } else if (is4kPanel) {
    maxSupportedWidth = 3840;
    maxSupportedHeight = 2160;
  } else {
    // Check if the physical screen resolution happens to be 1440p
    if (window.screen.width >= 2560 || window.screen.height >= 1440) {
      maxSupportedWidth = 2560;
      maxSupportedHeight = 1440;
    }
  }
} catch (e) {
  console.error("Error fetching panel capabilities: " + e.message);
}
var isHdrCapable = webapis.avinfo.isHdrTvSupport(); // Check if the device supports HDR
var hosts = {}; // Hosts is an associative array of NvHTTP objects, keyed by server UID
var isHostOpening = false; // Prevents concurrent hostChosen executions, initial value is false
var isHostsLoaded = false; // Indicates if IndexedDB has finished loading hosts
var isSubnetScanFinished = false; // Indicates if the initial subnet scan has completed
var activePolls = {}; // Hosts currently being polled. An associated array of polling IDs, keyed by server UID
var pairingCert; // Loads the generated certificate
var myUniqueid;
var api; // The `api` should only be set if we're in a host-specific screen, on the initial screen it should always be null
var isInGame = false; // Flag indicating whether the game has started, initial value is false
var isDialogOpen = false; // Flag indicating whether the dialog is open, initial value is false
var isPairingInProgress = false; // Flag indicating whether a pairing process is in progress, initial value is false
var wasPairingCanceled = false; // Flag indicating whether the current pairing process was canceled by the user, initial value is false
var isGamepadActive = false; // Flag indicating whether the gamepad input is active, initial value is false
var isClickPrevented = false; // Flag indicating whether the click event should be prevented, initial value is false
var resFpsWarning = false; // Flag indicating whether the video resolution and frame rate warning message has shown, initial value is false
var bitrateWarning = false; // Flag indicating whether the video bitrate warning message has shown, initial value is false
var audioWarning = false; // Flag indicating whether the audio configuration warning message has shown, initial value is false
var codecWarning = false; // Flag indicating whether the video codec warning message has shown, initial value is false
var repeatAction = null; // Flag indicating whether the repeat action is set, initial value is null
var lastInvokeTime = 0; // Flag indicating the last invoke time, initial value is 0
var repeatTimeout = null; // Flag indicating whether the repeat timeout is set, initial value is null
var navigationTimeout = null; // Flag indicating whether the navigation timeout is set, initial value is null
const BUILD_TYPE = '__BUILD_TYPE__'; // Placeholder for build type, which should be replaced during the build process
const BUILD_COMMIT = '__BUILD_COMMIT__'; // Placeholder for build commit, which should be replaced during the build process
const REPO_OWNER = '__REPO_OWNER__'; // Placeholder for repository owner, which should be replaced during the build process
const REPO_NAME = '__REPO_NAME__'; // Placeholder for repository name, which should be replaced during the build process
var _smartHubLocalMessagePort = null; // Local message port for receiving messages from the Smart Hub service
var _smartHubMessagePortListener = null; // Listener ID for the Smart Hub local message port
var _previewApps = {}; // Per-host app cache for Smart Hub Preview: {serverUid: {hostname, address, apps: [{id, title, imageUri}]}}
var _isSmartHubSupported = false; // Flag indicating if Smart Hub Preview is supported on this device

const REPEAT_DELAY = 350; // Repeat delay set to 350ms (milliseconds)
const REPEAT_INTERVAL = 100; // Repeat interval set to 100ms (milliseconds)
const ACTION_THRESHOLD = 0.5; // Threshold for initial navigation set to 0.5
const NAVIGATION_DELAY = 150; // Navigation delay set to 150ms (milliseconds)
const UPDATE_TIMESTAMP = 'lastUpdateCheck'; // Use the update check timestamp key to determine the last update check
const UPDATE_VERSION = 'latestUpdateVersion'; // // Use the update version key to cache the latest version found
const UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // Automatic check for updates interval is set to 24 hours

// Called by the common.js module
function attachListeners() {
  changeUiModeForWasmLoad();

  // Register loadSystemInfo to run when language is initialized, and every time it changes
  if (window.i18n && typeof window.i18n.onRefresh === 'function') {
    window.i18n.onRefresh(loadSystemInfo);
  } else {
    // Fallback if i18n is not present
    loadSystemInfo();
  }

  const i18nInitPromise = (window.i18n && typeof window.i18n.init === 'function')
    ? window.i18n.init().catch((error) => {
      console.warn('%c[index.js, attachListeners]', 'color: green;', 'Warning: i18n initialization failed: ' + error);
    })
    : Promise.resolve();

  i18nInitPromise.finally(() => {
    if (window.i18n && typeof window.i18n.populateLanguageMenu === 'function') {
      window.i18n.populateLanguageMenu(saveLanguagePreference);
    }
  });

  initIpAddressFields();
  filterUnsupportedResolutions();

  $('#addHostContainer').on('click', addHostDialog);
  $('#settingsBtn').on('click', showSettings);
  $('#supportBtn').on('click', appSupportDialog);
  $('#goBackBtn').on('click', showHosts);
  $('#restoreDefaultsBtn').on('click', restoreDefaultsDialog);
  $('#quitRunningAppBtn').on('click', quitAppDialog);
  $('.videoResolutionMenu li:not(.unsupported-resolution)').on('click', saveResolution);
  $('.videoFramerateMenu li').on('click', saveFramerate);
  $('#bitrateSlider').on('input', saveBitrate);
  $('#framePacingSwitch').on('click', saveFramePacing);
  $('#ipAddressFieldModeSwitch').on('click', saveIpAddressFieldMode);
  $('#ipAddressTextInput').on('input', updateIpAddressInputValidationState);
  $('#sortAppsListSwitch').on('click', saveSortAppsList);
  $('#optimizeGamesSwitch').on('click', saveOptimizeGames);
  $('#removeAllHostsBtn').on('click', deleteAllHostsDialog);
  $('#rumbleFeedbackSwitch').on('click', saveRumbleFeedback);
  $('#mouseEmulationSwitch').on('click', saveMouseEmulation);
  $('#flipABfaceButtonsSwitch').on('click', saveFlipABfaceButtons);
  $('#flipXYfaceButtonsSwitch').on('click', saveFlipXYfaceButtons);
  $('.audioBackendMenu li').on('click', saveAudioBackend);
  $('.audioConfigMenu li').on('click', saveAudioConfiguration);
  $('#audioSyncSwitch').on('click', saveAudioSync);
  $('#jitterSlider').on('input', saveAudioJitter);
  $('#playHostAudioSwitch').on('click', savePlayHostAudio);
  $('#decryptHostAudioSwitch').on('click', saveDecryptHostAudio);
  $('.videoCodecMenu li').on('click', saveVideoCodec);
  $('#hdrModeSwitch').on('click', saveHdrMode);
  $('#fullRangeSwitch').on('click', saveFullRange);
  $('#gameModeSwitch').on('click', saveGameMode);
  $('#unlockAllFpsSwitch').on('click', saveUnlockAllFps);
  $('#optimizeBitrateSwitch').on('click', saveOptimizeBitrate);
  $('#disableWarningsSwitch').on('click', saveDisableWarnings);
  $('#performanceStatsSwitch').on('click', savePerformanceStats);
  $('#navigationGuideBtn').on('click', navigationGuideDialog);
  $('#checkUpdatesBtn').on('click', checkForAppUpdates);
  $('#restartAppBtn').on('click', restartAppDialog);

  const registerMenu = (elementId, view) => {
    $(`#${elementId}`).on('click', () => {
      if (view.isActive()) {
        Navigation.pop();
      } else {
        Navigation.push(view);
      }
    });
  }

  registerMenu('selectResolution', Views.SelectResolutionMenu);
  registerMenu('selectFramerate', Views.SelectFramerateMenu);
  registerMenu('selectBitrate', Views.SelectBitrateMenu);
  registerMenu('selectLanguage', Views.SelectLanguageMenu);
  registerMenu('selectAudioBackend', Views.SelectAudioBackendMenu);
  registerMenu('selectAudio', Views.SelectAudioMenu);
  registerMenu('selectAudioJitter', Views.SelectAudioJitterMenu);
  registerMenu('selectCodec', Views.SelectCodecMenu);

  $(window).resize(fullscreenWasmModule);

  Controller.startWatching();
  window.addEventListener('gamepadinputchanged', (e) => {
    isGamepadActive = true;
    const changes = e.detail.changes;
    // Iterate through each change in the gamepad input
    changes.forEach((change) => {
      const { type, index, pressed, value } = change;
      if (type === 'button') {
        // Handle button mapping
        const buttonMapping = {
          0: () => delayedNavigation(() => Navigation.accept()),
          1: () => delayedNavigation(() => Navigation.back()),
          8: () => delayedNavigation(() => Navigation.move()),
        };
        // Handle D-Pad mapping
        const dPadMapping = {
          12: () => Navigation.up(),
          13: () => Navigation.down(),
          14: () => Navigation.left(),
          15: () => Navigation.right(),
        };
        // Handle button press
        if (pressed) {
          if (buttonMapping[index]) {
            buttonMapping[index]();
            // Clear repeat action and timeout for non-navigation buttons
            repeatAction = null;
            clearTimeout(repeatTimeout);
          } else if (dPadMapping[index]) {
            dPadMapping[index]();
            // Set repeat action and timeout to the mapped D-Pad button
            repeatAction = dPadMapping[index];
            lastInvokeTime = Date.now();
            repeatTimeout = setTimeout(() => requestAnimationFrame(repeatActionHandler), REPEAT_DELAY);
          }
        } else {
          // Clear repeat action and timeout if button is released
          repeatAction = null;
          clearTimeout(repeatTimeout);
        }
      } else if (type === 'axis') {
        // Handle axis mapping
        const axisMapping = {
          0: (value) => value < -ACTION_THRESHOLD ? (delayedNavigation(() => Navigation.left()), () => Navigation.left()) : 
            value > ACTION_THRESHOLD ? (delayedNavigation(() => Navigation.right()), () => Navigation.right()) : null,
          1: (value) => value < -ACTION_THRESHOLD ? (delayedNavigation(() => Navigation.up()), () => Navigation.up()) : 
            value > ACTION_THRESHOLD ? (delayedNavigation(() => Navigation.down()), () => Navigation.down()) : null,
        };
        // Handle axis value
        if (axisMapping[index]) {
          const axisValue = axisMapping[index](value);
          if (axisValue && Math.abs(value) > ACTION_THRESHOLD) {
            // Set repeat action and timeout to the mapped axis
            repeatAction = axisValue;
            lastInvokeTime = Date.now();
            repeatTimeout = setTimeout(() => requestAnimationFrame(repeatActionHandler), REPEAT_DELAY);
          } else {
            // Clear repeat action and timeout if axis is released
            repeatAction = null;
            clearTimeout(repeatTimeout);
          }
        }
      }
    });
  });
}

function changeUiModeForWasmLoad() {
  $('#main-header').hide();
  $('#main-header').children().hide();
  $('#main-content').children().not('#listener, #wasmSpinner').hide();
  $('#wasmSpinner').css('display', 'inline-block');
  $('#wasmSpinnerLogo').show();
  $('#wasmSpinnerMessage').text(t('Loading Moonlight...'));
}

function moduleDidLoad() {
  loadHTTPCerts();
}

// Check if the application is running in a forced Game Mode variant based on Tizen AppMetaData
function checkForceGMVariant() {
  try {
    var metaData = tizen.application.getAppMetaData(appInfo.id);
    // Check if the AppMetaData contains the key-value pair indicating forced Game Mode
    if (metaData && metaData.some(m => m.key === 'http://samsung.com/tv/metadata/use.game.mode' && m.value === 'true')) {
      return true;
    }
  } catch (error) {
    console.warn('%c[index.js, checkForceGMVariant]', 'color: green;', 'Failed to probe AppMetaData for ForceGM check: ', error);
  }
  // Return false if the application is not running in a forced Game Mode variant
  return false;
}

// Formats the build version string based on the build type and commit information
function getBuildVersion(version) {
  // Append pre-release identifier and short commit SHA to the version number for development builds
  if (BUILD_TYPE === 'development' && BUILD_COMMIT) {
    return `${version} (pre-${BUILD_COMMIT})`;
  }
  // Return only the version number without any additional metadata for release builds
  return version;
}

// Handles repeated execution of the current action based on a specified interval
function repeatActionHandler() {
  // Check if repeat action is set and enough time has passed since the last invocation
  if (repeatAction && Date.now() - lastInvokeTime > REPEAT_INTERVAL) {
    repeatAction();
    // Update the last invocation time
    lastInvokeTime = Date.now();
  }
  // Check if repeat action is still set, then schedule the next execution frame
  if (repeatAction) {
    requestAnimationFrame(repeatActionHandler);
  }
}

// Delays navigation-related callback execution after a specified delay
function delayedNavigation(callback) {
  // Clear any existing navigation timeout
  clearTimeout(navigationTimeout);
  // Set a new navigation timeout with the provided callback and delay
  navigationTimeout = setTimeout(callback, NAVIGATION_DELAY);
}

// Updates the host status indicator based on the host's online and paired status
function updateHostStatusIndicator(host) {
  // Find the desired host cell using the server UUID
  var hostCell = document.querySelector('#host-' + host.serverUid);
  var indicator = document.querySelector('#host-status-' + host.serverUid);

  // Update the host cell inactive styling class
  if (hostCell) {
    // Check if the host is currently online
    if (host.online) {
      // If the host is online, show it as active
      hostCell.classList.remove('host-cell-inactive');
    } else {
      // If the host is offline, show it as inactive
      hostCell.classList.add('host-cell-inactive');
    }
  }

  // If the indicator element is not found, exit the function early
  if (!indicator) {
    return;
  }
  // Set the appropriate status indicator based on the host status
  if (host.online === undefined || host.online === null) {
    indicator.style.display = 'none';
  } else if (!host.online) {
    indicator.style.display = 'block';
    indicator.innerHTML = 'warning';
  } else if (host.online && !host.paired) {
    indicator.style.display = 'block';
    indicator.innerHTML = 'lock';
  } else {
    indicator.style.display = 'none';
    indicator.innerHTML = '';
  }
}

function beginBackgroundPollingOfHost(host) {
  // Clear any existing polling interval for this host before starting a new one.
  // Without this, every call to beginBackgroundPollingOfHost (e.g. on each navigation
  // back to the host view) would leak the old setInterval, causing multiple overlapping
  // poll loops that corrupt the _pollCompletionCallbacks deduplication guard and
  // prevent the host from ever recovering to the online state.
  endBackgroundPollingOfHost(host);
  // Ensure the key exists so the hasOwnProperty check in scheduleNextPoll passes
  activePolls[host.serverUid] = null;

  // Refresh server info before attempting to start background polling of the host
  return host.refreshServerInfo().then(function(ret) {
    console.log('%c[index.js, beginBackgroundPollingOfHost]', 'color: green;', 'Starting background polling of host ' + host.serverUid, host, '\n' + host.toString()); // Logging both object (for console) and toString-ed object (for text logs)
    
    // The fast-path ping succeeded! Mark the host online instantly to prevent the UI from
    // flashing offline in the .finally block, and to skip the redundant 0-delay poll.
    host.online = true;
  }).catch(function(failedRefreshInfo) {
    console.error('%c[index.js, beginBackgroundPollingOfHost]', 'color: green;', 'Error: Failed to refresh server info! Returned error was: ' + failedRefreshInfo + '! Failed server was: ' + '\n', host, '\n' + host.toString()); // Logging both object (for console) and toString-ed object (for text logs)

    // Set host to offline and clear the app list cache
    host.online = false;
    host._memCachedApplist = null;
  }).finally(function() {
    // Update the UI after the network finishes
    updateHostStatusIndicator(host);

    // Reset poll state so that recovery polls from the interval below start with
    // a clean slate. Without this, stale _pollCompletionCallbacks entries from
    // previous (leaked) intervals can block the deduplication guard and prevent
    // pollServer from ever starting a new poll.
    // Note: resetting _consecutivePollFailures to 0 here is always safe. If the
    // host was previously online, this counter was already 0 (it is reset to 0 on
    // every successful poll). Online *recovery* (host.online = true) is set
    // unconditionally in pollServer's success callback regardless of this counter;
    // the counter only gates the *offline* direction (host.online = false after
    // >= 2 consecutive failures inside pollServer), so resetting it here does not
    // interfere with future offline detection either.
    host._consecutivePollFailures = 0;
    host._pollCompletionCallbacks = [];

    var scheduleNextPoll = function(delay) {
      // Stop if the poll was canceled (ID removed from activePolls)
      if (!activePolls.hasOwnProperty(host.serverUid)) return;

      activePolls[host.serverUid] = window.setTimeout(function() {
        // In case it was canceled while waiting
        if (!activePolls.hasOwnProperty(host.serverUid)) return;

        host.pollServer(function(returnedHost) {
          // Update the UI after the network finishes
          updateHostStatusIndicator(returnedHost);

          // In case it was canceled while the network request was running
          if (!activePolls.hasOwnProperty(host.serverUid)) return;

          // Schedule the next poll for 5 seconds AFTER this one finished
          scheduleNextPoll(5000);
        });
      }, delay);
    };

    // Check if the host is currently online
    if (host.online) {
      // The host was already online, so start polling in the background now
      scheduleNextPoll(5000);
    } else {
      // The host was offline, so poll immediately to check the host's status
      scheduleNextPoll(0);
    }
  });
}

function startPollingHosts() {
  var pollPromises = [];
  for (var hostUID in hosts) {
    pollPromises.push(beginBackgroundPollingOfHost(hosts[hostUID]));
  }
  return Promise.all(pollPromises);
}

function endBackgroundPollingOfHost(host) {
  console.log('%c[index.js, endBackgroundPollingOfHost]', 'color: green;', 'Stopping background polling of host ' + host.serverUid, host, '\n' + host.toString()); // Logging both object (for console) and toString-ed object (for text logs)
  // Clear the host's polling interval and remove it from the activePolls object, also while the first
  // refresh is still running and the entry is null, otherwise the polling would start anyway when it finishes
  if (activePolls.hasOwnProperty(host.serverUid)) {
    window.clearTimeout(activePolls[host.serverUid]);
    delete activePolls[host.serverUid];
  }
}

function stopPollingHosts() {
  for (var hostUID in hosts) {
    endBackgroundPollingOfHost(hosts[hostUID]);
  }
}

function snackbarLog(...args) {
  const translatedMessage = t(...args);
  console.log('%c[index.js, snackbarLog]', 'color: green;', ...args);
  var data = {
    message: translatedMessage,
    timeout: 2500
  };
  document.querySelector('#snackbar').MaterialSnackbar.showSnackbar(data);
}

function snackbarLogLong(...args) {
  const translatedMessage = t(...args);
  console.log('%c[index.js, snackbarLogLong]', 'color: green;', ...args);
  var data = {
    message: translatedMessage,
    timeout: 5000
  };
  document.querySelector('#snackbar').MaterialSnackbar.showSnackbar(data);
}

// Handle layout elements when displaying the Hosts view
function showHostsMode() {
  console.log('%c[index.js, showHostsMode]', 'color: green;', 'Entering "Show Hosts" mode.');
  $('#header-title').html(t('Hosts'));
  $('#header-logo').show();
  $('#main-header').show();
  $('.nav-menu-parent').show();
  $('#updateAppBtn').show();
  $('#settingsBtn').show();
  $('#supportBtn').show();
  $('#main-content').children().not('#listener, #loadingSpinner, #wasmSpinner').show();
  $('#settings-list').hide();
  $('#game-grid').hide();
  $('#goBackBtn').hide();
  $('#restoreDefaultsBtn').hide();
  $('#quitRunningAppBtn').hide();
  $('#connection-warnings').css('display', 'none');
  $('#performance-stats').css('display', 'none');
  $('#main-content').removeClass('fullscreen');
  $('#listener').removeClass('fullscreen');

  Navigation.start();
  Navigation.pop();
  // Stop any existing polls before starting new ones to prevent setInterval leaks.
  // Without this, navigating back to the host view multiple times accumulates
  // duplicate polling intervals for each host, which causes race conditions in
  // _pollCompletionCallbacks and prevents the host from recovering to online.
  stopPollingHosts();
  startPollingHosts();
}

// Show the Hosts grid
function showHosts() {
  // Stop navigation before showing the loading screen
  Navigation.stop();

  // Hide the main header and content before showing a loading screen
  $('#main-header').children().hide();
  $('#main-header').css({'backgroundColor': 'transparent', 'boxShadow': 'none'});
  $('#settings-list, #game-grid').hide();

  // Show a spinner while the host list loads
  $('#wasmSpinner').css('display', 'inline-block');
  $('#wasmSpinnerLogo').hide();
  $('#wasmSpinnerMessage').text(t('Loading Hosts...'));

  setTimeout(() => {
    // Hide the spinner after successfully retrieving the host list
    $('#wasmSpinner').hide();

    // Show the main header after the loading screen is complete
    $('#main-header').children().show();
    $('#main-header').css({'backgroundColor': '#333846', 'boxShadow': '0 0 4px 0 rgba(0, 0, 0, 1)'});

    // Navigate to the Hosts view
    showHostsMode();
  }, 500);

  setTimeout(() => {
    var lastOpenedHost = localStorage.getItem('lastOpenedHost');
    if (lastOpenedHost && window.Views && Views.Hosts && Views.Hosts.view) {
      var children = Views.Hosts.view.func();
      for (var i = 0; i < children.length; i++) {
        if (children[i].id === 'host-' + lastOpenedHost) {
          Views.Hosts.view.index = i;
          break;
        }
      }
    }
    Navigation.switch();
  }, 500);
}

function restoreUiAfterWasmLoad() {
  // Stop navigation before showing the loading screen
  Navigation.stop();

  $('#main-header').children().not('#goBackBtn, #restoreDefaultsBtn, #quitRunningAppBtn').show();
  $('#main-content').children().not('#listener, #wasmSpinner, #settings-list, #game-grid').show();
  $('#wasmSpinner').hide();
  $('#loadingSpinner').css('display', 'none');

  // Navigate to the Hosts view
  Navigation.push(Views.Hosts);
  showHostsMode();
  // Set focus to current item and/or scroll to the current host row
  setTimeout(() => Navigation.switch(), 100);

  // Find mDNS host discovered using ServiceFinder (network service discovery)
  // findNvService(function(finder, opt_error) {
  //   if (finder.byService_['_nvstream._tcp']) {
  //     var ips = Object.keys(finder.byService_['_nvstream._tcp']);
  //     for (var i in ips) {
  //       var ip = ips[i];
  //       if (finder.byService_['_nvstream._tcp'][ip]) {
  //         var mDnsDiscoveredHost = new NvHTTP(ip, myUniqueid);
  //         mDnsDiscoveredHost.pollServer(function(returnedDiscoveredHost) {
  //           // Just drop this if the host doesn't respond
  //           if (!returnedDiscoveredHost.online) {
  //             return;
  //           }
  //           if (hosts[returnedDiscoveredHost.serverUid] != null) {
  //             // If we're seeing a host we've already seen before, update it for the current local IP
  //             hosts[returnedDiscoveredHost.serverUid].address = returnedDiscoveredHost.address;
  //             hosts[returnedDiscoveredHost.serverUid].updateExternalAddressIP4();
  //           } else {
  //             // Host must be in the grid before starting background polling
  //             addHostToGrid(returnedDiscoveredHost, true);
  //             beginBackgroundPollingOfHost(returnedDiscoveredHost);
  //           }
  //           saveHosts();
  //         });
  //       }
  //     }
  //   }
  // });


  // Automatically check for a new update after 10 seconds delay at application startup once every 24 hours
  setTimeout(() => checkForAppUpdatesAtStartup(), 10000);
}

// Handles the selection of a host, manages the connection, pairing process, including error handling
function hostChosen(host, onSuccessCallback) {
  // Check if a host is already being opened to prevent concurrent executions
  if (isHostOpening) {
    return;
  }

  // Set the flag to indicate that a host is currently being opened
  isHostOpening = true;

  // Check if a pairing request is already in progress to prevent multiple pairing attempts
  if (isPairingInProgress) {
    // Set the flag to indicate that a host is unable to be opened due to an ongoing pairing request
    isHostOpening = false;
    snackbarLogLong('A pairing request is currently in progress. Please wait for it to timeout or finish before trying again.');
    return;
  }
  localStorage.setItem('lastOpenedHost', host.serverUid);

  // If the host is already offline or fails to connect, notify the user.
  if (!host.online) {
    // Set the flag to indicate that a host is unable to be opened due to being offline or failing to connect
    isHostOpening = false;
    // Only show the Wake PC dialog if the user has explicitly enabled per-host Auto WOL toggle
    if (host.autoWolEnabled === true) {
      autoWolDialog(host, function() {
        // Success callback: The host is now online.
        if (onSuccessCallback) {
          onSuccessCallback();
        } else {
          // Re-call hostChosen(host) to proceed normally.
          hostChosen(host);
        }
      });
    } else {
      // Let the user know what to do to bring the host back online and until then, we'll be back to the previous view.
      console.error('%c[index.js, hostChosen]', 'color: green;', 'Error: Connection to host failed or host is offline!');
      snackbarLogLong('Failed to connect to %1$s. Ensure Sunshine is running on your host PC or GameStream is enabled in GeForce Experience SHIELD settings.', 'the host');
    }
    return;
  }

  // Avoid delay from other polling during pairing
  stopPollingHosts();

  api = host;
  // If the host is not yet paired or has been removed from the server, go to the pairing flow.
  if (!host.paired) {
    // Continue with the pairing flow
    pairingDialog(host, function() {
      // After pairing the host, save the host object, show the apps, and navigate to the Apps view
      saveHosts();
      Navigation.push(Views.Apps);
      showApps(host).then(() => {
        // Scroll to the current game row
        Navigation.switch();
        // Switch to Apps view
        Navigation.change(Views.Apps);
      }).catch(console.error).finally(() => {
        // Reset the flag to indicate that a host failed to show apps list
        isHostOpening = false;
      });
    }, function() {
      // Reset the flag to indicate that a host failed due to unsuccessful pairing
      isHostOpening = false;
      // Resume background polling after the pairing flow
      startPollingHosts();
    });
  } else {
    // But if the host is already paired and online, then we show the apps and navigate to the Apps view as usual.
    Navigation.push(Views.Apps);
    showApps(host).then(() => {
      // Scroll to the current game row
      Navigation.switch();
      // Switch to Apps view
      Navigation.change(Views.Apps);
    }).catch(console.error).finally(() => {
      // Reset the flag to indicate that a host failed to show apps list
      isHostOpening = false;
    });
  }
}

// Handles the change of input mode based on the state of the IP address field mode switch
function handleIpAddressFieldMode() {
  // Finds the existing switch, input field, and select fields elements
  const ipAddressFieldModeSwitch = document.getElementById('ipAddressFieldModeSwitch');
  const ipAddressInputField = document.getElementById('ipAddressInputField');
  const ipAddressSelectFields = document.getElementById('ipAddressSelectFields');
  const ipAddressInput = document.getElementById('ipAddressTextInput');
  const textField = ipAddressInput ? ipAddressInput.closest('.mdl-textfield') : null;

  // Checks if the IP address field mode switch is checked
  if (ipAddressFieldModeSwitch.checked) {
    // Hides the input field and shows the select field
    ipAddressInputField.style.display = 'none';
    ipAddressSelectFields.style.display = 'block';
    if (ipAddressInput && textField) {
      ipAddressInput.setCustomValidity('');
      textField.classList.remove('is-invalid');
    }
  } else {
    // Shows the input field and hides the select field
    ipAddressInputField.style.display = 'block';
    ipAddressSelectFields.style.display = 'none';
    updateIpAddressInputValidationState();
  }
}

// Populates the select IP address fields with options from a specified range
function populateSelectFields(element, start, end, selectedValue) {
  // Iterate through the range from start to end
  for (let i = start; i <= end; i++) {
    // Create a new option element
    const option = document.createElement('option');
    // Set the value and text of the option to the current iteration value
    option.value = i;
    option.text = i;
    // Checks if the current iteration value matches the selected value
    if (i === selectedValue) {
      // Mark the option as selected
      option.selected = true;
    }
    // Append the created option to the select element
    element.appendChild(option);
  }
}

// Initialize the IP address select fields with predefined values
function initIpAddressFields() {
  // Find the existing select fields elements and set the values
  const ipAddressFields = [
    { element: 'ipAddressField1', selectedValue: 192 },
    { element: 'ipAddressField2', selectedValue: 168 },
    { element: 'ipAddressField3', selectedValue: 0 },
    { element: 'ipAddressField4', selectedValue: 0 },
  ];

  // Populate each IP address field with the selected values
  ipAddressFields.forEach(ipAddressField => {
    const element = document.getElementById(ipAddressField.element);
    populateSelectFields(element, 0, 255, ipAddressField.selectedValue);
  });
}

function filterUnsupportedResolutions() {
  $('.videoResolutionMenu li').each(function() {
    var resData = $(this).data('value');
    if (resData) {
      var resWidth = parseInt(resData.split(':')[0], 10);
      if (resWidth > maxSupportedWidth) {
        $(this).addClass('mdl-menu__item--full-bleed-divider unsupported-resolution');
        $(this).attr('disabled', 'disabled');
        $(this).text($(this).text() + ' [Unsupported]');
      }
    }
  });
}

function isValidPort(port) {
  return Number.isInteger(port) && port > 0 && port <= 65535;
}

function isValidHostAddress(address) {
  if (!address) {
    return false;
  }

  // IPv4 regex
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // IPv6 regex
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
  
  // Hostname regex (FQDN or short hostname)
  const hostnameRegex = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/;

  return ipv4Regex.test(address) || ipv6Regex.test(address) || hostnameRegex.test(address);
}

function isPotentialAddressWithOptionalPort(rawInput) {
  const input = (rawInput || '').trim();
  if (!input) {
    return true;
  }

  // Relaxed validation while typing: allow alphanumeric, dots, hyphens, colons, and brackets
  return /^[a-zA-Z0-9.:\[\]\-]*$/.test(input);
}

function updateIpAddressInputValidationState() {
  const ipAddressInput = document.getElementById('ipAddressTextInput');
  const textField = ipAddressInput ? ipAddressInput.closest('.mdl-textfield') : null;
  const usingSelectFields = $('#ipAddressFieldModeSwitch').prop('checked');

  if (!ipAddressInput || !textField || usingSelectFields) {
    return;
  }

  const inputValue = ipAddressInput.value;
  const isPotentialValue = isPotentialAddressWithOptionalPort(inputValue);

  if (!inputValue.trim()) {
    ipAddressInput.setCustomValidity('');
    textField.classList.remove('is-invalid');
    return;
  }

  if (isPotentialValue) {
    ipAddressInput.setCustomValidity('');
    textField.classList.remove('is-invalid');
  } else {
    ipAddressInput.setCustomValidity('invalid-host');
    textField.classList.add('is-invalid');
  }
}

function parseHostAndPortInput(rawInput) {
  const input = (rawInput || '').trim();

  if (!input) {
    return { valid: false, error: t('Please enter a valid host address!') };
  }

  let hostPart = input;
  let portPart = '';

  // Check for IPv6 with port like [fe80::1]:47989
  const ipv6PortMatch = input.match(/^\[(.*)\]:(\d+)$/);
  // Check for IPv6 surrounded by brackets without port like [fe80::1]
  const ipv6BracketMatch = input.match(/^\[(.*)\]$/);
  
  if (ipv6PortMatch) {
    hostPart = ipv6PortMatch[1];
    portPart = ipv6PortMatch[2];
  } else if (ipv6BracketMatch) {
    hostPart = ipv6BracketMatch[1];
  } else {
    // Check if it has a port but is not an IPv6 address
    const firstColon = input.indexOf(':');
    const lastColon = input.lastIndexOf(':');
    
    if (firstColon > 0 && firstColon === lastColon) {
      hostPart = input.substring(0, firstColon).trim();
      portPart = input.substring(firstColon + 1).trim();
    } else {
      hostPart = input;
    }
  }

  if (!hostPart) {
    return { valid: false, error: t('Please enter a valid host address!') };
  }

  if (!isValidHostAddress(hostPart)) {
    return { valid: false, error: t('Please enter a valid host address!') };
  }

  if (portPart) {
    if (!/^\d{1,5}$/.test(portPart)) {
      return { valid: false, error: t('Port must be a numeric value between 1 and 65535!') };
    }

    const parsedPort = parseInt(portPart, 10);
    if (!isValidPort(parsedPort)) {
      return { valid: false, error: t('Please enter a valid port number between 1 and 65535!') };
    }

    return { valid: true, addr: hostPart, port: parsedPort };
  }

  return { valid: true, addr: hostPart, port: 47989 };
}

// If the `Add Host +` is selected on the host grid, then show the 
// Add Host dialog to enter the connection details for the host PC
function addHostDialog() {
  if (typeof window.abortSubnetScan === 'function') window.abortSubnetScan();
  // Find the existing overlay and dialog elements
  var addHostOverlay = document.querySelector('#addHostDialogOverlay');
  var addHostDialog = document.querySelector('#addHostDialog');
  
  // Show the dialog and push the view
  addHostOverlay.style.display = 'flex';
  addHostDialog.showModal();
  isDialogOpen = true;
  Navigation.push(Views.AddHostDialog);
  updateIpAddressInputValidationState();
  // Remove focus from any current active element
  document.activeElement.blur();

  // Cancel the operation if the Cancel button is pressed
  $('#cancelAddHost').off('click');
  $('#cancelAddHost').on('click', function() {
    console.log('%c[index.js, addHostDialog]', 'color: green;', 'Closing app dialog and returning.');
    addHostOverlay.style.display = 'none';
    addHostDialog.close();
    isDialogOpen = false;
    Navigation.pop();
    // Re-enable the Continue button after canceling the operation
    $('#continueAddHost').removeClass('mdl-button--disabled').prop('disabled', false);
    // Clear the input field after canceling the operation
    $('#ipAddressTextInput').val('');
    updateIpAddressInputValidationState();
    initIpAddressFields();
  });

  // Send a connection request if the Continue button is pressed
  $('#continueAddHost').off('click');
  $('#continueAddHost').on('click', function() {
    console.log('%c[index.js, addHostDialog]', 'color: green;', 'Adding host, closing app dialog, and returning.');
    // Get the IP address value from the input field or select fields
    var inputHost;
    if ($('#ipAddressFieldModeSwitch').prop('checked')) {
      var ipAddressField1 = $('#ipAddressField1').val();
      var ipAddressField2 = $('#ipAddressField2').val();
      var ipAddressField3 = $('#ipAddressField3').val();
      var ipAddressField4 = $('#ipAddressField4').val();
      inputHost = ipAddressField1 + '.' + ipAddressField2 + '.' + ipAddressField3 + '.' + ipAddressField4;
    } else {
      inputHost = $('#ipAddressTextInput').val();
    }
    // Get the IP address and port from the input and validate them
    var parsedHostInput;
    if ($('#ipAddressFieldModeSwitch').prop('checked')) {
      // Select fields only provide IP octets, so always use default HTTP port
      parsedHostInput = { valid: true, addr: inputHost, port: 47989 };
    } else {
      parsedHostInput = parseHostAndPortInput(inputHost);
    }
    // If the input is invalid, show an error message and return early
    if (!parsedHostInput.valid) {
      snackbarLog(parsedHostInput.error);
      return;
    }
    // Disable the Continue button to prevent multiple connection requests
    setTimeout(() => {
      // Add disabled state after 2 seconds
      $('#continueAddHost').addClass('mdl-button--disabled').prop('disabled', true);
      Navigation.switch();
      // Re-enable the Continue button after 12 seconds
      setTimeout(() => {
        $('#continueAddHost').removeClass('mdl-button--disabled').prop('disabled', false);
        Navigation.switch();
      }, 12000);
    }, 2000);
    // Send a connection request to the Host object based on the given IP address
    var _nvhttpHost = new NvHTTP(parsedHostInput.addr, myUniqueid, parsedHostInput.addr);
    _nvhttpHost.httpPort = parsedHostInput.port;
    console.log('%c[index.js, addHostDialog]', 'color: green;', 'Sending connection request to host address ' + _nvhttpHost.hostname);
    _nvhttpHost.refreshServerInfoAtAddress(parsedHostInput.addr).then(function(success) {
      snackbarLog('Connecting to %1$s...', _nvhttpHost.hostname);
      // Close the dialog if the user has provided the IP address
      console.log('%c[index.js, addHostDialog]', 'color: green;', 'Closing app dialog and returning.');
      addHostOverlay.style.display = 'none';
      addHostDialog.close();
      isDialogOpen = false;
      Navigation.pop();
      // Avoid delay from other polling during pairing
      stopPollingHosts();
      // Check if we already have record of this host. If so, we'll
      // need the PPK string to ensure our pairing status is accurate.
      if (hosts[_nvhttpHost.serverUid] != null) {
        // Update the addresses
        hosts[_nvhttpHost.serverUid].address = _nvhttpHost.address;
        hosts[_nvhttpHost.serverUid].userEnteredAddress = _nvhttpHost.userEnteredAddress;
        hosts[_nvhttpHost.serverUid].httpPort = _nvhttpHost.httpPort;
        // Use the host in the array directly to ensure the PPK propagates after pairing
        pairingDialog(hosts[_nvhttpHost.serverUid], function() {
          saveHosts();
          startPollingHosts();
        }, function() {
          // Resume background polling after the pairing flow
          startPollingHosts();
        });
      } else {
        pairingDialog(_nvhttpHost, function() {
          // Add the host to the grid after successful pairing
          addHostToGrid(_nvhttpHost);
          saveHosts();
          startPollingHosts();
        }, function() {
          // Resume background polling after the pairing flow
          startPollingHosts();
        });
      }
      // Re-enable the Continue button after successful processing
      $('#continueAddHost').removeClass('mdl-button--disabled').prop('disabled', false);
      // Clear the input field after successful processing
      $('#ipAddressTextInput').val('');
      updateIpAddressInputValidationState();
      initIpAddressFields();
    }.bind(this), function(failure) {
      console.error('%c[index.js, addHostDialog]', 'color: green;', 'Error: Failed API object:\n', _nvhttpHost, '\n' + _nvhttpHost.toString()); // Logging both object (for console) and toString-ed object (for text logs)
      snackbarLogLong('Failed to connect to %1$s. Ensure Sunshine is running on your host PC or GameStream is enabled in GeForce Experience SHIELD settings.', _nvhttpHost.hostname || t('the host'));
      // Re-enable the Continue button after failure processing
      $('#continueAddHost').removeClass('mdl-button--disabled').prop('disabled', false);
      // Clear the input field after failure processing
      $('#ipAddressTextInput').val('');
      updateIpAddressInputValidationState();
      initIpAddressFields();
    }.bind(this));
  });
}

// Show the Pairing dialog before pairing with the given NvHTTP host object. Returns whether the pairing was successful or failed.
function pairingDialog(nvhttpHost, onSuccess, onFailure) {
  if (typeof window.abortSubnetScan === 'function') window.abortSubnetScan();
  if (!onFailure) {
    onFailure = function() {}
  }

  if (!pairingCert) {
    console.warn('%c[index.js, pairingDialog]', 'color: green;', 'Warning: Pairing certificate is not generated yet. Please ensure Wasm is initialized properly!');
    snackbarLogLong('Something went wrong with the pairing certificate. Please try pairing with the host PC again.');
    onFailure();
    return;
  }

  nvhttpHost.pollServer(function(returnedNvHTTPHost) {
    if (!returnedNvHTTPHost.online) {
      console.error('%c[index.js, pairingDialog]', 'color: green;', 'Error: Failed to connect to ' + nvhttpHost.hostname + '. Ensure your host PC is online!', nvhttpHost, '\n' + nvhttpHost.toString()); // Logging both object (for console) and toString-ed object (for text logs)
      snackbarLogLong('Failed to connect to %1$s. Ensure Sunshine is running on your host PC or GameStream is enabled in GeForce Experience SHIELD settings.', nvhttpHost.hostname || t('the host'));
      onFailure();
      return;
    }

    if (nvhttpHost.paired) {
      onSuccess();
      return;
    }

    if (nvhttpHost.currentGame != 0) {
      snackbarLogLong('%1$s is currently in a game session. Please quit the running app or restart the computer, then try again.', nvhttpHost.hostname);
      onFailure();
      return;
    }

    // Find the existing overlay and dialog elements
    var pairingOverlay = document.querySelector('#pairingDialogOverlay');
    var pairingDialog = document.querySelector('#pairingDialog');
    var randomNumber = String('0000' + (Math.random() * 10000 | 0)).slice(-4);

    // Rollback to 'Cancel' button text when opening
    $('#cancelPairing').text('Cancel');

    // Change the dialog text element to include the random PIN number
    $('#pairingDialogText').html(
      t('Please enter the following PIN on the target PC: %1$s<br><br>', randomNumber) + 
      t('If your host PC is running Sunshine (all GPUs), navigate to the Sunshine Web UI to enter the PIN.<br><br>') + 
      t('Alternatively, if your host PC has NVIDIA GameStream (NVIDIA-only), navigate to the GeForce Experience to enter the PIN.<br><br>') + 
      t('This dialog will close once the pairing is complete.')
    );

    // Show the dialog and push the view
    pairingOverlay.style.display = 'flex';
    pairingDialog.showModal();
    isDialogOpen = true;
    Navigation.push(Views.PairingDialog);

    isPairingInProgress = true;
    wasPairingCanceled = false;

    // Cancel the operation if the Cancel button is pressed
    $('#cancelPairing').off('click');
    $('#cancelPairing').on('click', function() {
      console.log('%c[index.js, pairingDialog]', 'color: green;', 'Closing app dialog and returning.');
      sendMessage('cancelRequest', []);
      wasPairingCanceled = true;
      pairingOverlay.style.display = 'none';
      pairingDialog.close();
      isDialogOpen = false;
      Navigation.pop();
    });

    console.log('%c[index.js, pairingDialog]', 'color: green;', 'Sending pairing request to ' + nvhttpHost.hostname + ' with PIN ' + randomNumber);
    nvhttpHost.pair(randomNumber).then(function() {
      isPairingInProgress = false;
      snackbarLog('Successfully paired with %1$s', nvhttpHost.hostname);
      // Close the dialog if the pairing was successful
      console.log('%c[index.js, pairingDialog]', 'color: green;', 'Closing app dialog and returning.');
      pairingOverlay.style.display = 'none';
      pairingDialog.close();
      isDialogOpen = false;
      Navigation.pop();
      onSuccess();
    }, function(failedPairing) {
      isPairingInProgress = false;
      if (wasPairingCanceled) {
        console.log('%c[index.js, pairingDialog]', 'color: green;', 'Ignored pairing failure due to cancellation.');
        // Still let the caller recover, so the host can be selected again and the hosts are polled again
        onFailure();
        return;
      }
      console.error('%c[index.js, pairingDialog]', 'color: green;', 'Error: Failed API object:\n', nvhttpHost, '\n' + nvhttpHost.toString()); // Logging both object (for console) and toString-ed object (for text logs)
      snackbarLog('Failed to pair with %1$s', nvhttpHost.hostname);
      // Keep the modal opened, but change the button for "Close"
      $('#cancelPairing').text('Close');

      // If the host is already in a streaming session or failed during pairing,
      // change the dialog text element to include the hostname and display the returned error message
      if (nvhttpHost.currentGame != 0) {
        $('#pairingDialogText').html(t('Error: %1$s is currently busy!<br><br>You must stop the running app in order to pair with the host.', escapeHTML(nvhttpHost.hostname)));
      } else {
        $('#pairingDialogText').html(t('Error: Failed to pair with %1$s.<br><br>Please, try pairing with the host again.', escapeHTML(nvhttpHost.hostname)));
      }
      onFailure();
    });
  });
}

function autoWolDialog(host, onSuccess, onCancel) {
  var autoWolOverlay = document.querySelector('#autoWolDialogOverlay');
  var autoWolDialog = document.querySelector('#autoWolDialog');

  // Reset the button text to their default state
  $('#cancelAutoWol').html(t('Cancel'));
  Views.AutoWolDialog.view.reset();

  // Set the checkbox state based on the host's autoWolEnabled property
  if (host.autoWolEnabled === true) {
    document.querySelector('#autoWolCheckboxBtn').MaterialSwitch.on();
  } else {
    document.querySelector('#autoWolCheckboxBtn').MaterialSwitch.off();
  }

  // Attach onchange event listener to the Auto WOL checkbox
  $('#autoWolCheckboxSwitch').off('change');
  $('#autoWolCheckboxSwitch').on('change', function() {
    host.autoWolEnabled = $(this).prop('checked');
    console.log('%c[index.js, autoWolDialog]', 'color: green;', 'Host autoWolEnabled set to: ' + host.autoWolEnabled);
    saveHosts();
  });

  autoWolOverlay.style.display = 'flex';
  autoWolDialog.showModal();
  isDialogOpen = true;
  Navigation.push(Views.AutoWolDialog);
  focusElement('cancelAutoWol');

  var isPolling = true;
  var pollTimeout = null;
  var hasFailed = false;

  var stopPollingTasks = function() {
    isPolling = false;
    if (pollTimeout) clearTimeout(pollTimeout);
    if (typeof abortSubnetScan === 'function') abortSubnetScan();
  };

  var cleanup = function() {
    stopPollingTasks();
    autoWolOverlay.style.display = 'none';
    autoWolDialog.close();
    isDialogOpen = false;
    Navigation.pop();
  };

  var sendWakeRequest = function() {
    $('#autoWolDialogText').html(t('Sending a Wake-on-LAN request to %1$s...', escapeHTML(host.hostname)));

    host.sendWOL().then(function(msg) {
      if (msg) console.log('%c[index.js, autoWolDialog]', 'color: green;', msg);
      $('#autoWolDialogText').html(
        t('Wake-on-LAN request sent to %1$s.', escapeHTML(host.hostname)) + '<br><br>' +
        t('Waiting for the host PC to wake up and connect to the network...')
      );

      var pollLoop = function() {
        if (!isPolling) return;

        // Continuously sweep the subnet to catch the host if it wakes up with a new DHCP IP
        var scanPromise = (typeof startSubnetScanner === 'function')
          ? Promise.resolve(startSubnetScanner()).catch(function(e){
              console.warn('%c[index.js, autoWolDialog]', 'color: orange;', 'Subnet scan failed during WOL wait, continuing to poll:', e);
            })
          : Promise.resolve();

        scanPromise.then(function() {
          if (!isPolling) return; // In case the dialog was closed during the scan
          
          host.pollServer(function(returnedHost) {
            if (!isPolling) return; // In case the dialog was closed while pollServer was running

            if (returnedHost.online) {
              cleanup();
              if (onSuccess) onSuccess();

              // Instantly update the UI to remove the offline styling
              updateHostStatusIndicator(returnedHost);
            } else {
              // Wait 1 second AFTER the previous poll finished before starting the next one.
              // This prevents rapid CPU spinning if the network drops temporarily and requests 
              // fail instantly, while still keeping the WOL check feeling responsive.
              pollTimeout = setTimeout(pollLoop, 1000);
            }
          });
        });
      };

      // Kick off the sequential polling loop
      pollLoop();

    }).catch(function(error) {
      hasFailed = true;
      stopPollingTasks();

      var errorMessage = typeof error === 'string' ? error : (error && error.message ? error.message : 'Unknown error');
      var translatedError = replaceKnownWolErrorLabels(errorMessage);
      $('#autoWolDialogText').html(
        t('Failed to send Wake-on-LAN request to %1$s!', escapeHTML(host.hostname)) + '<br><br>' +
        t('Error: %1$s', translatedError)
      );
      // Change the button text to "OK" to indicate that the user can acknowledge the failure
      $('#cancelAutoWol').html(t('OK'));
    });
  };

  $('#cancelAutoWol').off('click');
  $('#cancelAutoWol').on('click', function() {
    if (hasFailed) {
      console.error('%c[index.js, autoWolDialog]', 'color: green;', 'Wake-on-LAN request failed: ' + errorMessage);
    } else {
      console.log('%c[index.js, autoWolDialog]', 'color: green;', 'Wake-on-LAN request canceled by user.');
    }
    cleanup();
    if (onCancel) onCancel();
  });

  // Send wake request immediately since user explicitly opened the Wake PC menu
  sendWakeRequest();
}

// Add the new NvHTTP Host object inside the host grid
function addHostToGrid(host, ismDNSDiscovered) {
  // Create the host container with the appropriate attributes for the host card
  var hostContainer = $('<div>', {
    id: 'host-container-' + host.serverUid,
    class: 'host-container mdl-card mdl-shadow--4dp',
    role: 'link',
    tabindex: 0,
    'aria-label': host.hostname
  });

  // Create the host cell to serve as a holder for the host box
  var hostCell = $('<div>', {
    id: 'host-' + host.serverUid,
    class: 'mdl-card__title mdl-card--expand'
  });

  // Create the host title wrapper to hold the host title text
  var hostTitle = $('<div>', {
    class: 'host-title mdl-card__title-text'
  });

  // Create the host text placeholder that will contain the host name
  var hostText = $('<span>', {
    class: 'host-text',
    text: host.hostname
  });

  // Create the host menu button with the appropriate attributes for the host menu
  var hostMenu = $('<div>', {
    id: 'hostMenuButton-' + host.serverUid,
    class: 'host-menu',
    role: 'button',
    tabindex: 0,
    'aria-label': host.hostname + ' menu'
  });

  // Create the host center icon to indicate the host's status (online/offline/unpaired)
  var hostStatusIndicator = $('<i>', {
    id: 'host-status-' + host.serverUid,
    class: 'material-icons host-center-icon'
  });

  // Append the host text to the host title wrapper
  hostTitle.append(hostText);

  // Handle animation state based on host title text length
  if (host.hostname.length <= 26) {
    // For host title text of 26 characters or less, disable scrolling text animation
    hostText.addClass('disable-animation');
  } else {
    // For host title text longer than 26 characters, enable scrolling text animation
    hostText.removeClass('disable-animation');
  }

  // Append the host title to the host cell
  hostCell.append(hostTitle);

  // Append the host cell to the host container
  hostContainer.append(hostCell);

  // Append the host menu button to the host container
  hostContainer.append(hostMenu);

  // Append the host status indicator to the host container
  hostContainer.append(hostStatusIndicator);

  // Set initial status
  updateHostStatusIndicator(host);

  // Attach the click event listener to the host container
  hostContainer.off('click');
  hostContainer.on('click', function() {
    // Prevent further clicks
    if (isClickPrevented) {
      return;
    }
    // Block subsequent clicks immediately
    isClickPrevented = true;
    // Select the host when the Click key is pressed
    hostChosen(host);
    // Reset the click flag after 2 second delay
    setTimeout(() => isClickPrevented = false, 2000);
  });

  // Attach the click event listener to the host menu button
  hostMenu.off('click');
  hostMenu.on('click', function(e) {
    // Prevent the click event from propagating to the host container
    e.stopPropagation();
    // Select the host menu button when the Click key is pressed
    hostMenuDialog(host);
  });

  // Append the host container to the host grid
  $('#host-grid').append(hostContainer);

  // Store the host object in the hosts array using its server UID as the key
  hosts[host.serverUid] = host;

  // Update the host's external IPv4 address if it was discovered via mDNS
  if (ismDNSDiscovered) {
    hosts[host.serverUid].updateExternalAddressIP4();
  }
}

// Function to correctly update and store the valid MAC address of the host in IndexedDB
function updateMacAddress(host) {
  getData('hosts', function(previousValue) {
    var dbHosts = previousValue.hosts != null ? previousValue.hosts : {};
    if (host.macAddress != '00:00:00:00:00:00') {
      if (dbHosts[host.serverUid] && dbHosts[host.serverUid].macAddress != host.macAddress) {
        console.log('%c[index.js, updateMacAddress]', 'color: green;', 'Updated MAC address for host ' + host.hostname + ' from ' + dbHosts[host.serverUid].macAddress + ' to ' + host.macAddress);
        if (hosts[host.serverUid]) {
          hosts[host.serverUid].macAddress = host.macAddress;
        }
        saveHosts();
      }
    }
  });
}

// Show the Host Menu dialog with host button options
function hostMenuDialog(host) {
  // Create an overlay for the dialog and append it to the body
  var hostMenuDialogOverlay = $('<div>', {
    id: 'hostMenuDialogOverlay-' + host.serverUid,
    class: 'dialog-overlay'
  }).appendTo(document.body);

  // Create the dialog element and append it to the overlay
  var hostMenuDialog = $('<dialog>', {
    id: 'hostMenuDialog-' + host.serverUid,
    class: 'mdl-dialog'
  }).appendTo(hostMenuDialogOverlay);

  // Add the dialog title with the host's name
  $('<h3>', {
    id: 'hostMenuDialogTitle-' + host.serverUid,
    class: 'mdl-dialog__title',
    text: host.hostname
  }).appendTo(hostMenuDialog);

  // Create a content section inside the dialog
  var hostMenuDialogContent = $('<div>', {
    class: 'mdl-dialog__content'
  }).appendTo(hostMenuDialog);

  // Define the options for the menu with the corresponding attributes
  var hostMenuDialogOptions = [
    {
      id: 'refreshApps-' + host.hostname,
      class: 'host-menu-button',
      'data-i18n': 'Refresh apps',
      text: t('Refresh apps'),
      disabled: !host.online,
      action: function() {
        // Refresh the list of apps for the target host
        snackbarLogLong('Refreshing the list of %1$s applications...', host.hostname);
        host.clearBoxArt();
        host.getAppListWithCacheFlush();
      }
    },
    {
      id: 'wakeHost-' + host.hostname,
      class: 'host-menu-button',
      'data-i18n': 'Wake PC',
      text: t('Wake PC'),
      disabled: host.online,
      action: function() {
        // Check if MAC is randomized
        if (isRandomMacAddress(host.macAddress)) {
          // Show warning dialog for randomized MAC addresses
          setTimeout(() => wakeOnLanWarningDialog(host), 100);
        } else {
          // Send a Wake-on-LAN request to the target host
          setTimeout(() => autoWolDialog(host, function() {}, function() {}), 100);
        }
      }
    },
    {
      id: 'deleteHost-' + host.hostname,
      class: 'host-menu-button',
      'data-i18n': 'Delete PC',
      text: t('Delete PC'),
      action: function() {
        // Remove the selected host from the list
        setTimeout(() => deleteHostDialog(host), 100);
      }
    },
    {
      id: 'viewDetails-' + host.hostname,
      class: 'host-menu-button',
      'data-i18n': 'View Details',
      text: t('View Details'),
      action: function() {
        // View details of the selected host
        setTimeout(() => hostDetailsDialog(host), 100);
      }
    },
  ];

  // Loop through each option to create a button in the dialog
  hostMenuDialogOptions.forEach(function(menuOption) {
    var hostMenuDialogOption = $('<button>', {
      type: 'button',
      id: menuOption.id,
      class: 'mdl-button mdl-js-button mdl-button--raised mdl-button--colored mdl-js-ripple-effect',
      text: menuOption.text,
      disabled: menuOption.disabled || false
    });
    // Trigger the action if the Option button is pressed
    hostMenuDialogOption.off('click');
    hostMenuDialogOption.click(function() {
      Navigation.pop();
      menuOption.action();
      $(hostMenuDialogOverlay).css('display', 'none');
      hostMenuDialog[0].close();
      hostMenuDialogOverlay.remove();
      isDialogOpen = false;
    });
    // Append the button to the dialog content
    hostMenuDialogOption.appendTo(hostMenuDialogContent);
  });

  // Create the actions section inside the dialog
  var hostMenuDialogActions = $('<div>', {
    class: 'mdl-dialog__actions'
  }).appendTo(hostMenuDialog);

  // Create and set up the Close button
  var closeHostMenuDialog = $('<button>', {
    type: 'button',
    id: 'closeHostMenu',
    class: 'mdl-button mdl-js-button mdl-button--raised mdl-button--colored mdl-js-ripple-effect',
    'data-i18n': 'Close',
    text: t('Close')
  });

  // Close the dialog if the Close button is pressed
  closeHostMenuDialog.off('click');
  closeHostMenuDialog.click(function() {
    console.log('%c[index.js, hostMenuDialog]', 'color: green;', 'Closing app dialog and returning.');
    $(hostMenuDialogOverlay).css('display', 'none');
    hostMenuDialog[0].close();
    hostMenuDialogOverlay.remove();
    isDialogOpen = false;
    Navigation.pop();
  }).appendTo(hostMenuDialogActions);

  // If the dialog element doesn't support the showModal method, register it with dialogPolyfill
  if (!hostMenuDialog[0].showModal) {
    dialogPolyfill.registerDialog(hostMenuDialog[0]);
  }

  // Show the dialog and push the view
  $(hostMenuDialogOverlay).css('display', 'flex');
  hostMenuDialog[0].showModal();
  isDialogOpen = true;
  Navigation.push(Views.HostMenuDialog, host.hostname);
  setTimeout(() => Navigation.switch(), 5);
}

// Show a confirmation with the Delete Host dialog before removing the host object
function deleteHostDialog(host) {
  // Find the existing overlay and dialog elements
  var deleteHostOverlay = document.querySelector('#deleteHostDialogOverlay');
  var deleteHostDialog = document.querySelector('#deleteHostDialog');

  // Change the dialog title and text elements to include the hostname
  document.getElementById('deleteHostDialogTitle').innerHTML = t('Delete Host');
  document.getElementById('deleteHostDialogText').innerHTML = t('Are you sure you want to delete %1$s?', escapeHTML(host.hostname));

  // Show the dialog and push the view
  deleteHostOverlay.style.display = 'flex';
  deleteHostDialog.showModal();
  isDialogOpen = true;
  Navigation.push(Views.DeleteHostDialog);

  // Cancel the operation if the Cancel button is pressed
  $('#cancelDeleteHost').off('click');
  $('#cancelDeleteHost').on('click', function() {
    console.log('%c[index.js, deleteHostDialog]', 'color: green;', 'Closing app dialog and returning.');
    deleteHostOverlay.style.display = 'none';
    deleteHostDialog.close();
    isDialogOpen = false;
    Navigation.pop();
  });

  // Remove the host object if the Continue button is pressed
  // locally remove the hostname/ip from the saved `hosts` array
  // NOTE: this does not make the host forget the pairing to us
  // This means we can re-add the host, and will still be paired
  $('#continueDeleteHost').off('click');
  $('#continueDeleteHost').on('click', function() {
    console.log('%c[index.js, deleteHostDialog]', 'color: green;', 'Removing host, closing app dialog, and returning.');
    // Remove the host container from the grid
    $('#host-container-' + host.serverUid).remove();
    // Stop background polling for removed host
    endBackgroundPollingOfHost(host);
    // Remove the host from the hosts object
    delete hosts[host.serverUid];
    // Save the updated hosts
    saveHosts();
    // Remove the host from the preview app cache and update Smart Hub Preview
    delete _previewApps[host.serverUid];
    savePreviewApps();
    updatePreviewData();
    // If host removed, show snackbar message
    snackbarLog('%1$s has been deleted successfully.', host.hostname);
    deleteHostOverlay.style.display = 'none';
    deleteHostDialog.close();
    isDialogOpen = false;
    Navigation.pop();
    // Reset the Hosts view navigation index to prevent possible out-of-bounds errors
    Views.Hosts.view.reset();
    Navigation.switch();
  });
}

// Show a confirmation with the Delete Host dialog before removing all hosts objects
function deleteAllHostsDialog() {
  if (Object.keys(hosts).length === 0) {
    // If there are no hosts, show snackbar message
    snackbarLog('No host exists.');
    return;
  } else {
    // Find the existing overlay and dialog elements
    var deleteHostOverlay = document.querySelector('#deleteHostDialogOverlay');
    var deleteHostDialog = document.querySelector('#deleteHostDialog');

    // Change the dialog title and text elements
    document.getElementById('deleteHostDialogTitle').innerHTML = t('Delete All Hosts');
    document.getElementById('deleteHostDialogText').innerHTML = t('Are you sure you want to delete all existing hosts?');
    
    // Show the dialog and push the view
    deleteHostOverlay.style.display = 'flex';
    deleteHostDialog.showModal();
    isDialogOpen = true;
    Navigation.push(Views.DeleteHostDialog);
  
    // Cancel the operation if the Cancel button is pressed
    $('#cancelDeleteHost').off('click');
    $('#cancelDeleteHost').on('click', function() {
      console.log('%c[index.js, deleteAllHostsDialog]', 'color: green;', 'Closing app dialog and returning.');
      deleteHostOverlay.style.display = 'none';
      deleteHostDialog.close();
      isDialogOpen = false;
      Navigation.pop();
      Navigation.switch();
    });
  
    // Remove all existing hosts if the Continue button is pressed
    $('#continueDeleteHost').off('click');
    $('#continueDeleteHost').on('click', function() {
      console.log('%c[index.js, deleteAllHostsDialog]', 'color: green;', 'Removing all hosts, closing app dialog, and returning.');
      // Stop background polling for all hosts before removing them
      stopPollingHosts();
      // Iterate through all hosts and remove them
      for (var serverUid in hosts) {
        if (hosts.hasOwnProperty(serverUid)) {
          var host = hosts[serverUid];
          // Remove the host container from the grid
          $('#host-container-' + host.serverUid).remove();
          // Remove the host from the hosts object
          delete hosts[host.serverUid];
          // Save the updated hosts (empty hosts object)
          saveHosts();
        }
      }
      // If all hosts removed, show snackbar message
      snackbarLog('All hosts have been deleted successfully.');
      // Clear the preview app cache and update Smart Hub Preview
      _previewApps = {};
      savePreviewApps();
      updatePreviewData();
      deleteHostOverlay.style.display = 'none';
      deleteHostDialog.close();
      isDialogOpen = false;
      Navigation.pop();
      // Reset the Hosts view navigation index to prevent possible out-of-bounds errors
      Views.Hosts.view.reset();
      Navigation.switch();
    });
  }
}

// Show the Host Details dialog with host information details
function hostDetailsDialog(host) {
  // Create an overlay for the dialog and append it to the body
  var hostDetailsDialogOverlay = $('<div>', {
    id: 'hostDetailsDialogOverlay-' + host.serverUid,
    class: 'dialog-overlay'
  }).appendTo(document.body);

  // Create the dialog element and append it to the overlay
  var hostDetailsDialog = $('<dialog>', {
    id: 'hostDetailsDialog-' + host.serverUid,
    class: 'mdl-dialog'
  }).appendTo(hostDetailsDialogOverlay);

  // Add a dialog title named Host Details
  $('<h3>', {
    id: 'hostDetailsDialogTitle-' + host.serverUid,
    class: 'mdl-dialog__title',
    'data-i18n': 'Host Details',
    text: t('Host Details')
  }).appendTo(hostDetailsDialog);

  // Create a content section inside the dialog
  var hostDetailsDialogContent = $('<div>', {
    class: 'mdl-dialog__content'
  }).appendTo(hostDetailsDialog);

  // Add a paragraph with multiple lines of text
  $('<p>', {
    id: 'hostDetailsDialogText-' + host.serverUid,
    class: 'host-details-text',
    html: [
      t('Name: %1$s', escapeHTML(host.hostname)),
      t('State: %1$s', escapeHTML(host.online) ? t('ONLINE') : t('OFFLINE')),
      t('Active Address: %1$s', escapeHTML(host.address) && escapeHTML(host.externalPort) ? escapeHTML(host.address) + ':' + escapeHTML(host.externalPort) : t('NULL')),
      t('UUID: %1$s', escapeHTML(host.serverUid) ? escapeHTML(host.serverUid) : t('NULL')),
      t('Local Address: %1$s', escapeHTML(host.localAddress) && escapeHTML(host.externalPort) ? escapeHTML(host.localAddress) + ':' + escapeHTML(host.externalPort) : t('NULL')),
      t('MAC Address: %1$s', escapeHTML(host.macAddress) ? escapeHTML(host.macAddress) : t('NULL')),
      t('Pair State: %1$s', escapeHTML(host.paired) ? t('PAIRED') : t('UNPAIRED')),
      t('Running Game ID: %1$s', escapeHTML(host.currentGame)),
      t('HTTP Port: %1$s', escapeHTML(host.httpPort) ? escapeHTML(host.httpPort) : t('NULL')),
      t('HTTPS Port: %1$s', escapeHTML(host.httpsPort) ? escapeHTML(host.httpsPort) : t('NULL'))
    ].join('<br>')
  }).appendTo(hostDetailsDialogContent);

  // Create the actions section inside the dialog
  var hostDetailsDialogActions = $('<div>', {
    class: 'mdl-dialog__actions'
  }).appendTo(hostDetailsDialog);

  // Create and set up the Close button
  var closeHostDetailsDialog = $('<button>', {
    type: 'button',
    id: 'closeHostDetails',
    class: 'mdl-button mdl-js-button mdl-button--raised mdl-button--colored mdl-js-ripple-effect',
    'data-i18n': 'Close',
    text: t('Close')
  });

  // Close the dialog if the Close button is pressed
  closeHostDetailsDialog.off('click');
  closeHostDetailsDialog.click(function() {
    console.log('%c[index.js, hostDetailsDialog]', 'color: green;', 'Closing app dialog and returning.');
    $(hostDetailsDialogOverlay).css('display', 'none');
    hostDetailsDialog[0].close();
    hostDetailsDialogOverlay.remove();
    isDialogOpen = false;
    Navigation.pop();
  }).appendTo(hostDetailsDialogActions);

  // If the dialog element doesn't support the showModal method, register it with dialogPolyfill
  if (!hostDetailsDialog[0].showModal) {
    dialogPolyfill.registerDialog(hostDetailsDialog[0]);
  }

  // Show the dialog and push the view
  $(hostDetailsDialogOverlay).css('display', 'flex');
  hostDetailsDialog[0].showModal();
  isDialogOpen = true;
  Navigation.push(Views.HostDetailsDialog);
  setTimeout(() => Navigation.switch(), 5);
}

// Show the Moonlight Support dialog
function appSupportDialog() {
  // Find the existing overlay and dialog elements
  var appSupportDialogOverlay = document.querySelector('#appSupportDialogOverlay');
  var appSupportDialog = document.querySelector('#appSupportDialog');

  // Show the dialog and push the view
  appSupportDialogOverlay.style.display = 'flex';
  appSupportDialog.showModal();
  isDialogOpen = true;
  Navigation.push(Views.MoonlightSupportDialog);

  // Close the dialog if the Close button is pressed
  $('#closeAppSupport').off('click');
  $('#closeAppSupport').on('click', function() {
    console.log('%c[index.js, appSupportDialog]', 'color: green;', 'Closing app dialog and returning.');
    appSupportDialogOverlay.style.display = 'none';
    appSupportDialog.close();
    isDialogOpen = false;
    Navigation.pop();
    Navigation.switch();
  });
}

// Handle layout elements when displaying the Settings view
function showSettingsMode() {
  console.log('%c[index.js, showSettingsMode]', 'color: green;', 'Entering "Show Settings" mode.');
  $('#header-title').html(t('Settings'));
  $('#header-logo').show();
  $('#main-header').show();
  $('#goBackBtn').show();
  $('#restoreDefaultsBtn').show();
  $('#main-content').children().not('#listener, #loadingSpinner, #wasmSpinner').show();
  $('#host-grid').hide();
  $('#game-grid').hide();
  $('.nav-menu-parent').hide();
  $('#updateAppBtn').hide();
  $('#settingsBtn').hide();
  $('#supportBtn').hide();
  $('#quitRunningAppBtn').hide();
  $('#connection-warnings').css('display', 'none');
  $('#performance-stats').css('display', 'none');
  $('#main-content').removeClass('fullscreen');
  $('#listener').removeClass('fullscreen');

  stopPollingHosts();
  Navigation.start();
  // Register showSettingsMode to re-run every time the language changes
  if (window.i18n && typeof window.i18n.onRefresh === 'function') {
    window.i18n.onRefresh(showSettingsMode);
  }
}

// Show the Settings list
function showSettings() {
  // Stop navigation before showing the loading screen
  Navigation.stop();

  // Hide the main header and content before showing a loading screen
  $('#main-header').children().hide();
  $('#main-header').css({'backgroundColor': 'transparent', 'boxShadow': 'none'});
  $('#host-grid, #game-grid').hide();

  // Show a spinner while the setting list loads
  $('#wasmSpinner').css('display', 'inline-block');
  $('#wasmSpinnerLogo').hide();
  $('#wasmSpinnerMessage').text(t('Loading Settings...'));

  setTimeout(() => {
    // Hide the spinner after successfully retrieving the setting list
    $('#wasmSpinner').hide();

    // Show the main header after the loading screen is complete
    $('#main-header').children().show();
    $('#main-header').css({'backgroundColor': '#333846', 'boxShadow': '0 0 4px 0 rgba(0, 0, 0, 1)'});

    // Show the settings list section
    $('#settings-list').removeClass('hide-container');
    $('#settings-list').css('display', 'flex');
    $('#settings-list').show();

    // Navigate to the Settings view
    Navigation.push(Views.Settings);
    showSettingsMode();
  }, 500);
}

// Reset the current settings view by clearing the selection and hiding the right pane
function resetSettingsView() {
  // Hide all settings options from the right pane
  document.querySelectorAll('.settings-options').forEach(function(settingsOption) {
    settingsOption.style.display = 'none';
  });

  // Remove the 'selected' class from all settings categories
  document.querySelectorAll('.settings-category').forEach(function(settingsCategory) {
    settingsCategory.classList.remove('selected');
  });
}

// Navigate to the provided settings view by pushing the target view and set the focus to the setting
function navigateSettingsView(view) {
  Navigation.pop();
  Navigation.push(view);
  setTimeout(() => Navigation.switch(), 250);
}

// Handle category selection, display appropriate options, and navigate to the provided settings pane
function handleSettingsView(category) {
  // Reset the current settings view before navigating to the next settings view
  resetSettingsView();

  // Show appropriate settings options in the target pane based on the selected settings category
  const targetPaneOptions = document.getElementById(category);
  const selectedCategory = document.querySelector(`.settings-category[data-category="${category}"]`);

  // Show the target pane options if the target pane exists
  if (targetPaneOptions) {
    // Show the pane view
    targetPaneOptions.style.display = 'block';
  } else {
    // Otherwise, exit early
    return;
  }

  // Add the 'selected' class to the clicked settings category
  if (selectedCategory) {
    // Mark the category as selected
    selectedCategory.classList.add('selected');
  } else {
    // Otherwise, exit early
    return;
  }

  // Navigate to the corresponding settings view
  switch (category) {
    case 'basicSettings': // Navigate to the BasicSettings view
      navigateSettingsView(Views.BasicSettings);
      break;
    case 'interfaceSettings': // Navigate to the InterfaceSettings view
      navigateSettingsView(Views.InterfaceSettings);
      break;
    case 'hostSettings': // Navigate to the HostSettings view
      navigateSettingsView(Views.HostSettings);
      break;
    case 'inputSettings': // Navigate to the InputSettings view
      navigateSettingsView(Views.InputSettings);
      break;
    case 'audioSettings': // Navigate to the AudioSettings view
      navigateSettingsView(Views.AudioSettings);
      break;
    case 'videoSettings': // Navigate to the VideoSettings view
      navigateSettingsView(Views.VideoSettings);
      break;
    case 'advancedSettings': // Navigate to the AdvancedSettings view
      navigateSettingsView(Views.AdvancedSettings);
      break;
    case 'aboutSettings': // Navigate to the AboutSettings view
      navigateSettingsView(Views.AboutSettings);
      break;
    default:
      break;
  }
}

// Show the Navigation Guide dialog
function navigationGuideDialog() {
  // Find the existing overlay and dialog elements
  var navGuideDialogOverlay = document.querySelector('#navGuideDialogOverlay');
  var navGuideDialog = document.querySelector('#navGuideDialog');

  // Show the dialog and push the view
  navGuideDialogOverlay.style.display = 'flex';
  navGuideDialog.showModal();
  isDialogOpen = true;
  Navigation.push(Views.NavigationGuideDialog);

  // Close the dialog if the Close button is pressed
  $('#closeNavGuide').off('click');
  $('#closeNavGuide').on('click', function() {
    console.log('%c[index.js, navigationGuideDialog]', 'color: green;', 'Closing app dialog and returning.');
    navGuideDialogOverlay.style.display = 'none';
    navGuideDialog.close();
    isDialogOpen = false;
    Navigation.pop();
    Navigation.switch();
  });
}

// Fetch the latest version and release notes from GitHub API
function fetchLatestRelease() {
  // Check if the REPO_OWNER and REPO_NAME are set to placeholders and apply fallback values
  const repoOwner = (REPO_OWNER === '__REPO_OWNER__') ? 'brightcraft' : REPO_OWNER;
  const repoName = (REPO_NAME === '__REPO_NAME__') ? 'moonlight-tizen' : REPO_NAME;

  // GitHub API endpoint to get the latest released version
  const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`;

  // Fetch the latest release data from the GitHub API
  return fetch(apiUrl).then(response => {
    if (!response.ok) {
      throw new Error('Network response failed: ' + response.statusText);
    }
    // Parse JSON response
    return response.json();
  }).then(data => {
    // Get the latest version and release notes from the released update
    let latestVersion = data.tag_name.startsWith('v') ? data.tag_name.slice(1) : data.tag_name;
    const releaseNotes = extractReleaseNotes(data.body) || t('• No relevant changes found.');
    return { latestVersion, releaseNotes };
  });
}

// Compare the current version with the latest version to determine if an update is available
function checkVersionUpdate(currentVersion, latestVersion) {
  // Return false if either version is missing or invalid
  if (!currentVersion || !latestVersion) {
    return false;
  }

  const currentVerParts = currentVersion.split('.').map(Number);
  const latestVerParts = latestVersion.split('.').map(Number);

  // Compare each part of the version numbers
  for (let i = 0; i < latestVerParts.length; i++) {
    if (latestVerParts[i] > currentVerParts[i]) {
      // If latest version has a higher number in any part, an update is available
      return true;
    } else if (latestVerParts[i] < currentVerParts[i]) {
      // If the current version has a higher number, no update is needed
      return false;
    }
  }
  // If all parts are equal, no update is available
  return false;
}

// Extract only the release notes section from the released update
function extractReleaseNotes(releaseNotes) {
  // Extract the "What's Changed" section and exclude everything after "Full Changelog"
  const match = releaseNotes.match(/## What's Changed:\r?\n\r?\n([\s\S]+?)(?:\r?\n\r?\n\*\*Full Changelog\*\*|$)/);
  // Return null if release notes section is not found or does not match expected format
  if (!match) {
    return null;
  }
  // Clean and format each release note line into a user-friendly bullet list
  return match[1].split('\n').map(line => {
	  let cleaned = line.trim();
	  // Remove contributor attribution and PR references
	  cleaned = cleaned.replace(/\s+by\s+@[^]+$/i, '');
	  // Convert list item to bullet point
	  cleaned = cleaned.replace(/^-\s*/, '• ');
	  // Add trailing period if missing
	  if (cleaned && !cleaned.endsWith('.')) {
	    cleaned += '.';
	  }
	  return cleaned;
  }).filter(line => line !== '').join('<br>');
}

// Format the update timestamp into a readable string as "dd/mm/yyyy hh:mm"
function formatUpdateTimestamp(ms) {
  var date = new Date(ms);
  var day = date.getDate().toString().padStart(2, '0');
  var month = (date.getMonth() + 1).toString().padStart(2, '0');
  var year = date.getFullYear();
  var hour = date.getHours().toString().padStart(2, '0');
  var minute = date.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hour}:${minute}`;
}

// Show the Update App button when a new update is found
function updateAppButton(latestVersion) {
  // Prevent adding duplicate buttons if one already exists
  if ($('#updateAppBtn').length > 0) {
    console.log('%c[index.js, updateAppButton]', 'color: green;', 'Update App button already exists. Skipping duplicate creation!');
    return;
  }

  // Create the button dynamically
  var updateAppBtn = $('<button>', {
    type: 'button',
    id: 'updateAppBtn',
    class: 'mdl-button mdl-js-button mdl-button--raised mdl-button--colored mdl-js-ripple-effect',
    'aria-label': 'Update App'
  });
  // Create the badge icon dynamically
  var updateAppBtnBadge = $('<div>', {
    class: 'navigation-button-icons material-icons mdl-badge mdl-badge--overlap',
    'data-badge': '1',
    text: 'update'
  });
  // Create the button text dynamically
  var updateAppBtnText = $('<span>', {
    id: 'updateAppBtnText',
    'data-i18n': 'New update v%1$s',
    'data-param': latestVersion,
    text: t('New update v%1$s', latestVersion)
  });
  // Create the button tooltip dynamically
  var updateAppBtnTooltip = $('<div>', {
    id: 'updateAppBtnTooltip',
    class: 'mdl-tooltip',
    'for': 'updateAppBtn',
    'data-i18n': 'Check what\'s new',
    text: t('Check what\'s new')
  });
  // Create the layout spacer dynamically
  var extraLayoutSpacer = $('<div>', {
    class: 'mdl-layout-spacer'
  });
  // Append elements inside the button
  updateAppBtn.append(updateAppBtnBadge, updateAppBtnText);
  // Insert elements after the existing layout spacer
  $('.mdl-layout-spacer').after(updateAppBtn, updateAppBtnTooltip, extraLayoutSpacer);
  // Upgrade newly added elements for MDL styling
  componentHandler.upgradeElement(updateAppBtn[0]);
  componentHandler.upgradeElement(updateAppBtnTooltip[0]);
  componentHandler.upgradeDom();
  // Smoothly fade-in the button after inserting
  setTimeout(() => {
    updateAppBtn.css({
      opacity: 1,
      transform: 'translateY(0)'
    });
  }, 1200);
  // Attach the click event listener to the Update App button
  updateAppBtn.off('click');
  updateAppBtn.on('click', function() {
    console.log('%c[index.js, updateAppButton]', 'color: green;', 'Checking for new update release notes...');
    // Fetch the latest release data from the GitHub API
    fetchLatestRelease().then(({ latestVersion, releaseNotes }) => {
      setTimeout(() => {
        // Check if a new version update is available
        if (checkVersionUpdate(appInfo.version, latestVersion)) {
          // Show the Update Moonlight dialog with new version and release notes to inform user to update the app
          updateAppDialog(latestVersion, releaseNotes);
        }
      }, 500);
    }).catch(error => {
      console.error('%c[index.js, updateAppButton]', 'color: green;', 'Error: Failed to fetch the release data!', error);
      snackbarLogLong('Unable to check update release notes at this time. Please try again later!');
    });
  });
}

// Show the Update Moonlight dialog
function updateAppDialog(latestVersion, releaseNotes) {
  // Find the existing overlay and dialog elements
  var updateAppDialogOverlay = $('#updateAppDialogOverlay');
  var updateAppDialog = $('#updateAppDialog');

  // Update the dialog text dynamically
  $('#updateAppDialogText').html(
	t('Version %1$s is now available! Update manually to enjoy new features and improvements.<br><br>', latestVersion) + 
	t('<strong>What\'s Changed:</strong><br>%1$s', releaseNotes)
  );

  // Set up the Close button
  $('#closeUpdateApp').off('click').on('click', function() {
    console.log('%c[index.js, updateAppDialog]', 'color: green;', 'Closing app dialog and returning.');
    updateAppDialogOverlay.css('display', 'none');
    updateAppDialog[0].close();
    isDialogOpen = false;
    Navigation.pop();
    Navigation.switch();
  });

  // Check if the dialog element does not support the showModal method
  if (!updateAppDialog[0].showModal) {
    // Register the dialog with dialogPolyfill to enable modal functionality for older browsers
    dialogPolyfill.registerDialog(updateAppDialog[0]);
  }

  // Show the dialog and push the view
  updateAppDialogOverlay.css('display', 'flex');
  updateAppDialog[0].showModal();
  isDialogOpen = true;
  Navigation.push(Views.UpdateMoonlightDialog);
}

// Check for updates when the Check for Updates button is pressed
function checkForAppUpdates() {
  console.log('%c[index.js, checkForAppUpdates]', 'color: green;', 'Checking for new application updates...');
  snackbarLog('Checking for available Moonlight updates...');
  // Fetch the latest release data from the GitHub API
  fetchLatestRelease().then(({ latestVersion, releaseNotes }) => {
    setTimeout(() => {
      // Check if a new version update is available
      if (checkVersionUpdate(appInfo.version, latestVersion)) {
        // Show the Update Moonlight dialog with new version and release notes to inform user to update the app
        updateAppDialog(latestVersion, releaseNotes);
        // Create and display the Update App button so they can access it later if they close the dialog
        updateAppButton(latestVersion);
      } else {
        // Otherwise, show a snackbar message to inform the user that the app is already up to date
        snackbarLogLong('Your app is already up to date! You\'re on the latest version.');
      }
    }, 1500);
  }).catch(error => {
    console.error('%c[index.js, checkForAppUpdates]', 'color: green;', 'Error: Failed to fetch the release data!', error);
    snackbarLogLong('Unable to check for updates right now. Please try again later!');
  });
}

// Automatically perform a scheduled app update check at startup if the interval condition is met and notify the user
function checkForAppUpdatesAtStartup() {
  // Fetch the current timestamp and stored version info
  getData(UPDATE_TIMESTAMP, function(tResult) {
    var lastChecked = tResult[UPDATE_TIMESTAMP];
    var currentTime = Date.now();
    // Log the last auto-check timestamp if it exists
    if (lastChecked) {
      console.log('%c[index.js, checkForAppUpdatesAtStartup]', 'color: green;', `Last auto-check performed: ${formatUpdateTimestamp(lastChecked)}`);
    }
    // Check if enough time has passed since the last update check
    if (!lastChecked || currentTime - lastChecked > UPDATE_INTERVAL) {
      console.log('%c[index.js, checkForAppUpdatesAtStartup]', 'color: green;', 'Performing auto-check for new application updates...');
      // Fetch the latest release data from the GitHub API
      fetchLatestRelease().then(({ latestVersion }) => {
        setTimeout(() => {
          // Check if a new version update is available
          if (checkVersionUpdate(appInfo.version, latestVersion)) {
            // Show snackbar message with new version to inform user to update the app
            snackbarLogLong('Version %1$s is now available! Check out the latest features & improvements.', latestVersion);
            // Create and display the Update App button with tooltip and additional layout spacer
            updateAppButton(latestVersion);
          }
        }, 100);
        // Save the fetched version as the last known update version
        storeData(UPDATE_VERSION, latestVersion);
      }).catch(error => {
        console.error('%c[index.js, checkForAppUpdatesAtStartup]', 'color: green;', 'Error: Failed to fetch the release data!', error);
        snackbarLogLong('Cannot automatically check for updates at this time!');
      });
      // Save the current time as the last update check timestamp
      storeData(UPDATE_TIMESTAMP, currentTime);
      console.log('%c[index.js, checkForAppUpdatesAtStartup]', 'color: green;', `New auto-check timestamp stored: ${formatUpdateTimestamp(currentTime)}`);
    } else {
      var timeLeft = UPDATE_INTERVAL - (currentTime - lastChecked);
      var hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
      var minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      console.log(
        '%c[index.js, checkForAppUpdatesAtStartup]', 'color: green;', 
        'Auto-update check skipped as the last one was within the past 24 hours. ' + 
        `Next auto-check will occur in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''} and ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`
      );
      // Still show the Update App button if a newer version was previously cached
      getData(UPDATE_VERSION, function(vResult) {
        var cachedVersion = vResult[UPDATE_VERSION];
        // Check if the cached version is newer than the current app version
        if (cachedVersion !== undefined && checkVersionUpdate(appInfo.version, cachedVersion)) {
          setTimeout(() => {
            // Show snackbar message with cached version to inform user to update the app
            snackbarLogLong('Version %1$s is now available! Check out the latest features & improvements.', cachedVersion);
            // Create and display the cached Update App button with tooltip and additional layout spacer
            updateAppButton(cachedVersion);
          }, 100);
        }
      });
    }
  });
}

// Show a confirmation with the Restore Defaults dialog before restoring the default settings
function restoreDefaultsDialog() {
  // Find the existing overlay and dialog elements
  var restoreDefaultsDialogOverlay = document.querySelector('#restoreDefaultsDialogOverlay');
  var restoreDefaultsDialog = document.querySelector('#restoreDefaultsDialog');

  // Show the dialog and push the view
  restoreDefaultsDialogOverlay.style.display = 'flex';
  restoreDefaultsDialog.showModal();
  isDialogOpen = true;
  Navigation.push(Views.RestoreDefaultsDialog);

  // Cancel the operation if the Cancel button is pressed
  $('#cancelRestoreDefaults').off('click');
  $('#cancelRestoreDefaults').on('click', function() {
    console.log('%c[index.js, restoreDefaultsDialog]', 'color: green;', 'Closing app dialog and returning.');
    restoreDefaultsDialogOverlay.style.display = 'none';
    restoreDefaultsDialog.close();
    isDialogOpen = false;
    Navigation.pop();
    Navigation.switch();
  });

  // Restore all default settings if the Continue button is pressed
  $('#continueRestoreDefaults').off('click');
  $('#continueRestoreDefaults').on('click', function() {
    console.log('%c[index.js, restoreDefaultsDialog]', 'color: green;', 'Restoring default settings, closing app dialog, and returning.');
    // Reset any settings to their default state and save the updated values
    restoreDefaultsSettingsValues();
    // If the settings have been reset to default, show snackbar message
    snackbarLog('Settings have been restored to their default values.');
    restoreDefaultsDialogOverlay.style.display = 'none';
    restoreDefaultsDialog.close();
    isDialogOpen = false;
    Navigation.pop();
    Navigation.switch();
    // Show the required Restart Moonlight dialog and push the view
    setTimeout(() => requiredRestartAppDialog(), 2000);
  });
}

// Show the Warning dialog
function warningDialog(title, message) {
  // Find the existing overlay and dialog elements
  var warningDialogOverlay = document.querySelector('#warningDialogOverlay');
  var warningDialog = document.querySelector('#warningDialog');

  // Change the dialog title and text element with a custom warning message
  document.getElementById('warningDialogTitle').innerHTML = t(title);
  document.getElementById('warningDialogText').innerHTML = t(message);

  // Show the dialog and push the view
  warningDialogOverlay.style.display = 'flex';
  warningDialog.showModal();
  isDialogOpen = true;
  Navigation.push(Views.WarningDialog);

  // Ensure the continueWarning button is hidden for standard warnings
  $('#continueWarning').hide();
  // Add single-button class for CSS styling when only Close button is visible
  warningDialog.classList.add('single-button');

  // Cancel the operation if the Close button is pressed
  $('#closeWarning').off('click');
  $('#closeWarning').on('click', function() {
    console.log('%c[index.js, warningDialog]', 'color: green;', 'Closing app dialog and returning.');
    warningDialogOverlay.style.display = 'none';
    warningDialog.close();
    isDialogOpen = false;
    warningDialog.classList.remove('single-button');
    Navigation.pop();
    Navigation.switch();
  });
}

// Show a WoL warning dialog for randomized (locally administered) MAC addresses
function wakeOnLanWarningDialog(host) {
  var warningDialogOverlay = document.querySelector('#warningDialogOverlay');
  var warningDialog = document.querySelector('#warningDialog');

  // Set the title and message
  document.getElementById('warningDialogTitle').innerHTML = t('Wake-on-LAN Warning');
  document.getElementById('warningDialogText').innerHTML = t(
    'The MAC address of %1$s (%2$s) appears to be randomly generated.', escapeHTML(host.hostname), escapeHTML(host.macAddress)) + '<br><br>' +
    t('The Operating System may be using a random MAC address instead of the physical network card address.') + ' ' +
    t('Wake-on-LAN may be unable to wake up the machine since the MAC address does not match the one from the network card.');

  // Show the dialog and push the view
  warningDialogOverlay.style.display = 'flex';
  warningDialog.showModal();
  isDialogOpen = true;
  Navigation.push(Views.WarningDialog);

  // Dynamically swap buttons: show "Continue" and change "Close" to act as Cancel
  $('#continueWarning').show();
  // Remove single-button class since both buttons are now visible
  warningDialog.classList.remove('single-button');

  // Cancel — close dialog without sending WoL (using Close button)
  $('#closeWarning').off('click');
  $('#closeWarning').on('click', function() {
    console.log('%c[index.js, wakeOnLanWarningDialog]', 'color: green;', 'Closing WoL warning dialog and returning.');
    warningDialogOverlay.style.display = 'none';
    warningDialog.close();
    isDialogOpen = false;
    // Restore the default state for future non-WoL warnings
    $('#continueWarning').hide();
    Navigation.pop();
    Navigation.switch();
  });

  // Continue — send WoL despite randomized MAC
  $('#continueWarning').off('click');
  $('#continueWarning').on('click', function() {
    console.log('%c[index.js, wakeOnLanWarningDialog]', 'color: green;', 'User accepted WoL warning. Sending WoL to ' + host.hostname);
    warningDialogOverlay.style.display = 'none';
    warningDialog.close();
    isDialogOpen = false;
    // Restore the default state for future non-WoL warnings
    $('#continueWarning').hide();
    Navigation.pop();
    Navigation.switch();
    // Proceed with sending the WoL packet
    setTimeout(() => autoWolDialog(host, function() {}, function() {}), 100);
  });
}

// Restart the application
function restartApplication() {
  var restartApplication = window.location;
  restartApplication.reload(true);
}

// Show the Restart Moonlight dialog
function restartAppDialog() {
  // Find the existing overlay and dialog elements
  var restartAppDialogOverlay = document.querySelector('#restartAppDialogOverlay');
  var restartAppDialog = document.querySelector('#restartAppDialog');

  // Change the dialog text element to confirm whether the user wants to restart the application
  document.getElementById('restartAppDialogText').innerHTML = t('Are you sure you want to restart Moonlight?');

  // Show the dialog and push the view
  restartAppDialogOverlay.style.display = 'flex';
  restartAppDialog.showModal();
  isDialogOpen = true;
  Navigation.push(Views.RestartMoonlightDialog);

  // Cancel the operation if the Cancel button is pressed
  $('#cancelRestartApp').off('click');
  $('#cancelRestartApp').on('click', function() {
    console.log('%c[index.js, restartAppDialog]', 'color: green;', 'Closing app dialog and returning.');
    restartAppDialogOverlay.style.display = 'none';
    restartAppDialog.close();
    isDialogOpen = false;
    Navigation.pop();
    Navigation.switch();
  });

  // Restart the application if the Restart button is pressed
  $('#continueRestartApp').off('click');
  $('#continueRestartApp').on('click', function() {
    console.log('%c[index.js, restartAppDialog]', 'color: green;', 'Closing app dialog, restarting application, and returning.');
    restartAppDialogOverlay.style.display = 'none';
    restartAppDialog.close();
    isDialogOpen = false;
    Navigation.pop();
    restartApplication();
  });
}

// Show the required Restart Moonlight dialog
function requiredRestartAppDialog() {
  // Find the existing overlay and dialog elements
  var restartAppDialogOverlay = document.querySelector('#restartAppDialogOverlay');
  var restartAppDialog = document.querySelector('#restartAppDialog');

  // Change the dialog text element to inform the user that a restart is required
  document.getElementById('restartAppDialogText').innerHTML = t('In order for your changes to take effect, a restart of the application is required.<br><br>Would you like to proceed with the restart?');

  // Show the dialog and push the view
  restartAppDialogOverlay.style.display = 'flex';
  restartAppDialog.showModal();
  isDialogOpen = true;
  Navigation.push(Views.RestartMoonlightDialog);

  // Cancel the operation if the Cancel button is pressed
  $('#cancelRestartApp').off('click');
  $('#cancelRestartApp').on('click', function() {
    console.log('%c[index.js, restartAppDialog]', 'color: green;', 'Closing app dialog and returning.');
    restartAppDialogOverlay.style.display = 'none';
    restartAppDialog.close();
    isDialogOpen = false;
    Navigation.pop();
    Navigation.switch();
  });

  // Restart the application if the Restart button is pressed
  $('#continueRestartApp').off('click');
  $('#continueRestartApp').on('click', function() {
    console.log('%c[index.js, restartAppDialog]', 'color: green;', 'Closing app dialog, restarting application, and returning.');
    restartAppDialogOverlay.style.display = 'none';
    restartAppDialog.close();
    isDialogOpen = false;
    Navigation.pop();
    restartApplication();
  });
}

// Exit the application
function exitApplication() {
  var exitApplication = tizen.application.getCurrentApplication();
  exitApplication.exit();
}

// Show the Exit Moonlight dialog
function exitAppDialog() {
  // Find the existing overlay and dialog elements
  var exitAppOverlay = document.querySelector('#exitAppDialogOverlay');
  var exitAppDialog = document.querySelector('#exitAppDialog');

  // Show the dialog and push the view
  exitAppOverlay.style.display = 'flex';
  exitAppDialog.showModal();
  isDialogOpen = true;
  Navigation.push(Views.ExitMoonlightDialog);

  // Cancel the operation if the Cancel button is pressed
  $('#cancelExitApp').off('click');
  $('#cancelExitApp').on('click', function() {
    console.log('%c[index.js, exitAppDialog]', 'color: green;', 'Closing app dialog and returning');
    exitAppOverlay.style.display = 'none';
    exitAppDialog.close();
    isDialogOpen = false;
    Navigation.pop();
    Navigation.change(Views.Hosts);
  });

  // Exit the application if the Exit button is pressed
  $('#continueExitApp').off('click');
  $('#continueExitApp').on('click', function() {
    console.log('%c[index.js, exitAppDialog]', 'color: green;', 'Closing app dialog, exiting application, and returning to Smart Hub.');
    exitAppOverlay.style.display = 'none';
    exitAppDialog.close();
    isDialogOpen = false;
    Navigation.pop();
    exitApplication();
  });
}

// Puts the CSS style for current app on the app that's currently running
// and puts the CSS style for non-current app on the apps that aren't running
// this requires a hot-off-the-host `api`, and the appId we're going to stylize
// the function was made like this so that we can remove duplicated code, but
// not do N*N stylization of the box art, or make the code not flow very well
function stylizeBoxArts(freshApi, appsList) {
  // Check each app in the list and apply CSS styling based on whether it's currently running or not
  appsList.forEach(function(app) {
    var appBox = document.querySelector('#game-container-' + app.id);
    if (!appBox) {
      console.warn('%c[index.js, stylizeBoxArts]', 'color: green;', 'Warning: No box art found for appId: ' + app.id);
      return;
    }
    // If the game is currently running, then apply CSS stylization
    if (freshApi.currentGame === app.id) {
      appBox.classList.add('current-game-active');
      appBox.title = app.title + t(' (Running)');
    } else {
      appBox.classList.remove('current-game-active');
      appBox.title = app.title;
    }
  });
}

// Sort the app titles
function sortTitles(list, sortOrder) {
  return list.sort((a, b) => {
    // Ascending order (A - Z)
    if (sortOrder === 'ASC') {
      return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
    }

    // Descending order (Z - A)
    if (sortOrder === 'DESC') {
      return b.title.localeCompare(a.title, undefined, { numeric: true, sensitivity: 'base' });
    }

    return 0;
  });
}

// Handle layout elements when displaying the Apps view
function showAppsMode() {
  console.log('%c[index.js, showAppsMode]', 'color: green;', 'Entering "Show Apps" mode.');
  $('#header-title').html(t('Apps'));
  $('#header-logo').show();
  $('#main-header').show();
  $('#goBackBtn').show();
  $('#quitRunningAppBtn').show();
  $('#main-content').children().not('#listener, #loadingSpinner, #wasmSpinner').show();
  $('#host-grid').hide();
  $('#settings-list').hide();
  $('.nav-menu-parent').hide();
  $('#updateAppBtn').hide();
  $('#settingsBtn').hide();
  $('#supportBtn').hide();
  $('#restoreDefaultsBtn').hide();
  $('#connection-warnings').css('display', 'none');
  $('#performance-stats').css('display', 'none');
  $('#main-content').removeClass('fullscreen');
  $('#listener').removeClass('fullscreen');
  $('#loadingSpinner').css('display', 'none');
  $('body').css('backgroundColor', '#282C38');
  $('#wasm_module').css('display', 'none');

  isInGame = false;
  // We want to eventually poll on the app screen, but we can't now because
  // it slows down box art loading and we don't update the UI live anyway.
  stopPollingHosts();
  Navigation.start();
}

// Show the Apps grid
function showApps(host) {
  return new Promise((resolve, reject) => {
    // Safety checking should happen before attempting to show the app list
    if (!host || !host.paired) {
      console.error('%c[index.js, showApps]', 'color: green;', 'Error: Unable to initialize the host properly! Host object: ', host);
      reject('Unable to initialize the host properly');
      return;
    } else {
      console.log('%c[index.js, showApps]', 'color: green;', 'Current host object: \n', host, '\n' + host.toString()); // Logging both object (for console) and toString-ed object (for text logs)
    }

    // Stop navigation before showing the loading screen
    Navigation.stop();
    if (typeof window.abortSubnetScan === 'function') window.abortSubnetScan();

    // Hide the main header before showing a loading screen
    $('#main-header').children().hide();
    $('#main-header').css({'backgroundColor': 'transparent', 'boxShadow': 'none'});
    $('#host-grid, #settings-list').hide();

    // Show a spinner while the app list loads
    $('#wasmSpinner').css('display', 'inline-block');
    $('#wasmSpinnerLogo').hide();
    $('#wasmSpinnerMessage').text(t('Loading Apps...'));

    // Remove all game container elements from the game grid and from any other div elements
    $('#game-grid').empty();
    $('div.game-container').remove();

    setTimeout(() => {
      host.getAppList().then(function(appList) {
        // Hide the spinner after the host has successfully retrieved the app list
        $('#wasmSpinner').hide();

        // Show the main header after the loading screen is complete
        $('#main-header').children().show();
        $('#main-header').css({'backgroundColor': '#333846', 'boxShadow': '0 0 4px 0 rgba(0, 0, 0, 1)'});

        // Show the game grid section
        $('#game-grid').show();

        if (appList.length == 0) {
          console.warn('%c[index.js, showApps]', 'Warning: Your app list is empty. Please add some apps to your list!');
          var emptyAppListImg = new Image();
          emptyAppListImg.src = 'static/res/applist_empty.svg';
          $('#game-grid').html(emptyAppListImg);
          snackbarLogLong('Your list is currently empty. Please add your favorite apps to the list.');
          // Navigate to the Apps view
          showAppsMode();
          resolve();
          return;
        }

        // Find the existing switch element
        const sortAppsListSwitch = document.getElementById('sortAppsListSwitch');
        // Defines the sort order based on the state of the switch
        const sortOrder = sortAppsListSwitch.checked ? 'DESC' : 'ASC';
        // If game grid is populated, sort the app list
        const sortedAppList = sortTitles(appList, sortOrder);

        if (_isSmartHubSupported) {
          var oldApps = (_previewApps[host.serverUid] && _previewApps[host.serverUid].apps) || [];

          _previewApps[host.serverUid] = {
            hostname: host.hostname,
            address: host.address,
            apps: sortedAppList.map(function(app) {
              var oldApp = oldApps.find(function(a) {
                return a.id === app.id;
              });
              var newApp = {
                id: app.id, title: app.title
              };
              if (oldApp) {
                if (oldApp.imageUri) {
                  newApp.imageUri = oldApp.imageUri;
                }
                if (oldApp.txtPath) {
                  newApp.txtPath = oldApp.txtPath;
                }
              }
              return newApp;
            })
          };
        }

        // Pause background polling during box art downloads to prevent
        // the polling /serverinfo request from being queued behind 40+
        // concurrent image downloads, which would cause a 5-second timeout
        // and trigger cancelRequest, killing all in-flight downloads.
        endBackgroundPollingOfHost(host);

        var boxArtPromises = [];
        
        // Reset preview promises for this showApps invocation
        window.previewPromises = [];

        sortedAppList.forEach(function(app) {
          // Double clicking the button will cause multiple box arts to appear.
          // To mitigate this, we ensure that we don't add a duplicate box art.
          // This isn't perfect: there's lots of RTTs before the logic prevents anything.
          if ($('#game-container-' + app.id).length === 0) {
            // Create the game container with the appropriate attributes for the game card
            var gameContainer = $('<div>', {
              id: 'game-container-' + app.id,
              class: 'game-container mdl-card mdl-shadow--4dp',
              role: 'link',
              tabindex: 0,
              'aria-label': app.title
            });

            // Create the game cell to serve as a holder for the game box
            var gameCell = $('<div>', {
              id: 'game-' + app.id,
              class: 'mdl-card__title mdl-card--expand'
            });

            // Create the game title wrapper to hold the game title text
            var gameTitle = $('<div>', {
              class: 'game-title mdl-card__title-text'
            });

            // Create the game text placeholder that will contain the game name
            var gameText = $('<span>', {
              class: 'game-text',
              text: app.title
            });

            // Append the game text to the game title wrapper
            gameTitle.append(gameText);

            // Handle animation state based on game title text length
            if (app.title.length <= 20) {
              // For game title text of 20 characters or less, disable scrolling text animation
              gameText.addClass('disable-animation');
            } else {
              // For game title text longer than 20 characters, enable scrolling text animation
              gameText.removeClass('disable-animation');
            }

            // Append the game title to the game cell
            gameCell.append(gameTitle);

            // Append the game cell to the game container
            gameContainer.append(gameCell);

            // Attach the click event listener to the game container
            gameContainer.off('click');
            gameContainer.on('click', function() {
              // Prevent further clicks
              if (isClickPrevented) {
                return;
              }
              // Block subsequent clicks immediately
              isClickPrevented = true;
              // Start the game when the Click key is pressed
              startGame(host, app.id);
              // Reset the click flag after 2 second delay
              setTimeout(() => isClickPrevented = false, 2000);
            });

            // Append the game container to the game grid
            $('#game-grid').append(gameContainer);
          }
          // Load box art
          var boxArtPlaceholderImg = new Image();
          var appEntry = (_isSmartHubSupported && _previewApps[host.serverUid]) ? _previewApps[host.serverUid].apps.find(function(a) {
            return a.id === app.id; 
          }) : null;
          var boxArtPromise = new Promise(function(resolveBoxArt) {
            host.getBoxArt(app.id, _isSmartHubSupported).then(function(resolvedPromise) {
              boxArtPlaceholderImg.src = resolvedPromise;
              // The resolvedPromise is now the absolute file URI (or data URL if it failed to save).
              if (_isSmartHubSupported && _previewApps[host.serverUid] && appEntry) {
                // Resolve real TV IP because Smart Hub might block 127.0.0.1
                var tvIp = '127.0.0.1';
                try {
                  if (typeof webapis !== 'undefined' && webapis.network) {
                    tvIp = webapis.network.getIp();
                  }
                } catch(e) {
                  console.log('%c[index.js, showApps]', 'color: green;', 'Failed to get TV IP: ', e);
                }

                // Use deterministic filename so the local HTTP server route stays stable
                var filename = 'preview-' + app.id + '.jpg';
                var cacheBuster = '?v=' + Date.now();

                // Determine local path from resolvedPromise if it's a file URI
                if (resolvedPromise.startsWith('file://')) {
                  var localPngPath = resolvedPromise.replace('file://', '');
                  appEntry.txtPath = localPngPath;
                  appEntry.imageUri = 'http://' + tvIp + ':8888/' + filename + cacheBuster;
                  resolveBoxArt();
                } else {
                  try {
                    var documentsPath = tizen.filesystem.toURI('documents').replace('file://', '');
                    appEntry.txtPath = documentsPath + '/' + filename;
                    appEntry.imageUri = 'http://' + tvIp + ':8888/' + filename + cacheBuster;
                  } catch(err) {
                    appEntry.txtPath = '/opt/usr/home/owner/content/Documents/' + filename;
                    appEntry.imageUri = 'http://' + tvIp + ':8888/' + filename + cacheBuster;
                  }
                  resolveBoxArt();
                }

                // Early return to prevent the fallback synchronous resolveBoxArt from firing
                return;
              }
              resolveBoxArt();
            }, function(failedPromise) {
              console.error('%c[index.js, showApps]', 'color: green;', 'Error: Failed to retrieve box art for app ID: ' + app.id + '. Returned value was: ' + failedPromise + '. Host object: ', host, '\n' + host.toString()); // Logging both object (for console) and toString-ed object (for text logs)
              boxArtPlaceholderImg.src = 'static/res/placeholder_error.svg';
              resolveBoxArt();
            });
          });

          boxArtPlaceholderImg.onload = e => boxArtPlaceholderImg.classList.add('fade-in');
          $(gameContainer).append(boxArtPlaceholderImg);
          boxArtPromises.push(boxArtPromise);
        });

        // Check all game containers for the current running app and apply CSS styling accordingly
        stylizeBoxArts(host, sortedAppList);

        var settledPromises = boxArtPromises.map(function(p) {
          return p.catch(function(e) {
            console.error('%c[index.js, showApps]', 'color: green;', 'Error: Box art promise rejected with error: ', e);
            return e;
          });
        });

        var appToSelect = (host.currentGame != 0) ? host.currentGame : localStorage.getItem('lastOpenedApp_' + host.serverUid);
        if (appToSelect && window.Views && Views.Apps && Views.Apps.view) {
          var children = Views.Apps.view.func();
          for (var i = 0; i < children.length; i++) {
            if (children[i].id === 'game-container-' + appToSelect) {
              Views.Apps.view.index = i;
              break;
            }
          }
        }

        // Navigate to the Apps view
        showAppsMode();
        resolve();

        Promise.all(settledPromises).then(function() {
          // Resume background polling now that all box art downloads are complete
          beginBackgroundPollingOfHost(host);

          // Wait for all Smart Hub Preview JPEGs to finish encoding and saving to disk
          // before sending the updated data to the background service.
          var previewsDone = window.previewPromises || [];
          Promise.all(previewsDone).then(function() {
            savePreviewApps();
            updatePreviewData();
          });
        });
      }, function(failedAppList) {
        // Hide the spinner if the host has failed to retrieve the app list
        $('#wasmSpinner').hide();

        // Show the main header after the loading screen is complete
        $('#main-header').children().show();
        $('#main-header').css({'backgroundColor': '#333846', 'boxShadow': '0 0 4px 0 rgba(0, 0, 0, 1)'});

        console.error('%c[index.js, showApps]', 'color: green;', 'Error: Failed to get app list from ' + host.hostname + '. Host object: ', host, '\n' + host.toString()); // Logging both object (for console) and toString-ed object (for text logs)
        var errorAppListImg = new Image();
        errorAppListImg.src = 'static/res/applist_error.svg';
        $('#game-grid').html(errorAppListImg);
        snackbarLogLong('Unable to retrieve your list of apps at this time. Please refresh the list of apps or try again later!');

        // Navigate to the Apps view
        showAppsMode();
        reject(failedAppList);
      });
    }, 500);
  });
}

// Show a confirmation with the Quit App dialog before stopping the running app
function quitAppDialog() {
  if (api.currentGame === 0) {
    // If no app is running, show snackbar message
    snackbarLog('No app is currently running.');
    return;
  } else {
    api.getAppById(api.currentGame).then(function(currentGame) {
      // Find the existing overlay and dialog elements
      var quitAppOverlay = document.querySelector('#quitAppDialogOverlay');
      var quitAppDialog = document.querySelector('#quitAppDialog');

      // Change the dialog text element to include the game title
      document.getElementById('quitAppDialogText').innerHTML = t('Are you sure you want to quit %1$s? All unsaved data will be lost.', escapeHTML(currentGame.title));
      
      // Show the dialog and push the view
      quitAppOverlay.style.display = 'flex';
      quitAppDialog.showModal();
      isDialogOpen = true;
      Navigation.push(Views.QuitAppDialog);

      // Cancel the operation if the Cancel button is pressed
      $('#cancelQuitApp').off('click');
      $('#cancelQuitApp').on('click', function() {
        console.log('%c[index.js, quitAppDialog]', 'color: green;', 'Closing app dialog and returning.');
        quitAppOverlay.style.display = 'none';
        quitAppDialog.close();
        isDialogOpen = false;
        Navigation.pop();
        Navigation.switch();
      });

      // Quit the running app if the Continue button is pressed
      $('#continueQuitApp').off('click');
      $('#continueQuitApp').on('click', function() {
        console.log('%c[index.js, quitAppDialog]', 'color: green;', 'Quitting game, closing app dialog, and returning.');
        quitAppOverlay.style.display = 'none';
        quitAppDialog.close();
        isDialogOpen = false;
        Navigation.pop();
        stopGame(api, function() {
          // After stopping the game, set focus back to the 'Quit Running App' button
          setTimeout(() => Navigation.switch(), 3000);
        });
      });
    });
  }
}

// Handle layout elements when displaying the Stream view
function showStreamMode() {
  console.log('%c[index.js, showStreamMode]', 'color: green;', 'Entering "Show Stream" mode.');
  $('#main-header').hide();
  $('#main-content').children().not('#listener, #loadingSpinner').hide();
  $('#main-content').addClass('fullscreen');
  $('#listener').addClass('fullscreen');
  $('#loadingSpinner').css('display', 'inline-block');

  isInGame = true;
  fullscreenWasmModule();
  handleOnScreenOverlays();
  Navigation.stop();
}

// Maximize the size of the Wasm module by scaling and resizing appropriately
function fullscreenWasmModule() {
  var streamWidth = $('#selectResolution').data('value').split(':')[0];
  var streamHeight = $('#selectResolution').data('value').split(':')[1];
  var screenWidth = window.innerWidth;
  var screenHeight = window.innerHeight;

  var xRatio = screenWidth / streamWidth;
  var yRatio = screenHeight / streamHeight;

  var zoom = Math.min(xRatio, yRatio);

  var module = $('#wasm_module')[0];
  module.width = zoom * streamWidth;
  module.height = zoom * streamHeight;
  module.style.marginTop = ((screenHeight - module.height) / 2) + 'px';
}

// Handle on-screen overlays when the streaming session starts
function handleOnScreenOverlays() {
  // Find the existing toggle switch elements
  const disableWarningsSwitch = document.getElementById('disableWarningsSwitch');
  const performanceStatsSwitch = document.getElementById('performanceStatsSwitch');

  // Check if the disable warnings switch is checked, then hide or show the connection warning messages
  disableWarningsSwitch.checked ? $('#connection-warnings').css('display', 'none') : $('#connection-warnings').css('display', 'inline-block');

  // Check if the performance stats switch is checked, then show or hide the performance statistics information
  performanceStatsSwitch.checked ? $('#performance-stats').css('display', 'inline-block') : $('#performance-stats').css('display', 'none');
}

// Start the given appID. If another app is running, offer to quit it. Otherwise, if the given app is already running, just resume it.
function startGame(host, appID) {
  if (!host || !host.paired) {
    console.error('%c[index.js, startGame]', 'color: green;', 'Error: Attempted to start a game, but the host was not initialized properly! Host object: ', host);
    return;
  }
  localStorage.setItem('lastOpenedApp_' + host.serverUid, appID);

  // Start the audio scheduler of the Web Audio backend while we are still running inside the
  // handler of the key press that started the stream, because the audio context of a device
  // with an autoplay policy can only be created from a user gesture
  if (isWebAudioBackendSelected()) {
    startAudioScheduler();
  }

  // Refresh the server info, because the user might have quit the game
  host.refreshServerInfo().then(function(ret) {
    host.getAppById(appID).then(function(appToStart) {
      if (host.currentGame != 0 && host.currentGame != appID) {
        host.getAppById(host.currentGame).then(function(currentApp) {
          // Find the existing overlay and dialog elements
          var quitAppOverlay = document.querySelector('#quitAppDialogOverlay');
          var quitAppDialog = document.querySelector('#quitAppDialog');

          // Change the dialog text element to include the game title
          document.getElementById('quitAppDialogText').innerHTML = t('%1$s is already running. Would you like to quit it and start %2$s?', escapeHTML(currentApp.title), escapeHTML(appToStart.title));

          // Show the dialog and push the view
          quitAppOverlay.style.display = 'flex';
          quitAppDialog.showModal();
          isDialogOpen = true;
          Navigation.push(Views.QuitAppDialog);

          // Cancel the operation if the Cancel button is pressed
          $('#cancelQuitApp').off('click');
          $('#cancelQuitApp').on('click', function() {
            console.log('%c[index.js, startGame]', 'color: green;', 'Closing app dialog and returning.');
            quitAppOverlay.style.display = 'none';
            quitAppDialog.close();
            isDialogOpen = false;
            Navigation.pop();
          });

          // Quit the running app if the Continue button is pressed
          $('#continueQuitApp').off('click');
          $('#continueQuitApp').on('click', function() {
            console.log('%c[index.js, startGame]', 'color: green;', 'Quitting game, closing app dialog, and returning.');
            stopGame(host, function() {
              setTimeout(() => {
                // Scroll to the current game row
                Navigation.switch();
                // Switch to Apps view
                Navigation.change(Views.Apps);
              }, 1500);
              // Please, don't infinite loop with recursion
              setTimeout(() => startGame(host, appID), 3000);
            });
            quitAppOverlay.style.display = 'none';
            quitAppDialog.close();
            isDialogOpen = false;
            Navigation.pop();
          });

          return;
        }, function(failedCurrentApp) {
          console.error('%c[index.js, startGame]', 'color: green;', 'Error: Failed to get the current running app from ' + host.hostname + '\n Returned error was: ' + failedCurrentApp + '!', '\n Host object: ' + '\n', host, '\n' + host.toString()); // Logging both object (for console) and toString-ed object (for text logs)
          return;
        });
        return;
      }

      // Retrieve all stream configuration options from the Settings view
      var streamWidth = $('#selectResolution').data('value').split(':')[0];
      var streamHeight = $('#selectResolution').data('value').split(':')[1];
      var frameRate = $('#selectFramerate').data('value').toString();
      var bitrate = parseFloat($('#bitrateSlider').val()) * 1000;
      var rikey = generateRemoteInputKey();
      var rikeyid = generateRemoteInputKeyId();
      var gamepadMask = getConnectedGamepadMask();
      const framePacing = $('#framePacingSwitch').parent().hasClass('is-checked') ? 1 : 0;
      const optimizeGames = $('#optimizeGamesSwitch').parent().hasClass('is-checked') ? 1 : 0;
      const rumbleFeedback = $('#rumbleFeedbackSwitch').parent().hasClass('is-checked') ? 1 : 0;
      const mouseEmulation = $('#mouseEmulationSwitch').parent().hasClass('is-checked') ? 1 : 0;
      const flipABfaceButtons = $('#flipABfaceButtonsSwitch').parent().hasClass('is-checked') ? 1 : 0;
      const flipXYfaceButtons = $('#flipXYfaceButtonsSwitch').parent().hasClass('is-checked') ? 1 : 0;
      var audioBackend = $('#selectAudioBackend').data('value').toString();
      var audioConfig = $('#selectAudio').data('value').toString();
      const audioSync = $('#audioSyncSwitch').parent().hasClass('is-checked') ? 1 : 0;
      const audioJitter = parseInt($('#jitterSlider').val());
      const playHostAudio = $('#playHostAudioSwitch').parent().hasClass('is-checked') ? 1 : 0;
      const decryptHostAudio = $('#decryptHostAudioSwitch').parent().hasClass('is-checked') ? 1 : 0;
      var videoCodec = $('#selectCodec').data('value').toString();
      const hdrMode = $('#hdrModeSwitch').parent().hasClass('is-checked') ? 1 : 0;
      const fullRange = $('#fullRangeSwitch').parent().hasClass('is-checked') ? 1 : 0;
      const gameMode = $('#gameModeSwitch').parent().hasClass('is-checked') ? 1 : 0;
      const disableWarnings = $('#disableWarningsSwitch').parent().hasClass('is-checked') ? 1 : 0;
      const performanceStats = $('#performanceStatsSwitch').parent().hasClass('is-checked') ? 1 : 0;

      console.log('%c[index.js, startGame]', 'color: green;', 'startRequest:' + 
      '\n Host address: ' + host.address + ':' + host.httpPort + 
      '\n Video resolution: ' + streamWidth + 'x' + streamHeight + 
      '\n Video frame rate: ' + frameRate + ' FPS' + 
      '\n Video bitrate: ' + bitrate + ' Kbps' + 
      '\n Video frame pacing: ' + framePacing + 
      '\n Optimize game settings: ' + optimizeGames + 
      '\n Rumble feedback: ' + rumbleFeedback + 
      '\n Mouse emulation: ' + mouseEmulation + 
      '\n Flip A/B face buttons: ' + flipABfaceButtons + 
      '\n Flip X/Y face buttons: ' + flipXYfaceButtons + 
      '\n Audio backend: ' + audioBackend + 
      '\n Audio configuration: ' + audioConfig + 
      '\n Audio synchronization: ' + audioSync + 
      '\n Audio jitter buffer: ' + audioJitter + ' ms' +
      '\n Play host audio: ' + playHostAudio + 
      '\n Decrypt host audio: ' + decryptHostAudio + 
      '\n Video codec: ' + videoCodec + 
      '\n Video HDR mode: ' + hdrMode + 
      '\n Full color range: ' + fullRange + 
      '\n Game Mode: ' + gameMode + 
      '\n Disable connection warnings: ' + disableWarnings + 
      '\n Performance statistics: ' + performanceStats);

      // Hide on-screen overlays until the streaming session begins
      $('#connection-warnings, #performance-stats').css('background', 'transparent').text('');

      // Shows a loading message to launch the application and start stream mode
      $('#loadingSpinnerMessage').text(t('Starting %1$s...', appToStart.title));
      showStreamMode();

      // Check if user wants to resume the already-running app
      if (host.currentGame == appID) {
        // If the app is already running, we can just resume it
        return host.resumeApp(
          streamWidth + 'x' + streamHeight + 'x' + frameRate, // Resolution and frame rate
          optimizeGames, // Optimize game settings (SOPS)
          rikey, rikeyid, // Remote input key and key ID
          hdrMode, // Auto HDR video streaming
          playHostAudio, // Play audio on host and client device
          0x030002, // Surround channel mask << 16 | Surround channel count
          gamepadMask // Connect gamepad mask
        ).then(function(launchResult) {
          $xml = $($.parseXML(launchResult.toString()));
          $root = $xml.find('root');
          var status_code = $root.attr('status_code');
          var status_message = $root.attr('status_message');
          if (status_code != 200) {
            $('#loadingSpinnerMessage').text('');
            snackbarLogLong('Error %1$s: %2$s', status_code, status_message);
            showApps(host).then(() => {
              // Scroll to the current game row
              Navigation.switch();
              // Switch to Apps view
              Navigation.change(Views.Apps);
            });
            return;
          }
          // Start stream request
          sendMessage('startRequest', [
            host.address, host.httpPort, streamWidth, streamHeight, frameRate, bitrate.toString(), rikey, rikeyid.toString(),
            host.appVersion, host.gfeVersion, $root.find('sessionUrl0').text().trim(), host.serverCodecModeSupport,
            framePacing, optimizeGames, rumbleFeedback, mouseEmulation, flipABfaceButtons, flipXYfaceButtons,
            audioBackend, audioConfig, audioSync, audioJitter, playHostAudio, decryptHostAudio, videoCodec, hdrMode, fullRange,
            gameMode, disableWarnings, performanceStats
          ]);
        }, function(failedResumeApp) {
          console.error('%c[index.js, startGame]', 'color: green;', 'Error: Failed to resume app with id: ' + appID + '\n Returned error was: ' + failedResumeApp + '!');
          snackbarLog('Failed to resume %1$s', appToStart.title);
          showApps(host).then(() => {
            // Scroll to the current game row
            Navigation.switch();
            // Switch to Apps view
            Navigation.change(Views.Apps);
          });
          return;
        });
      }

      // If the user wants to launch the app, then we start launching it
      host.launchApp(
        appID, // App ID
        streamWidth + 'x' + streamHeight + 'x' + frameRate, // Resolution and frame rate
        optimizeGames, // Optimize game settings (SOPS)
        rikey, rikeyid, // Remote input key and key ID
        hdrMode, // Auto HDR video streaming
        playHostAudio, // Play audio on host and client device
        0x030002, // Surround channel mask << 16 | Surround channel count
        gamepadMask // Connect gamepad mask
      ).then(function(launchResult) {
        $xml = $($.parseXML(launchResult.toString()));
        $root = $xml.find('root');
        var status_code = $root.attr('status_code');
        var status_message = $root.attr('status_message');
        if (status_code != 200) {
          if (status_code == 4294967295 && status_message == 'Invalid') {
            // Special case handling an audio capture error which GFE doesn't provide any useful status message
            status_code = 418;
            status_message = t('Audio capture device is missing. Please reinstall the audio drivers.');
          }
          $('#loadingSpinnerMessage').text('');
          snackbarLogLong('Error %1$s: %2$s', status_code, status_message);
          showApps(host).then(() => {
            // Scroll to the current game row
            Navigation.switch();
            // Switch to Apps view
            Navigation.change(Views.Apps);
          });
          return;
        }
        // Start stream request
        sendMessage('startRequest', [
          host.address, host.httpPort, streamWidth, streamHeight, frameRate, bitrate.toString(), rikey, rikeyid.toString(),
          host.appVersion, host.gfeVersion, $root.find('sessionUrl0').text().trim(), host.serverCodecModeSupport,
          framePacing, optimizeGames, rumbleFeedback, mouseEmulation, flipABfaceButtons, flipXYfaceButtons,
          audioBackend, audioConfig, audioSync, audioJitter, playHostAudio, decryptHostAudio, videoCodec, hdrMode, fullRange,
          gameMode, disableWarnings, performanceStats
        ]);
      }, function(failedLaunchApp) {
        console.error('%c[index.js, startGame]', 'color: green;', 'Error: Failed to launch app with id: ' + appID + '\n Returned error was: ' + failedLaunchApp + '!');
        snackbarLog('Failed to launch %1$s', appToStart.title);
        showApps(host).then(() => {
          // Scroll to the current game row
          Navigation.switch();
          // Switch to Apps view
          Navigation.change(Views.Apps);
        });
        return;
      });
    });
  }, function(failedRefreshInfo) {
    console.error('%c[index.js, startGame]', 'color: green;', 'Error: Failed to refresh server info! Returned error was: ' + failedRefreshInfo + ' and failed server was: ' + '\n', host, '\n' + host.toString()); // Logging both object (for console) and toString-ed object (for text logs)
  });
}

// Stop the running app title, refresh the server info, and then return to Apps grid
function stopGame(host, callbackFunction) {
  isInGame = false;

  if (!host.paired) {
    return;
  }

  host.refreshServerInfo().then(function(ret) {
    host.getAppById(host.currentGame).then(function(runningApp) {
      if (!runningApp) {
        snackbarLog('No app is currently running.');
        return;
      }
      var appTitle = runningApp.title;
      snackbarLog('Quitting %1$s...', appTitle);
      host.quitApp().then(function(ret2) {
        snackbarLog('Successfully quit %1$s', appTitle);
        host.refreshServerInfo().then(function(ret3) {
          // Refresh to show no app is currently running
          showApps(host).finally(() => {
            if (typeof(callbackFunction) === "function") callbackFunction();
          });
        }, function(failedRefreshInfo2) {
          console.error('%c[index.js, stopGame]', 'color: green;', 'Error: Failed to refresh server info! Returned error was: ' + failedRefreshInfo2 + '! Failed server was: ' + '\n', host, '\n' + host.toString()); // Logging both object (for console) and toString-ed object (for text logs)
        });
      }, function(failedQuitApp) {
        console.error('%c[index.js, stopGame]', 'color: green;', 'Error: Failed to quit app! Returned error was: ' + failedQuitApp + '!');
      });
    }, function(failedGetApp) {
      console.error('%c[index.js, stopGame]', 'color: green;', 'Error: Failed to get app ID! Returned error was: ' + failedGetApp + '!');
    });
  }, function(failedRefreshInfo) {
    console.error('%c[index.js, stopGame]', 'color: green;', 'Error: Failed to refresh server info! Returned error was: ' + failedRefreshInfo + '!');
  });
}

// Send the Escape key using the keyboard event to the host
function sendEscapeKeyToHost() {
  Module.sendKeyboardEvent(0x80 << 8 | 0x1B, 0x03, 0); // Key down
  Module.sendKeyboardEvent(0x80 << 8 | 0x1B, 0x04, 0); // Key up
}

// Send a key combination to the host, pressing the keys in order and releasing them in reverse order
function sendKeyCombinationToHost(keyCodes) {
  // Modifier flags of the modifier keys: Left Shift, Left Ctrl, Left Alt and Left Windows
  const modifierFlags = { 0xA0: 0x01, 0xA2: 0x02, 0xA4: 0x04, 0x5B: 0x08 };
  var modifiers = 0;
  keyCodes.forEach(function(keyCode) {
    modifiers |= modifierFlags[keyCode] || 0;
    Module.sendKeyboardEvent(0x80 << 8 | keyCode, 0x03, modifiers); // Key down
  });
  keyCodes.slice().reverse().forEach(function(keyCode) {
    modifiers &= ~(modifierFlags[keyCode] || 0);
    Module.sendKeyboardEvent(0x80 << 8 | keyCode, 0x04, modifiers); // Key up
  });
}

// Create a Stream Menu option that sends a key combination to the host
function sendKeysMenuOption(id, keysLabel, keyCodes) {
  return {
    id: id,
    text: t('Send %1$s', keysLabel),
    action: function() {
      sendKeyCombinationToHost(keyCodes);
    }
  };
}

// Define the options of the Stream Menu in display order, add, remove or reorder entries here to change the menu
function getStreamMenuOptions() {
  return [
    sendKeysMenuOption('streamMenuSendWin', 'WIN', [0x5B]),
    sendKeysMenuOption('streamMenuSendAltTab', 'ALT + TAB', [0xA4, 0x09]),
    sendKeysMenuOption('streamMenuSendAltF4', 'ALT + F4', [0xA4, 0x73]),
    sendKeysMenuOption('streamMenuSendF11', 'F11', [0x7A]),
    {
      id: 'streamMenuToggleStats',
      text: t('Toggle performance stats'),
      action: function() {
        // Toggle performance stats overlay
        Module.toggleStats();
      }
    },
    {
      id: 'streamMenuDisconnect',
      text: t('Disconnect'),
      action: function() {
        // Terminate the connection
        Module.stopStream();
      }
    },
  ];
}

// Show the Stream Menu dialog over the streaming session
function streamMenuDialog() {
  // Create an overlay for the dialog and append it to the body
  var streamMenuDialogOverlay = $('<div>', {
    id: 'streamMenuDialogOverlay',
    class: 'dialog-overlay'
  }).appendTo(document.body);

  // Create the dialog element and append it to the overlay
  var streamMenuDialog = $('<dialog>', {
    id: 'streamMenuDialog',
    class: 'mdl-dialog'
  }).appendTo(streamMenuDialogOverlay);

  // Add the dialog title
  $('<h3>', {
    id: 'streamMenuDialogTitle',
    class: 'mdl-dialog__title',
    'data-i18n': 'Stream Menu',
    text: t('Stream Menu')
  }).appendTo(streamMenuDialog);

  // Create a content section inside the dialog
  var streamMenuDialogContent = $('<div>', {
    class: 'mdl-dialog__content'
  }).appendTo(streamMenuDialog);

  // Loop through each option to create a button in the dialog
  getStreamMenuOptions().forEach(function(menuOption) {
    var streamMenuDialogOption = $('<button>', {
      type: 'button',
      id: menuOption.id,
      class: 'mdl-button mdl-js-button mdl-button--raised mdl-button--colored mdl-js-ripple-effect',
      text: menuOption.text
    });
    // Close the dialog and trigger the action if the Option button is pressed
    streamMenuDialogOption.click(function() {
      closeStreamMenuDialog(true);
      menuOption.action();
    });
    // Append the button to the dialog content
    streamMenuDialogOption.appendTo(streamMenuDialogContent);
  });

  // Create the actions section inside the dialog
  var streamMenuDialogActions = $('<div>', {
    class: 'mdl-dialog__actions'
  }).appendTo(streamMenuDialog);

  // Create and set up the Close button, and close the dialog if it is pressed
  $('<button>', {
    type: 'button',
    id: 'closeStreamMenu',
    class: 'mdl-button mdl-js-button mdl-button--raised mdl-button--colored mdl-js-ripple-effect',
    'data-i18n': 'Close',
    text: t('Close')
  }).click(function() {
    console.log('%c[index.js, streamMenuDialog]', 'color: green;', 'Closing app dialog and returning.');
    closeStreamMenuDialog(true);
  }).appendTo(streamMenuDialogActions);

  // If the dialog element doesn't support the showModal method, register it with dialogPolyfill
  if (!streamMenuDialog[0].showModal) {
    dialogPolyfill.registerDialog(streamMenuDialog[0]);
  }

  // Release the mouse while the dialog is open, otherwise the 'Back' key releases the mouse instead of closing the dialog
  if (document.pointerLockElement) {
    document.exitPointerLock();
  }
  // Ignore the mouse movement while the dialog is open, since releasing the mouse moves the pointer and removes the focus from the dialog
  window.addEventListener('mousemove', stopMouseMovePropagation, true);

  // Show the dialog, start on the first option, and enable the navigation while the dialog is open
  $(streamMenuDialogOverlay).css('display', 'flex');
  streamMenuDialog[0].showModal();
  isDialogOpen = true;
  Views.StreamMenuDialog.view.index = 0;
  Navigation.start();
  Navigation.push(Views.StreamMenuDialog);
  setTimeout(() => Navigation.switch(), 5);
}

// Close the Stream Menu dialog if it is open, and optionally return the input to the streaming session
function closeStreamMenuDialog(returnToStream) {
  var streamMenuDialogOverlay = $('#streamMenuDialogOverlay');
  if (streamMenuDialogOverlay.length === 0) {
    return;
  }

  Navigation.pop();
  Navigation.stop();
  window.removeEventListener('mousemove', stopMouseMovePropagation, true);
  $('#streamMenuDialog')[0].close();
  streamMenuDialogOverlay.remove();
  isDialogOpen = false;

  if (returnToStream) {
    // Move focus back to the streaming session, so the keys are sent to the host again
    var videoElement = document.getElementById('wasm_module');
    videoElement.focus();
    // Simulate mouse to lock the mouse again only if the lock was lost, since a locked mouse would send a click to the host
    if (document.pointerLockElement !== videoElement) {
      videoElement.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true, cancelable: true, view: window, clientX: 0, clientY: 0
      }));
    }
  }
}

// Stop a mouse movement event before it reaches the navigation and the streaming session
function stopMouseMovePropagation(e) {
  e.stopPropagation();
}

// Open or close the Stream Menu dialog while the video stream is displayed
function toggleStreamMenuDialog() {
  if ($('#streamMenuDialogOverlay').length > 0) {
    closeStreamMenuDialog(true);
  } else if (!isDialogOpen && document.getElementById('wasm_module').style.display !== 'none') {
    streamMenuDialog();
  }
}

let indexedDB = null;
const dbVersion = 1.0;
let db = null;
const dbName = 'GameStreamingDB';
const storeName = 'GameStreamingStore';

// Based on example from https://hacks.mozilla.org/2012/02/storing-images-and-files-in-indexeddb/
function createObjectStore(dataBase) {
  if (!dataBase.objectStoreNames.contains(storeName)) {
    dataBase.createObjectStore(storeName);
  }
}

function openIndexDB(callback) {
  if (db) {
    // Database already opened
    callback();
    return;
  }

  console.log('%c[index.js, openIndexDB]', 'color: green;', 'Opening IndexedDB...');
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persisted().then(persistent => {
      if (persistent) {
        console.log('%c[index.js, openIndexDB]', 'color: green;', 'Storage will not be cleared except by explicit user action.');
      } else {
        console.log('%c[index.js, openIndexDB]', 'color: green;', 'Storage may be cleared by the UA under storage pressure.');
      }
    });
  } else {
    console.warn('%c[index.js, openIndexDB]', 'color: green;', 'Warning: Persistent storage is not available!');
  }

  if (!indexedDB) {
    indexedDB = self.indexedDB || self.webkitIndexedDB || self.mozIndexedDB || self.OIndexedDB || self.msIndexedDB;
  }

  // Create/open database
  const request = indexedDB.open(dbName, dbVersion);

  request.onerror = function(e) {
    console.error('%c[index.js, openIndexDB]', 'color: green;', 'Error: Cannot create or access the IndexedDB database: ', e);
  };

  request.onsuccess = function(e) {
    console.log('%c[index.js, openIndexDB]', 'color: green;', 'Successfully created or accessed the IndexedDB database: ', e);
    db = request.result;

    db.onerror = function(e) {
      console.error('%c[index.js, openIndexDB]', 'color: green;', 'Error: Failed to create or access the IndexedDB database: ', e);
    };

    // Interim solution to create an objectStore
    if (db.setVersion && db.version != dbVersion) {
      const setVersion = db.setVersion(dbVersion);
      setVersion.onsuccess = function() {
        createObjectStore(db);
        callback();
      };
    } else {
      callback();
    }
  };

  request.onupgradeneeded = function(e) {
    createObjectStore(e.target.result);
  };
}

function callCb(key, value, callbackFunction) {
  let obj = {};
  obj[key] = value;
  callbackFunction(obj);
}

function getData(key, callbackFunction) {
  let cb = function() {
    try {
      // Open a transaction to the database
      const transaction = db.transaction(storeName, 'readonly');
      const readRequest = transaction.objectStore(storeName).get(key);

      // Retrieve the data that was stored
      readRequest.onsuccess = function(e) {
        console.log('%c[index.js, getData]', 'color: green;', 'Reading data from DB key: ' + key + ' with value: ' + readRequest.result);
        let value = null;
        if (readRequest.result) {
          value = JSON.parse(readRequest.result);
        }
        callCb(key, value, callbackFunction);
      };

      transaction.onerror = function(e) {
        console.error('%c[index.js, getData]', 'color: green;', 'Error: Unable to read data at the: ' + key + ' from IndexedDB: ' + e);
        callCb(key, value, callbackFunction);
      };
    } catch (err) {
      console.error('%c[index.js, getData]', 'color: green;', 'Error: Something went wrong while reading data at the key: ' + key + ' from IndexedDB: ' + err);
      callCb(key, value, callbackFunction);
    }
  };

  if (db) {
    cb();
  } else {
    openIndexDB(cb);
  }
}

function storeData(key, data, callbackFunction) {
  let cb = function() {
    try {
      // Open a transaction to the database
      const transaction = db.transaction(storeName, 'readwrite');
      // Put the text into the database
      const put = transaction.objectStore(storeName).put(JSON.stringify(data), key);

      transaction.oncomplete = function(e) {
        console.log('%c[index.js, storeData]', 'color: green;', 'Storing data at key: ' + key + ' with data: ' + JSON.stringify(data));
        if (callbackFunction) {
          callbackFunction();
        }
      };

      transaction.onerror = function(e) {
        console.error('%c[index.js, storeData]', 'color: green;', 'Error: Unable to store data in IndexedDB: ' + e);
      };
    } catch (err) {
      console.error('%c[index.js, storeData]', 'color: green;', 'Error: Something went wrong while storing data at the key: ' + key + ' from IndexedDB: ' + err);
    }
  };

  if (db) {
    cb();
  } else {
    openIndexDB(cb);
  }
}

// Storing data takes the data as an object, and shoves it into JSON to store.
// Unfortunately, objects with function instances (classes) are stripped of their function instances
// when converted to a raw object, so we cannot forget to revive the object after we load it.
function saveHosts() {
  storeData('hosts', hosts, null);
}

function savePreviewApps() {
  if (!_isSmartHubSupported) {
    return;
  }
  console.log('%c[index.js, savePreviewApps]', 'color: green;', 'Saving preview apps data: ' + JSON.stringify(_previewApps));
  storeData('previewApps', _previewApps, null);
}

function saveResolution() {
  var chosenResolution = $(this).data('value');
  $('#selectResolution').text($(this).text()).attr('data-value', chosenResolution).data('value', chosenResolution);
  console.log('%c[index.js, saveResolution]', 'color: green;', 'Saving resolution value: ' + chosenResolution);
  storeData('resolution', chosenResolution, null);

  // Update the bitrate value based on the selected resolution
  $('#optimizeBitrateSwitch').prop('checked') ? optimizeBitratePresets() : standardBitratePresets();
  // Trigger warning check after changing video resolution
  warnResolutionFramerate();
}

function saveFramerate() {
  var chosenFramerate = $(this).data('value');
  $('#selectFramerate').text($(this).text()).attr('data-value', chosenFramerate).data('value', chosenFramerate);
  console.log('%c[index.js, saveFramerate]', 'color: green;', 'Saving framerate value: ' + chosenFramerate);
  storeData('frameRate', chosenFramerate, null);

  // Update the bitrate value based on the selected frame rate
  $('#optimizeBitrateSwitch').prop('checked') ? optimizeBitratePresets() : standardBitratePresets();
  // Trigger warning check after changing video frame rate
  warnResolutionFramerate();
}

function warnResolutionFramerate() {
  var chosenResolutionWidth = $('#selectResolution').data('value').split(':')[0];
  var chosenResolutionHeight = $('#selectResolution').data('value').split(':')[1];
  var chosenFramerate = $('#selectFramerate').data('value');

  // Video resolution and frame rate warning
  if (!resFpsWarning && chosenResolutionWidth > '1920' && chosenResolutionHeight > '1080' && chosenFramerate > '60') {
    // Warn only if video resolution is greater than 1080p and frame rate is greater than 60 FPS
    snackbarLogLong('Warning: This resolution and frame rate may not perform well on lower-end devices or slower connections!');
    // Set flag for video resolution and frame rate warning
    resFpsWarning = true;
  } else if (resFpsWarning && (chosenResolutionWidth <= '1920' || chosenResolutionHeight <= '1080' || chosenFramerate <= '60')) {
    // Reset the flag for video resolution and frame rate warning if the condition goes back to normal (1080p and 60 FPS)
    resFpsWarning = false;
  }
}

function saveBitrate() {
  var chosenBitrate = $('#bitrateSlider').val();
  $('#selectBitrate').html(chosenBitrate + ' Mbps');
  console.log('%c[index.js, saveBitrate]', 'color: green;', 'Saving bitrate value: ' + chosenBitrate);
  storeData('bitrate', chosenBitrate, null);

  // Trigger warning check after changing video bitrate
  warnBitrate();
}

function warnBitrate() {
  var chosenBitrate = $('#bitrateSlider').val();

  // Video bitrate warning
  if (!bitrateWarning && chosenBitrate > 100) {
    // Warn only if video bitrate is greater than 100 Mbps
    snackbarLogLong('Warning: Higher bitrate may cause playback interruptions and performance issues, please try with caution!');
    // Set flag for video bitrate warning
    bitrateWarning = true;
  } else if (bitrateWarning && chosenBitrate <= 100) {
    // Reset the flag for video bitrate warning if the condition goes back to normal (100 Mbps)
    bitrateWarning = false;
  }
}

function standardBitratePresets() {
  console.log('%c[index.js, standardBitratePresets]', 'color: green;', 'Applying standard bitrate presets...');
  var res = $('#selectResolution').data('value');
  var frameRate = $('#selectFramerate').data('value').toString();

  // Set the bitrate based on the selected resolution and frame rate
  if (res === '854:480') { // 480p
    if (frameRate === '30') { // 30 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('2');
    } else if (frameRate === '60') { // 60 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('4');
    } else if (frameRate === '90') { // 90 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('5');
    } else if (frameRate === '120') { // 120 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('6');
    } else if (frameRate === '144') { // 144 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('8');
    }
  } else if (res === '1280:720') { // 720p
    if (frameRate === '30') { // 30 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('5');
    } else if (frameRate === '60') { // 60 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('10');
    } else if (frameRate === '90') { // 90 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('12');
    } else if (frameRate === '120') { // 120 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('15');
    } else if (frameRate === '144') { // 144 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('18');
    }
  } else if (res === '1920:1080') { // 1080p
    if (frameRate === '30') { // 30 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('10');
    } else if (frameRate === '60') { // 60 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('20');
    } else if (frameRate === '90') { // 90 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('25');
    } else if (frameRate === '120') { // 120 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('30');
    } else if (frameRate === '144') { // 144 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('35');
    }
  } else if (res === '2560:1440') { // 1440p
    if (frameRate === '30') { // 30 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('20');
    } else if (frameRate === '60') { // 60 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('40');
    } else if (frameRate === '90') { // 90 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('50');
    } else if (frameRate === '120') { // 120 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('60');
    } else if (frameRate === '144') { // 144 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('70');
    }
  } else if (res === '3840:2160') { // 2160p
    if (frameRate === '30') { // 30 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('40');
    } else if (frameRate === '60') { // 60 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('80');
    } else if (frameRate === '90') { // 90 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('100');
    } else if (frameRate === '120') { // 120 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('120');
    } else if (frameRate === '144') { // 144 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('140');
    }
  } else {
    // Unrecognized option! In case someone screws with the JS to add custom resolutions.
    $('#bitrateSlider')[0].MaterialSlider.change('10');
  }

  // Update the bitrate value
  saveBitrate();
}

function optimizeBitratePresets() {
  console.log('%c[index.js, optimizeBitratePresets]', 'color: green;', 'Applying optimize bitrate presets...');
  var width = parseInt($('#selectResolution').data('value').split(':')[0]);
  var height = parseInt($('#selectResolution').data('value').split(':')[1]);
  var frameRate = $('#selectFramerate').data('value').toString();
  var videoCodec = $('#selectCodec').data('value').toString();
  var hdrMode = $('#hdrModeSwitch').parent().hasClass('is-checked') ? 1 : 0;

  // Multiplier to adjust bitrate based on codec efficiency
  // Sweet-spot formula reference: https://www.reddit.com/r/MoonlightStreaming/comments/1gg2cdy/sweet_spot_bitrate/
  var codecMultiplier = {
    "H264": 1.0,
    "HEVC": 0.6,
    "AV1": 0.4
  }[videoCodec];

  // Bitrate factor depends on HDR state
  var bitrateFactor = hdrMode ? 6630.5 : 8309;

  // Calculate optimized bitrate based on resolution, framerate, codec efficiency, and HDR state
  var baseBitrate = width * height * frameRate / bitrateFactor;
  var finalBitrate = Math.round(baseBitrate * codecMultiplier);

  // Apply the default bitrate value in case of invalid calculation
  if (finalBitrate <= 0) {
    finalBitrate = 10;
  }

  // Set the bitrate slider value based on the calculated optimized bitrate
  $('#bitrateSlider')[0].MaterialSlider.change(finalBitrate / 1000);

  // Update the bitrate value
  saveBitrate();
}

function saveFramePacing() {
  setTimeout(() => {
    const chosenFramePacing = $('#framePacingSwitch').parent().hasClass('is-checked');
    console.log('%c[index.js, saveFramePacing]', 'color: green;', 'Saving frame pacing state: ' + chosenFramePacing);
    storeData('framePacing', chosenFramePacing, null);
  }, 100);
}

function saveLanguagePreference() {
  var chosenLanguage = $(this).data('value') || 'auto';
  $('#selectLanguage').text($(this).text()).attr('data-value', chosenLanguage).data('value', chosenLanguage);
  console.log('%c[index.js, saveLanguagePreference]', 'color: green;', 'Saving language preference value: ' + chosenLanguage);
  if (window.i18n && typeof window.i18n.applyLanguagePreference === 'function') {
    window.i18n.applyLanguagePreference(chosenLanguage).catch((error) => {
      console.warn('%c[index.js, saveLanguagePreference]', 'color: green;', 'Warning: failed to apply language: ' + error);
    });
  }
}

function saveIpAddressFieldMode() {
  setTimeout(() => {
    const chosenIpAddressFieldMode = $('#ipAddressFieldModeSwitch').parent().hasClass('is-checked');
    console.log('%c[index.js, saveIpAddressFieldMode]', 'color: green;', 'Saving IP address field mode state: ' + chosenIpAddressFieldMode);
    storeData('ipAddressFieldMode', chosenIpAddressFieldMode, null);
  }, 100);
}

function saveSortAppsList() {
  setTimeout(() => {
    const chosenSortAppsList = $('#sortAppsListSwitch').parent().hasClass('is-checked');
    console.log('%c[index.js, saveSortAppsList]', 'color: green;', 'Saving sort apps list state: ' + chosenSortAppsList);
    storeData('sortAppsList', chosenSortAppsList, null);
    
    // Instantly update the Smart Hub Preview to reflect the new sort order
    const sortOrder = chosenSortAppsList ? 'DESC' : 'ASC';
    let updated = false;
    Object.keys(_previewApps).forEach(function(serverUid) {
      if (_previewApps[serverUid] && _previewApps[serverUid].apps) {
        _previewApps[serverUid].apps = sortTitles(_previewApps[serverUid].apps, sortOrder);
        updated = true;
      }
    });
    if (updated) {
      savePreviewApps();
      updatePreviewData();
    }
  }, 100);
}

function saveOptimizeGames() {
  setTimeout(() => {
    const chosenOptimizeGames = $('#optimizeGamesSwitch').parent().hasClass('is-checked');
    console.log('%c[index.js, saveOptimizeGames]', 'color: green;', 'Saving optimize games state: ' + chosenOptimizeGames);
    storeData('optimizeGames', chosenOptimizeGames, null);
  }, 100);
}

function saveRumbleFeedback() {
  setTimeout(() => {
    const chosenRumbleFeedback = $('#rumbleFeedbackSwitch').parent().hasClass('is-checked');
    console.log('%c[index.js, saveRumbleFeedback]', 'color: green;', 'Saving rumble feedback state: ' + chosenRumbleFeedback);
    storeData('rumbleFeedback', chosenRumbleFeedback, null);
  }, 100);
}

function saveMouseEmulation() {
  setTimeout(() => {
    const chosenMouseEmulation = $('#mouseEmulationSwitch').parent().hasClass('is-checked');
    console.log('%c[index.js, saveMouseEmulation]', 'color: green;', 'Saving mouse emulation state: ' + chosenMouseEmulation);
    storeData('mouseEmulation', chosenMouseEmulation, null);
  }, 100);
}

function saveFlipABfaceButtons() {
  setTimeout(() => {
    const chosenFlipABfaceButtons = $('#flipABfaceButtonsSwitch').parent().hasClass('is-checked');
    console.log('%c[index.js, saveFlipABfaceButtons]', 'color: green;', 'Saving flip A/B face buttons state: ' + chosenFlipABfaceButtons);
    storeData('flipABfaceButtons', chosenFlipABfaceButtons, null);
  }, 100);
}

function saveFlipXYfaceButtons() {
  setTimeout(() => {
    const chosenFlipXYfaceButtons = $('#flipXYfaceButtonsSwitch').parent().hasClass('is-checked');
    console.log('%c[index.js, saveFlipXYfaceButtons]', 'color: green;', 'Saving flip X/Y face buttons state: ' + chosenFlipXYfaceButtons);
    storeData('flipXYfaceButtons', chosenFlipXYfaceButtons, null);
  }, 100);
}

function saveAudioBackend() {
  var chosenAudioBackend = $(this).data('value');
  $('#selectAudioBackend').text($(this).text()).attr('data-value', chosenAudioBackend).data('value', chosenAudioBackend);
  console.log('%c[index.js, saveAudioBackend]', 'color: green;', 'Saving audioBackend value: ' + chosenAudioBackend);
  storeData('audioBackend', chosenAudioBackend, null);

  // Show only the settings that apply to the selected audio backend
  updateAudioBackendSettings();
}

// The audio backends do not share their tuning settings, so only show the
// settings that the selected backend actually uses while streaming
function updateAudioBackendSettings() {
  // Check if the audio output is disabled in the audio backend setting
  if (isAudioOutputDisabled()) {
    // Neither setting applies when the audio stream is discarded
    $('#audioConfigOption').hide();
    $('#audioSyncOption').hide();
    $('#audioJitterOption').hide();
    $('#decryptHostAudioOption').hide();
  } else {
    // These two settings apply to all active backends, so show them normally
    $('#audioConfigOption').show();
    $('#decryptHostAudioOption').show();
    // Check which backend is selected and show the appropriate setting for that backend
    if (isWebAudioBackendSelected()) {
      // The Web Audio backend schedules the audio itself using the jitter buffer
      $('#audioSyncOption').hide();
      $('#audioJitterOption').show();
    } else {
      // The EMSS backend drops audio packets to stay in sync instead of buffering them
      $('#audioJitterOption').hide();
      $('#audioSyncOption').show();
    }
  }
}

// Check whether the Web Audio backend is the currently selected audio backend
function isWebAudioBackendSelected() {
  return $('#selectAudioBackend').data('value') === 'WebAudio';
}

// Check whether the audio output is disabled in the audio backend setting
function isAudioOutputDisabled() {
  return $('#selectAudioBackend').data('value') === 'Disabled';
}

function saveAudioConfiguration() {
  var chosenAudioConfig = $(this).data('value');
  $('#selectAudio').text($(this).text()).attr('data-value', chosenAudioConfig).data('value', chosenAudioConfig);
  console.log('%c[index.js, saveAudioConfiguration]', 'color: green;', 'Saving audioConfig value: ' + chosenAudioConfig);
  storeData('audioConfig', chosenAudioConfig, null);

  // Trigger warning check after changing audio configuration
  warnAudioConfiguration();
}

function warnAudioConfiguration() {
  var chosenAudioConfig = $('#selectAudio').data('value');

  // Audio configuration warning
  if (!audioWarning && (chosenAudioConfig === '71Surround' || chosenAudioConfig === '51Surround')) {
    // Warn only if audio configuration is selected to 5.1 or 7.1 Surround
    snackbarLogLong('Warning: Surround Sound (5.1/7.1) may not be supported by your TV and is not guaranteed to work due to platform limitations!');
    // Set flag for audio configuration warning
    audioWarning = true;
  } else if (audioWarning && (chosenAudioConfig === 'Stereo')) {
    // Reset the flag for audio configuration warning if the condition goes back to normal (Stereo)
    audioWarning = false;
  }
}

function saveAudioSync() {
  setTimeout(() => {
    const chosenAudioSync = $('#audioSyncSwitch').parent().hasClass('is-checked');
    console.log('%c[index.js, saveAudioSync]', 'color: green;', 'Saving audio sync state: ' + chosenAudioSync);
    storeData('audioSync', chosenAudioSync, null);
  }, 100);
}

function saveAudioJitter() {
  var chosenAudioJitter = $('#jitterSlider').val();
  $('#selectAudioJitter').html(chosenAudioJitter + ' ms');
  console.log('%c[index.js, saveAudioJitter]', 'color: green;', 'Saving audio jitter buffer: ' + chosenAudioJitter);
  storeData('audioJitter', chosenAudioJitter, null);
}

function savePlayHostAudio() {
  setTimeout(() => {
    const chosenPlayHostAudio = $('#playHostAudioSwitch').parent().hasClass('is-checked');
    console.log('%c[index.js, savePlayHostAudio]', 'color: green;', 'Saving play host audio state: ' + chosenPlayHostAudio);
    storeData('playHostAudio', chosenPlayHostAudio, null);
  }, 100);
}

function saveDecryptHostAudio() {
  setTimeout(() => {
    const chosenDecryptHostAudio = $('#decryptHostAudioSwitch').parent().hasClass('is-checked');
    console.log('%c[index.js, saveDecryptHostAudio]', 'color: green;', 'Saving decrypt host audio state: ' + chosenDecryptHostAudio);
    storeData('decryptHostAudio', chosenDecryptHostAudio, null);

    // Warning when enabling decrypt host audio for non-Wolf/Punktfunk-style hosts
    if (chosenDecryptHostAudio) {
      // Show a warning message when enabling decrypt host audio
      snackbarLogLong('Warning: Enable this only for Wolf or Punktfunk-style hosts, and leave it disabled for Sunshine or GameStream hosts to avoid audio streaming issues!');
    }
  }, 100);
}

function saveVideoCodec() {
  var chosenVideoCodec = $(this).data('value');
  const selectedH264Codec = $('#h264').data('value');
  const enabledHdrMode = $('#hdrModeSwitch').parent().hasClass('is-checked');

  // Check if HDR mode is enabled and prevent any incompatible HDR codec from being selected
  if (enabledHdrMode && chosenVideoCodec === selectedH264Codec) { // Selecting H.264 while HDR mode is enabled
    // H.264 does not support HDR profile, so stay on H.264 codec
    updateVideoCodec('#h264', selectedH264Codec);
    snackbarLog('HDR has been disabled due to unsupported H.264 codec.');
    // Turn off the HDR mode switch and save the state
    document.querySelector('#hdrModeBtn').MaterialSwitch.off();
    updateHdrMode();
  } else { // Selecting other video codecs while HDR mode is disabled
    // Continue to select the SDR profile of other video codecs
    updateVideoCodec(this, chosenVideoCodec);
  }
}

function updateVideoCodec(chosenCodecId, chosenCodecValue) {
  $('#selectCodec').text($(chosenCodecId).text()).attr('data-value', chosenCodecValue).data('value', chosenCodecValue);
  console.log('%c[index.js, updateVideoCodec]', 'color: green;', 'Saving video codec value: ' + chosenCodecValue);
  storeData('videoCodec', chosenCodecValue, null);

  // Update the bitrate value based on the selected codec
  if ($('#optimizeBitrateSwitch').prop('checked')) {
    optimizeBitratePresets();
  }
  // Trigger warning check after changing video codec
  warnVideoCodec();
}

function warnVideoCodec() {
  var chosenVideoCodec = $('#selectCodec').data('value');

  // Video codec warning
  if (!codecWarning && (chosenVideoCodec === 'AV1')) {
    // Warn only if video codec is selected to AV1
    snackbarLogLong('Warning: Selected codec may not be supported by your host PC and may significantly slow down performance!');
    // Set flag for video codec warning
    codecWarning = true;
  } else if (codecWarning && (chosenVideoCodec === 'HEVC' || chosenVideoCodec === 'H264')) {
    // Reset the flag for video codec warning if the condition goes back to normal (HEVC or H.264)
    codecWarning = false;
  }
}

function saveHdrMode() {
  setTimeout(() => {
    var selectedVideoCodec = $('#selectCodec').data('value');
    const chosenH264Codec = $('#h264').data('value');
    const chosenHevcCodec = $('#hevc').data('value');
    const chosenAv1Codec = $('#av1').data('value');

    // Handle HDR mode switch based on the selected codec
    if (selectedVideoCodec === chosenH264Codec) { // H.264
      // H.264 does not support HDR profile, so stay on H.264 codec
      snackbarLog('H.264 codec does not support the HDR profile.');
      // Turn off the HDR mode switch and save the state
      document.querySelector('#hdrModeBtn').MaterialSwitch.off();
      updateHdrMode();
    } else if (selectedVideoCodec === chosenHevcCodec) { // HEVC
      // Select the HDR profile of the HEVC codec (HEVC Main10)
      // Toggle the HDR mode switch and save the state
      updateHdrMode();
    } else if (selectedVideoCodec === chosenAv1Codec) { // AV1
      // Select the HDR profile of the AV1 codec (AV1 Main10)
      // Toggle the HDR mode switch and save the state
      updateHdrMode();
    } else { // Undefined
      // Unknown codec format does not support HDR profile
      snackbarLog('Selected codec does not support the HDR profile.');
      // Turn off the HDR mode switch and save the state
      document.querySelector('#hdrModeBtn').MaterialSwitch.off();
      updateHdrMode();
    }
  }, 100);
}

function updateHdrMode() {
  setTimeout(() => {
    const chosenHdrMode = $('#hdrModeSwitch').parent().hasClass('is-checked');
    console.log('%c[index.js, updateHdrMode]', 'color: green;', 'Saving HDR mode state: ' + chosenHdrMode);
    storeData('hdrMode', chosenHdrMode, null);

    // Update the bitrate value based on the selected HDR state
    if ($('#optimizeBitrateSwitch').prop('checked')) {
      optimizeBitratePresets();
    }
  }, 100);
}

function saveFullRange() {
  setTimeout(() => {
    const chosenFullRange = $('#fullRangeSwitch').parent().hasClass('is-checked');
    console.log('%c[index.js, saveFullRange]', 'color: green;', 'Saving full range state: ' + chosenFullRange);
    storeData('fullRange', chosenFullRange, null);
  }, 100);
}

function saveGameMode() {
  setTimeout(() => {
    const chosenGameMode = $('#gameModeSwitch').parent().hasClass('is-checked');
    console.log('%c[index.js, saveGameMode]', 'color: green;', 'Saving game mode state: ' + chosenGameMode);
    storeData('gameMode', chosenGameMode, null);

    // Check if the Tizen version is 9.0 or higher and the Game Mode is turned on
    if (parseFloat(platformVer) >= 9.0 && chosenGameMode) {
      // Show a warning dialog when turning on Game Mode on Tizen 9.0 or higher
      setTimeout(() => {
        warningDialog(t('Compatibility Warning'),
          t('Game Mode (Ultra Low Latency) is not compatible with Tizen %1$s due to platform changes introduced by Samsung.', platformVer) + 
          t('Enabling this option may result in video freezing on the first rendered frame, black screen, unstable performance, and other streaming issues.<br><br>') + 
          t('For more information about this incompatibility, including available workarounds and potential limitations, please refer to the <b>Known Issues &amp; Limitations</b> page on the Wiki.')
        );
      }, 250);
    } else if (parseFloat(platformVer) < 9.0 && !chosenGameMode) { // Check if the Tizen version is lower than 9.0 and the Game Mode is turned off
      // Show a warning message when turning off Game Mode on compatible Tizen versions
      snackbarLogLong('Warning: Disabling game mode may increase latency and affect your game streaming performance!');
    }
  }, 100);
}

function saveUnlockAllFps() {
  setTimeout(() => {
    const chosenUnlockAllFps = $('#unlockAllFpsSwitch').parent().hasClass('is-checked');
    console.log('%c[index.js, saveUnlockAllFps]', 'color: green;', 'Saving unlock all FPS state: ' + chosenUnlockAllFps);
    storeData('unlockAllFps', chosenUnlockAllFps, null);

    // Warning when enabling higher FPS options
    if (chosenUnlockAllFps) {
      // Show a warning message when enabling higher FPS options
      snackbarLogLong('Warning: Higher frame rates may not be fully supported by your TV and do not guarantee a smoother experience. Performance issues may occur due to platform limitations!');
    }
  }, 100);
}

function handleUnlockAllFps() {
  var currentFps = $('#selectFramerate').data('value');
  const addFramerate = $('.videoFramerateMenu').find('li[data-value="60"]');

  // Check if the Unlock all FPS switch is checked
  if ($('#unlockAllFpsSwitch').prop('checked')) {
    console.log('%c[index.js, handleUnlockAllFps]', 'color: green;', 'Adding higher framerate options: 90, 120, 144 FPS');
    // Check if any of the higher FPS options are absent to avoid duplicates
    if (!$('.videoFramerateMenu').find('li[data-value="90"], li[data-value="120"], li[data-value="144"]').length) {
      // Insert all higher FPS options in correct order (90, 120, 144)
      addFramerate.after(`
        <li class="mdl-menu__item" data-value="90" data-i18n="90 FPS">90 FPS</li>
        <li class="mdl-menu__item" data-value="120" data-i18n="120 FPS">120 FPS</li>
        <li class="mdl-menu__item" data-value="144" data-i18n="144 FPS">144 FPS</li>
      `);
      // Attach click listeners only to the newly added FPS options
      $('.videoFramerateMenu li[data-value="90"], li[data-value="120"], li[data-value="144"]').on('click', saveFramerate);
    }
  } else {
    console.log('%c[index.js, handleUnlockAllFps]', 'color: green;', 'Removing higher framerate options: 90, 120, 144 FPS');
    // If unchecked, remove the higher FPS options from the selection menu
    $('.videoFramerateMenu li[data-value="90"], li[data-value="120"], li[data-value="144"]').remove();
    // After removal, if a higher FPS option remains selected, then reset it to the default option
    if (['90', '120', '144'].includes(String(currentFps))) {
      $('#selectFramerate').text('60 FPS').attr('data-value', '60').data('value', '60');
      console.log('%c[index.js, handleUnlockAllFps]', 'color: green;', 'Resetting framerate value to 60 FPS');
      storeData('frameRate', '60', null);
      // Update the bitrate value based on the selected frame rate
      $('#optimizeBitrateSwitch').prop('checked') ? optimizeBitratePresets() : standardBitratePresets();
    }
  }
}

function saveOptimizeBitrate() {
  setTimeout(() => {
    const chosenOptimizeBitrate = $('#optimizeBitrateSwitch').parent().hasClass('is-checked');
    console.log('%c[index.js, saveOptimizeBitrate]', 'color: green;', 'Saving optimize bitrate state: ' + chosenOptimizeBitrate);
    storeData('optimizeBitrate', chosenOptimizeBitrate, null);

    // Update the bitrate value based on the selected preset mode
    chosenOptimizeBitrate ? optimizeBitratePresets() : standardBitratePresets();
  }, 100);
}

function saveDisableWarnings() {
  setTimeout(() => {
    const chosenDisableWarnings = $('#disableWarningsSwitch').parent().hasClass('is-checked');
    console.log('%c[index.js, saveDisableWarnings]', 'color: green;', 'Saving disable warnings state: ' + chosenDisableWarnings);
    storeData('disableWarnings', chosenDisableWarnings, null);
  }, 100);
}

function savePerformanceStats() {
  setTimeout(() => {
    const chosenPerformanceStats = $('#performanceStatsSwitch').parent().hasClass('is-checked');
    console.log('%c[index.js, savePerformanceStats]', 'color: green;', 'Saving performance stats state: ' + chosenPerformanceStats);
    storeData('performanceStats', chosenPerformanceStats, null);
  }, 100);
}

// Reset all settings to their default state and save the value data
function restoreDefaultsSettingsValues() {
  const defaultResolution = '1280:720';
  $('#selectResolution').text('1280 x 720 (720p)').attr('data-value', defaultResolution).data('value', defaultResolution);
  storeData('resolution', defaultResolution, null);

  const defaultFramerate = '60';
  $('#selectFramerate').text('60 FPS').attr('data-value', defaultFramerate).data('value', defaultFramerate);
  storeData('frameRate', defaultFramerate, null);

  const defaultBitrate = '10';
  $('#selectBitrate').html(defaultBitrate + ' Mbps');
  $('#bitrateSlider')[0].MaterialSlider.change(defaultBitrate);
  storeData('bitrate', defaultBitrate, null);

  const defaultFramePacing = true;
  document.querySelector('#framePacingBtn').MaterialSwitch.off();
  storeData('framePacing', defaultFramePacing, null);

  const defaultIpAddressFieldMode = true;
  document.querySelector('#ipAddressFieldModeBtn').MaterialSwitch.off();
  storeData('ipAddressFieldMode', defaultIpAddressFieldMode, null);

  const defaultSortAppsList = false;
  document.querySelector('#sortAppsListBtn').MaterialSwitch.off();
  storeData('sortAppsList', defaultSortAppsList, null);

  const defaultOptimizeGames = false;
  document.querySelector('#optimizeGamesBtn').MaterialSwitch.off();
  storeData('optimizeGames', defaultOptimizeGames, null);

  const defaultRumbleFeedback = false;
  document.querySelector('#rumbleFeedbackBtn').MaterialSwitch.off();
  storeData('rumbleFeedback', defaultRumbleFeedback, null);

  const defaultMouseEmulation = false;
  document.querySelector('#mouseEmulationBtn').MaterialSwitch.off();
  storeData('mouseEmulation', defaultMouseEmulation, null);

  const defaultFlipABfaceButtons = false;
  document.querySelector('#flipABfaceButtonsBtn').MaterialSwitch.off();
  storeData('flipABfaceButtons', defaultFlipABfaceButtons, null);

  const defaultFlipXYfaceButtons = false;
  document.querySelector('#flipXYfaceButtonsBtn').MaterialSwitch.off();
  storeData('flipXYfaceButtons', defaultFlipXYfaceButtons, null);

  const defaultAudioBackend = 'EMSS';
  $('#selectAudioBackend').text('EMSS').attr('data-value', defaultAudioBackend).data('value', defaultAudioBackend);
  storeData('audioBackend', defaultAudioBackend, null);
  // Show the settings of the restored audio backend
  updateAudioBackendSettings();

  const defaultAudioConfig = 'Stereo';
  $('#selectAudio').text('Stereo').attr('data-value', defaultAudioConfig).data('value', defaultAudioConfig);
  storeData('audioConfig', defaultAudioConfig, null);

  const defaultAudioSync = false;
  document.querySelector('#audioSyncBtn').MaterialSwitch.off();
  storeData('audioSync', defaultAudioSync, null);

  const defaultAudioJitter = '100';
  $('#selectAudioJitter').html(defaultAudioJitter + ' ms');
  $('#jitterSlider')[0].MaterialSlider.change(defaultAudioJitter);
  storeData('audioJitter', defaultAudioJitter, null);

  const defaultPlayHostAudio = false;
  document.querySelector('#playHostAudioBtn').MaterialSwitch.off();
  storeData('playHostAudio', defaultPlayHostAudio, null);

  const defaultDecryptHostAudio = false;
  document.querySelector('#decryptHostAudioBtn').MaterialSwitch.off();
  storeData('decryptHostAudio', defaultDecryptHostAudio, null);

  const defaultVideoCodec = 'H264';
  $('#selectCodec').text('H.264').attr('data-value', defaultVideoCodec).data('value', defaultVideoCodec);
  storeData('videoCodec', defaultVideoCodec, null);

  const defaultHdrMode = false;
  document.querySelector('#hdrModeBtn').MaterialSwitch.off();
  storeData('hdrMode', defaultHdrMode, null);

  const defaultFullRange = false;
  document.querySelector('#fullRangeBtn').MaterialSwitch.off();
  storeData('fullRange', defaultFullRange, null);

  // Reset default Game Mode based on Tizen platform version
  if (parseFloat(platformVer) >= 9.0) {
    // Turn off for Tizen 9.0 and newer to avoid compatibility issues
    const incompatibleGameMode = false;
    document.querySelector('#gameModeBtn').MaterialSwitch.off();
    storeData('gameMode', incompatibleGameMode, null);
  } else if (parseFloat(platformVer) === 5.5) {
    // Keep turned off and disabled for Tizen 5.5 due to lack of support
  } else {
    // Turn on for compatible Tizen versions (e.g., 6.0, 6.5, 7.0, 8.0)
    const defaultGameMode = true;
    document.querySelector('#gameModeBtn').MaterialSwitch.on();
    storeData('gameMode', defaultGameMode, null);
  }

  const defaultUnlockAllFps = false;
  document.querySelector('#unlockAllFpsBtn').MaterialSwitch.off();
  storeData('unlockAllFps', defaultUnlockAllFps, null);

  const defaultOptimizeBitrate = false;
  document.querySelector('#optimizeBitrateBtn').MaterialSwitch.off();
  storeData('optimizeBitrate', defaultOptimizeBitrate, null);

  const defaultDisableWarnings = false;
  document.querySelector('#disableWarningsBtn').MaterialSwitch.off();
  storeData('disableWarnings', defaultDisableWarnings, null);

  const defaultPerformanceStats = false;
  document.querySelector('#performanceStatsBtn').MaterialSwitch.off();
  storeData('performanceStats', defaultPerformanceStats, null);
}

function initSamsungKeys() {
  console.log('%c[index.js, initSamsungKeys]', 'color: green;', 'Initializing TV keys...');

  // For explanation on ordering, see: https://developer.samsung.com/smarttv/develop/guides/user-interaction/keyboardime.html
  var handler = {
    initRemoteController: true,
    buttonsToRegister: [
      'ColorF0Red',      // F1
      'ColorF1Green',    // F2
      'ColorF2Yellow',   // F3
      'ColorF3Blue',     // F4
      //'SmartHub',      // F5
      'Source',          // F6
      'ChannelList',     // F7
      //'VolumeMute',    // F8
      //'VolumeDown',    // F9
      //'VolumeUp',      // F10
      'ChannelDown',     // F11
      'ChannelUp',       // F12
      'MediaPlayPause',
    ],
    onKeydownListener: remoteControllerHandler
  };

  console.log('%c[index.js, initSamsungKeys]', 'color: green;', 'Initializing TV platform...');
  platformOnLoad(handler);
}

function initSpecialKeys() {
  console.log('%c[index.js, initSpecialKeys]', 'color: green;', 'Initializing special TV input keys...');

  // Find the video element that displays the streaming session
  var videoElement = document.getElementById('wasm_module');

  // Listen for keydown events on the video element
  videoElement.addEventListener('keydown', function(e) {
    // Check if the 'Back' key has been pressed and the streaming is currently active
    if (e.key === 'XF86Back' && isInGame === true) {
      // Send the Escape key (ESC) to the host while streaming
      sendEscapeKeyToHost();
      // Simulate mouse to move focus back to the streaming session
      videoElement.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true, cancelable: true, view: window, clientX: 0, clientY: 0
      }));
    }
  });

  // Listen for the 'Play/Pause' key before the streaming session does, so it is never sent to the host
  ['keydown', 'keyup'].forEach(function(eventType) {
    window.addEventListener(eventType, function(e) {
      if (e.keyCode === tvKey.KEY_PLAY_PAUSE && isInGame === true) {
        e.preventDefault();
        e.stopPropagation();
        // Open or close the Stream Menu when the key is pressed
        if (e.type === 'keydown' && !e.repeat) {
          toggleStreamMenuDialog();
        }
      }
    }, true);
  });
}

function loadSystemInfo() {
  console.log('%c[index.js, loadSystemInfo]', 'color: green;', 'Loading system information...');
  const systemInfoPlaceholder = document.getElementById('systemInfoBtn');
  const isForceGMVariant = checkForceGMVariant(); // Check if the currently installed app is the ForceGM variant
  const buildVer = getBuildVersion(appInfo.version);

  // Get the system information from the TV
  if (systemInfoPlaceholder) {
    console.log('%c[index.js, loadSystemInfo]', 'color: green;', 'App Version: ' + appInfo.name + (isForceGMVariant ? '-ForceGM' : '') + ' v' + buildVer);
    console.log('%c[index.js, loadSystemInfo]', 'color: green;', 'Platform Version: Tizen ' + (platformVer ? platformVer : 'Unknown'));
    console.log('%c[index.js, loadSystemInfo]', 'color: green;', 'TV Model Series: ' + (modelSeries ? modelSeries : 'Unknown'));
    console.log('%c[index.js, loadSystemInfo]', 'color: green;', 'TV Model Name: ' + (modelName ? modelName : 'Unknown'));
    console.log('%c[index.js, loadSystemInfo]', 'color: green;', 'TV Model Group: ' + (modelGroup ? modelGroup : 'Unknown'));
    console.log('%c[index.js, loadSystemInfo]', 'color: green;', '4K Panel: ' + (is4kPanel ? 'Yes' : 'No'));
    console.log('%c[index.js, loadSystemInfo]', 'color: green;', 'HDR Capable: ' + (isHdrCapable ? 'Yes' : 'No'));
    // Insert the system information into the placeholder
    systemInfoPlaceholder.innerText =
      t('App Version: %1$s v%2$s', appInfo.name + (isForceGMVariant ? '-ForceGM' : ''), buildVer) + '\n' +
      t('Platform Version: Tizen %1$s', platformVer ? platformVer : t('Unknown')) + '\n' +
      t('TV Model Series: %1$s', modelSeries ? modelSeries : t('Unknown')) + '\n' +
      t('TV Model Name: %1$s', modelName ? modelName : t('Unknown')) + '\n' +
      t('TV Model Group: %1$s', modelGroup ? modelGroup : t('Unknown'));
  } else {
    console.error('%c[index.js, loadSystemInfo]', 'color: green;', 'Error: Failed to load system information!');
    systemInfoPlaceholder.innerText = t('Failed to load system information!');
  }
}

function loadUserData() {
  console.log('%c[index.js, loadUserData]', 'color: green;', 'Loading stored user data...');
  openIndexDB(loadUserDataCb);
}

function loadUserDataCb() {
  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored resolution preferences.');
  getData('resolution', function(previousValue) {
    if (previousValue.resolution != null) {
      var resWidth = parseInt(previousValue.resolution.split(':')[0], 10);
      if (resWidth > maxSupportedWidth) {
        previousValue.resolution = maxSupportedWidth >= 3840 ? '3840:2160' : '1920:1080';
        storeData('resolution', previousValue.resolution, null);
      }
      $('.videoResolutionMenu li').each(function() {
        if ($(this).data('value') === previousValue.resolution) {
          // Update the video resolution field based on the given value
          $('#selectResolution').text($(this).text()).attr('data-value', previousValue.resolution).data('value', previousValue.resolution);
        }
      });
    }
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored unlockAllFps preferences.');
  getData('unlockAllFps', function(previousValue) {
    if (previousValue.unlockAllFps == null) {
      document.querySelector('#unlockAllFpsBtn').MaterialSwitch.off(); // Set the default state
    } else if (previousValue.unlockAllFps == false) {
      document.querySelector('#unlockAllFpsBtn').MaterialSwitch.off();
    } else {
      document.querySelector('#unlockAllFpsBtn').MaterialSwitch.on();
    }
    // Handle the Unlocked FPS visibility based on switch state
    handleUnlockAllFps();
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored frameRate preferences.');
  getData('frameRate', function(previousValue) {
    if (previousValue.frameRate != null) {
      $('.videoFramerateMenu li').each(function() {
        if ($(this).data('value') === previousValue.frameRate) {
          // Update the video frame rate field based on the given value
          $('#selectFramerate').text($(this).text()).attr('data-value', previousValue.frameRate).data('value', previousValue.frameRate);
        }
      });
    }
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored bitrate preferences.');
  getData('bitrate', function(previousValue) {
    $('#bitrateSlider')[0].MaterialSlider.change(previousValue.bitrate != null ? previousValue.bitrate : '10');
    // Update the video bitrate field based on the given value
    $('#selectBitrate').html($('#bitrateSlider').val() + ' Mbps');
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored framePacing preferences.');
  getData('framePacing', function(previousValue) {
    if (previousValue.framePacing == null) {
      document.querySelector('#framePacingBtn').MaterialSwitch.on(); // Set the default state
    } else if (previousValue.framePacing == false) {
      document.querySelector('#framePacingBtn').MaterialSwitch.off();
    } else {
      document.querySelector('#framePacingBtn').MaterialSwitch.on();
    }
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored ipAddressFieldMode preferences.');
  getData('ipAddressFieldMode', function(previousValue) {
    if (previousValue.ipAddressFieldMode == null) {
      document.querySelector('#ipAddressFieldModeBtn').MaterialSwitch.on(); // Set the default state
    } else if (previousValue.ipAddressFieldMode == false) {
      document.querySelector('#ipAddressFieldModeBtn').MaterialSwitch.off();
    } else {
      document.querySelector('#ipAddressFieldModeBtn').MaterialSwitch.on();
    }
    // Handle the IP address field visibility based on switch state
    handleIpAddressFieldMode();
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored sortAppsList preferences.');
  getData('sortAppsList', function(previousValue) {
    if (previousValue.sortAppsList == null) {
      document.querySelector('#sortAppsListBtn').MaterialSwitch.off(); // Set the default state
    } else if (previousValue.sortAppsList == false) {
      document.querySelector('#sortAppsListBtn').MaterialSwitch.off();
    } else {
      document.querySelector('#sortAppsListBtn').MaterialSwitch.on();
    }
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored optimizeGames preferences.');
  getData('optimizeGames', function(previousValue) {
    if (previousValue.optimizeGames == null) {
      document.querySelector('#optimizeGamesBtn').MaterialSwitch.off(); // Set the default state
    } else if (previousValue.optimizeGames == false) {
      document.querySelector('#optimizeGamesBtn').MaterialSwitch.off();
    } else {
      document.querySelector('#optimizeGamesBtn').MaterialSwitch.on();
    }
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored rumbleFeedback preferences.');
  getData('rumbleFeedback', function(previousValue) {
    if (previousValue.rumbleFeedback == null) {
      document.querySelector('#rumbleFeedbackBtn').MaterialSwitch.off(); // Set the default state
    } else if (previousValue.rumbleFeedback == false) {
      document.querySelector('#rumbleFeedbackBtn').MaterialSwitch.off();
    } else {
      document.querySelector('#rumbleFeedbackBtn').MaterialSwitch.on();
    }
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored mouseEmulation preferences.');
  getData('mouseEmulation', function(previousValue) {
    if (previousValue.mouseEmulation == null) {
      document.querySelector('#mouseEmulationBtn').MaterialSwitch.off(); // Set the default state
    } else if (previousValue.mouseEmulation == false) {
      document.querySelector('#mouseEmulationBtn').MaterialSwitch.off();
    } else {
      document.querySelector('#mouseEmulationBtn').MaterialSwitch.on();
    }
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored flipABfaceButtons preferences.');
  getData('flipABfaceButtons', function(previousValue) {
    if (previousValue.flipABfaceButtons == null) {
      document.querySelector('#flipABfaceButtonsBtn').MaterialSwitch.off(); // Set the default state
    } else if (previousValue.flipABfaceButtons == false) {
      document.querySelector('#flipABfaceButtonsBtn').MaterialSwitch.off();
    } else {
      document.querySelector('#flipABfaceButtonsBtn').MaterialSwitch.on();
    }
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored flipXYfaceButtons preferences.');
  getData('flipXYfaceButtons', function(previousValue) {
    if (previousValue.flipXYfaceButtons == null) {
      document.querySelector('#flipXYfaceButtonsBtn').MaterialSwitch.off(); // Set the default state
    } else if (previousValue.flipXYfaceButtons == false) {
      document.querySelector('#flipXYfaceButtonsBtn').MaterialSwitch.off();
    } else {
      document.querySelector('#flipXYfaceButtonsBtn').MaterialSwitch.on();
    }
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored audioBackend preferences.');
  getData('audioBackend', function(previousValue) {
    if (previousValue.audioBackend != null) {
      $('.audioBackendMenu li').each(function() {
        if ($(this).data('value') === previousValue.audioBackend) {
          // Update the audio backend field based on the given value
          $('#selectAudioBackend').text($(this).text()).attr('data-value', previousValue.audioBackend).data('value', previousValue.audioBackend);
        }
      });
    }
    // Show the settings of the stored audio backend
    updateAudioBackendSettings();
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored audioConfig preferences.');
  getData('audioConfig', function(previousValue) {
    if (previousValue.audioConfig != null) {
      $('.audioConfigMenu li').each(function() {
        if ($(this).data('value') === previousValue.audioConfig) {
          // Update the audio configuration field based on the given value
          $('#selectAudio').text($(this).text()).attr('data-value', previousValue.audioConfig).data('value', previousValue.audioConfig);
        }
      });
    }
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored audioSync preferences.');
  getData('audioSync', function(previousValue) {
    if (previousValue.audioSync == null) {
      document.querySelector('#audioSyncBtn').MaterialSwitch.off(); // Set the default state
    } else if (previousValue.audioSync == false) {
      document.querySelector('#audioSyncBtn').MaterialSwitch.off();
    } else {
      document.querySelector('#audioSyncBtn').MaterialSwitch.on();
    }
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored audioJitter preferences.');
  getData('audioJitter', function(previousValue) {
    $('#jitterSlider')[0].MaterialSlider.change(previousValue.audioJitter != null ? previousValue.audioJitter : '100');
    // Update the audio jitter buffer field based on the given value
    $('#selectAudioJitter').html($('#jitterSlider').val() + ' ms');
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored playHostAudio preferences.');
  getData('playHostAudio', function(previousValue) {
    if (previousValue.playHostAudio == null) {
      document.querySelector('#playHostAudioBtn').MaterialSwitch.off(); // Set the default state
    } else if (previousValue.playHostAudio == false) {
      document.querySelector('#playHostAudioBtn').MaterialSwitch.off();
    } else {
      document.querySelector('#playHostAudioBtn').MaterialSwitch.on();
    }
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored decryptHostAudio preferences.');
  getData('decryptHostAudio', function(previousValue) {
    if (previousValue.decryptHostAudio == null) {
      document.querySelector('#decryptHostAudioBtn').MaterialSwitch.off(); // Set the default state
    } else if (previousValue.decryptHostAudio == false) {
      document.querySelector('#decryptHostAudioBtn').MaterialSwitch.off();
    } else {
      document.querySelector('#decryptHostAudioBtn').MaterialSwitch.on();
    }
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored videoCodec preferences.');
  getData('videoCodec', function(previousValue) {
    if (previousValue.videoCodec != null) {
      $('.videoCodecMenu li').each(function() {
        if ($(this).data('value') === previousValue.videoCodec) {
          // Update the video codec field based on the given value
          $('#selectCodec').text($(this).text()).attr('data-value', previousValue.videoCodec).data('value', previousValue.videoCodec);
        }
      });
    }
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored hdrMode preferences.');
  getData('hdrMode', function(previousValue) {
    if (previousValue.hdrMode == null) {
      document.querySelector('#hdrModeBtn').MaterialSwitch.off(); // Set the default state
    } else if (previousValue.hdrMode == false) {
      document.querySelector('#hdrModeBtn').MaterialSwitch.off();
    } else {
      document.querySelector('#hdrModeBtn').MaterialSwitch.on();
    }
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored fullRange preferences.');
  getData('fullRange', function(previousValue) {
    if (previousValue.fullRange == null) {
      document.querySelector('#fullRangeBtn').MaterialSwitch.off(); // Set the default state
    } else if (previousValue.fullRange == false) {
      document.querySelector('#fullRangeBtn').MaterialSwitch.off();
    } else {
      document.querySelector('#fullRangeBtn').MaterialSwitch.on();
    }
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored gameMode preferences.');
  getData('gameMode', function(previousValue) {
    if (previousValue.gameMode == null) {
      if (parseFloat(platformVer) >= 9.0) {
        document.querySelector('#gameModeBtn').MaterialSwitch.off(); // Turn off for Tizen 9.0 and newer to avoid compatibility issues
      } else if (parseFloat(platformVer) === 5.5) {
        document.querySelector('#gameModeBtn').MaterialSwitch.off(); // Turn off for Tizen 5.5 due to lack of support
        document.querySelector('#gameModeBtn').MaterialSwitch.disable(); // Disable the switch to prevent user interaction
      } else {
        document.querySelector('#gameModeBtn').MaterialSwitch.on(); // Turn on for compatible Tizen versions (e.g., 6.0, 6.5, 7.0, 8.0)
      }
    } else if (previousValue.gameMode == false) {
      document.querySelector('#gameModeBtn').MaterialSwitch.off();
    } else {
      document.querySelector('#gameModeBtn').MaterialSwitch.on();
    }
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored optimizeBitrate preferences.');
  getData('optimizeBitrate', function(previousValue) {
    if (previousValue.optimizeBitrate == null) {
      document.querySelector('#optimizeBitrateBtn').MaterialSwitch.off(); // Set the default state
    } else if (previousValue.optimizeBitrate == false) {
      document.querySelector('#optimizeBitrateBtn').MaterialSwitch.off();
    } else {
      document.querySelector('#optimizeBitrateBtn').MaterialSwitch.on();
    }
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored disableWarnings preferences.');
  getData('disableWarnings', function(previousValue) {
    if (previousValue.disableWarnings == null) {
      document.querySelector('#disableWarningsBtn').MaterialSwitch.off(); // Set the default state
    } else if (previousValue.disableWarnings == false) {
      document.querySelector('#disableWarningsBtn').MaterialSwitch.off();
    } else {
      document.querySelector('#disableWarningsBtn').MaterialSwitch.on();
    }
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored performanceStats preferences.');
  getData('performanceStats', function(previousValue) {
    if (previousValue.performanceStats == null) {
      document.querySelector('#performanceStatsBtn').MaterialSwitch.off(); // Set the default state
    } else if (previousValue.performanceStats == false) {
      document.querySelector('#performanceStatsBtn').MaterialSwitch.off();
    } else {
      document.querySelector('#performanceStatsBtn').MaterialSwitch.on();
    }
  });
}

function loadHTTPCerts() {
  console.log('%c[index.js, loadHTTPCerts]', 'color: green;', 'Loading stored HTTP certificates...');
  openIndexDB(loadHTTPCertsCb);
}

function loadHTTPCertsCb() {
  console.log('%c[index.js, loadHTTPCertsCb]', 'color: green;', 'Load the HTTP certificate and unique ID if they are already available.');
  getData('cert', function(savedCert) {
    if (savedCert.cert != null) { // We have a saved cert
      pairingCert = savedCert.cert;
    }

    getData('uniqueid', function(savedUniqueid) {
      if (savedUniqueid && savedUniqueid.uniqueid != null) { // We have a saved uniqueid
        myUniqueid = savedUniqueid.uniqueid;
      } else {
        myUniqueid = uniqueid();
        storeData('uniqueid', myUniqueid, null);
      }

      if (!pairingCert) { // We couldn't load a cert. Let's attempt to generate a new one.
        console.warn('%c[index.js, loadHTTPCertsCb]', 'color: green;', 'Warning: Local certificate not found! Generating a new one...');
        sendMessage('makeCert', []).then(function(cert) {
          storeData('cert', cert, null);
          pairingCert = cert;
          console.info('%c[index.js, loadHTTPCertsCb]', 'color: green;', 'Generated new certificate: ', cert);
        }, function(failedCert) {
          console.error('%c[index.js, loadHTTPCertsCb]', 'color: green;', 'Error: Failed to generate a new certificate! Returned error was: \n', failedCert + '!');
        }).then(function(ret) {
          sendMessage('httpInit', [pairingCert.cert, pairingCert.privateKey, myUniqueid]).then(function(ret) {
            restoreUiAfterWasmLoad();
          }, function(failedInit) {
            console.error('%c[index.js, loadHTTPCertsCb]', 'color: green;', 'Error: Failed HTTP initialization! Returned error was: ', failedInit + '!');
          });
        });
      } else {
        sendMessage('httpInit', [pairingCert.cert, pairingCert.privateKey, myUniqueid]).then(function(ret) {
          restoreUiAfterWasmLoad();
        }, function(failedInit) {
          console.error('%c[index.js, loadHTTPCertsCb]', 'color: green;', 'Error: Failed HTTP initialization! Returned error was: ', failedInit + '!');
        });
      }

      // load previously connected hosts, which have been killed into an object, and revive them back into a class
      getData('hosts', function(previousValue) {
        hosts = previousValue.hosts != null ? previousValue.hosts : {};
        for (var hostUID in hosts) { // Programmatically add each new host
          var revivedHost = new NvHTTP(hosts[hostUID].address, myUniqueid, hosts[hostUID].userEnteredAddress, hosts[hostUID].macAddress);
          Object.assign(revivedHost, hosts[hostUID]);
          revivedHost._memCachedApplist = null; // Prevent using the app list cache from a previous session
          revivedHost.httpPort = hosts[hostUID].httpPort || ((hosts[hostUID].httpsPort || 47984) + 5);
          revivedHost.httpsPort = hosts[hostUID].httpsPort || (revivedHost.httpPort - 5);
          revivedHost.externalPort = hosts[hostUID].externalPort || revivedHost.httpPort;
          revivedHost.serverUid = hosts[hostUID].serverUid;
          revivedHost.externalIP = hosts[hostUID].externalIP;
          revivedHost.hostname = hosts[hostUID].hostname;
          revivedHost.ppkstr = hosts[hostUID].ppkstr;
          revivedHost.autoWolEnabled = hosts[hostUID].autoWolEnabled || false;
          hosts[hostUID] = revivedHost;
          addHostToGrid(revivedHost);
        }
        isHostsLoaded = true;
        // Load stored preview app lists and update Smart Hub Preview tiles.
        // Using the persisted list avoids requiring live host connections at startup.
        getData('previewApps', function(storedPreview) {
          _previewApps = (storedPreview.previewApps != null) ? storedPreview.previewApps : {};
          updatePreviewData();
        });
        console.log('%c[index.js, loadHTTPCertsCb]', 'color: green;', 'Loading previously connected hosts...');
        
        // Immediately start polling known hosts so they are ready for Smart Hub or instant clicks.
        // We wait for all known hosts to finish their initial ping before launching the subnet scanner
        // to guarantee that the 254 scanner requests don't choke the network stack and cause known hosts to timeout.
        startPollingHosts().then(() => {
          if (typeof startSubnetScanner === 'function') {
            snackbarLog('Scanning the local network to discover new hosts...');
            // Stop background polling while sweeping the subnet to prevent network exhaustion
            stopPollingHosts();
            startSubnetScanner().then(() => {
              isSubnetScanFinished = true;
              startPollingHosts();
            }).catch(() => {
              isSubnetScanFinished = true;
              startPollingHosts();
            });
          } else {
            isSubnetScanFinished = true;
          }
        });
      });
    });
  });
}

// Navigates to a specific host once it has been loaded and becomes available.
// Polls the hosts object at 1-second intervals for up to 30 seconds.
function waitForHostAndNavigate(serverUid) {
  var attempts = 0;
  var interval = setInterval(function() {
    attempts++;
    var host = hosts[serverUid];
    
    if (host && (host.online || isSubnetScanFinished)) {
      clearInterval(interval);
      console.log('%c[index.js, waitForHostAndNavigate]', 'color: green;', 'Host found for deep link, navigating: ' + serverUid);
      hostChosen(host);
    } else if (!host && isHostsLoaded) {
      clearInterval(interval);
      console.warn('%c[index.js, waitForHostAndNavigate]', 'color: orange;', 'Host ' + serverUid + ' no longer exists in Moonlight.');
      snackbarLogLong('The selected host is no longer available on Moonlight.');
      if (typeof updatePreviewData === 'function') updatePreviewData();
    } else if (attempts > 30) {
      clearInterval(interval);
      console.warn('%c[index.js, waitForHostAndNavigate]', 'color: orange;', 'Warning: Timed out waiting for host ' + serverUid + ' to load.');
      if (host) hostChosen(host); // Fallback to trigger offline error or Auto WOL
    }
  }, 1000);
}

// Navigates to a specific app on a host from a Smart Hub Preview deep link.
// Waits for the host to load, then checks availability and whether the app still exists.
// - If the host is offline: removes it from preview and returns to the Moonlight home screen.
// - If the app no longer exists on the server: connects to the host and shows the current app list.
// - If the app exists: connects to the host and navigates directly to the app list.
function waitForHostAndNavigateToApp(serverUid, appId) {
  var attempts = 0;
  var interval = setInterval(function() {
    attempts++;
    var host = hosts[serverUid];

    if (host && (host.online || isSubnetScanFinished)) {
      clearInterval(interval);
      console.log('%c[index.js, waitForHostAndNavigateToApp]', 'color: green;', 'Host found for deep link, checking availability: ' + serverUid);

      // Check whether the host is online before trying to connect
      if (!host.online) {
        hostChosen(host, function() {
          // Success callback: The host is now online. Retry the deep link navigation.
          waitForHostAndNavigateToApp(serverUid, appId);
        });
        return;
      }

      // Host is online: check whether the requested app still exists
      host.getAppListWithCacheFlush().then(function(appList) {
        // Find the existing switch element
        const sortAppsListSwitch = document.getElementById('sortAppsListSwitch');
        // Defines the sort order based on the state of the switch
        const sortOrder = sortAppsListSwitch.checked ? 'DESC' : 'ASC';
        // If game grid is populated, sort the app list
        const sortedAppList = sortTitles(appList, sortOrder);

        if (_isSmartHubSupported) {
          // Preserve existing image paths from the previous preview cache
          var oldApps = (_previewApps[serverUid] && _previewApps[serverUid].apps) || [];

          // Update the preview with the latest app list from this successful connection
          _previewApps[serverUid] = {
            hostname: host.hostname,
            address: host.address,
            apps: sortedAppList.map(function(app) {
              var oldApp = oldApps.find(function(a) {
                return a.id === app.id; 
              });
              var newApp = {
                id: app.id, title: app.title
              };
              if (oldApp) {
                if (oldApp.imageUri) {
                  newApp.imageUri = oldApp.imageUri;
                }
                if (oldApp.txtPath) {
                  newApp.txtPath = oldApp.txtPath;
                }
              }
              return newApp;
            })
          };
          savePreviewApps();
          updatePreviewData();
        }

        var appExists = appList.some(function(app) {
          return app.id === appId;
        });
        if (appExists) {
          // App still exists: connect, show the app list, and auto-launch the app
          console.log('%c[index.js, waitForHostAndNavigateToApp]', 'color: green;', 'App ' + appId + ' found, launching app from deep link.');
          hostChosen(host);
          // Wait for the app list to render, then scroll to the app and launch it automatically.
          // This ensures the app list is in the navigation stack so Back returns correctly:
          // streaming session → app list → Moonlight home screen.
          var gameStartAttempts = 0;
          var gameStartInterval = setInterval(function() {
            gameStartAttempts++;
            var gameContainer = document.getElementById('game-container-' + appId);
            if (gameContainer) {
              clearInterval(gameStartInterval);
              gameContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
              startGame(host, appId);
            } else if (gameStartAttempts > 30) {
              clearInterval(gameStartInterval);
              console.warn('%c[index.js, waitForHostAndNavigateToApp]', 'color: orange;', 'Warning: Timed out waiting for game container for app ' + appId + ' to appear.');
            }
          }, 200);
        } else {
          // App no longer exists: connect to host and show the current app list
          console.warn('%c[index.js, waitForHostAndNavigateToApp]', 'color: orange;', 'App ' + appId + ' not found on host, showing current app list.');
          snackbarLogLong('The selected app is no longer available on this host. Showing the current app list.');
          hostChosen(host);
        }
      }, function() {
        // Could not fetch app list (host may have gone offline during the check)
        hostChosen(host);
      });
    } else if (!host && isHostsLoaded) {
      clearInterval(interval);
      console.warn('%c[index.js, waitForHostAndNavigateToApp]', 'color: orange;', 'Host ' + serverUid + ' no longer exists in Moonlight.');
      snackbarLogLong('The selected host is no longer available on Moonlight.');
      if (typeof updatePreviewData === 'function') updatePreviewData();
    } else if (attempts > 30) { // 30s timeout
      clearInterval(interval);
      console.warn('%c[index.js, waitForHostAndNavigateToApp]', 'color: orange;', 'Warning: Timed out waiting for host ' + serverUid + ' to load.');
      if (host) hostChosen(host); // Fallback to trigger offline error or Auto WOL
    }
  }, 1000);
}

// Handles deep link navigation when the app is launched from a Smart Hub Preview tile.
// Reads the PAYLOAD from AppControl data and navigates to the appropriate host and app.
function handleDeepLink() {
  if (!_isSmartHubSupported) {
    return;
  }
  try {
    var reqAppControl = tizen.application.getCurrentApplication().getRequestedAppControl();
    if (!reqAppControl) {
      console.warn('%c[index.js, handleDeepLink]', 'color: green;', 'Warning: No requested app control found, skipping deep link handling!');
      return;
    }

    var appControlData = reqAppControl.appControl.data;
    console.log('%c[index.js, handleDeepLink]', 'color: green;', 'App control data: ' + JSON.stringify(appControlData));

    for (var i = 0; i < appControlData.length; i++) {
      if (appControlData[i].key === 'PAYLOAD') {
        var payload = JSON.parse(appControlData[i].value[0]);
        var actionData = JSON.parse(payload.values);
        console.log('%c[index.js, handleDeepLink]', 'color: green;', 'Deep link action data: ', actionData);

        if (actionData.serverUid && actionData.appId !== null && actionData.appId !== undefined) {
          // App-level deep link from a preview tile: navigate to the specific host and app
          waitForHostAndNavigateToApp(actionData.serverUid, actionData.appId);
        } else if (actionData.serverUid) {
          // Host-level deep link: navigate to the host's app list
          waitForHostAndNavigate(actionData.serverUid);
        }
        break;
      }
    }
  } catch (e) {
    console.error('%c[index.js, handleDeepLink]', 'color: green;', 'Error: No deep link or error processing it: ' + e.message);
  }
}

// Builds Smart Hub Preview tiles from the cached per-host app lists and sends the
// preview data to the background service, which calls webapis.preview.setPreviewData().
// The webapis.preview API is only accessible from within a Tizen background service.
// The preview is populated only from successfully connected hosts (stored in _previewApps).
function updatePreviewData() {
  try {
    var packageId = tizen.application.getCurrentApplication().appInfo.packageId;
    if (!_isSmartHubSupported) {
      console.log('%c[index.js, updatePreviewData]', 'color: green;', 'Smart Hub Preview is not supported on this device. Skipping!');
      return;
    }

    // Build one section per host that has a cached app list
    // Smart Hub supports a maximum of 40 tiles across all sections
    var sections = [];
    var totalTiles = 0;
    var SMART_HUB_MAX_TILES = 40;
    Object.keys(_previewApps).forEach(function(serverUid) {
      var entry = _previewApps[serverUid];
      if (!entry || !entry.apps || entry.apps.length === 0) {
        console.error('%c[index.js, updatePreviewData]', 'color: green;', 'Error: No apps found for host ' + serverUid);
        return;
      }

      // Stop adding sections once the Smart Hub tile limit is reached
      if (totalTiles >= SMART_HUB_MAX_TILES) {
        return;
      }

      // Only include as many apps as can fit within the remaining tile limit
      var remainingTiles = SMART_HUB_MAX_TILES - totalTiles;
      var apps = entry.apps.slice(0, remainingTiles);

      // Create a tile for each app in the host's app list, including the title, subtitle, and action data
      var tiles = apps.map(function(app, index) {
        // Each tile object accepts a `position` attribute. By explicitly setting
        // the global position, we override the native behavior and enforce our
        // custom sorting (A-Z or Z-A).
        var tile = {
          title: app.title,
          subtitle: entry.hostname,
          action_data: JSON.stringify({
            serverUid: serverUid, address: entry.address, appId: app.id
          }),
          is_playable: true,
          position: totalTiles + index
        };
        if (app.imageUri) {
          tile.image_url = app.imageUri;
        }
        if (app.txtPath) {
          tile.txtPath = app.txtPath;
        }
        return tile;
      });

      // Update the total tile count after adding this host's tiles
      totalTiles += tiles.length;

      // Only add the section if it contains tiles
      if (tiles.length > 0) {
        sections.push({
          title: entry.hostname, tiles: tiles
        });
      }
    });

    if (sections.length === 0) {
      console.log('%c[index.js, updatePreviewData]', 'color: green;', 'No preview app data found, clearing Smart Hub Preview.');
    }

    var previewData = {
      sections: sections
    };
    var serviceId = packageId + '.service';

    console.log('%c[index.js, updatePreviewData]', 'color: green;', 'Launching Smart Hub service with preview data: ', previewData);

    // Set up local message port to receive responses from the service
    if (_smartHubLocalMessagePort && _smartHubMessagePortListener !== null) {
      try {
        _smartHubLocalMessagePort.removeMessagePortListener(_smartHubMessagePortListener);
      } catch (e) {
        // Ignore listener removal errors
        console.error('%c[index.js, updatePreviewData]', 'color: green;', 'Error removing previous Smart Hub message port listener: ' + e.message);
      }
    }
    _smartHubLocalMessagePort = tizen.messageport.requestLocalMessagePort(packageId);
    _smartHubMessagePortListener = _smartHubLocalMessagePort.addMessagePortListener(function(uiData) {
      console.log('%c[index.js, updatePreviewData]', 'color: green;', 'Received from Smart Hub service: ' + uiData[0].value);
      if (uiData[0].value === 'Service stopping...' || uiData[0].value === 'Service exiting...') {
        try {
          _smartHubLocalMessagePort.removeMessagePortListener(_smartHubMessagePortListener);
          _smartHubMessagePortListener = null;
        } catch (e) {
          // Ignore listener removal errors
          console.error('%c[index.js, updatePreviewData]', 'color: green;', 'Error removing Smart Hub message port listener: ' + e.message);
        }
      }
    });

    // Launch the background service with the preview data via AppControl
    tizen.application.launchAppControl(
      new tizen.ApplicationControl(
        'http://tizen.org/appcontrol/operation/pick', null, 'image/jpeg', null,
        [new tizen.ApplicationControlData('Preview', [JSON.stringify(previewData)])]
      ),
      serviceId, function() {
        console.log('%c[index.js, updatePreviewData]', 'color: green;', 'Preview data sent to service: ' + serviceId);
      }, function(err) {
        console.error('%c[index.js, updatePreviewData]', 'color: green;', 'Failed to launch Smart Hub service: ' + err.message);
      }
    );
  } catch (e) {
    console.error('%c[index.js, updatePreviewData]', 'color: green;', 'Error while updating Smart Hub preview data: ' + e.message);
  }
}

function probeSmartHubSupport() {
  return new Promise(function(resolve) {
    // Check localStorage cache first
    var cached = localStorage.getItem('smartHubSupported');
    if (cached !== null) {
      _isSmartHubSupported = cached === 'true';
      console.log('%c[index.js, probeSmartHubSupport]', 'color: green;', 'Smart Hub support (cached): ' + _isSmartHubSupported);
      resolve();
      return;
    }

    // First launch: probe the service
    var packageId = tizen.application.getCurrentApplication().appInfo.packageId;
    var serviceId = packageId + '.service';
    
    try {
      var probePort = tizen.messageport.requestLocalMessagePort(packageId);
      var probeListener = probePort.addMessagePortListener(function(data) {
        var key = data[0].key;
        if (key !== 'PROBE') {
          return;
        }
        
        var value = data[0].value;
        _isSmartHubSupported = (value === 'SMART_HUB_SUPPORTED');
        localStorage.setItem('smartHubSupported', String(_isSmartHubSupported));
        console.log('%c[index.js, probeSmartHubSupport]', 'color: green;', 'Smart Hub support (probed): ' + _isSmartHubSupported);
        try {
          probePort.removeMessagePortListener(probeListener);
        } catch(e) {
          console.error('%c[index.js, probeSmartHubSupport]', 'color: green;', 'Error removing Smart Hub probe listener: ' + e.message);
        }
        resolve();
      });

      // Launch service with Probe request
      tizen.application.launchAppControl(
        new tizen.ApplicationControl(
          'http://tizen.org/appcontrol/operation/pick', null, null, null,
          [new tizen.ApplicationControlData('Probe', ['check'])]
        ),
        serviceId, function() {
          console.log('%c[index.js, probeSmartHubSupport]', 'color: green;', 'Probe sent to service.');
        }, function(err) {
          // Service launch failed — assume not supported
          console.warn('%c[index.js, probeSmartHubSupport]', 'color: green;', 'Probe failed: ' + err.message);
          _isSmartHubSupported = false;
          localStorage.setItem('smartHubSupported', 'false');
          resolve();
        }
      );
    } catch (e) {
      console.warn('%c[index.js, probeSmartHubSupport]', 'color: green;', 'Error probing Smart Hub support: ' + e.message);
      _isSmartHubSupported = false;
      localStorage.setItem('smartHubSupported', 'false');
      resolve();
    }
  });
}

function onWindowLoad() {
  console.log('%c[index.js, onWindowLoad]', 'color: green;', 'Moonlight\'s main window loaded.');

  initSamsungKeys();
  initSpecialKeys();
  loadUserData();

  probeSmartHubSupport().then(function() {
    // Handle deep links from Smart Hub Preview tile clicks (initial launch)
    handleDeepLink();
    // Also handle deep links when the app is brought to the foreground via Smart Hub
    window.addEventListener('appcontrol', handleDeepLink);
  });
}

window.onload = onWindowLoad;

// Gamepad connected events
window.addEventListener('gamepadconnected', function(e) {
  const connectedGamepad = e.gamepad;
  const gamepadIndex = connectedGamepad.index;
  const rumbleFeedbackSwitch = document.getElementById('rumbleFeedbackSwitch');
  console.log('%c[index.js, gamepadconnected]', 'color: green;', 'Gamepad connected:\n' + JSON.stringify(connectedGamepad), connectedGamepad);
  snackbarLog('Gamepad %1$s has been connected.', gamepadIndex);
  // Check if the rumble feedback switch is checked
  if (rumbleFeedbackSwitch.checked) {
    // Check if the connected gamepad has a vibrationActuator associated with it
    if (connectedGamepad.vibrationActuator) {
      console.log('%c[index.js, gamepadconnected]', 'color: green;', 'Playing rumble on the connected gamepad ' + gamepadIndex + '...');
      connectedGamepad.vibrationActuator.playEffect('dual-rumble', {
        startDelay: 0,
        duration: 500,
        weakMagnitude: 0.5,
        strongMagnitude: 0.5,
      });
    } else {
      console.warn('%c[index.js, gamepadconnected]', 'color: green;', 'Warning: Connected gamepad ' + gamepadIndex + ' does not support the rumble feature!');
    }
  }
});

// Gamepad disconnected events
window.addEventListener('gamepaddisconnected', function(e) {
  const disconnectedGamepad = e.gamepad;
  const gamepadIndex = disconnectedGamepad.index;
  console.log('%c[index.js, gamepaddisconnected]', 'color: green;', 'Gamepad disconnected:\n' + JSON.stringify(disconnectedGamepad), disconnectedGamepad);
  snackbarLog('Gamepad %1$s has been disconnected.', gamepadIndex);
  console.warn('%c[index.js, gamepaddisconnected]', 'color: green;', 'Warning: Lost connection to gamepad ' + gamepadIndex + '. Please reconnect your gamepad!');
});
