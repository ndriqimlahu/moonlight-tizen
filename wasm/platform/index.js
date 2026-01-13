// Initialize global variables and constants
var hosts = {}; // Hosts is an associative array of NvHTTP objects, keyed by server UID
var activePolls = {}; // Hosts currently being polled. An associated array of polling IDs, keyed by server UID
var pairingCert; // Loads the generated certificate
var myUniqueid = '0123456789ABCDEF'; // Use the same UID as other Moonlight clients to allow them to quit each other's games
var api; // The `api` should only be set if we're in a host-specific screen, on the initial screen it should always be null
var isPlatformVer = parseFloat(tizen.systeminfo.getCapability("http://tizen.org/feature/platform.version")); // Retrieve the Tizen platform version
var isInGame = false; // Flag indicating whether the game has started, initial value is false
var isDialogOpen = false; // Flag indicating whether the dialog is open, initial value is false
var isClickPrevented = false; // Flag indicating whether the click event should be prevented, initial value is false
var resFpsWarning = false; // Flag indicating whether the video resolution and frame rate warning message has shown, initial value is false
var bitrateWarning = false; // Flag indicating whether the video bitrate warning message has shown, initial value is false
var audioWarning = false; // Flag indicating whether the audio configuration warning message has shown, initial value is false
var codecWarning = false; // Flag indicating whether the video codec warning message has shown, initial value is false
var repeatAction = null; // Flag indicating whether the repeat action is set, initial value is null
var lastInvokeTime = 0; // Flag indicating the last invoke time, initial value is 0
var repeatTimeout = null; // Flag indicating whether the repeat timeout is set, initial value is null
var navigationTimeout = null; // Flag indicating whether the navigation timeout is set, initial value is null
const REPEAT_DELAY = 350; // Repeat delay set to 350ms (milliseconds)
const REPEAT_INTERVAL = 100; // Repeat interval set to 100ms (milliseconds)
const ACTION_THRESHOLD = 0.5; // Threshold for initial navigation set to 0.5
const NAVIGATION_DELAY = 150; // Navigation delay set to 150ms (milliseconds)
const UPDATE_TIMESTAMP = 'lastUpdateCheck'; // Use the update check timestamp key to determine the last update check
const UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // Automatic check for updates interval is set to 24 hours

