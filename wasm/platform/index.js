// Initialize variables and constants
var hosts = {}; // Hosts is an associative array of NvHTTP objects, keyed by server UID
var activePolls = {}; // Hosts currently being polled. An associated array of polling IDs, keyed by server UID
var pairingCert; // Loads the generated certificate
var myUniqueid = '0123456789ABCDEF'; // Use the same UID as other Moonlight clients to allow them to quit each other's games
var api; // The `api` should only be set if we're in a host-specific screen, on the initial screen it should always be null
var isInGame = false; // Flag indicating whether the game has started, initial value is false
var isDialogOpen = false; // Flag indicating whether the dialog is open, initial value is false
var appName = null; // Flag indicating whether the application name is set, initial value is null
var appVer = null; // Flag indicating whether the application version is set, initial value is null
var platformVer = null; // Flag indicating whether the platform version is set, initial value is null
var tvModelName = null; // Flag indicating whether the TV model name is set, initial value is null
var tvModelCode = null; // Flag indicating whether the TV model code is set, initial value is null
var repeatAction = null; // Flag indicating whether the repeat action is set, initial value is null
var lastInvokeTime = 0; // Flag indicating the last invoke time, initial value is 0
var repeatTimeout = null; // Flag indicating whether the repeat timeout is set, initial value is null
var navigationTimeout = null; // Flag indicating whether the navigation timeout is set, initial value is null
const REPEAT_DELAY = 350; // Repeat delay set to 350ms (milliseconds)
const REPEAT_INTERVAL = 100; // Repeat interval set to 100ms (milliseconds)
const ACTION_THRESHOLD = 0.5; // Threshold for initial navigation set to 0.5
const NAVIGATION_DELAY = 150; // Navigation delay set to 150ms (milliseconds)