// Called by the common.js module
function attachListeners() {
  changeUiModeForWasmLoad();
  initIpAddressFields();

  $('#addHostContainer').on('click', addHostDialog);
  $('#settingsBtn').on('click', showSettings);
  $('#supportBtn').on('click', appSupportDialog);
  $('#goBackBtn').on('click', showHosts);
  $('#restoreDefaultsBtn').on('click', restoreDefaultsDialog);
  $('#quitRunningAppBtn').on('click', quitAppDialog);
  $('.videoResolutionMenu li').on('click', saveResolution);
  $('.videoFramerateMenu li').on('click', saveFramerate);
  $('#bitrateSlider').on('input', saveBitrate);
  $('#framePacingSwitch').on('click', saveFramePacing);
  $('#ipAddressFieldModeSwitch').on('click', saveIpAddressFieldMode);
  $('#sortAppsListSwitch').on('click', saveSortAppsList);
  $('#optimizeGamesSwitch').on('click', saveOptimizeGames);
  $('#removeAllHostsBtn').on('click', deleteAllHostsDialog);
  $('#rumbleFeedbackSwitch').on('click', saveRumbleFeedback);
  $('#mouseEmulationSwitch').on('click', saveMouseEmulation);
  $('#flipABfaceButtonsSwitch').on('click', saveFlipABfaceButtons);
  $('#flipXYfaceButtonsSwitch').on('click', saveFlipXYfaceButtons);
  $('.audioConfigMenu li').on('click', saveAudioConfiguration);
  $('#audioSyncSwitch').on('click', saveAudioSync);
  $('#playHostAudioSwitch').on('click', savePlayHostAudio);
  $('.videoCodecMenu li').on('click', saveVideoCodec);
  $('#hdrModeSwitch').on('click', saveHdrMode);
  $('#fullRangeSwitch').on('click', saveFullRange);
  $('#gameModeSwitch').on('click', saveGameMode);
  $('#unlockAllFpsSwitch').on('click', saveUnlockAllFps);
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
  registerMenu('selectAudio', Views.SelectAudioMenu);
  registerMenu('selectCodec', Views.SelectCodecMenu);

  $(window).resize(fullscreenWasmModule);

  Controller.startWatching();
  window.addEventListener('gamepadinputchanged', (e) => {
    const changes = e.detail.changes;
    // Iterate through each change in the gamepad input
    changes.forEach((change) => {
      const { type, index, pressed, value } = change;
      if (type === 'button') {
        // Handle button mapping
        const buttonMapping = {
          0: () => Navigation.accept(),
          1: () => Navigation.back(),
          8: () => Navigation.press(),
          9: () => Navigation.switch(),
          12: () => Navigation.up(),
          13: () => Navigation.down(),
          14: () => Navigation.left(),
          15: () => Navigation.right(),
        };
        // Handle button press
        if (pressed) {
          if (buttonMapping[index]) {
            buttonMapping[index]();
            // Set repeat action and timeout to the mapped button
            repeatAction = buttonMapping[index];
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
  $('#wasmSpinnerMessage').text('Loading Moonlight...');
}

function moduleDidLoad() {
  loadHTTPCerts();
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

function beginBackgroundPollingOfHost(host) {
  // Assign methods of NvHTTP to the host object
  Object.assign(host, NvHTTP.prototype);

  // Refresh server info before attempting to start background polling of the host
  host.refreshServerInfo().then(function(ret) {
    console.log('%c[index.js, beginBackgroundPollingOfHost]', 'color: green;', 'Starting background polling of host ' + host.serverUid, host, '\n' + host.toString()); // Logging both object (for console) and toString-ed object (for text logs)
    // Find the desired host cell using the server UUID
    var hostCell = document.querySelector('#host-' + host.serverUid);
    // Check if the host is currently online
    if (host.online) {
      // If the host is online, show it as active
      hostCell.classList.remove('host-cell-inactive');
      // The host was already online, so start polling in the background now
      activePolls[host.serverUid] = window.setInterval(function() {
        // Every 5 seconds, poll at the address to check for any status changes
        host.pollServer(function(returnedHost) {
          // Check if the host is currently online
          if (returnedHost.online) {
            hostCell.classList.remove('host-cell-inactive');
          } else {
            hostCell.classList.add('host-cell-inactive');
          }
        });
      }, 5000);
    } else {
      // If the host is offline, show it as inactive
      hostCell.classList.add('host-cell-inactive');
      // The host was offline, so poll immediately to check the host's status
      host.pollServer(function(returnedHost) {
        // Check if the host is currently online
        if (returnedHost.online) {
          hostCell.classList.remove('host-cell-inactive');
        } else {
          hostCell.classList.add('host-cell-inactive');
        }
        // Now that the initial poll is done, start the background polling
        activePolls[host.serverUid] = window.setInterval(function() {
          // Every 5 seconds, poll at the address to check for any status changes
          host.pollServer(function(returnedHost) {
            // Check if the host is currently online
            if (returnedHost.online) {
              hostCell.classList.remove('host-cell-inactive');
            } else {
              hostCell.classList.add('host-cell-inactive');
            }
          });
        }, 5000);
      });
    }
  }, function(failedRefreshInfo) {
    console.error('%c[index.js, beginBackgroundPollingOfHost]', 'color: green;', 'Error: Failed to refresh server info! Returned error was: ' + failedRefreshInfo + '! Failed server was: ' + '\n', host, '\n' + host.toString()); // Logging both object (for console) and toString-ed object (for text logs)
  });
}

function startPollingHosts() {
  for (var hostUID in hosts) {
    beginBackgroundPollingOfHost(hosts[hostUID]);
  }
}

function endBackgroundPollingOfHost(host) {
  console.log('%c[index.js, endBackgroundPollingOfHost]', 'color: green;', 'Stopping background polling of host ' + host.serverUid, host, '\n' + host.toString()); // Logging both object (for console) and toString-ed object (for text logs)
  // Clear the host's polling interval and remove it from the activePolls object
  window.clearInterval(activePolls[host.serverUid]);
  delete activePolls[host.serverUid];
}

function stopPollingHosts() {
  for (var hostUID in hosts) {
    endBackgroundPollingOfHost(hosts[hostUID]);
  }
}

function snackbarLog(givenMessage) {
  console.log('%c[index.js, snackbarLog]', 'color: green;', givenMessage);
  var data = {
    message: givenMessage,
    timeout: 2500
  };
  document.querySelector('#snackbar').MaterialSnackbar.showSnackbar(data);
}

function snackbarLogLong(givenMessage) {
  console.log('%c[index.js, snackbarLogLong]', 'color: green;', givenMessage);
  var data = {
    message: givenMessage,
    timeout: 5000
  };
  document.querySelector('#snackbar').MaterialSnackbar.showSnackbar(data);
}

// Handle layout elements when displaying the Hosts view
function showHostsMode() {
  console.log('%c[index.js, showHostsMode]', 'color: green;', 'Entering "Show Hosts" mode.');
  $('#header-title').html('Hosts');
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
  startPollingHosts();
}

// Show the Hosts grid
function showHosts() {
  // Hide the main header and content before showing a loading screen
  $('#main-header').children().hide();
  $('#main-header').css({'backgroundColor': 'transparent', 'boxShadow': 'none'});
  $('#settings-list, #game-grid').hide();

  // Show a spinner while the host list loads
  $('#wasmSpinner').css('display', 'inline-block');
  $('#wasmSpinnerLogo').hide();
  $('#wasmSpinnerMessage').text('Loading Hosts...');

  setTimeout(() => {
    // Hide the spinner after successfully retrieving the host list
    $('#wasmSpinner').hide();

    // Show the main header after the loading screen is complete
    $('#main-header').children().show();
    $('#main-header').css({'backgroundColor': '#333846', 'boxShadow': '0 0 4px 0 rgba(0, 0, 0, 1)'});

    // Navigate to the Hosts view
    showHostsMode();
  }, 500);

  // Set focus to current item and/or scroll to the current host row
  setTimeout(() => Navigation.switch(), 500);
}

function restoreUiAfterWasmLoad() {
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

function hostChosen(host) {
  // If the host is already offline or fails to connect, notify the user.
  if (!host.online) {
    // Let the user know what to do to bring the host back online and until then, we'll be back to the previous view.
    console.error('%c[index.js, hostChosen]', 'color: green;', 'Error: Connection to host failed or host is offline!');
    snackbarLogLong('Failed to connect to the host. Ensure the host is online, Sunshine is running on your PC or GameStream is enabled in GeForce Experience SHIELD settings.');
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
      showApps(host);
      Navigation.push(Views.Apps);
      setTimeout(() => {
        // Scroll to the current game row
        Navigation.switch();
        // Switch to Apps view
        Navigation.change(Views.Apps);
      }, 1500);
    }, function() {
      // Start polling the host after pairing flow
      startPollingHosts();
    });
  } else {
    // But if the host is already paired and online, then we show the apps and navigate to the Apps view as usual.
    showApps(host);
    Navigation.push(Views.Apps);
    setTimeout(() => {
      // Scroll to the current game row
      Navigation.switch();
      // Switch to Apps view
      Navigation.change(Views.Apps);
    }, 1500);
  }
}

// Handles the change of input mode based on the state of the IP address field mode switch
function handleIpAddressFieldMode() {
  // Finds the existing switch, input field, and select fields elements
  const ipAddressFieldModeSwitch = document.getElementById('ipAddressFieldModeSwitch');
  const ipAddressInputField = document.getElementById('ipAddressInputField');
  const ipAddressSelectFields = document.getElementById('ipAddressSelectFields');

  // Checks if the IP address field mode switch is checked
  if (ipAddressFieldModeSwitch.checked) {
    // Hides the input field and shows the select field
    ipAddressInputField.style.display = 'none';
    ipAddressSelectFields.style.display = 'block';
  } else {
    // Shows the input field and hides the select field
    ipAddressInputField.style.display = 'block';
    ipAddressSelectFields.style.display = 'none';
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

// If the `Add Host +` is selected on the host grid, then show the 
// Add Host dialog to enter the connection details for the host PC
function addHostDialog() {
  // Find the existing overlay and dialog elements
  var addHostOverlay = document.querySelector('#addHostDialogOverlay');
  var addHostDialog = document.querySelector('#addHostDialog');
  
  // Show the dialog and push the view
  addHostOverlay.style.display = 'flex';
  addHostDialog.showModal();
  isDialogOpen = true;
  Navigation.push(Views.AddHostDialog);

  // Checks if the IP address field mode switch is checked
  if ($('#ipAddressFieldModeSwitch').prop('checked')) {
    // Remove focus from any currently focused element
    document.activeElement.blur();
  } else {
    // Set focus to the currently active element
    document.activeElement.focus();
  }

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
    initIpAddressFields();
  });

  // Send a connection request if the Continue button is pressed
  $('#continueAddHost').off('click');
  $('#continueAddHost').on('click', function() {
    console.log('%c[index.js, addHostDialog]', 'color: green;', 'Adding host, closing app dialog, and returning.');
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
    // Get the IP address value from the input field
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
    // Send a connection request to the Host object based on the given IP address
    var _nvhttpHost = new NvHTTP(inputHost, myUniqueid, inputHost);
    console.log('%c[index.js, addHostDialog]', 'color: green;', 'Sending connection request to host address ' + _nvhttpHost.hostname);
    _nvhttpHost.refreshServerInfoAtAddress(inputHost).then(function(success) {
      snackbarLog('Connecting to ' + _nvhttpHost.hostname + '...');
      // Close the dialog if the user has provided the IP address
      console.log('%c[index.js, addHostDialog]', 'color: green;', 'Closing app dialog and returning.');
      addHostOverlay.style.display = 'none';
      addHostDialog.close();
      isDialogOpen = false;
      Navigation.pop();
      // Check if we already have record of this host. If so, we'll
      // need the PPK string to ensure our pairing status is accurate.
      if (hosts[_nvhttpHost.serverUid] != null) {
        // Update the addresses
        hosts[_nvhttpHost.serverUid].address = _nvhttpHost.address;
        hosts[_nvhttpHost.serverUid].userEnteredAddress = _nvhttpHost.userEnteredAddress;
        // Use the host in the array directly to ensure the PPK propagates after pairing
        pairingDialog(hosts[_nvhttpHost.serverUid], function() {
          saveHosts();
        });
      } else {
        pairingDialog(_nvhttpHost, function() {
          // Host must be in the grid before starting background polling
          addHostToGrid(_nvhttpHost);
          beginBackgroundPollingOfHost(_nvhttpHost);
          saveHosts();
        });
      }
      // Re-enable the Continue button after successful processing
      $('#continueAddHost').removeClass('mdl-button--disabled').prop('disabled', false);
      // Clear the input field after successful processing
      $('#ipAddressTextInput').val('');
      initIpAddressFields();
    }.bind(this), function(failure) {
      console.error('%c[index.js, addHostDialog]', 'color: green;', 'Error: Failed API object:\n', _nvhttpHost, '\n' + _nvhttpHost.toString()); // Logging both object (for console) and toString-ed object (for text logs)
      snackbarLogLong('Failed to connect to ' + (_nvhttpHost.hostname || 'the host') + '. Ensure Sunshine is running on your PC or GameStream is enabled in GeForce Experience SHIELD settings.');
      // Re-enable the Continue button after failure processing
      $('#continueAddHost').removeClass('mdl-button--disabled').prop('disabled', false);
      // Clear the input field after failure processing
      $('#ipAddressTextInput').val('');
      initIpAddressFields();
    }.bind(this));
  });
}

// Show the Pairing dialog before pairing with the given NvHTTP host object. Returns whether the pairing was successful or failed.
function pairingDialog(nvhttpHost, onSuccess, onFailure) {
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
      snackbarLogLong('Failed to connect to ' + nvhttpHost.hostname + '. Ensure Sunshine is running on your host PC or GameStream is enabled in the GeForce Experience SHIELD settings.');
      onFailure();
      return;
    }

    if (nvhttpHost.paired) {
      onSuccess();
      return;
    }

    if (nvhttpHost.currentGame != 0) {
      snackbarLogLong(nvhttpHost.hostname + ' is currently in a game session. Please quit the running app or restart the computer, then try again.');
      onFailure();
      return;
    }

    // Find the existing overlay and dialog elements
    var pairingOverlay = document.querySelector('#pairingDialogOverlay');
    var pairingDialog = document.querySelector('#pairingDialog');
    var randomNumber = String('0000' + (Math.random() * 10000 | 0)).slice(-4);

    // Change the dialog text element to include the random PIN number
    $('#pairingDialogText').html(
      'Please enter the following PIN on the target PC: ' + randomNumber + '<br><br>' +
      'If your host PC is running Sunshine (all GPUs), navigate to the Sunshine Web UI to enter the PIN.<br><br>' +
      'Alternatively, if your host PC has NVIDIA GameStream (NVIDIA-only), navigate to the GeForce Experience to enter the PIN.<br><br>' +
      'This dialog will close once the pairing is complete.'
    );

    // Show the dialog and push the view
    pairingOverlay.style.display = 'flex';
    pairingDialog.showModal();
    isDialogOpen = true;
    Navigation.push(Views.PairingDialog);

    // Cancel the operation if the Cancel button is pressed
    $('#cancelPairing').off('click');
    $('#cancelPairing').on('click', function() {
      console.log('%c[index.js, pairingDialog]', 'color: green;', 'Closing app dialog and returning.');
      pairingOverlay.style.display = 'none';
      pairingDialog.close();
      isDialogOpen = false;
      Navigation.pop();
    });

    console.log('%c[index.js, pairingDialog]', 'color: green;', 'Sending pairing request to ' + nvhttpHost.hostname + ' with PIN ' + randomNumber);
    nvhttpHost.pair(randomNumber).then(function() {
      snackbarLog('Successfully paired with ' + nvhttpHost.hostname);
      // Close the dialog if the pairing was successful
      console.log('%c[index.js, pairingDialog]', 'color: green;', 'Closing app dialog and returning.');
      pairingOverlay.style.display = 'none';
      pairingDialog.close();
      isDialogOpen = false;
      Navigation.pop();
      onSuccess();
    }, function(failedPairing) {
      console.error('%c[index.js, pairingDialog]', 'color: green;', 'Error: Failed API object:\n', nvhttpHost, '\n' + nvhttpHost.toString()); // Logging both object (for console) and toString-ed object (for text logs)
      snackbarLog('Failed to pair with ' + nvhttpHost.hostname);
      // If the host is already in a streaming session or failed during pairing,
      // change the dialog text element to include the hostname and display the returned error message
      if (nvhttpHost.currentGame != 0) {
        $('#pairingDialogText').html('Error: ' + nvhttpHost.hostname + ' is currently busy!<br><br>You must stop the running app in order to pair with the host.');
      } else {
        $('#pairingDialogText').html('Error: Failed to pair with ' + nvhttpHost.hostname + '.<br><br>Please, try pairing with the host again.');
      }
      onFailure();
    });
  });
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
    html: host.hostname
  });

  // Create the host menu button with the appropriate attributes for the host menu
  var hostMenu = $('<div>', {
    id: 'hostMenuButton-' + host.serverUid,
    class: 'host-menu',
    role: 'button',
    tabindex: 0,
    'aria-label': host.hostname + ' menu'
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
    hosts = previousValue.hosts != null ? previousValue.hosts : {};
    if (host.macAddress != '00:00:00:00:00:00') {
      if (hosts[host.serverUid] && hosts[host.serverUid].macAddress != host.macAddress) {
        console.log('%c[index.js, updateMacAddress]', 'color: green;', 'Updated MAC address for host ' + host.hostname + ' from ' + hosts[host.serverUid].macAddress + ' to ' + host.macAddress);
        hosts[host.serverUid].macAddress = host.macAddress;
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
      text: 'Refresh apps',
      action: function() {
        // Refresh the list of apps for the target host
        snackbarLogLong('Refreshing the list of ' + host.hostname + ' applications...');
        host.clearBoxArt();
        host.getAppListWithCacheFlush();
      }
    },
    {
      id: 'wakeHost-' + host.hostname,
      class: 'host-menu-button',
      text: 'Wake PC',
      action: function() {
        // Send a Wake-on-LAN request to the target host
        snackbarLogLong('Sending a Wake On LAN request to ' + host.hostname + '...');
        host.sendWOL();
      }
    },
    {
      id: 'deleteHost-' + host.hostname,
      class: 'host-menu-button',
      text: 'Delete PC',
      action: function() {
        // Remove the selected host from the list
        setTimeout(() => deleteHostDialog(host), 100);
      }
    },
    {
      id: 'viewDetails-' + host.hostname,
      class: 'host-menu-button',
      text: 'View Details',
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
      text: menuOption.text
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
    text: 'Close'
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
  document.getElementById('deleteHostDialogTitle').innerHTML = 'Delete Host';
  document.getElementById('deleteHostDialogText').innerHTML = 'Are you sure you want to delete ' + host.hostname + '?';

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
    // Remove the host from the hosts object
    delete hosts[host.serverUid];
    // Save the updated hosts
    saveHosts();
    // If host removed, show snackbar message
    snackbarLog(host.hostname + ' has been deleted successfully.');
    deleteHostOverlay.style.display = 'none';
    deleteHostDialog.close();
    isDialogOpen = false;
    Navigation.pop();
    Navigation.left();
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
    document.getElementById('deleteHostDialogTitle').innerHTML = 'Delete All Hosts';
    document.getElementById('deleteHostDialogText').innerHTML = 'Are you sure you want to delete all existing hosts?';
    
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
      deleteHostOverlay.style.display = 'none';
      deleteHostDialog.close();
      isDialogOpen = false;
      Navigation.pop();
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
    text: 'Host Details'
  }).appendTo(hostDetailsDialog);

  // Create a content section inside the dialog
  var hostDetailsDialogContent = $('<div>', {
    class: 'mdl-dialog__content'
  }).appendTo(hostDetailsDialog);

  // Add a paragraph with multiple lines of text
  $('<p>', {
    id: 'hostDetailsDialogText-' + host.serverUid,
    class: 'host-details-text',
    html: 'Name: ' + host.hostname + '<br>' +
          'State: ' + (host.online ? 'ONLINE' : 'OFFLINE') + '<br>' +
          'Active Address: ' + (host.address && host.externalPort ? host.address + ':' + host.externalPort : 'NULL') + '<br>' +
          'UUID: ' + (host.serverUid ? host.serverUid : 'NULL') + '<br>' +
          'Local Address: ' + (host.localAddress && host.externalPort ? host.localAddress + ':' + host.externalPort : 'NULL') + '<br>' +
          'MAC Address: ' + (host.macAddress ? host.macAddress : 'NULL') + '<br>' +
          'Pair State: ' + (host.paired ? 'PAIRED' : 'UNPAIRED') + '<br>' +
          'Running Game ID: ' + host.currentGame + '<br>' +
          'HTTPS Port: ' + (host.httpsPort ? host.httpsPort : 'NULL')
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
    text: 'Close'
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
  $('#header-title').html('Settings');
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
}

// Show the Settings list
function showSettings() {
  // Hide the main header and content before showing a loading screen
  $('#main-header').children().hide();
  $('#main-header').css({'backgroundColor': 'transparent', 'boxShadow': 'none'});
  $('#host-grid, #game-grid').hide();

  // Show a spinner while the setting list loads
  $('#wasmSpinner').css('display', 'inline-block');
  $('#wasmSpinnerLogo').hide();
  $('#wasmSpinnerMessage').text('Loading Settings...');

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
  // Remove the 'hovered' and 'is-focused' classes from all toggle switches
  document.querySelectorAll('.mdl-switch').forEach(function(toggleSwitch) {
    toggleSwitch.classList.remove('hovered', 'is-focused');
  });

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
  setTimeout(() => Navigation.switch(), 5);
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
  // GitHub API endpoint to get the latest released version
  const repoOwner = 'ndriqimlahu';
  const repoName = 'moonlight-tizen';
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
    const releaseNotes = extractReleaseNotes(data.body) || 'No relevant changes found.';
    return { latestVersion, releaseNotes };
  });
}

// Compare the current version with the latest version to determine if an update is available
function checkVersionUpdate(currentVersion, latestVersion) {
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
  const match = releaseNotes.match(/## What's Changed:\r?\n\r?\n([\s\S]+?)(?:\r?\n\r?\n\*\*Full Changelog\*\*|$)/);
  return match ? match[1].split('\n').map(line => line.replace(/^-\s/, '• ')).join('<br>') : null;
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
    text: 'New update v' + latestVersion
  });
  // Create the button tooltip dynamically
  var updateAppBtnTooltip = $('<div>', {
    id: 'updateAppBtnTooltip',
    class: 'mdl-tooltip',
    'for': 'updateAppBtn',
    text: 'Check what\'s new'
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
    // Get current app version
    const currentVersion = tizen.application.getAppInfo().version;

    console.log('%c[index.js, updateAppButton]', 'color: green;', 'Checking for new update release notes...');
    // Fetch the latest release data from the GitHub API
    fetchLatestRelease().then(({ latestVersion, releaseNotes }) => {
      setTimeout(() => {
        // Check if a new version update is available
        if (checkVersionUpdate(currentVersion, latestVersion)) {
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
  // Create an overlay for the dialog and append it to the body
  var updateAppDialogOverlay = $('<div>', {
    id: 'updateAppDialogOverlay',
    class: 'dialog-overlay'
  }).appendTo(document.body);

  // Create the dialog element and append it to the overlay
  var updateAppDialog = $('<dialog>', {
    id: 'updateAppDialog',
    class: 'mdl-dialog'
  }).appendTo(updateAppDialogOverlay);

  // Add a dialog title named Update Moonlight
  $('<h3>', {
    id: 'updateAppDialogTitle',
    class: 'mdl-dialog__title',
    text: 'Update Moonlight'
  }).appendTo(updateAppDialog);

  // Create a content section inside the dialog
  var updateAppDialogContent = $('<div>', {
    class: 'mdl-dialog__content'
  }).appendTo(updateAppDialog);

  // Add a paragraph with multiple lines of text
  $('<p>', {
    id: 'updateAppDialogText',
    class: 'update-app-text',
    html: `Version ${latestVersion} is now available! Update manually to enjoy new features and improvements.<br><br>` +
          `<strong>What's Changed:</strong><br>` + releaseNotes
  }).appendTo(updateAppDialogContent);

  // Create the actions section inside the dialog
  var updateAppDialogActions = $('<div>', {
    class: 'mdl-dialog__actions'
  }).appendTo(updateAppDialog);

  // Create and set up the Close button
  var closeUpdateAppDialog = $('<button>', {
    type: 'button',
    id: 'closeUpdateApp',
    class: 'mdl-button mdl-js-button mdl-button--raised mdl-button--colored mdl-js-ripple-effect',
    text: 'Close'
  });

  // Close the dialog if the Close button is pressed
  closeUpdateAppDialog.off('click');
  closeUpdateAppDialog.click(function() {
    console.log('%c[index.js, updateAppDialog]', 'color: green;', 'Closing app dialog and returning.');
    $(updateAppDialogOverlay).css('display', 'none');
    updateAppDialog[0].close();
    updateAppDialogOverlay.remove();
    isDialogOpen = false;
    Navigation.pop();
    Navigation.switch();
  }).appendTo(updateAppDialogActions);

  // If the dialog element doesn't support the showModal method, register it with dialogPolyfill
  if (!updateAppDialog[0].showModal) {
    dialogPolyfill.registerDialog(updateAppDialog[0]);
  }

  // Show the dialog and push the view
  $(updateAppDialogOverlay).css('display', 'flex');
  updateAppDialog[0].showModal();
  isDialogOpen = true;
  Navigation.push(Views.UpdateMoonlightDialog);
  setTimeout(() => Navigation.switch(), 5);
}

// Check for updates when the Check for Updates button is pressed
function checkForAppUpdates() {
  // Get current app version
  const currentVersion = tizen.application.getAppInfo().version;

  console.log('%c[index.js, checkForAppUpdates]', 'color: green;', 'Checking for new application updates...');
  snackbarLog('Checking for available Moonlight updates...');
  // Fetch the latest release data from the GitHub API
  fetchLatestRelease().then(({ latestVersion, releaseNotes }) => {
    setTimeout(() => {
      // Check if a new version update is available
      if (checkVersionUpdate(currentVersion, latestVersion)) {
        // Show the Update Moonlight dialog with new version and release notes to inform user to update the app
        updateAppDialog(latestVersion, releaseNotes);
      } else {
        // Otherwise, show a snackbar message to inform the user that the app is already up to date
        snackbarLogLong(`✅ Your app is already up to date! You're on the latest version.`);
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
  getData(UPDATE_TIMESTAMP, function(result) {
    var lastChecked = result[UPDATE_TIMESTAMP];
    var currentTime = Date.now();

    if (lastChecked) {
      console.log('%c[index.js, checkForAppUpdatesAtStartup]', 'color: green;', `Last auto-check performed: ${formatUpdateTimestamp(lastChecked)}`);
    }

    // Check if enough time has passed since the last update check
    if (!lastChecked || currentTime - lastChecked > UPDATE_INTERVAL) {
      // Get current app version
      const currentVersion = tizen.application.getAppInfo().version;

      console.log('%c[index.js, checkForAppUpdatesAtStartup]', 'color: green;', 'Performing auto-check for new application updates...');
      // Fetch the latest release data from the GitHub API
      fetchLatestRelease().then(({ latestVersion }) => {
        setTimeout(() => {
          // Check if a new version update is available
          if (checkVersionUpdate(currentVersion, latestVersion)) {
            // Show snackbar message with new version to inform user to update the app
            snackbarLogLong(`🚀 Version ${latestVersion} is now available! Check out the latest features & improvements.`);
            // Create and display the Update App button with tooltip and additional layout spacer
            updateAppButton(latestVersion);
          }
        }, 100);
      }).catch(error => {
        console.error('%c[index.js, checkForAppUpdatesAtStartup]', 'color: green;', 'Error: Failed to fetch the release data!', error);
        snackbarLogLong('Cannot automatically check for updates at this time!');
      });

      // Save the current time
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
  document.getElementById('warningDialogTitle').innerHTML = title;
  document.getElementById('warningDialogText').innerHTML = message;

  // Show the dialog and push the view
  warningDialogOverlay.style.display = 'flex';
  warningDialog.showModal();
  isDialogOpen = true;
  Navigation.push(Views.WarningDialog);

  // Cancel the operation if the Close button is pressed
  $('#closeWarning').off('click');
  $('#closeWarning').on('click', function() {
    console.log('%c[index.js, warningDialog]', 'color: green;', 'Closing app dialog and returning.');
    warningDialogOverlay.style.display = 'none';
    warningDialog.close();
    isDialogOpen = false;
    Navigation.pop();
    Navigation.switch();
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
  document.getElementById('restartAppDialogText').innerHTML = 'Are you sure you want to restart Moonlight?';

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
  document.getElementById('restartAppDialogText').innerHTML = 'In order for your changes to take effect, a restart of the application is required.'
  + '<br><br>' + 'Would you like to proceed with the restart?';

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
function stylizeBoxArt(freshApi, appIdToStylize) {
  // Refresh server info and apply the CSS style to the current running game
  freshApi.refreshServerInfo().then(function(ret) {
    var appBox = document.querySelector('#game-container-' + appIdToStylize);
    if (!appBox) {
      console.warn('%c[index.js, stylizeBoxArt]', 'color: green;', 'Warning: No box art found for appId: ' + appIdToStylize);
      return;
    }
    // If the game is currently running, then apply CSS stylization
    if (freshApi.currentGame === appIdToStylize) {
      appBox.classList.add('current-game-active');
      appBox.title += ' (Running)';
    } else {
      appBox.classList.remove('current-game-active');
      appBox.title = appBox.title.replace(' (Running)', ''); // TODO: Replace with localized string so make it e.title = game_title
    }
  }, function(failedRefreshInfo) {
    console.error('%c[index.js, stylizeBoxArt]', 'color: green;', 'Error: Failed to refresh server info! Returned error was: ' + failedRefreshInfo + '!');
  });
}

// Sort the app titles
function sortTitles(list, sortOrder) {
  return list.sort((a, b) => {
    const titleA = a.title.toLowerCase();
    const titleB = b.title.toLowerCase();

    // Ascending order (A - Z)
    if (sortOrder === 'ASC') {
      if (titleA < titleB) {
        return -1;
      }
      if (titleA > titleB) {
        return 1;
      }
      return 0;
    }

    // Descending order (Z - A)
    if (sortOrder === 'DESC') {
      if (titleA < titleB) {
        return 1;
      }
      if (titleA > titleB) {
        return -1;
      }
      return 0;
    }
  });
}

// Handle layout elements when displaying the Apps view
function showAppsMode() {
  console.log('%c[index.js, showAppsMode]', 'color: green;', 'Entering "Show Apps" mode.');
  $('#header-title').html('Apps');
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
  // Safety checking should happen before attempting to show the app list
  if (!host || !host.paired) {
    console.error('%c[index.js, showApps]', 'color: green;', 'Error: Unable to initialize the host properly! Host object: ', host);
    return;
  } else {
    console.log('%c[index.js, showApps]', 'color: green;', 'Current host object: \n', host, '\n' + host.toString()); // Logging both object (for console) and toString-ed object (for text logs)
  }

  // Hide the main header before showing a loading screen
  $('#main-header').children().hide();
  $('#main-header').css({'backgroundColor': 'transparent', 'boxShadow': 'none'});
  $('#host-grid, #settings-list').hide();

  // Show a spinner while the app list loads
  $('#wasmSpinner').css('display', 'inline-block');
  $('#wasmSpinnerLogo').hide();
  $('#wasmSpinnerMessage').text('Loading Apps...');

  // Remove all game container elements from the game grid and from any other div elements
  $('#game-grid .game-container').remove();
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
        return;
      }

      // Find the existing switch element
      const sortAppsListSwitch = document.getElementById('sortAppsListSwitch');
      // Defines the sort order based on the state of the switch
      const sortOrder = sortAppsListSwitch.checked ? 'DESC' : 'ASC';
      // If game grid is populated, sort the app list
      const sortedAppList = sortTitles(appList, sortOrder);

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
            html: app.title
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

          // Apply style to the game container to indicate whether the game is active or not
          setTimeout(() => stylizeBoxArt(host, app.id), 100);
        }
        // Load box art
        var boxArtPlaceholderImg = new Image();
        host.getBoxArt(app.id).then(function(resolvedPromise) {
          boxArtPlaceholderImg.src = resolvedPromise;
        }, function(failedPromise) {
          console.error('%c[index.js, showApps]', 'color: green;', 'Error: Failed to retrieve box art for app ID: ' + app.id + '. Returned value was: ' + failedPromise + '. Host object: ', host, '\n' + host.toString()); // Logging both object (for console) and toString-ed object (for text logs)
          boxArtPlaceholderImg.src = 'static/res/placeholder_error.svg';
        });
        boxArtPlaceholderImg.onload = e => boxArtPlaceholderImg.classList.add('fade-in');
        $(gameContainer).append(boxArtPlaceholderImg);
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
    });

    // Navigate to the Apps view
    showAppsMode();
  }, 500);
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
      document.getElementById('quitAppDialogText').innerHTML = 'Are you sure you want to quit ' + currentGame.title + '? All unsaved data will be lost.';
      
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

  // Refresh the server info, because the user might have quit the game
  host.refreshServerInfo().then(function(ret) {
    host.getAppById(appID).then(function(appToStart) {
      if (host.currentGame != 0 && host.currentGame != appID) {
        host.getAppById(host.currentGame).then(function(currentApp) {
          // Find the existing overlay and dialog elements
          var quitAppOverlay = document.querySelector('#quitAppDialogOverlay');
          var quitAppDialog = document.querySelector('#quitAppDialog');

          // Change the dialog text element to include the game title
          document.getElementById('quitAppDialogText').innerHTML = currentApp.title + ' is already running. Would you like to quit it and start ' + appToStart.title + '?';

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
      var audioConfig = $('#selectAudio').data('value').toString();
      const audioSync = $('#audioSyncSwitch').parent().hasClass('is-checked') ? 1 : 0;
      const playHostAudio = $('#playHostAudioSwitch').parent().hasClass('is-checked') ? 1 : 0;
      var videoCodec = $('#selectCodec').data('value').toString();
      const hdrMode = $('#hdrModeSwitch').parent().hasClass('is-checked') ? 1 : 0;
      const fullRange = $('#fullRangeSwitch').parent().hasClass('is-checked') ? 1 : 0;
      const gameMode = $('#gameModeSwitch').parent().hasClass('is-checked') ? 1 : 0;
      const disableWarnings = $('#disableWarningsSwitch').parent().hasClass('is-checked') ? 1 : 0;
      const performanceStats = $('#performanceStatsSwitch').parent().hasClass('is-checked') ? 1 : 0;

      console.log('%c[index.js, startGame]', 'color: green;', 'startRequest:' + 
      '\n Host address: ' + host.address + 
      '\n Video resolution: ' + streamWidth + 'x' + streamHeight + 
      '\n Video frame rate: ' + frameRate + ' FPS' + 
      '\n Video bitrate: ' + bitrate + ' Kbps' + 
      '\n Video frame pacing: ' + framePacing + 
      '\n Optimize game settings: ' + optimizeGames + 
      '\n Rumble feedback: ' + rumbleFeedback + 
      '\n Mouse emulation: ' + mouseEmulation + 
      '\n Flip A/B face buttons: ' + flipABfaceButtons + 
      '\n Flip X/Y face buttons: ' + flipXYfaceButtons + 
      '\n Audio configuration: ' + audioConfig + 
      '\n Audio synchronization: ' + audioSync + 
      '\n Play host audio: ' + playHostAudio + 
      '\n Video codec: ' + videoCodec + 
      '\n Video HDR mode: ' + hdrMode + 
      '\n Full color range: ' + fullRange + 
      '\n Game Mode: ' + gameMode + 
      '\n Disable connection warnings: ' + disableWarnings + 
      '\n Performance statistics: ' + performanceStats);

      // Hide on-screen overlays until the streaming session begins
      $('#connection-warnings, #performance-stats').css('background', 'transparent').text('');

      // Shows a loading message to launch the application and start stream mode
      $('#loadingSpinnerMessage').text('Starting ' + appToStart.title + '...');
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
            snackbarLogLong('Error ' + status_code + ': ' + status_message);
            showApps(host);
            setTimeout(() => {
              // Scroll to the current game row
              Navigation.switch();
              // Switch to Apps view
              Navigation.change(Views.Apps);
            }, 1500);
            return;
          }
          // Start stream request
          sendMessage('startRequest', [
            host.address, streamWidth, streamHeight, frameRate, bitrate.toString(), rikey, rikeyid.toString(),
            host.appVersion, host.gfeVersion, $root.find('sessionUrl0').text().trim(), host.serverCodecModeSupport,
            framePacing, optimizeGames, rumbleFeedback, mouseEmulation, flipABfaceButtons, flipXYfaceButtons,
            audioConfig, audioSync, playHostAudio, videoCodec, hdrMode, fullRange, gameMode, disableWarnings,
            performanceStats
          ]);
        }, function(failedResumeApp) {
          console.error('%c[index.js, startGame]', 'color: green;', 'Error: Failed to resume app with id: ' + appID + '\n Returned error was: ' + failedResumeApp + '!');
          snackbarLog('Failed to resume ' + appToStart.title);
          showApps(host);
          setTimeout(() => {
            // Scroll to the current game row
            Navigation.switch();
            // Switch to Apps view
            Navigation.change(Views.Apps);
          }, 1500);
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
            status_message = 'Audio capture device is missing. Please reinstall the audio drivers.';
          }
          $('#loadingSpinnerMessage').text('');
          snackbarLogLong('Error ' + status_code + ': ' + status_message);
          showApps(host);
          setTimeout(() => {
            // Scroll to the current game row
            Navigation.switch();
            // Switch to Apps view
            Navigation.change(Views.Apps);
          }, 1500);
          return;
        }
        // Start stream request
        sendMessage('startRequest', [
          host.address, streamWidth, streamHeight, frameRate, bitrate.toString(), rikey, rikeyid.toString(),
          host.appVersion, host.gfeVersion, $root.find('sessionUrl0').text().trim(), host.serverCodecModeSupport,
          framePacing, optimizeGames, rumbleFeedback, mouseEmulation, flipABfaceButtons, flipXYfaceButtons,
          audioConfig, audioSync, playHostAudio, videoCodec, hdrMode, fullRange, gameMode, disableWarnings,
          performanceStats
        ]);
      }, function(failedLaunchApp) {
        console.error('%c[index.js, startGame]', 'color: green;', 'Error: Failed to launch app with id: ' + appID + '\n Returned error was: ' + failedLaunchApp + '!');
        snackbarLog('Failed to launch ' + appToStart.title + '.');
        showApps(host);
        setTimeout(() => {
          // Scroll to the current game row
          Navigation.switch();
          // Switch to Apps view
          Navigation.change(Views.Apps);
        }, 1500);
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
      snackbarLog('Quitting ' + appTitle + '...');
      host.quitApp().then(function(ret2) {
        snackbarLog('Successfully quit ' + appTitle);
        host.refreshServerInfo().then(function(ret3) {
          // Refresh to show no app is currently running
          showApps(host);
          if (typeof(callbackFunction) === "function") callbackFunction();
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

function saveResolution() {
  var chosenResolution = $(this).data('value');
  $('#selectResolution').text($(this).text()).data('value', chosenResolution);
  console.log('%c[index.js, saveResolution]', 'color: green;', 'Saving resolution value: ' + chosenResolution);
  storeData('resolution', chosenResolution, null);

  // Update the bitrate value based on the selected resolution
  setBitratePresetValue();
  // Trigger warning check after changing video resolution
  warnResolutionFramerate();
}

function saveFramerate() {
  var chosenFramerate = $(this).data('value');
  $('#selectFramerate').text($(this).text()).data('value', chosenFramerate);
  console.log('%c[index.js, saveFramerate]', 'color: green;', 'Saving framerate value: ' + chosenFramerate);
  storeData('frameRate', chosenFramerate, null);

  // Update the bitrate value based on the selected frame rate
  setBitratePresetValue();
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

function setBitratePresetValue() {
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

function saveFramePacing() {
  setTimeout(() => {
    const chosenFramePacing = $('#framePacingSwitch').parent().hasClass('is-checked');
    console.log('%c[index.js, saveFramePacing]', 'color: green;', 'Saving frame pacing state: ' + chosenFramePacing);
    storeData('framePacing', chosenFramePacing, null);
  }, 100);
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

function saveAudioConfiguration() {
  var chosenAudioConfig = $(this).data('value');
  $('#selectAudio').text($(this).text()).data('value', chosenAudioConfig);
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
    snackbarLogLong('Warning: 5.1 or 7.1 Surround sound may not be supported by your host PC and may increase audio latency!');
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

function savePlayHostAudio() {
  setTimeout(() => {
    const chosenPlayHostAudio = $('#playHostAudioSwitch').parent().hasClass('is-checked');
    console.log('%c[index.js, savePlayHostAudio]', 'color: green;', 'Saving play host audio state: ' + chosenPlayHostAudio);
    storeData('playHostAudio', chosenPlayHostAudio, null);
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
    $('#hdrModeSwitch').parent().removeClass('is-checked');
    updateHdrMode();
  } else { // Selecting other video codecs while HDR mode is disabled
    // Continue to select the SDR profile of other video codecs
    updateVideoCodec(this, chosenVideoCodec);
  }
}

function updateVideoCodec(chosenCodecId, chosenCodecValue) {
  $('#selectCodec').text($(chosenCodecId).text()).data('value', chosenCodecValue);
  console.log('%c[index.js, updateVideoCodec]', 'color: green;', 'Saving video codec value: ' + chosenCodecValue);
  storeData('videoCodec', chosenCodecValue, null);

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
      $('#hdrModeSwitch').parent().removeClass('is-checked');
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
      $('#hdrModeSwitch').parent().removeClass('is-checked');
      updateHdrMode();
    }
  }, 100);
}

function updateHdrMode() {
  setTimeout(() => {
    const chosenHdrMode = $('#hdrModeSwitch').parent().hasClass('is-checked');
    console.log('%c[index.js, updateHdrMode]', 'color: green;', 'Saving HDR mode state: ' + chosenHdrMode);
    storeData('hdrMode', chosenHdrMode, null);
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

    // Warning for Tizen 9.0 platform when enabling game mode
    if (isPlatformVer === 9.0 && chosenGameMode) {
      // Show the Warning dialog and push the view
      setTimeout(() => {
        // Show a warning message when enabling game mode on Tizen 9.0 platform
        warningDialog('Compatibility Warning',
          'Game Mode (Ultra Low Latency) is not compatible with Tizen ' + isPlatformVer + ' due to platform changes introduced by Samsung. Enabling this option may result in video freezing on the first rendered frame, black screens, unstable performance, and other streaming issues.<br><br>' +
          'If you want to benefit from Game Mode, you must apply the required Game Mode metadata during app installation and keep this setting disabled (Low Latency) in Moonlight to avoid these issues.<br><br>' +
          'For more details about this issue and the metadata workaround, please refer to the <b>Known Issues &amp; Limitations</b> page on the Wiki.'
        );
      }, 250);
    } else if (isPlatformVer < 9.0 && !chosenGameMode) { // Warning other Tizen versions when disabling game mode
      // Show a warning message when disabling game mode
      snackbarLogLong('Warning: Disabling game mode may increase latency and affect your game streaming performance!');
    }
  }, 100);
}

function saveUnlockAllFps() {
  setTimeout(() => {
    const chosenUnlockAllFps = $('#unlockAllFpsSwitch').parent().hasClass('is-checked');
    console.log('%c[index.js, saveUnlockAllFps]', 'color: green;', 'Saving unlock all FPS state: ' + chosenUnlockAllFps);
    storeData('unlockAllFps', chosenUnlockAllFps, null);
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
        <li class="mdl-menu__item" data-value="90">90 FPS</li>
        <li class="mdl-menu__item" data-value="120">120 FPS</li>
        <li class="mdl-menu__item" data-value="144">144 FPS</li>
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
      $('#selectFramerate').text('60 FPS').data('value', '60');
      console.log('%c[index.js, handleUnlockAllFps]', 'color: green;', 'Resetting framerate value to 60 FPS');
      storeData('frameRate', '60', null);
      // Update the bitrate value based on the selected frame rate
      setBitratePresetValue();
    }
  }
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
  $('#selectResolution').text('1280 x 720 (720p)').data('value', defaultResolution);
  storeData('resolution', defaultResolution, null);

  const defaultFramerate = '60';
  $('#selectFramerate').text('60 FPS').data('value', defaultFramerate);
  storeData('frameRate', defaultFramerate, null);

  const defaultBitrate = '10';
  $('#selectBitrate').html(defaultBitrate + ' Mbps');
  $('#bitrateSlider')[0].MaterialSlider.change(defaultBitrate);
  storeData('bitrate', defaultBitrate, null);

  const defaultFramePacing = false;
  document.querySelector('#framePacingBtn').MaterialSwitch.off();
  storeData('framePacing', defaultFramePacing, null);

  const defaultIpAddressFieldMode = false;
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

  const defaultAudioConfig = 'Stereo';
  $('#selectAudio').text('Stereo').data('value', defaultAudioConfig);
  storeData('audioConfig', defaultAudioConfig, null);

  const defaultAudioSync = false;
  document.querySelector('#audioSyncBtn').MaterialSwitch.off();
  storeData('audioSync', defaultAudioSync, null);

  const defaultPlayHostAudio = false;
  document.querySelector('#playHostAudioBtn').MaterialSwitch.off();
  storeData('playHostAudio', defaultPlayHostAudio, null);

  const defaultVideoCodec = 'H264';
  $('#selectCodec').text('H.264').data('value', defaultVideoCodec);
  storeData('videoCodec', defaultVideoCodec, null);

  const defaultHdrMode = false;
  document.querySelector('#hdrModeBtn').MaterialSwitch.off();
  storeData('hdrMode', defaultHdrMode, null);

  const defaultFullRange = false;
  document.querySelector('#fullRangeBtn').MaterialSwitch.off();
  storeData('fullRange', defaultFullRange, null);

  // Reset default Game Mode based on Tizen platform version
  if (isPlatformVer === 9.0) {
    // Disable for Tizen 9.0 to avoid compatibility issues
    const incompatibleGameMode = false;
    document.querySelector('#gameModeBtn').MaterialSwitch.off();
    storeData('gameMode', incompatibleGameMode, null);
  } else {
    // Enable for other Tizen platform versions
    const defaultGameMode = true;
    document.querySelector('#gameModeBtn').MaterialSwitch.on();
    storeData('gameMode', defaultGameMode, null);
  }

  const defaultUnlockAllFps = false;
  document.querySelector('#unlockAllFpsBtn').MaterialSwitch.off();
  storeData('unlockAllFps', defaultUnlockAllFps, null);

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
}

function loadSystemInfo() {
  console.log('%c[index.js, loadSystemInfo]', 'color: green;', 'Loading system information...');
  const systemInfoPlaceholder = document.getElementById('systemInfoBtn');

  // Get the system information from the TV
  if (systemInfoPlaceholder) {
    var appName = tizen.application.getAppInfo();
    console.log('%c[index.js, loadSystemInfo]', 'color: green;', 'App Name: ' + (appName.name ? appName.name : 'Unknown') + ' Game Streaming');
    var appVer = tizen.application.getAppInfo();
    console.log('%c[index.js, loadSystemInfo]', 'color: green;', 'App Version: ' + (appVer.version ? appVer.version : 'Unknown'));
    var platformVer = tizen.systeminfo.getCapability("http://tizen.org/feature/platform.version");
    console.log('%c[index.js, loadSystemInfo]', 'color: green;', 'Platform Version: Tizen ' + (platformVer ? platformVer : 'Unknown'));
    var tvModelName = webapis.productinfo.getModel();
    console.log('%c[index.js, loadSystemInfo]', 'color: green;', 'TV Model Name: ' + (tvModelName ? tvModelName : 'Unknown'));
    var tvModelFullName = webapis.productinfo.getRealModel();
    console.log('%c[index.js, loadSystemInfo]', 'color: green;', 'TV Model Full Name: ' + (tvModelFullName ? tvModelFullName : 'Unknown'));
    var tvModelCode = webapis.productinfo.getModelCode();
    console.log('%c[index.js, loadSystemInfo]', 'color: green;', 'TV Model Code: ' + (tvModelCode ? tvModelCode : 'Unknown'));
    var is4kPanelSupported = webapis.productinfo.isUdPanelSupported();
    console.log('%c[index.js, loadSystemInfo]', 'color: green;', '4K Panel: ' + (is4kPanelSupported ? 'Supported' : 'Unsupported'));
    var isHdrCapabilitySupported = webapis.avinfo.isHdrTvSupport();
    console.log('%c[index.js, loadSystemInfo]', 'color: green;', 'HDR Capability: ' + (isHdrCapabilitySupported ? 'Supported' : 'Unsupported'));

    // Insert the system information into the placeholder
    systemInfoPlaceholder.innerText =
      'App Name: ' + (appName.name ? appName.name : 'Unknown') + ' Game Streaming' + '\n' +
      'App Version: ' + (appVer.version ? appVer.version : 'Unknown') + '\n' +
      'Platform Version: Tizen ' + (platformVer ? platformVer : 'Unknown') + '\n' +
      'TV Model Name: ' + (tvModelName ? tvModelName : 'Unknown') + '\n' +
      'TV Model Full Name: ' + (tvModelFullName ? tvModelFullName : 'Unknown') + '\n' +
      'TV Model Code: ' + (tvModelCode ? tvModelCode : 'Unknown') + '\n' +
      '4K Panel: ' + (is4kPanelSupported ? 'Supported' : 'Unsupported') + '\n' +
      'HDR Capability: ' + (isHdrCapabilitySupported ? 'Supported' : 'Unsupported');
  } else {
    console.error('%c[index.js, loadSystemInfo]', 'color: green;', 'Error: Failed to load system information!');
    systemInfoPlaceholder.innerText = 'Failed to load system information!';
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
      $('.videoResolutionMenu li').each(function() {
        if ($(this).data('value') === previousValue.resolution) {
          // Update the video resolution field based on the given value
          $('#selectResolution').text($(this).text()).data('value', previousValue.resolution);
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
          $('#selectFramerate').text($(this).text()).data('value', previousValue.frameRate);
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
      document.querySelector('#framePacingBtn').MaterialSwitch.off(); // Set the default state
    } else if (previousValue.framePacing == false) {
      document.querySelector('#framePacingBtn').MaterialSwitch.off();
    } else {
      document.querySelector('#framePacingBtn').MaterialSwitch.on();
    }
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored ipAddressFieldMode preferences.');
  getData('ipAddressFieldMode', function(previousValue) {
    if (previousValue.ipAddressFieldMode == null) {
      document.querySelector('#ipAddressFieldModeBtn').MaterialSwitch.off(); // Set the default state
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

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored audioConfig preferences.');
  getData('audioConfig', function(previousValue) {
    if (previousValue.audioConfig != null) {
      $('.audioConfigMenu li').each(function() {
        if ($(this).data('value') === previousValue.audioConfig) {
          // Update the audio configuration field based on the given value
          $('#selectAudio').text($(this).text()).data('value', previousValue.audioConfig);
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

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored videoCodec preferences.');
  getData('videoCodec', function(previousValue) {
    if (previousValue.videoCodec != null) {
      $('.videoCodecMenu li').each(function() {
        if ($(this).data('value') === previousValue.videoCodec) {
          // Update the video codec field based on the given value
          $('#selectCodec').text($(this).text()).data('value', previousValue.videoCodec);
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
      if (isPlatformVer === 9.0) {
        document.querySelector('#gameModeBtn').MaterialSwitch.off(); // Disable for Tizen 9.0 to avoid compatibility issues
      } else {
        document.querySelector('#gameModeBtn').MaterialSwitch.on(); // Set the default state
      }
    } else if (previousValue.gameMode == false) {
      document.querySelector('#gameModeBtn').MaterialSwitch.off();
    } else {
      document.querySelector('#gameModeBtn').MaterialSwitch.on();
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
      // See comment on myUniqueid
      /*if (savedUniqueid.uniqueid != null) { // We have a saved uniqueid
        myUniqueid = savedUniqueid.uniqueid;
      } else {
        myUniqueid = uniqueid();
        storeData('uniqueid', myUniqueid, null);
      }*/

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
          revivedHost.serverUid = hosts[hostUID].serverUid;
          revivedHost.externalIP = hosts[hostUID].externalIP;
          revivedHost.hostname = hosts[hostUID].hostname;
          revivedHost.ppkstr = hosts[hostUID].ppkstr;
          addHostToGrid(revivedHost);
        }
        startPollingHosts();
        console.log('%c[index.js, loadHTTPCertsCb]', 'color: green;', 'Loading previously connected hosts...');
      });
    });
  });
}

function onWindowLoad() {
  console.log('%c[index.js, onWindowLoad]', 'color: green;', 'Moonlight\'s main window loaded.');

  initSamsungKeys();
  initSpecialKeys();
  loadSystemInfo();
  loadUserData();
}

window.onload = onWindowLoad;

// Gamepad connected events
window.addEventListener('gamepadconnected', function(e) {
  const connectedGamepad = e.gamepad;
  const gamepadIndex = connectedGamepad.index;
  const rumbleFeedbackSwitch = document.getElementById('rumbleFeedbackSwitch');
  console.log('%c[index.js, gamepadconnected]', 'color: green;', 'Gamepad connected:\n' + JSON.stringify(connectedGamepad), connectedGamepad);
  snackbarLog('Gamepad ' + gamepadIndex + ' has been connected.');
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
  snackbarLog('Gamepad ' + gamepadIndex + ' has been disconnected.');
  console.warn('%c[index.js, gamepaddisconnected]', 'color: green;', 'Warning: Lost connection to gamepad ' + gamepadIndex + '. Please reconnect your gamepad!');
});