// Called by the common.js module
function attachListeners() {
  changeUiModeForWasmLoad();
  initIpAddressFields();

  $('#addHostCell').on('click', addHost);
  $('#settingsBtn').on('click', showSettingsContainer);
  $('#supportBtn').on('click', showSupportDialog);
  $('#goBackBtn').on('click', showHostsMode);
  $('#restoreDefaultsBtn').on('click', restoreDefaultSettings);
  $('#quitRunningAppBtn').on('click', quitRunningApp);
  $('.resolutionMenu li').on('click', saveResolution);
  $('.framerateMenu li').on('click', saveFramerate);
  $('#bitrateSlider').on('input', updateBitrateField);
  $('#ipAddressFieldModeSwitch').on('click', saveIpAddressFieldMode);
  $('#sortAppsListSwitch').on('click', saveSortAppsList);
  $('#optimizeGamesSwitch').on('click', saveOptimizeGames);
  $('#externalAudioSwitch').on('click', saveExternalAudio);
  $('#removeAllHostsBtn').on('click', removeAllHosts);
  $('#rumbleFeedbackSwitch').on('click', saveRumbleFeedback);
  $('#mouseEmulationSwitch').on('click', saveMouseEmulation);
  $('#flipABfaceButtonsSwitch').on('click', saveFlipABfaceButtons);
  $('#flipXYfaceButtonsSwitch').on('click', saveFlipXYfaceButtons);
  $('.codecMenu li').on('click', saveCodecMode);
  $('#framePacingSwitch').on('click', saveFramePacing);
  $('#audioSyncSwitch').on('click', saveAudioSync);
  $('#navigationGuideBtn').on('click', showNavigationGuideDialog);
  $('#restartAppBtn').on('click', restartApplication);
  $('#exitAppBtn').on('click', exitApplication);

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
  $('#main-navigation').hide();
  $('#main-navigation').children().hide();
  $("#main-content").children().not("#listener, #wasmSpinner").hide();
  $('#wasmSpinnerMessage').text('Loading Moonlight plugins...');
  $('#wasmSpinner').css('display', 'inline-block');
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

function startPollingHosts() {
  for (var hostUID in hosts) {
    beginBackgroundPollingOfHost(hosts[hostUID]);
  }
}

function stopPollingHosts() {
  for (var hostUID in hosts) {
    stopBackgroundPollingOfHost(hosts[hostUID]);
  }
}

function restoreUiAfterWasmLoad() {
  $('#main-navigation').children().not("#goBackBtn, #restoreDefaultsBtn, #quitRunningAppBtn").show();
  $("#main-content").children().not("#listener, #wasmSpinner, #settings-container, #game-grid").show();
  $('#wasmSpinner').hide();
  $('#loadingSpinner').css('display', 'none');
  Navigation.push(Views.Hosts);
  showHostsMode();

  findNvService(function(finder, opt_error) {
    if (finder.byService_['_nvstream._tcp']) {
      var ips = Object.keys(finder.byService_['_nvstream._tcp']);
      for (var i in ips) {
        var ip = ips[i];
        if (finder.byService_['_nvstream._tcp'][ip]) {
          var mDnsDiscoveredHost = new NvHTTP(ip, myUniqueid);
          mDnsDiscoveredHost.pollServer(function(returneMdnsDiscoveredHost) {
            // Just drop this if the host doesn't respond
            if (!returneMdnsDiscoveredHost.online) {
              return;
            }
            if (hosts[returneMdnsDiscoveredHost.serverUid] != null) {
              // If we're seeing a host we've already seen before, update it for the current local IP
              hosts[returneMdnsDiscoveredHost.serverUid].address = returneMdnsDiscoveredHost.address;
              hosts[returneMdnsDiscoveredHost.serverUid].updateExternalAddressIP4();
            } else {
              // Host must be in the grid before starting background polling
              addHostToGrid(returneMdnsDiscoveredHost, true);
              beginBackgroundPollingOfHost(returneMdnsDiscoveredHost);
            }
            saveHosts();
          });
        }
      }
    }
  });
}

function beginBackgroundPollingOfHost(host) {
  console.log('%c[index.js, beginBackgroundPollingOfHost]', 'color: green;', 'Starting background polling of host ' + host.serverUid + '\n', host, host.toString()); // Logging both object (for console) and toString-ed object (for text logs)
  var hostCell = document.querySelector('#hostgrid-' + host.serverUid);
  if (host.online) {
    hostCell.classList.remove('host-cell-inactive');
    // The host was already online, just start polling in the background now
    activePolls[host.serverUid] = window.setInterval(function() {
      // Every 5 seconds, poll at the address we know it was live at
      host.pollServer(function() {
        if (host.online) {
          hostCell.classList.remove('host-cell-inactive');
        } else {
          hostCell.classList.add('host-cell-inactive');
        }
      });
    }, 5000);
  } else {
    hostCell.classList.add('host-cell-inactive');
    // The host was offline, so poll immediately
    host.pollServer(function() {
      if (host.online) {
        hostCell.classList.remove('host-cell-inactive');
      } else {
        hostCell.classList.add('host-cell-inactive');
      }
      // Now start background polling
      activePolls[host.serverUid] = window.setInterval(function() {
        // Every 5 seconds, poll at the address we know it was live at
        host.pollServer(function() {
          if (host.online) {
            hostCell.classList.remove('host-cell-inactive');
          } else {
            hostCell.classList.add('host-cell-inactive');
          }
        });
      }, 5000);
    });
  }
}

function stopBackgroundPollingOfHost(host) {
  console.log('%c[index.js, stopBackgroundPollingOfHost]', 'color: green;', 'Stopping background polling of host ' + host.serverUid + '\n', host, host.toString()); // Logging both object (for console) and toString-ed object (for text logs)
  window.clearInterval(activePolls[host.serverUid]);
  delete activePolls[host.serverUid];
}

// FIXME: This is a workaround to correctly update and store valid host MAC address in IndexedDB
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

function moduleDidLoad() {
  loadHTTPCerts();
}

// Pair to the given NvHTTP host object. Returns whether pairing was successful
function pairTo(nvhttpHost, onSuccess, onFailure) {
  if (!onFailure) {
    onFailure = function() {}
  }

  if (!pairingCert) {
    console.warn('%c[index.js, pairTo]', 'color: green;', 'User wants to pair, and we still have no cert');
    snackbarLog('Cert has not been generated yet. Is Wasm initialized?');
    onFailure();
    return;
  }

  nvhttpHost.pollServer(function(ret) {
    if (!nvhttpHost.online) {
      console.error('%c[index.js, pairTo]', 'color: green;', 'Error: Failed to connect with ' + nvhttpHost.hostname + '\n', nvhttpHost, nvhttpHost.toString()); // Logging both object (for console) and toString-ed object (for text logs)
      snackbarLog('Failed to connect with ' + nvhttpHost.hostname + '! Ensure Sunshine is running on your host PC or GameStream is enabled in GeForce Experience SHIELD settings');
      onFailure();
      return;
    }

    if (nvhttpHost.paired) {
      onSuccess();
      return;
    }

    if (nvhttpHost.currentGame != 0) {
      snackbarLog(nvhttpHost.hostname + ' is currently in game. Quit the running app or restart the computer, then try again');
      onFailure();
      return;
    }

    var randomNumber = String("0000" + (Math.random() * 10000 | 0)).slice(-4);

    // Find the existing overlay and dialog elements
    var pairingOverlay = document.querySelector('#pairingDialogOverlay');
    var pairingDialog = document.querySelector('#pairingDialog');
    $('#pairingDialogText').html('Please enter the following PIN on the target PC: ' + randomNumber + '<br><br>If your host PC is running Sunshine (all GPUs), navigate to the Sunshine Web UI to enter the PIN.<br><br>Alternatively, if your host PC has NVIDIA GameStream (NVIDIA-only), navigate to the GeForce Experience to enter the PIN.<br><br>This dialog will close once the pairing is complete.');
    
    // Show the dialog and push the view
    pairingOverlay.style.display = 'flex';
    pairingDialog.showModal();
    Navigation.push(Views.PairingDialog);
    isDialogOpen = true;

    // Cancel the operation if the Cancel button is pressed
    $('#cancelPairingDialog').off('click');
    $('#cancelPairingDialog').on('click', function() {
      console.log('%c[index.js, pairTo]', 'color: green;', 'Closing app dialog, and returning');
      pairingOverlay.style.display = 'none';
      pairingDialog.close();
      isDialogOpen = false;
      Navigation.pop();
    });

    console.log('%c[index.js, pairTo]', 'color: green;', 'Sending pairing request to ' + nvhttpHost.hostname + ' with PIN: ' + randomNumber);
    nvhttpHost.pair(randomNumber).then(function() {
      snackbarLog('Paired successfully with ' + nvhttpHost.hostname);
      // Close the dialog if the pairing was successful
      console.log('%c[index.js, pairTo]', 'color: green;', 'Closing app dialog, and returning');
      pairingOverlay.style.display = 'none';
      pairingDialog.close();
      isDialogOpen = false;
      Navigation.pop();
      onSuccess();
    }, function(failedPairing) {
      console.error('%c[index.js, pairTo]', 'color: green;', 'Error: Failed API object: ', nvhttpHost, nvhttpHost.toString()); // Logging both object (for console) and toString-ed object (for text logs)
      snackbarLog('Failed to pair with ' + nvhttpHost.hostname);
      if (nvhttpHost.currentGame != 0) {
        $('#pairingDialogText').html('Error: ' + nvhttpHost.hostname + ' is currently busy!<br><br>You must stop streaming to pair with the host.');
      } else {
        $('#pairingDialogText').html('Error: Failed to pair with ' + nvhttpHost.hostname + '<br><br>Please try pairing with the host again.');
      }
      onFailure();
    });
  });
}

function hostChosen(host) {
  if (!host.online) {
    console.error('%c[index.js, hostChosen]', 'color: green;', 'Error: Connection to the host has failed or host has gone offline');
    // If the host is offline, then return to the previous view
    snackbarLog('Connection to the host failed or the host is offline! Ensure the host is online and Sunshine is running on your host PC or GameStream is enabled in GeForce Experience SHIELD settings');
    return;
  }

  // Avoid delay from other polling during pairing
  stopPollingHosts();

  api = host;
  if (!host.paired) {
    // Still not paired, go to the pairing flow
    pairTo(host, function() {
      showApps(host);
      saveHosts();
      Navigation.push(Views.Apps);
    },
    function() {
      startPollingHosts();
    });
  } else {
    // When we queried again, it was paired, so show apps
    showApps(host);
    Navigation.push(Views.Apps);
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
function addHost() {
  // Find the existing overlay and dialog elements
  var addHostOverlay = document.querySelector('#addHostDialogOverlay');
  var addHostDialog = document.querySelector('#addHostDialog');
  
  // Show the dialog and push the view
  addHostOverlay.style.display = 'flex';
  addHostDialog.showModal();
  Navigation.push(Views.AddHostDialog);
  isDialogOpen = true;

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
    console.log('%c[index.js, addHost]', 'color: green;', 'Closing app dialog, and returning');
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
    console.log('%c[index.js, addHost]', 'color: green;', 'Adding host, and closing app dialog, and returning');
    // Disable the Continue button to prevent multiple connection requests
    setTimeout(function() {
      // Add disabled state after 2 seconds
      $('#continueAddHost').addClass('mdl-button--disabled').prop('disabled', true);
      // Re-enable the Continue button after 12 seconds
      setTimeout(function() {
        $('#continueAddHost').removeClass('mdl-button--disabled').prop('disabled', false);
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
    console.log('%c[index.js, addHost]', 'color: green;', 'Sending connection request to ' + _nvhttpHost.hostname);
    _nvhttpHost.refreshServerInfoAtAddress(inputHost).then(function(success) {
      snackbarLog('Connected successfully with ' + _nvhttpHost.hostname);
      // Close the dialog if the user has provided the IP address
      console.log('%c[index.js, addHost]', 'color: green;', 'Closing app dialog, and returning');
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
        pairTo(hosts[_nvhttpHost.serverUid], function() {
          saveHosts();
        });
      } else {
        pairTo(_nvhttpHost, function() {
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
      console.error('%c[index.js, addHost]', 'color: green;', 'Error: Failed API object: ', _nvhttpHost, _nvhttpHost.toString()); // Logging both object (for console) and toString-ed object (for text logs)
      snackbarLog('Failed to connect with ' + _nvhttpHost.hostname + '! Ensure Sunshine is running on your host PC or GameStream is enabled in GeForce Experience SHIELD settings');
      // Re-enable the Continue button after failure processing
      $('#continueAddHost').removeClass('mdl-button--disabled').prop('disabled', false);
      // Clear the input field after failure processing
      $('#ipAddressTextInput').val('');
      initIpAddressFields();
    }.bind(this));
  });
}

// Add the new NvHTTP Host object inside the host grid
function addHostToGrid(host, ismDNSDiscovered) {
  var outerDiv = $("<div>", {
    class: 'host-container mdl-card mdl-shadow--4dp',
    id: 'host-container-' + host.serverUid,
    role: 'link',
    tabindex: 0,
    'aria-label': host.hostname
  });
  var cell = $("<div>", {
    class: 'mdl-card__title mdl-card--expand',
    id: 'hostgrid-' + host.serverUid
  });
  $(cell).prepend($("<h2>", {
    class: "host-title mdl-card__title-text",
    html: host.hostname
  }));
  var hostMenu = $('<div>', {
    id: 'hostMenuButton-' + host.serverUid,
    class: 'host-menu',
    role: 'button',
    tabindex: 0,
    'aria-label': host.hostname + ' menu'
  });
  hostMenu.off('click');
  hostMenu.click(function() {
    hostMenu(host);
  });
  cell.off('click');
  cell.click(function() {
    hostChosen(host);
  });
  outerDiv.keypress(function(e) {
    if (e.keyCode == 13) {
      hostChosen(host);
    } else if (e.keyCode == 32) {
      hostMenu(host);
    }
  });
  $(outerDiv).append(cell);
  if (!ismDNSDiscovered) {
    // We don't have the option to delete mDNS hosts, so don't show it to the user
    $(outerDiv).append(hostMenu);
  }
  $('#host-grid').append(outerDiv);
  hosts[host.serverUid] = host;
  if (ismDNSDiscovered) {
    hosts[host.serverUid].updateExternalAddressIP4();
  }
}

// Show the Host Menu dialog with host button options
function hostMenu(host) {
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
      text: 'Refresh apps',
      action: function() {
        // Refresh apps and games from the selected host
        host.clearBoxArt();
        host.getAppListWithCacheFlush();
        // If apps and games have been refreshed, show snackbar message
        snackbarLogLong('Apps and games have been refreshed for ' + host.hostname);
      }
    },
    {
      id: 'wakeHost-' + host.hostname,
      text: 'Wake PC',
      action: function() {
        // Send a Wake-on-LAN request to the selected host
        host.sendWOL();
        // If the request has been sent, show snackbar message
        snackbarLogLong('Sending Wake On LAN request to ' + host.hostname);
      }
    },
    {
      id: 'removeHost-' + host.hostname,
      text: 'Delete PC',
      action: function() {
        // Remove the selected host from the list
        setTimeout(() => removeClicked(host), 100);
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
    id: 'closeHostMenuDialog',
    class: 'mdl-button mdl-js-button mdl-button--raised mdl-button--colored mdl-js-ripple-effect',
    text: 'Close'
  });
  // Close the dialog if the Close button is pressed
  closeHostMenuDialog.off('click');
  closeHostMenuDialog.click(function() {
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
function removeClicked(host) {
  // Find the existing overlay and dialog elements
  var deleteHostOverlay = document.querySelector('#deleteHostDialogOverlay');
  var deleteHostDialog = document.querySelector('#deleteHostDialog');
  document.getElementById('deleteHostDialogText').innerHTML = ' Are you sure you want to delete ' + host.hostname + '?';

  // Show the dialog and push the view
  deleteHostOverlay.style.display = 'flex';
  deleteHostDialog.showModal();
  Navigation.push(Views.DeleteHostDialog);
  isDialogOpen = true;

  // Cancel the operation if the Cancel button is pressed
  $('#cancelDeleteHost').off('click');
  $('#cancelDeleteHost').on('click', function() {
    console.log('%c[index.js, removeClicked]', 'color: green;', 'Closing app dialog, and returning');
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
    console.log('%c[index.js, removeClicked]', 'color: green;', 'Removing host, and closing app dialog, and returning');
    // Remove the host container from the grid
    $('#host-container-' + host.serverUid).remove();
    // Remove the host from the hosts object
    delete hosts[host.serverUid];
    // Save the updated hosts
    saveHosts();
    // If host removed, show snackbar message
    snackbarLog(host.hostname + ' deleted successfully');
    deleteHostOverlay.style.display = 'none';
    deleteHostDialog.close();
    isDialogOpen = false;
    Navigation.pop();
    Navigation.left();
  });
}

// Show a confirmation with the Delete Host dialog before removing all hosts objects
function removeAllHosts() {
  if (Object.keys(hosts).length === 0) {
    // If no hosts exist, show snackbar message
    snackbarLog('No hosts exist');
  } else {
    // Find the existing overlay and dialog elements
    var deleteHostOverlay = document.querySelector('#deleteHostDialogOverlay');
    var deleteHostDialog = document.querySelector('#deleteHostDialog');
    document.getElementById('deleteHostDialogText').innerHTML = ' Are you sure you want to delete all hosts?';
    
    // Show the dialog and push the view
    deleteHostOverlay.style.display = 'flex';
    deleteHostDialog.showModal();
    Navigation.push(Views.DeleteHostDialog);
    isDialogOpen = true;
  
    // Cancel the operation if the Cancel button is pressed
    $('#cancelDeleteHost').off('click');
    $('#cancelDeleteHost').on('click', function() {
      console.log('%c[index.js, removeAllHosts]', 'color: green;', 'Closing app dialog, and returning');
      deleteHostOverlay.style.display = 'none';
      deleteHostDialog.close();
      isDialogOpen = false;
      Navigation.pop();
      Navigation.switch();
    });
  
    // Remove all existing hosts if the Continue button is pressed
    $('#continueDeleteHost').off('click');
    $('#continueDeleteHost').on('click', function() {
      console.log('%c[index.js, removeAllHosts]', 'color: green;', 'Removing all hosts, and closing app dialog, and returning');
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
      snackbarLog('All hosts deleted successfully');
      deleteHostOverlay.style.display = 'none';
      deleteHostDialog.close();
      isDialogOpen = false;
      Navigation.pop();
      Navigation.switch();
    });
  }
}

// Show the Settings container
function showSettingsContainer() {
  // Show the container section
  $("#settings-container").removeClass('hide-container');
  $("#settings-container").css('display', 'flex');
  $("#settings-container").show()
  
  // Navigate to the Settings view
  Navigation.push(Views.Settings);
  showSettingsMode();
}

// Handle the click event on the settings categories and open the corresponding views
function handleCategoryClick(category) {
  // Hide the right settings panel which includes settings options
  const settingsOptions = document.querySelectorAll('.settings-options');
  settingsOptions.forEach(function(settingsOption) {
    settingsOption.style.display = 'none';
  });

  // Remove the 'selected' class from all categories
  const settingsCategories = document.querySelectorAll('.category');
  settingsCategories.forEach(function(settingsCategory) {
    settingsCategory.classList.remove('selected');
  });

  // Show the right settings panel when the category item is clicked
  const currentItem = document.getElementById(category);
  if (currentItem) {
    currentItem.style.display = 'block';

    // Add the 'selected' class to the clicked category and mark it as selected
    const selectedCategory = document.querySelector('.category[data-category="' + category + '"]');
    if (selectedCategory) {
      selectedCategory.classList.add('selected');
    }

    // Retrieve the settings option for the current category
    const currentSettingsCategory = document.getElementById(category);
    const currentSettingsOption = currentSettingsCategory.querySelector('.setting-option');

    // Trigger the corresponding action based on the category ID
    switch (category) {
      case 'basicSettings':
        // Navigate to the BasicSettings view
        Navigation.pop();
        Navigation.push(Views.BasicSettings);
        if (currentSettingsOption) {
          // Set focus on the current settings option
          currentSettingsOption.focus();
          // Simulate navigation to set focus on the settings item
          setTimeout(() => Navigation.switch(), 5);
        }
        break;
      case 'hostSettings':
        // Navigate to the HostSettings view
        Navigation.pop();
        Navigation.push(Views.HostSettings);
        if (currentSettingsOption) {
          // Set focus on the current settings option
          currentSettingsOption.focus();
          // Simulate navigation to set focus on the settings item
          setTimeout(() => Navigation.switch(), 5);
        }
        break;
      case 'inputSettings':
        // Navigate to the InputSettings view
        Navigation.pop();
        Navigation.push(Views.InputSettings);
        if (currentSettingsOption) {
          // Set focus on the current settings option
          currentSettingsOption.focus();
          // Simulate navigation to set focus on the settings item
          setTimeout(() => Navigation.switch(), 5);
        }
        break;
      case 'decoderSettings':
        // Navigate to the DecoderSettings view
        Navigation.pop();
        Navigation.push(Views.DecoderSettings);
        if (currentSettingsOption) {
          // Set focus on the current settings option
          currentSettingsOption.focus();
          // Simulate navigation to set focus on the settings item
          setTimeout(() => Navigation.switch(), 5);
        }
        break;
      case 'aboutSettings':
        // Navigate to the AboutSettings view
        Navigation.pop();
        Navigation.push(Views.AboutSettings);
        if (currentSettingsOption) {
          // Set focus on the current settings option
          currentSettingsOption.focus();
          // Simulate navigation to set focus on the settings item
          setTimeout(() => Navigation.switch(), 5);
        }
        break;
      default:
        break;
    }
  }
}

// Show a confirmation with the Restore Defaults dialog before restoring the default settings
function restoreDefaultSettings() {
  // Find the existing overlay and dialog elements
  var restoreDefaultsDialogOverlay = document.querySelector('#restoreDefaultsDialogOverlay');
  var restoreDefaultsDialog = document.querySelector('#restoreDefaultsDialog');

  // Show the dialog and push the view
  restoreDefaultsDialogOverlay.style.display = 'flex';
  restoreDefaultsDialog.showModal();
  Navigation.push(Views.RestoreDefaultsDialog);
  isDialogOpen = true;

  // Cancel the operation if the Cancel button is pressed
  $('#cancelRestoreDefaults').off('click');
  $('#cancelRestoreDefaults').on('click', function() {
    console.log('%c[index.js, restoreDefaultSettings]', 'color: green;', 'Closing app dialog, and returning');
    restoreDefaultsDialogOverlay.style.display = 'none';
    restoreDefaultsDialog.close();
    isDialogOpen = false;
    Navigation.pop();
    Navigation.switch();
  });

  // Restore all default settings if the Continue button is pressed
  $('#continueRestoreDefaults').off('click');
  $('#continueRestoreDefaults').on('click', function() {
    console.log('%c[index.js, restoreDefaultSettings]', 'color: green;', 'Restoring default settings, and closing app dialog, and returning');
    // Reset any settings to their default state and save the updated values
    restoreDefaultsSettingsValues();
    // If the settings have been reset to default, show snackbar message
    snackbarLog('Settings have been restored to defaults');
    restoreDefaultsDialogOverlay.style.display = 'none';
    restoreDefaultsDialog.close();
    isDialogOpen = false;
    Navigation.pop();
    Navigation.switch();
    // Show the Restart Moonlight dialog and push the view
    setTimeout(() => showRestartMoonlightDialog(), 2000);
  });
}

// Show the Support dialog
function showSupportDialog() {
  // Find the existing overlay and dialog elements
  var supportDialogOverlay = document.querySelector('#supportDialogOverlay');
  var supportDialog = document.querySelector('#supportDialog');

  // Show the dialog and push the view
  supportDialogOverlay.style.display = 'flex';
  supportDialog.showModal();
  Navigation.push(Views.SupportDialog);
  isDialogOpen = true;

  // Close the dialog if the Close button is pressed
  $('#closeSupportDialog').off('click');
  $('#closeSupportDialog').on('click', function() {
    console.log('%c[index.js, showSupportDialog]', 'color: green;', 'Closing app dialog, and returning');
    supportDialogOverlay.style.display = 'none';
    supportDialog.close();
    isDialogOpen = false;
    Navigation.pop();
    Navigation.switch();
  });
}

// Show the Navigation Guide dialog
function showNavigationGuideDialog() {
  // Find the existing overlay and dialog elements
  var navGuideDialogOverlay = document.querySelector('#navGuideDialogOverlay');
  var navGuideDialog = document.querySelector('#navGuideDialog');

  // Show the dialog and push the view
  navGuideDialogOverlay.style.display = 'flex';
  navGuideDialog.showModal();
  Navigation.push(Views.NavigationGuideDialog);
  isDialogOpen = true;

  // Close the dialog if the Close button is pressed
  $('#closeNavGuideDialog').off('click');
  $('#closeNavGuideDialog').on('click', function() {
    console.log('%c[index.js, showNavigationGuideDialog]', 'color: green;', 'Closing app dialog, and returning');
    navGuideDialogOverlay.style.display = 'none';
    navGuideDialog.close();
    isDialogOpen = false;
    Navigation.pop();
    Navigation.switch();
  });
}

// Restart the application
function restartApplication() {
  window.location.reload(true);
}

// Show the Restart Moonlight dialog
function showRestartMoonlightDialog() {
  // Find the existing overlay and dialog elements
  var restartAppDialogOverlay = document.querySelector('#restartAppDialogOverlay');
  var restartAppDialog = document.querySelector('#restartAppDialog');

  // Show the dialog and push the view
  restartAppDialogOverlay.style.display = 'flex';
  restartAppDialog.showModal();
  Navigation.push(Views.RestartMoonlightDialog);
  isDialogOpen = true;

  // Cancel the operation if the Cancel button is pressed
  $('#cancelRestartApp').off('click');
  $('#cancelRestartApp').on('click', function() {
    console.log('%c[index.js, showRestartMoonlightDialog]', 'color: green;', 'Closing app dialog, and returning');
    restartAppDialogOverlay.style.display = 'none';
    restartAppDialog.close();
    isDialogOpen = false;
    Navigation.pop();
    Navigation.switch();
  });

  // Restart the application if the Restart button is pressed
  $('#continueRestartApp').off('click');
  $('#continueRestartApp').on('click', function() {
    console.log('%c[index.js, showRestartMoonlightDialog]', 'color: green;', 'Restart application, and closing app dialog, and returning to Moonlight');
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

// Show the Exit Application dialog
function showExitMoonlightDialog() {
  // Find the existing overlay and dialog elements
  var exitAppOverlay = document.querySelector('#exitAppDialogOverlay');
  var exitAppDialog = document.querySelector('#exitAppDialog');

  if (!exitAppOverlay && !exitAppDialog) {
    // Check if the dialog element doesn't exist, create it
    var exitAppDialog = document.createElement('dialog');
    exitAppDialog.id = 'exitAppDialog';
    exitAppDialog.classList.add('mdl-dialog');

    // Create the dialog content
    exitAppDialog.innerHTML = `
      <h3 id="exitAppDialogTitle" class="mdl-dialog__title">Exit Moonlight</h3>
      <div class="mdl-dialog__content">
        <p id="exitAppDialogText">
          Are you sure you want to exit Moonlight?
        </p>
      </div>
      <div class="mdl-dialog__actions">
        <button type="button" id="cancelExitApp" class="mdl-button mdl-js-button mdl-button--raised mdl-button--colored mdl-js-ripple-effect">Cancel</button>
        <button type="button" id="continueExitApp" class="mdl-button mdl-js-button mdl-button--raised mdl-button--colored mdl-js-ripple-effect">Exit</button>
      </div>
    `;

    // Create the dialog overlay
    exitAppOverlay = document.createElement('div');
    exitAppOverlay.id = 'exitAppDialogOverlay';
    exitAppOverlay.classList.add('dialog-overlay');
    exitAppOverlay.appendChild(exitAppDialog);

    // Append the dialog overlay with dialog content to the DOM
    document.body.appendChild(exitAppOverlay);

    // Initialize the dialog
    componentHandler.upgradeElements(exitAppDialog);
  }

  // Show the dialog and push the view
  exitAppOverlay.style.display = 'flex';
  exitAppDialog.showModal();
  Navigation.push(Views.ExitMoonlightDialog);
  isDialogOpen = true;

  // Cancel the operation if the Cancel button is pressed
  $('#cancelExitApp').off('click');
  $('#cancelExitApp').on('click', function() {
    console.log('%c[index.js, showExitMoonlightDialog]', 'color: green;', 'Closing app dialog, and returning');
    exitAppOverlay.style.display = 'none';
    exitAppDialog.close();
    // Remove the dialog overlay and dialog content from the DOM if the dialog is open
    document.body.removeChild(exitAppOverlay);
    isDialogOpen = false;
    Navigation.pop();
    Navigation.change(Views.Hosts);
  });

  // Exit the application if the Exit button is pressed
  $('#continueExitApp').off('click');
  $('#continueExitApp').on('click', function() {
    console.log('%c[index.js, showExitMoonlightDialog]', 'color: green;', 'Exit application, and closing app dialog, and returning to Smart Hub');
    exitAppOverlay.style.display = 'none';
    exitAppDialog.close();
    // Remove the dialog overlay and dialog content from the DOM if the dialog is open
    document.body.removeChild(exitAppOverlay);
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
  // If the app or game is currently running, then apply CSS stylization
  var appBox = document.querySelector("#game-" + appIdToStylize);
  if (freshApi.currentGame === appIdToStylize) {
    appBox.classList.add('current-game');
    appBox.title += ' (Running)';
  } else {
    appBox.classList.remove('current-game');
    appBox.title.replace(' (Running)', ''); // TODO: Replace with localized string so make it e.title = game_title
  }
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

// Show the app list
function showApps(host) {
  // Safety checking, shouldn't happen
  if (!host || !host.paired) {
    console.error('%c[index.js, showApps]', 'color: green;', 'Error: Moved into showApps, but `host` was not initialized properly.\nHost object: ', host);
    return;
  }

  console.log('%c[index.js, showApps]', 'color: green;', 'Current host object: ', host, host.toString()); // Logging both object (for console) and toString-ed object (for text logs)
  $("#gameList .game-container").remove();

  // Hide the main navigation before showing a loading screen
  $('#main-navigation').children().hide();
  $('#main-navigation').css({'backgroundColor': 'transparent', 'boxShadow': 'none'});

  // Show a spinner while the app list loads
  $('#wasmSpinnerMessage').text('Loading apps...');
  $('#wasmSpinner').css('display', 'inline-block');

  $("div.game-container").remove();

  host.getAppList().then(function(appList) {
    // Hide the spinner after the host has successfully retrieved the app list
    $('#wasmSpinner').hide();

    // Show the main navigation after the loading screen is complete
    $('#main-navigation').children().show();
    $('#main-navigation').css({'backgroundColor': '#333846', 'boxShadow': '0 0 4px 0 rgba(0, 0, 0, 1)'});

    // Show the game list section
    $("#game-grid").show();

    if (appList.length == 0) {
      console.error('%c[index.js, showApps]', 'Error: User\'s applist is empty');
      var img = new Image();
      img.src = 'static/res/applist_empty.svg';
      $('#game-grid').html(img);
      snackbarLog('Your list of apps or games is empty');
      return; // We stop the function right here
    }

    // Find the existing switch element
    const sortAppsListSwitch = document.getElementById('sortAppsListSwitch');
    // Defines the sort order based on the state of the switch
    const sortOrder = sortAppsListSwitch.checked ? 'DESC' : 'ASC';
    // If game grid is populated, sort the app list
    const sortedAppList = sortTitles(appList, sortOrder);

    sortedAppList.forEach(function(app) {
      if ($('#game-' + app.id).length === 0) {
        // Double clicking the button will cause multiple box arts to appear.
        // To mitigate this, we ensure that we don't add a duplicate box art.
        // This isn't perfect: there's lots of RTTs before the logic prevents anything.
        var gameCard = document.createElement('div');
        gameCard.id = 'game-' + app.id;
        gameCard.className = 'game-container mdl-card mdl-shadow--4dp';
        gameCard.setAttribute('role', 'link');
        gameCard.tabIndex = 0;
        gameCard.title = app.title;
        gameCard.innerHTML = `<div class="game-title">${app.title}</div>`;

        gameCard.addEventListener('click', e => {
          startGame(host, app.id);
        });
        gameCard.addEventListener('mouseover', e => {
          gameCard.focus();
        });
        gameCard.addEventListener('keydown', e => {
          if (e.key == "Enter") {
            startGame(host, app.id);
          }
          if (e.key == "ArrowLeft") {
            let prev = gameCard.previousSibling;
            if (prev !== null) {
              gameCard.previousSibling.focus();
            }
            // TODO: Add a sound when limit reached
          }
          if (e.key == "ArrowRight") {
            let next = gameCard.nextSibling;
            if (next !== null) {
              gameCard.nextSibling.focus();
            }
            // TODO: Add a sound when limit reached
          }
        });
        document.querySelector('#game-grid').appendChild(gameCard);
        // Apply CSS stylization to indicate whether the app is active
        stylizeBoxArt(host, app.id);
      }
      var img = new Image();
      host.getBoxArt(app.id).then(function(resolvedPromise) {
        img.src = resolvedPromise;
      }, function(failedPromise) {
        console.error('%c[index.js, showApps]', 'color: green;', 'Error: Failed to retrieve box art for app ID: ' + app.id + '! Returned value was: ' + failedPromise, '\n Host object: ', host, host.toString()); // Logging both object (for console) and toString-ed object (for text logs)
        img.src = 'static/res/placeholder_error.svg';
      });
      img.onload = e => img.classList.add('fade-in');
      $(gameCard).append(img);
    });
  }, function(failedAppList) {
    // Hide the spinner if the host has failed to retrieve the app list
    $('#wasmSpinner').hide();

    // Show the main navigation after the loading screen is complete
    $('#main-navigation').children().show();
    $('#main-navigation').css({'backgroundColor': '#333846', 'boxShadow': '0 0 4px 0 rgba(0, 0, 0, 1)'});

    console.error('%c[index.js, showApps]', 'Error: Failed to get applist from ' + host.hostname + '!', '\n Host object: ', host, host.toString()); // Logging both object (for console) and toString-ed object (for text logs)
    var img = new Image();
    img.src = 'static/res/applist_error.svg';
    $("#game-grid").html(img);
    snackbarLog('Unable to retrieve your apps or games');
  });

  showAppsMode();
}

// Set the layout to the initial mode when you open Hosts view
function showHostsMode() {
  console.log('%c[index.js, showHostsMode]', 'color: green;', 'Entering "Show hosts" mode');
  $("#navigation-title").html("Hosts");
  $("#navigation-logo").show();
  $("#main-navigation").show();
  $(".nav-menu-parent").show();
  $('#settingsBtn').show();
  $('#supportBtn').show();
  $("#main-content").children().not("#listener, #loadingSpinner, #wasmSpinner").show();
  $('#settings-container').hide();
  $('#game-grid').hide();
  $('#goBackBtn').hide();
  $('#restoreDefaultsBtn').hide();
  $('#quitRunningAppBtn').hide();
  $("#main-content").removeClass("fullscreen");
  $("#listener").removeClass("fullscreen");

  Navigation.start();
  Navigation.pop();
  startPollingHosts();
}

// Set the layout to the initial mode when you open Settings view
function showSettingsMode() {
  console.log('%c[index.js, showSettingsMode]', 'color: green;', 'Entering "Show settings" mode');
  $("#navigation-title").html("Settings");
  $("#navigation-logo").show();
  $("#main-navigation").show();
  $('#goBackBtn').show();
  $('#restoreDefaultsBtn').show();
  $("#main-content").children().not("#listener, #loadingSpinner, #wasmSpinner").show();
  $(".nav-menu-parent").hide();
  $('#settingsBtn').hide();
  $('#supportBtn').hide();
  $("#host-grid").hide();
  $('#game-grid').hide();
  $('#quitRunningAppBtn').hide();
  $("#main-content").removeClass("fullscreen");
  $("#listener").removeClass("fullscreen");

  stopPollingHosts();
  Navigation.start();
}

// Set the layout to the initial mode when you open Apps view
function showAppsMode() {
  console.log('%c[index.js, showAppsMode]', 'color: green;', 'Entering "Show apps and games" mode');
  $("#navigation-title").html("Apps & Games");
  $("#navigation-logo").show();
  $("#main-navigation").show();
  $('#goBackBtn').show();
  $('#quitRunningAppBtn').show();
  $("#main-content").children().not("#listener, #loadingSpinner, #wasmSpinner").show();
  $(".nav-menu-parent").hide();
  $('#settingsBtn').hide();
  $('#supportBtn').hide();
  $("#host-grid").hide();
  $('#settings-container').hide();
  $('#restoreDefaultsBtn').hide();
  $("#main-content").removeClass("fullscreen");
  $("#listener").removeClass("fullscreen");
  $('#loadingSpinner').css('display', 'none');
  $('body').css('backgroundColor', '#282C38');
  $('#wasm_module').css('display', 'none');

  isInGame = false;
  // FIXME: We want to eventually poll on the app screen, but we can't now
  // because it slows down box art loading and we don't update the UI live anyway.
  stopPollingHosts();
  Navigation.start();
}

// Start the given appID. If another app is running, offer to quit it. Otherwise, if the given app is already running, just resume it.
function startGame(host, appID) {
  if (!host || !host.paired) {
    console.error('%c[index.js, startGame]', 'color: green;', 'Error: Attempted to start a game, but `host` was not initialized properly.\nHost object: ', host);
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
          document.getElementById('quitAppDialogText').innerHTML = currentApp.title + ' is already running. Would you like to quit ' + currentApp.title + '?';
          
          // Show the dialog and push the view
          quitAppOverlay.style.display = 'flex';
          quitAppDialog.showModal();
          Navigation.push(Views.QuitAppDialog);
          isDialogOpen = true;

          // Cancel the operation if the Cancel button is pressed
          $('#cancelQuitApp').off('click');
          $('#cancelQuitApp').on('click', function() {
            console.log('%c[index.js, startGame]', 'color: green;', 'Closing app dialog, and returning');
            quitAppOverlay.style.display = 'none';
            quitAppDialog.close();
            isDialogOpen = false;
            Navigation.pop();
          });

          // Quit the running app if the Continue button is pressed
          $('#continueQuitApp').off('click');
          $('#continueQuitApp').on('click', function() {
            console.log('%c[index.js, startGame]', 'color: green;', 'Quitting game, and closing app dialog, and returning');
            stopGame(host, function() {
              // Please, don't infinite loop with recursion
              startGame(host, appID);
            });
            quitAppOverlay.style.display = 'none';
            quitAppDialog.close();
            isDialogOpen = false;
            Navigation.pop();
          });

          return;
        }, function(failedCurrentApp) {
          console.error('%c[index.js, startGame]', 'color: green;', 'Error: Failed to get the current running app from ' + host.hostname + '! Returned error was: ' + failedCurrentApp, '\n Host object: ', host, host.toString()); // Logging both object (for console) and toString-ed object (for text logs)
          return;
        });
        return;
      }

      var streamWidth = $('#selectResolution').data('value').split(':')[0];
      var streamHeight = $('#selectResolution').data('value').split(':')[1];
      var frameRate = $('#selectFramerate').data('value').toString();
      var bitrate = parseInt($("#bitrateSlider").val()) * 1000;
      const optimizeGames = $("#optimizeGamesSwitch").parent().hasClass('is-checked') ? 1 : 0;
      const externalAudio = $("#externalAudioSwitch").parent().hasClass('is-checked') ? 1 : 0;
      const rumbleFeedback = $("#rumbleFeedbackSwitch").parent().hasClass('is-checked') ? 1 : 0;
      const mouseEmulation = $("#mouseEmulationSwitch").parent().hasClass('is-checked') ? 1 : 0;
      const flipABfaceButtons = $("#flipABfaceButtonsSwitch").parent().hasClass('is-checked') ? 1 : 0;
      const flipXYfaceButtons = $("#flipXYfaceButtonsSwitch").parent().hasClass('is-checked') ? 1 : 0;
      var codecMode = $('#selectCodec').data('value').toString();
      const framePacing = $('#framePacingSwitch').parent().hasClass('is-checked') ? 1 : 0;
      const audioSync = $('#audioSyncSwitch').parent().hasClass('is-checked') ? 1 : 0;

      console.log('%c[index.js, startGame]', 'color: green;', 'startRequest:' + 
        '\n Host address: ' + host.address + 
        '\n Stream resolution: ' + streamWidth + 'x' + streamHeight + 
        '\n Stream frame rate: ' + frameRate + ' FPS' + 
        '\n Stream bitrate: ' + bitrate + ' Kbps' + 
        '\n Optimize games: ' + optimizeGames + 
        '\n External audio: ' + externalAudio + 
        '\n Rumble feedback: ' + rumbleFeedback + 
        '\n Mouse emulation: ' + mouseEmulation + 
        '\n Flip A/B face buttons: ' + flipABfaceButtons + 
        '\n Flip X/Y face buttons: ' + flipXYfaceButtons + 
        '\n Codec mode: ' + codecMode + 
        '\n Frame pacing: ' + framePacing + 
        '\n Audio sync: ' + audioSync);

      var rikey = generateRemoteInputKey();
      var rikeyid = generateRemoteInputKeyId();
      var gamepadMask = getConnectedGamepadMask();

      $('#loadingMessage').text('Starting ' + appToStart.title + '...');
      playGameMode();

      // If user wants to launch the already-running app, then we resume it
      if (host.currentGame == appID) {
        return host.resumeApp(
          rikey, rikeyid, // Remote input key and key ID
          0x030002 // Surround channel mask << 16 | Surround channel count
        ).then(function(launchResult) {
          $xml = $($.parseXML(launchResult.toString()));
          $root = $xml.find('root');

          if ($root.attr('status_code') != 200) {
            snackbarLog('Error ' + $root.attr('status_code') + ': ' + $root.attr('status_message'));
            showApps(host);
            return;
          }

          sendMessage('startRequest', [host.address, streamWidth, streamHeight, frameRate,
            bitrate.toString(), rikey, rikeyid.toString(), host.appVersion, host.gfeVersion,
            $root.find('sessionUrl0').text().trim(), rumbleFeedback, mouseEmulation, flipABfaceButtons,
            flipXYfaceButtons, codecMode, host.serverCodecMode, framePacing, audioSync
          ]);
        }, function(failedResumeApp) {
          console.error('%c[index.js, startGame]', 'color: green;', 'Error: Failed to resume app with id: ' + appID + '\n Returned error was: ' + failedResumeApp);
          showApps(host);
          return;
        });
      }

      // If user wants to launch the app, then we launch it
      host.launchApp(appID,
        streamWidth + "x" + streamHeight + "x" + frameRate,
        optimizeGames, // Optimize game settings
        rikey, rikeyid, // Remote input key and key ID
        externalAudio, // Play audio on PC
        0x030002, // Surround channel mask << 16 | Surround channel count
        gamepadMask // Connect gamepad mask
      ).then(function(launchResult) {
        $xml = $($.parseXML(launchResult.toString()));
        $root = $xml.find('root');

        var status_code = $root.attr('status_code');
        if (status_code != 200) {
          var status_message = $root.attr('status_message');
          if (status_code == 4294967295 && status_message == 'Invalid') {
            // Special case handling an audio capture error which GFE doesn't provide any useful status message
            status_code = 418;
            status_message = 'Audio capture device is missing. Please reinstall Sunshine or GeForce Experience.';
          }
          snackbarLog('Error ' + status_code + ': ' + status_message);
          showApps(host);
          return;
        }

        sendMessage('startRequest', [host.address, streamWidth, streamHeight, frameRate,
          bitrate.toString(), rikey, rikeyid.toString(), host.appVersion, host.gfeVersion,
          $root.find('sessionUrl0').text().trim(), rumbleFeedback, mouseEmulation, flipABfaceButtons,
          flipXYfaceButtons, codecMode, host.serverCodecMode, framePacing, audioSync
        ]);
      }, function(failedLaunchApp) {
        console.error('%c[index.js, launchApp]', 'color: green;', 'Error: Failed to launch app with id: ' + appID + '\n Returned error was: ' + failedLaunchApp);
        showApps(host);
        return;
      });

    });
  });
}

function playGameMode() {
  console.log('%c[index.js, playGameMode]', 'color: green;', 'Entering "Play game" mode');
  isInGame = true;

  $("#main-navigation").hide();
  $("#main-content").children().not("#listener, #loadingSpinner").hide();
  $("#main-content").addClass("fullscreen");
  $("#listener").addClass("fullscreen");

  fullscreenWasmModule();
  $('#loadingSpinner').css('display', 'inline-block');
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

  var module = $("#wasm_module")[0];
  module.width = zoom * streamWidth;
  module.height = zoom * streamHeight;
  module.style.marginTop = ((screenHeight - module.height) / 2) + "px";
}

// FIXME: This is a workaround to send the escape key to the host
function sendEscapeKeyToHost() {
  Module.sendLiSendKeyboardEvent(0x80 << 8 | 0x1B, 0x03, 0);
  Module.sendLiSendKeyboardEvent(0x80 << 8 | 0x1B, 0x04, 0);
}

// Show a confirmation with the Quit App dialog before stopping the running game
function quitRunningApp() {
  if (api.currentGame === 0) {
    // If no app or game is running, show snackbar message
    snackbarLog('Nothing was running');
  } else {
    api.getAppById(api.currentGame).then(function(currentGame) {
      // Find the existing overlay and dialog elements
      var quitAppOverlay = document.querySelector('#quitAppDialogOverlay');
      var quitAppDialog = document.querySelector('#quitAppDialog');
      document.getElementById('quitAppDialogText').innerHTML = ' Are you sure you want to quit ' + currentGame.title + '?  All unsaved data will be lost.';
      
      // Show the dialog and push the view
      quitAppOverlay.style.display = 'flex';
      quitAppDialog.showModal();
      Navigation.push(Views.QuitAppDialog);
      isDialogOpen = true;

      // Cancel the operation if the Cancel button is pressed
      $('#cancelQuitApp').off('click');
      $('#cancelQuitApp').on('click', function() {
        console.log('%c[index.js, quitRunningApp]', 'color: green;', 'Closing app dialog, and returning');
        quitAppOverlay.style.display = 'none';
        quitAppDialog.close();
        isDialogOpen = false;
        Navigation.pop();
        Navigation.switch();
      });

      // Quit the running app if the Continue button is pressed
      $('#continueQuitApp').off('click');
      $('#continueQuitApp').on('click', function() {
        console.log('%c[index.js, quitRunningApp]', 'color: green;', 'Quitting game, and closing app dialog, and returning');
        stopGame(api);
        quitAppOverlay.style.display = 'none';
        quitAppDialog.close();
        isDialogOpen = false;
        Navigation.pop();
        Navigation.switch();
      });
    });
  }
}

function stopGame(host, callbackFunction) {
  isInGame = false;

  if (!host.paired) {
    return;
  }

  host.refreshServerInfo().then(function(ret) {
    host.getAppById(host.currentGame).then(function(runningApp) {
      if (!runningApp) {
        snackbarLog('Nothing was running');
        return;
      }
      var appName = runningApp.title;
      snackbarLog('Quitting ' + appName + '...');
      host.quitApp().then(function(ret2) {
        snackbarLog('Successfully quit ' + appName);
        host.refreshServerInfo().then(function(ret3) { // Refresh to show no app is currently running
          showApps(host);
          if (typeof(callbackFunction) === "function") callbackFunction();
        }, function(failedRefreshInfo2) {
          console.error('%c[index.js, stopGame]', 'color: green;', 'Error: Failed to refresh server info! Returned error was: ' + failedRefreshInfo + ' and failed server was: ', host, host.toString()); // Logging both object (for console) and toString-ed object (for text logs)
        });
      }, function(failedQuitApp) {
        console.error('%c[index.js, stopGame]', 'color: green;', 'Error: Failed to quit app! Returned error was: ' + failedQuitApp);
      });
    }, function(failedGetApp) {
      console.error('%c[index.js, stopGame]', 'color: green;', 'Error: Failed to get app ID! Returned error was: ' + failedRefreshInfo);
    });
  }, function(failedRefreshInfo) {
    console.error('%c[index.js, stopGame]', 'color: green;', 'Error: Failed to refresh server info! Returned error was: ' + failedRefreshInfo);
  });
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

  console.log('%c[index.js, openIndexDB]', 'color: green;', 'Opening IndexDB');
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persisted().then(persistent => {
      if (persistent) {
        console.log('%c[index.js, openIndexDB]', 'color: green;', 'Storage will not be cleared except by explicit user action');
      } else {
        console.log('%c[index.js, openIndexDB]', 'color: green;', 'Storage may be cleared by the UA under storage pressure');
      }
    });
  } else {
    console.warn('%c[index.js, openIndexDB]', 'color: green;', 'Persistent storage not available');
  }

  if (!indexedDB) {
    indexedDB = self.indexedDB || self.webkitIndexedDB || self.mozIndexedDB || self.OIndexedDB || self.msIndexedDB;
  }

  // Create/open database
  const request = indexedDB.open(dbName, dbVersion);

  request.onerror = function(e) {
    console.error('%c[index.js, openIndexDB]', 'color: green;', 'Error creating/accessing IndexedDB database: ', e);
  };

  request.onsuccess = function(e) {
    console.log('%c[index.js, openIndexDB]', 'color: green;', 'Success creating/accessing IndexedDB database: ', e);
    db = request.result;

    db.onerror = function(e) {
      console.error('%c[index.js, openIndexDB]', 'color: green;', 'Error creating/accessing IndexedDB database: ', e);
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
        console.log('%c[index.js, getData]', 'color: green;', 'Read data from the DB key: ' + key + ' with value: ' + readRequest.result);
        let value = null;
        if (readRequest.result) {
          value = JSON.parse(readRequest.result);
          console.log('%c[index.js, getData]', 'color: green;', 'Parsed value: ' + value);
        }
        callCb(key, value, callbackFunction);
      };

      transaction.onerror = function(e) {
        console.error('%c[index.js, getData]', 'color: green;', 'Error reading data at key: ' + key + ' from IndexDB: ' + e);
        callCb(key, value, callbackFunction);
      };
    } catch (err) {
      console.warn('%c[index.js, getData]', 'color: green;', 'getData: caught exception while reading key: ' + key);
      console.error('%c[index.js, getData]', 'color: green;', 'Error getData: caught error while reading key: ' + err);
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
        console.log('%c[index.js, storeData]', 'color: green;', 'Data at key: ' + key + ' is stored as: ' + JSON.stringify(data));
        if (callbackFunction) {
          callbackFunction();
        }
      };

      transaction.onerror = function(e) {
        console.error('%c[index.js, storeData]', 'color: green;', 'Error: Storing data in IndexDB: ' + e);
      };
    } catch (err) {
      console.warn('%c[index.js, storeData]', 'color: green;', 'storeData: caught exception while storing key: ' + key);
      console.error('%c[index.js, storeData]', 'color: green;', 'Error storeData: caught error while storing key: ' + err);
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
  storeData('resolution', chosenResolution, null);
  updateDefaultBitrate();
}

function saveFramerate() {
  var chosenFramerate = $(this).data('value');
  $('#selectFramerate').text($(this).text()).data('value', chosenFramerate);
  storeData('frameRate', chosenFramerate, null);
  updateDefaultBitrate();
}

function saveBitrate() {
  storeData('bitrate', $('#bitrateSlider').val(), null);
}

function updateBitrateField() {
  $('#selectBitrate').html($('#bitrateSlider').val() + " Mbps");
  saveBitrate();
}

function updateDefaultBitrate() {
  var res = $('#selectResolution').data('value');
  var frameRate = $('#selectFramerate').data('value').toString();

  if (res === "858:480") {
    if (frameRate === "30") { // 480p, 30 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('2');
    } else if (frameRate === "60") { // 480p, 60 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('4');
    } else if (frameRate === "90") { // 480p, 90 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('5');
    } else if (frameRate === "120") { // 480p, 120 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('6');
    }
  } else if (res === "1280:720") {
    if (frameRate === "30") { // 720p, 30 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('5');
    } else if (frameRate === "60") { // 720p, 60 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('10');
    } else if (frameRate === "90") { // 720p, 90 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('12');
    } else if (frameRate === "120") { // 720p, 120 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('15');
    }
  } else if (res === "1920:1080") {
    if (frameRate === "30") { // 1080p, 30 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('10');
    } else if (frameRate === "60") { // 1080p, 60 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('20');
    } else if (frameRate === "90") { // 1080p, 90 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('25');
    } else if (frameRate === "120") { // 1080p, 120 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('30');
    }
  } else if (res === "2560:1440") {
    if (frameRate === "30") { // 1440p, 30 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('20');
    } else if (frameRate === "60") { // 1440p, 60 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('40');
    } else if (frameRate === "90") { // 1440p, 90 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('50');
    } else if (frameRate === "120") { // 1440p, 120 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('60');
    }
  } else if (res === "3840:2160") {
    if (frameRate === "30") { // 2160p, 30 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('40');
    } else if (frameRate === "60") { // 2160p, 60 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('80');
    } else if (frameRate === "90") { // 2160p, 90 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('100');
    } else if (frameRate === "120") { // 2160p, 120 FPS
      $('#bitrateSlider')[0].MaterialSlider.change('120');
    }
  } else {
    // Unrecognized option! In case someone screws with the JS to add custom resolutions.
    $('#bitrateSlider')[0].MaterialSlider.change('20');
  }

  updateBitrateField();
  saveBitrate();
}

function saveIpAddressFieldMode() {
  setTimeout(function() {
    const chosenIpAddressFieldMode = $("#ipAddressFieldModeSwitch").parent().hasClass('is-checked');
    console.log('%c[index.js, saveIpAddressFieldMode]', 'color: green;', 'Saving IP address field mode state: ' + chosenIpAddressFieldMode);
    storeData('ipAddressFieldMode', chosenIpAddressFieldMode, null);
  }, 100);
}

function saveSortAppsList() {
  setTimeout(function() {
    const chosenSortAppsList = $("#sortAppsListSwitch").parent().hasClass('is-checked');
    console.log('%c[index.js, saveSortAppsList]', 'color: green;', 'Saving sort apps list state: ' + chosenSortAppsList);
    storeData('sortAppsList', chosenSortAppsList, null);
  }, 100);
}

function saveOptimizeGames() {
  setTimeout(function() {
    const chosenOptimizeGames = $("#optimizeGamesSwitch").parent().hasClass('is-checked');
    console.log('%c[index.js, saveOptimizeGames]', 'color: green;', 'Saving optimize games state: ' + chosenOptimizeGames);
    storeData('optimizeGames', chosenOptimizeGames, null);
  }, 100);
}

function saveExternalAudio() {
  setTimeout(function() {
    const chosenExternalAudio = $("#externalAudioSwitch").parent().hasClass('is-checked');
    console.log('%c[index.js, saveExternalAudio]', 'color: green;', 'Saving external audio state: ' + chosenExternalAudio);
    storeData('externalAudio', chosenExternalAudio, null);
  }, 100);
}

function saveRumbleFeedback() {
  setTimeout(function() {
    const chosenRumbleFeedback = $("#rumbleFeedbackSwitch").parent().hasClass('is-checked');
    console.log('%c[index.js, saveRumbleFeedback]', 'color: green;', 'Saving rumble feedback state: ' + chosenRumbleFeedback);
    storeData('rumbleFeedback', chosenRumbleFeedback, null);
  }, 100);
}

function saveMouseEmulation() {
  setTimeout(function() {
    const chosenMouseEmulation = $("#mouseEmulationSwitch").parent().hasClass('is-checked');
    console.log('%c[index.js, saveMouseEmulation]', 'color: green;', 'Saving mouse emulation state: ' + chosenMouseEmulation);
    storeData('mouseEmulation', chosenMouseEmulation, null);
  }, 100);
}

function saveFlipABfaceButtons() {
  setTimeout(function() {
    const chosenFlipABfaceButtons = $("#flipABfaceButtonsSwitch").parent().hasClass('is-checked');
    console.log('%c[index.js, saveFlipABfaceButtons]', 'color: green;', 'Saving flip A/B face buttons state: ' + chosenFlipABfaceButtons);
    storeData('flipABfaceButtons', chosenFlipABfaceButtons, null);
  }, 100);
}

function saveFlipXYfaceButtons() {
  setTimeout(function() {
    const chosenFlipXYfaceButtons = $("#flipXYfaceButtonsSwitch").parent().hasClass('is-checked');
    console.log('%c[index.js, saveFlipXYfaceButtons]', 'color: green;', 'Saving flip X/Y face buttons state: ' + chosenFlipXYfaceButtons);
    storeData('flipXYfaceButtons', chosenFlipXYfaceButtons, null);
  }, 100);
}

function saveCodecMode() {
  var chosenCodecMode = $(this).data('value');
  $('#selectCodec').text($(this).text()).data('value', chosenCodecMode);
  storeData('codecMode', chosenCodecMode, null);
}

function saveFramePacing() {
  setTimeout(function() {
    const chosenFramePacing = $("#framePacingSwitch").parent().hasClass('is-checked');
    console.log('%c[index.js, saveFramePacing]', 'color: green;', 'Saving frame pacing state: ' + chosenFramePacing);
    storeData('framePacing', chosenFramePacing, null);
  }, 100);
}

function saveAudioSync() {
  setTimeout(function() {
    const chosenAudioSync = $("#audioSyncSwitch").parent().hasClass('is-checked');
    console.log('%c[index.js, saveAudioSync]', 'color: green;', 'Saving audio sync state: ' + chosenAudioSync);
    storeData('audioSync', chosenAudioSync, null);
  }, 100);
}

// Reset all settings to their default state and save the value data
function restoreDefaultsSettingsValues() {
  const defaultResolution = '1920:1080';
  $('#selectResolution').text('1920 x 1080 (1080p)').data('value', defaultResolution);
  storeData('resolution', defaultResolution, null);

  const defaultFramerate = '60';
  $('#selectFramerate').text('60 FPS').data('value', defaultFramerate);
  storeData('frameRate', defaultFramerate, null);

  const defaultBitrate = '20';
  $('#selectBitrate').html(defaultBitrate + " Mbps");
  $('#bitrateSlider')[0].MaterialSlider.change(defaultBitrate);
  storeData('bitrate', defaultBitrate, null);

  const defaultIpAddressFieldMode = false;
  document.querySelector('#ipAddressFieldModeBtn').MaterialSwitch.off();
  storeData('ipAddressFieldMode', defaultIpAddressFieldMode, null);

  const defaultSortAppsList = false;
  document.querySelector('#sortAppsListBtn').MaterialSwitch.off();
  storeData('sortAppsList', defaultSortAppsList, null);

  const defaultOptimizeGames = false;
  document.querySelector('#optimizeGamesBtn').MaterialSwitch.off();
  storeData('optimizeGames', defaultOptimizeGames, null);

  const defaultExternalAudio = false;
  document.querySelector('#externalAudioBtn').MaterialSwitch.off();
  storeData('externalAudio', defaultExternalAudio, null);

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

  const defaultCodecMode = '0x0001';
  $('#selectCodec').text('H.264').data('value', defaultCodecMode);
  storeData('codecMode', defaultCodecMode, null);

  const defaultFramePacing = false;
  document.querySelector('#framePacingBtn').MaterialSwitch.off();
  storeData('framePacing', defaultFramePacing, null);
  
  const defaultAudioSync = false;
  document.querySelector('#audioSyncBtn').MaterialSwitch.off();
  storeData('audioSync', defaultAudioSync, null);
}

function initSamsungKeys() {
  console.log('%c[index.js, initSamsungKeys]', 'color: green;', 'Initializing TV keys');

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

  console.log('%c[index.js, initSamsungKeys]', 'color: green;', 'Initializing the TV platform');
  platformOnLoad(handler);
}

function initSpecialKeys() {
  console.log('%c[index.js, initSpecialKeys]', 'color: green;', 'Initializing special keys');

  var videoElement = document.getElementById('wasm_module');
  videoElement.addEventListener('keydown', function(e) {
    if (e.key === 'XF86Back') {
      if (isInGame === true) {
        sendEscapeKeyToHost();
        videoElement.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, clientX: 0, clientY: 0 }));
      } else {
        console.error('%c[index.js, initSpecialKeys]', 'color: green;', 'Error: Failed to send escape key to host');
      }
    }
  });
}

function loadSystemInfo() {
  console.log('%c[index.js, loadSystemInfo]', 'color: green;', 'Loading system information');
  const systemInfoPlaceholder = document.getElementById("systemInfoBtn");

  if (systemInfoPlaceholder) {
    appName = tizen.application.getAppInfo();
    console.log('%c[index.js, loadSystemInfo]', 'color: green;', 'App Name: ', appName.name + ' Game Streaming');
    appVer = tizen.application.getAppInfo();
    console.log('%c[index.js, loadSystemInfo]', 'color: green;', 'App Version: ', appVer.version);
    platformVer = tizen.systeminfo.getCapability("http://tizen.org/feature/platform.version");
    console.log('%c[index.js, loadSystemInfo]', 'color: green;', 'Platform Version: Tizen ', platformVer);
    tvModelName = webapis.productinfo.getRealModel();
    console.log('%c[index.js, loadSystemInfo]', 'color: green;', 'TV Model Name: ', tvModelName);
    tvModelCode = webapis.productinfo.getModelCode();
    console.log('%c[index.js, loadSystemInfo]', 'color: green;', 'TV Model Code: ', tvModelCode);

    systemInfoPlaceholder.innerText =
      "App Name: " + (appName.name ? appName.name : "Unknown") + " Game Streaming" + "\n" +
      "App Version: " + (appVer.version ? appVer.version : "Unknown") + "\n" +
      "Platform Version: Tizen " + (platformVer ? platformVer : "Unknown") + "\n" +
      "TV Model: " + (tvModelName ? tvModelName : "Unknown") + "\n" +
      "TV Model Code: " + (tvModelCode ? tvModelCode : "Unknown");
  } else {
    console.error('%c[index.js, loadSystemInfo]', 'color: green;', 'Error: Failed to load system information!');
    systemInfoPlaceholder.innerText = "Failed to load system information!";
  }
}

function loadUserData() {
  console.log('%c[index.js, loadUserData]', 'color: green;', 'Loading stored user data');
  openIndexDB(loadUserDataCb);
}

function loadUserDataCb() {
  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored resolution prefs');
  getData('resolution', function(previousValue) {
    if (previousValue.resolution != null) {
      $('.resolutionMenu li').each(function() {
        if ($(this).data('value') === previousValue.resolution) {
          $('#selectResolution').text($(this).text()).data('value', previousValue.resolution);
        }
      });
    }
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored frameRate prefs');
  getData('frameRate', function(previousValue) {
    if (previousValue.frameRate != null) {
      $('.framerateMenu li').each(function() {
        if ($(this).data('value') === previousValue.frameRate) {
          $('#selectFramerate').text($(this).text()).data('value', previousValue.frameRate);
        }
      });
    }
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored bitrate prefs');
  getData('bitrate', function(previousValue) {
    $('#bitrateSlider')[0].MaterialSlider.change(previousValue.bitrate != null ? previousValue.bitrate : '20');
    updateBitrateField();
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored ipAddressFieldMode prefs');
  getData('ipAddressFieldMode', function(previousValue) {
    if (previousValue.ipAddressFieldMode == null) {
      document.querySelector('#ipAddressFieldModeBtn').MaterialSwitch.off();
    } else if (previousValue.ipAddressFieldMode == false) {
      document.querySelector('#ipAddressFieldModeBtn').MaterialSwitch.off();
    } else {
      document.querySelector('#ipAddressFieldModeBtn').MaterialSwitch.on();
    }
    // Handle the display of the IP address field mode based on the loaded state
    handleIpAddressFieldMode();
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored sortAppsList prefs');
  getData('sortAppsList', function(previousValue) {
    if (previousValue.sortAppsList == null) {
      document.querySelector('#sortAppsListBtn').MaterialSwitch.off();
    } else if (previousValue.sortAppsList == false) {
      document.querySelector('#sortAppsListBtn').MaterialSwitch.off();
    } else {
      document.querySelector('#sortAppsListBtn').MaterialSwitch.on();
    }
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored optimizeGames prefs');
  getData('optimizeGames', function(previousValue) {
    if (previousValue.optimizeGames == null) {
      document.querySelector('#optimizeGamesBtn').MaterialSwitch.off();
    } else if (previousValue.optimizeGames == false) {
      document.querySelector('#optimizeGamesBtn').MaterialSwitch.off();
    } else {
      document.querySelector('#optimizeGamesBtn').MaterialSwitch.on();
    }
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored externalAudio prefs');
  getData('externalAudio', function(previousValue) {
    if (previousValue.externalAudio == null) {
      document.querySelector('#externalAudioBtn').MaterialSwitch.off();
    } else if (previousValue.externalAudio == false) {
      document.querySelector('#externalAudioBtn').MaterialSwitch.off();
    } else {
      document.querySelector('#externalAudioBtn').MaterialSwitch.on();
    }
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored rumbleFeedback prefs');
  getData('rumbleFeedback', function(previousValue) {
    if (previousValue.rumbleFeedback == null) {
      document.querySelector('#rumbleFeedbackBtn').MaterialSwitch.off();
    } else if (previousValue.rumbleFeedback == false) {
      document.querySelector('#rumbleFeedbackBtn').MaterialSwitch.off();
    } else {
      document.querySelector('#rumbleFeedbackBtn').MaterialSwitch.on();
    }
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored mouseEmulation prefs');
  getData('mouseEmulation', function(previousValue) {
    if (previousValue.mouseEmulation == null) {
      document.querySelector('#mouseEmulationBtn').MaterialSwitch.off();
    } else if (previousValue.mouseEmulation == false) {
      document.querySelector('#mouseEmulationBtn').MaterialSwitch.off();
    } else {
      document.querySelector('#mouseEmulationBtn').MaterialSwitch.on();
    }
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored flipABfaceButtons prefs');
  getData('flipABfaceButtons', function(previousValue) {
    if (previousValue.flipABfaceButtons == null) {
      document.querySelector('#flipABfaceButtonsBtn').MaterialSwitch.off();
    } else if (previousValue.flipABfaceButtons == false) {
      document.querySelector('#flipABfaceButtonsBtn').MaterialSwitch.off();
    } else {
      document.querySelector('#flipABfaceButtonsBtn').MaterialSwitch.on();
    }
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored flipXYfaceButtons prefs');
  getData('flipXYfaceButtons', function(previousValue) {
    if (previousValue.flipXYfaceButtons == null) {
      document.querySelector('#flipXYfaceButtonsBtn').MaterialSwitch.off();
    } else if (previousValue.flipXYfaceButtons == false) {
      document.querySelector('#flipXYfaceButtonsBtn').MaterialSwitch.off();
    } else {
      document.querySelector('#flipXYfaceButtonsBtn').MaterialSwitch.on();
    }
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored codecMode prefs');
  getData('codecMode', function(previousValue) {
    if (previousValue.codecMode != null) {
      $('.codecMenu li').each(function() {
        if ($(this).data('value') === previousValue.codecMode) {
          $('#selectCodec').text($(this).text()).data('value', previousValue.codecMode);
        }
      });
    }
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored framePacing prefs');
  getData('framePacing', function(previousValue) {
    if (previousValue.framePacing == null) {
      document.querySelector('#framePacingBtn').MaterialSwitch.off();
    } else if (previousValue.framePacing == false) {
      document.querySelector('#framePacingBtn').MaterialSwitch.off();
    } else {
      document.querySelector('#framePacingBtn').MaterialSwitch.on();
    }
  });

  console.log('%c[index.js, loadUserDataCb]', 'color: green;', 'Load stored audioSync prefs');
  getData('audioSync', function(previousValue) {
    if (previousValue.audioSync == null) {
      document.querySelector('#audioSyncBtn').MaterialSwitch.off();
    } else if (previousValue.audioSync == false) {
      document.querySelector('#audioSyncBtn').MaterialSwitch.off();
    } else {
      document.querySelector('#audioSyncBtn').MaterialSwitch.on();
    }
  });
}

function loadHTTPCerts() {
  console.log('%c[index.js, loadHTTPCerts]', 'color: green;', 'Loading stored HTTP certs');
  openIndexDB(loadHTTPCertsCb);
}

function loadHTTPCertsCb() {
  console.log('%c[index.js, loadHTTPCertsCb]', 'color: green;', 'Load the HTTP cert and unique ID if we have one');
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

      if (!pairingCert) { // We couldn't load a cert. Make one.
        console.warn('%c[index.js, loadHTTPCertsCb]', 'color: green;', 'Error: Failed to load local cert. Generating new one!');
        sendMessage('makeCert', []).then(function(cert) {
          storeData('cert', cert, null);
          pairingCert = cert;
          console.info('%c[index.js, loadHTTPCertsCb]', 'color: green;', 'Generated new cert: ', cert);
        }, function(failedCert) {
          console.error('%c[index.js, loadHTTPCertsCb]', 'color: green;', 'Error: Failed to generate new cert! Returned error was: \n', failedCert);
        }).then(function(ret) {
          sendMessage('httpInit', [pairingCert.cert, pairingCert.privateKey, myUniqueid]).then(function(ret) {
            restoreUiAfterWasmLoad();
          }, function(failedInit) {
            console.error('%c[index.js, loadHTTPCertsCb]', 'color: green;', 'Error: Failed httpInit! Returned error was: ', failedInit);
          });
        });
      } else {
        sendMessage('httpInit', [pairingCert.cert, pairingCert.privateKey, myUniqueid]).then(function(ret) {
          restoreUiAfterWasmLoad();
        }, function(failedInit) {
          console.error('%c[index.js, loadHTTPCertsCb]', 'color: green;', 'Error: Failed httpInit! Returned error was: ', failedInit);
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
        console.log('%c[index.js, loadHTTPCertsCb]', 'color: green;', 'Loaded previously connected hosts');
      });
    });
  });
}

function onWindowLoad() {
  console.log('%c[index.js, onWindowLoad]', 'color: green;', 'Moonlight\'s main window loaded');
  // Don't show the game selection div
  $('#gameSelection').css('display', 'none');

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
  console.log('%c[index.js, gamepadconnected]', 'color: green;', 'Gamepad connected: ' + JSON.stringify(connectedGamepad), connectedGamepad);
  snackbarLog('Gamepad connected');
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
      console.warn('%c[index.js, gamepadconnected]', 'color: green;', 'Connected gamepad ' + gamepadIndex + ' does not support the rumble feature!');
    }
  }
});

// Gamepad disconnected events
window.addEventListener('gamepaddisconnected', function(e) {
  const disconnectedGamepad = e.gamepad;
  const gamepadIndex = disconnectedGamepad.index;
  console.log('%c[index.js, gamepaddisconnected]', 'color: green;', 'Gamepad disconnected: ' + JSON.stringify(disconnectedGamepad), disconnectedGamepad);
  snackbarLog('Gamepad disconnected');
  console.warn('%c[index.js, gamepaddisconnected]', 'color: green;', 'Lost connection with gamepad ' + gamepadIndex);
});
