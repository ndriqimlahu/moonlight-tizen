const hoveredClassName = 'hovered';
let currentPlatformVer = parseFloat(tizen.systeminfo.getCapability("http://tizen.org/feature/platform.version")); // Retrieve platform version

function markElement(element) {
  if (element) {
    element.classList.add(hoveredClassName);
    element.dispatchEvent(new Event('mouseenter'));
  }
}

function markElementById(id) {
  markElement(document.getElementById(id));
}

function mark(value) {
  if (typeof value === 'string') {
    markElementById(value);
  } else if (typeof value === 'object') {
    markElement(value);
  }
}

function unmarkElement(element) {
  if (element) {
    element.classList.remove(hoveredClassName);
    element.dispatchEvent(new Event('mouseleave'));
  }
}

function unmarkElementById(id) {
  unmarkElement(document.getElementById(id));
}

function unmark(value) {
  if (typeof value === 'string') {
    unmarkElementById(value);
  } else if (typeof value === 'object') {
    unmarkElement(value);
  }
}

function isPopupActive(id) {
  return document
    .getElementById(id)
    .parentNode
    .children[3]
    .classList
    .contains('is-visible');
}

function changeIpAddressFieldValue(adjust) {
  const currentItem = this.view.current();
  if (currentItem.startsWith('ipAddressField')) {
    const digitElement = document.getElementById(currentItem);
    let currentValue = parseInt(digitElement.value, 10);
    currentValue = (currentValue + adjust + 256) % 256;
    digitElement.value = currentValue;
  }
}

class ListView {
  constructor(func) {
    this.index = 0;
    this.func = func;
  }

  current() {
    const array = this.func();
    return array[this.index];
  }

  prev() {
    const array = this.func();
    if (this.index > 0) {
      unmark(array[this.index]);
      --this.index;
      mark(array[this.index]);
    }
    return array[this.index];
  }

  next() {
    const array = this.func();
    if (this.index < array.length - 1) {
      unmark(array[this.index]);
      ++this.index;
      mark(array[this.index]);
    }
    return array[this.index];
  }

  prevCategory() {
    const array = this.func();
    if (this.index > 0) {
      unmark(array[this.index]);
      --this.index;
      mark(array[this.index]);
      // Indicate that there are more categories
      return true;
    }
    // Indicate that there are no more categories
    return false;
  }

  nextCategory() {
    const array = this.func();
    if (this.index < array.length - 1) {
      unmark(array[this.index]);
      ++this.index;
      mark(array[this.index]);
      // Indicate that there are more categories
      return true;
    }
    // Indicate that there are no more categories
    return false;
  }

  prevOption() {
    const array = this.func();
    unmark(array[this.index]);
    this.index = (this.index - 1 + array.length) % array.length;
    mark(array[this.index]);
    return array[this.index];
  }

  nextOption() {
    const array = this.func();
    unmark(array[this.index]);
    this.index = (this.index + 1) % array.length;
    mark(array[this.index]);
    return array[this.index];
  }

  prevCard(cardsPerRow) {
    const array = this.func();
    const currentRow = Math.floor(this.index / cardsPerRow);
    // Check if a previous card exists
    if (this.index > 0) {
      unmark(array[this.index]);
      --this.index;
      const newRow = Math.floor(this.index / cardsPerRow);
      mark(array[this.index]);
      if (newRow !== currentRow) {
        this.scrollToCardRow(newRow, cardsPerRow);
      }
    }
    return array[this.index];
  }

  nextCard(cardsPerRow) {
    const array = this.func();
    const currentRow = Math.floor(this.index / cardsPerRow);
    // Check if a next card exists
    if (this.index < array.length - 1) {
      unmark(array[this.index]);
      ++this.index;
      const newRow = Math.floor(this.index / cardsPerRow);
      mark(array[this.index]);
      if (newRow !== currentRow) {
        this.scrollToCardRow(newRow, cardsPerRow);
      }
    }
    return array[this.index];
  }

  currentCardRow(cardsPerRow) {
    const array = this.func();
    // Check if there are any card in the current row
    if (!array || array.length === 0) {
      return;
    }
    // Determine the current row based on the index
    const currentRow = Math.floor(this.index / cardsPerRow);
    // Scroll to the row containing the current card
    this.scrollToCardRow(currentRow, cardsPerRow);
  }

  prevCardRow(cardsPerRow) {
    const array = this.func();
    const currentRow = Math.floor(this.index / cardsPerRow);
    // Check if a previous card row exists
    if (currentRow > 0) {
      unmark(array[this.index]);
      this.index = Math.max(0, this.index - cardsPerRow);
      mark(array[this.index]);
      this.scrollToCardRow(currentRow - 1, cardsPerRow);
      // Indicate that there are more card rows
      return true;
    }
    // Indicate that there are no more card rows
    return false;
  }

  nextCardRow(cardsPerRow) {
    const array = this.func();
    const rows = Math.ceil(array.length / cardsPerRow);
    const currentRow = Math.floor(this.index / cardsPerRow);
    // Check if a next card row exists
    if (currentRow < rows - 1) {
      unmark(array[this.index]);
      this.index = Math.min(array.length - 1, this.index + cardsPerRow);
      mark(array[this.index]);
      this.scrollToCardRow(currentRow + 1, cardsPerRow);
      // Indicate that there are more card rows
      return true;
    }
    // Indicate that there are no more card rows
    return false;
  }

  scrollToCardRow(row, cardsPerRow) {
    const array = this.func();
    const targetCard = array[row * cardsPerRow];
    if (targetCard) {
      requestAnimationFrame(() => {
        targetCard.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      });
    }
  }
};

const Views = {
  Hosts: {
    view: new ListView(() => document.getElementById('host-grid').children),
    up: function() {
      // If there are more rows behind, then go to the previous row
      if (this.view.prevCardRow(5)) {
        document.getElementById(this.view.current()).focus();
      } else {
        // If there are no more rows, navigate to the HostsNav view
        Navigation.change(Views.HostsNav);
        // Set focus on the first navigation item in HostsNav view when transitioning from Hosts view
        const navItem = document.getElementById(Views.HostsNav.view.current());
        if (navItem) {
          navItem.focus();
        }
      }
    },
    down: function() {
      // If there are more rows after, then go to the next row
      if (this.view.nextCardRow(5)) {
        document.getElementById(this.view.current()).focus();
      }
    },
    left: function() {
      this.view.prevCard(5);
      document.getElementById(this.view.current()).focus();
    },
    right: function() {
      this.view.nextCard(5);
      document.getElementById(this.view.current()).focus();
    },
    select: function() {
      const currentItem = this.view.current();
      if (currentItem.id === 'addHostContainer') {
        currentItem.click();
      } else {
        currentItem.children[0].click();
      }
    },
    accept: function() {
      const currentItem = this.view.current();
      if (currentItem.id === 'addHostContainer') {
        currentItem.click();
      } else {
        currentItem.children[0].click();
      }
    },
    back: function() {
      // Show the Exit Moonlight dialog and push the view
      exitAppDialog();
    },
    press: function() {
      const currentItem = this.view.current();
      if (currentItem.id !== 'addHostContainer') {
        currentItem.children[1].focus();
        // Show the Host Menu dialog and push the view
        setTimeout(() => currentItem.children[1].click(), 600);
      }
    },
    switch: function() {
      const currentItem = this.view.current();
      if (currentItem.id === 'addHostContainer') {
        currentItem.focus();
      } else {
        this.view.currentCardRow(5);
        currentItem.children[0].focus();
      }
    },
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  HostsNav: {
    view: new ListView(() => {
      if (document.getElementById('updateAppBtn')) {
        return ['updateAppBtn', 'settingsBtn', 'supportBtn'];
      } else {
        return ['settingsBtn', 'supportBtn'];
      }
    }),
    up: function() {},
    down: function() {
      // Remove focus from the current element before changing the view
      document.getElementById(this.view.current()).blur();
      // Navigate to the Hosts view
      Navigation.change(Views.Hosts);
      // Set focus on the first navigation item in Hosts view when transitioning from HostsNav view
      const navItem = document.getElementById(Views.Hosts.view.current());
      if (navItem) {
        navItem.focus();
      }
    },
    left: function() {
      this.view.prev();
      document.getElementById(this.view.current()).focus();
    },
    right: function() {
      this.view.next();
      document.getElementById(this.view.current()).focus();
    },
    select: function() {
      this.view.current().click();
    },
    accept: function() {
      document.getElementById(this.view.current()).click();
    },
    back: function() {
      // Remove focus from the current element before changing the view
      document.getElementById(this.view.current()).blur();
      // Navigate to the Hosts view
      Navigation.change(Views.Hosts);
    },
    press: function() {},
    switch: function() {
      document.getElementById(this.view.current()).focus();
    },
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  AddHostDialog: {
    view: new ListView(() => {
      if (document.getElementById('ipAddressFieldModeSwitch').checked) {
        return ['ipAddressField1', 'ipAddressField2', 'ipAddressField3', 'ipAddressField4', 'continueAddHost', 'cancelAddHost'];
      } else {
        return ['ipAddressTextInput', 'continueAddHost', 'cancelAddHost'];
      }
    }),
    up: function() {
      if (document.getElementById('ipAddressFieldModeSwitch').checked) {
        changeIpAddressFieldValue.call(this, 1);
      }
    },
    down: function() {
      if (document.getElementById('ipAddressFieldModeSwitch').checked) {
        changeIpAddressFieldValue.call(this, -1);
      }
    },
    left: function() {
      if (document.getElementById('ipAddressFieldModeSwitch').checked) {
        const currentItem = this.view.current();
        if (currentItem.startsWith('ipAddressField') && currentItem !== 'continueAddHost' || currentItem !== 'cancelAddHost') {
          // Remove focus from any currently focused item element
          document.getElementById(currentItem).blur();
          document.getElementById(this.view.prev());
        } else {
          document.getElementById(this.view.prev()).focus();
        }
      } else {
        this.view.prev();
        document.getElementById(this.view.current()).focus();
      }
    },
    right: function() {
      if (document.getElementById('ipAddressFieldModeSwitch').checked) {
        const currentItem = this.view.current();
        if (currentItem.startsWith('ipAddressField') && currentItem !== 'ipAddressField4') {
          // Remove focus from any currently focused item element
          document.getElementById(currentItem).blur();
          document.getElementById(this.view.next());
        } else {
          document.getElementById(this.view.next()).focus();
        }
      } else {
        this.view.next();
        document.getElementById(this.view.current()).focus();
      }
    },
    select: function() {
      this.view.current().click();
    },
    accept: function() {
      document.getElementById(this.view.current()).click();
    },
    back: function() {
      document.getElementById('cancelAddHost').click();
    },
    press: function() {
      document.getElementById('ipAddressFieldModeSwitch').click();
    },
    switch: function() {
      const currentItem = this.view.current();
      if (currentItem === 'continueAddHost' || currentItem === 'cancelAddHost') {
        // Set focus only on the Continue or Cancel button element
        document.getElementById(currentItem).focus();
      } else {
        // Remove focus from any other focused item element
        document.getElementById(currentItem).blur();
      }
    },
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  PairingDialog: {
    view: new ListView(() => [
      'cancelPairing'
    ]),
    up: function() {
      document.getElementById('cancelPairing').blur();
    },
    down: function() {
      document.getElementById('cancelPairing').focus();
    },
    left: function() {},
    right: function() {},
    select: function() {
      this.view.current().click();
    },
    accept: function() {
      document.getElementById(this.view.current()).click();
    },
    back: function() {
      document.getElementById('cancelPairing').click();
    },
    press: function() {},
    switch: function() {},
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  HostMenuDialog: {
    view: new ListView(() => {
      const actions = ['refreshApps', 'wakeHost', 'deleteHost', 'viewDetails', 'closeHostMenu'];
      return actions.map(action => action === 'closeHostMenu' ? action : action + '-' + Views.HostMenuDialog.hostname);
    }),
    up: function() {
      this.view.prevOption();
      document.getElementById(this.view.current()).focus();
    },
    down: function() {
      this.view.nextOption();
      document.getElementById(this.view.current()).focus();
    },
    left: function() {},
    right: function() {},
    select: function() {
      this.view.current().click();
    },
    accept: function() {
      document.getElementById(this.view.current()).click();
    },
    back: function() {
      document.getElementById('closeHostMenu').click();
    },
    press: function() {},
    switch: function() {
      document.getElementById(this.view.current()).focus();
    },
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  DeleteHostDialog: {
    view: new ListView(() => [
      'continueDeleteHost',
      'cancelDeleteHost'
    ]),
    up: function() {},
    down: function() {},
    left: function() {
      this.view.prev();
      document.getElementById('continueDeleteHost').focus();
    },
    right: function() {
      this.view.next();
      document.getElementById('cancelDeleteHost').focus();
    },
    select: function() {
      this.view.current().click();
    },
    accept: function() {
      document.getElementById(this.view.current()).click();
    },
    back: function() {
      document.getElementById('cancelDeleteHost').click();
    },
    press: function() {},
    switch: function() {},
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  HostDetailsDialog: {
    view: new ListView(() => [
      'closeHostDetails'
    ]),
    up: function() {
      document.getElementById('closeHostDetails').blur();
    },
    down: function() {
      document.getElementById('closeHostDetails').focus();
    },
    left: function() {},
    right: function() {},
    select: function() {
      this.view.current().click();
    },
    accept: function() {
      document.getElementById(this.view.current()).click();
    },
    back: function() {
      document.getElementById('closeHostDetails').click();
    },
    press: function() {},
    switch: function() {
      document.getElementById(this.view.current()).focus();
    },
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  MoonlightSupportDialog: {
    view: new ListView(() => [
      'closeAppSupport'
    ]),
    up: function() {
      document.getElementById('closeAppSupport').blur();
    },
    down: function() {
      document.getElementById('closeAppSupport').focus();
    },
    left: function() {},
    right: function() {},
    select: function() {
      this.view.current().click();
    },
    accept: function() {
      document.getElementById(this.view.current()).click();
    },
    back: function() {
      document.getElementById('closeAppSupport').click();
    },
    press: function() {},
    switch: function() {},
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  Settings: {
    view: new ListView(() => document.querySelector('.settings-categories').children),
    up: function() {
      // If there are more categories behind, then go to the previous category
      if (this.view.prevCategory()) {
        document.getElementById(this.view.current()).focus();
      } else {
        // If there are no more categories, navigate to the SettingsNav view
        Navigation.change(Views.SettingsNav);
        // Set focus on the first navigation item in SettingsNav view when transitioning from Settings view
        const navItem = document.getElementById(Views.SettingsNav.view.current());
        if (navItem) {
          navItem.focus();
        }
      }
    },
    down: function() {
      // If there are more categories after, then go to the next category
      if (this.view.nextCategory()) {
        document.getElementById(this.view.current()).focus();
      }
    },
    left: function() {},
    right: function() {},
    select: function() {
      this.view.current().click();
    },
    accept: function() {
      this.view.current().click();
    },
    back: function() {
      document.getElementById('goBackBtn').click();
      // Navigate to the HostsNav view
      Navigation.change(Views.HostsNav);
      document.getElementById('settingsBtn').focus();
    },
    press: function() {},
    switch: function() {
      this.view.current().focus();
    },
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  SettingsNav: {
    view: new ListView(() => [
      'goBackBtn',
      'restoreDefaultsBtn'
    ]),
    up: function() {},
    down: function() {
      // Navigate to the Settings view
      Navigation.change(Views.Settings);
      // Set focus on the first navigation item in Settings view when transitioning from SettingsNav view
      const navItem = document.getElementById(Views.Settings.view.current());
      if (navItem) {
        navItem.focus();
      }
    },
    left: function() {
      this.view.prev();
      document.getElementById(this.view.current()).focus();
    },
    right: function() {
      this.view.next();
      document.getElementById(this.view.current()).focus();
    },
    select: function() {
      const currentItem = this.view.current();
      if (currentItem.id === 'goBackBtn') {
        currentItem.click();
        // Navigate to the HostsNav view
        Navigation.change(Views.HostsNav);
        document.getElementById('settingsBtn').focus();
      } else {
        this.view.current().click();
      }
    },
    accept: function() {
      const currentItem = document.getElementById(this.view.current());
      if (currentItem.id === 'goBackBtn') {
        currentItem.click();
        // Navigate to the HostsNav view
        Navigation.change(Views.HostsNav);
        document.getElementById('settingsBtn').focus();
      } else {
        document.getElementById(this.view.current()).click();
      }
    },
    back: function() {
      document.getElementById('goBackBtn').click();
      // Navigate to the HostsNav view
      Navigation.change(Views.HostsNav);
      document.getElementById('settingsBtn').focus();
    },
    press: function() {},
    switch: function() {
      document.getElementById(this.view.current()).focus();
    },
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  BasicSettings: {
    view: new ListView(() => [
      'selectResolution',
      'selectFramerate',
      'selectBitrate',
      'framePacingBtn'
    ]),
    up: function() {
      this.view.prevOption();
      document.getElementById(this.view.current()).focus();
    },
    down: function() {
      this.view.nextOption();
      document.getElementById(this.view.current()).focus();
    },
    left: function() {},
    right: function() {},
    select: function() {
      // Determine the appropriate click handling method depending on the Tizen platform version
      if (currentPlatformVer === 6.0) {
        // For Tizen 6.0, directly invoke the click event on the current element reference
        this.view.current().click();
      } else {
        // For other Tizen OS versions, obtain the element by its ID and invoke its click for proper functionality
        const currentItem = document.getElementById(this.view.current());
        // Check if the current item contains a checkbox input
        const toggleInput = currentItem.querySelector('input[type="checkbox"]');
        if (toggleInput) {
          // Click the input to toggle
          toggleInput.click();
        } else {
          // Click the element
          currentItem.click();
        }
      }
    },
    accept: function() {
      document.getElementById(this.view.current()).click();
    },
    back: function() {
      // Remove focus from the current element before changing the view
      document.getElementById(this.view.current()).blur();
      // Reset the current settings view before navigating to the next settings view
      resetSettingsView();
      // Navigate to the Settings view
      Navigation.change(Views.Settings);
      // Set focus on the category item in Settings view when transitioning from BasicSettings view
      const navItem = document.getElementById(Views.Settings.view.current());
      if (navItem) {
        navItem.focus();
      }
    },
    press: function() {},
    switch: function() {
      document.getElementById(this.view.current()).focus();
    },
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  SelectResolutionMenu: {
    isActive: () => isPopupActive('videoResolutionMenu'),
    view: new ListView(() => 
      document.getElementById('videoResolutionMenu')
      .parentNode.children[3].children[1].children),
    up: function() {
      this.view.prevOption();
      document.getElementById(this.view.current()).focus();
    },
    down: function() {
      this.view.nextOption();
      document.getElementById(this.view.current()).focus();
    },
    left: function() {},
    right: function() {},
    select: function() {
      this.view.current().click();
      document.getElementById('selectResolution').focus();
    },
    accept: function() {
      this.view.current().click();
      Navigation.pop();
      document.getElementById('selectResolution').focus();
    },
    back: function() {
      document.getElementById('selectResolution').click();
      document.getElementById('selectResolution').focus();
    },
    press: function() {},
    switch: function() {},
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  SelectFramerateMenu: {
    isActive: () => isPopupActive('videoFramerateMenu'),
    view: new ListView(() => 
      document.getElementById('videoFramerateMenu')
      .parentNode.children[3].children[1].children),
    up: function() {
      this.view.prevOption();
      document.getElementById(this.view.current()).focus();
    },
    down: function() {
      this.view.nextOption();
      document.getElementById(this.view.current()).focus();
    },
    left: function() {},
    right: function() {},
    select: function() {
      this.view.current().click();
      document.getElementById('selectFramerate').focus();
    },
    accept: function() {
      this.view.current().click();
      Navigation.pop();
      document.getElementById('selectFramerate').focus();
    },
    back: function() {
      document.getElementById('selectFramerate').click();
      document.getElementById('selectFramerate').focus();
    },
    press: function() {},
    switch: function() {},
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  SelectBitrateMenu: {
    isActive: () => isPopupActive('videoBitrateMenu'),
    view: new ListView(() => 
      document.getElementById('videoBitrateMenu')
      .parentNode.children[3].children[1].children),
    up: function() {},
    down: function() {},
    left: function() {
      bitrateSlider.stepDown();
      bitrateSlider.dispatchEvent(new Event('input'));
    },
    right: function() {
      bitrateSlider.stepUp();
      bitrateSlider.dispatchEvent(new Event('input'));
    },
    select: function() {
      this.view.current().click();
      document.getElementById('selectBitrate').focus();
    },
    accept: function() {
      document.getElementById('selectBitrate').click();
      document.getElementById('selectBitrate').focus();
    },
    back: function() {
      document.getElementById('selectBitrate').click();
      document.getElementById('selectBitrate').focus();
    },
    press: function() {},
    switch: function() {},
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  HostSettings: {
    view: new ListView(() => [
      'ipAddressFieldModeBtn',
      'sortAppsListBtn',
      'optimizeGamesBtn',
      'playHostAudioBtn',
      'removeAllHostsBtn'
    ]),
    up: function() {
      this.view.prevOption();
      document.getElementById(this.view.current()).focus();
    },
    down: function() {
      this.view.nextOption();
      document.getElementById(this.view.current()).focus();
    },
    left: function() {},
    right: function() {},
    select: function() {
      // Determine the appropriate click handling method depending on the Tizen platform version
      if (currentPlatformVer === 6.0) {
        // For Tizen 6.0, directly invoke the click event on the current element reference
        this.view.current().click();
      } else {
        // For other Tizen OS versions, obtain the element by its ID and invoke its click for proper functionality
        const currentItem = document.getElementById(this.view.current());
        // Check if the current item contains a checkbox input
        const toggleInput = currentItem.querySelector('input[type="checkbox"]');
        if (toggleInput) {
          // Click the input to toggle
          toggleInput.click();
        } else {
          // Click the element
          currentItem.click();
        }
      }
    },
    accept: function() {
      document.getElementById(this.view.current()).click();
    },
    back: function() {
      // Remove focus from the current element before changing the view
      document.getElementById(this.view.current()).blur();
      // Reset the current settings view before navigating to the next settings view
      resetSettingsView();
      // Navigate to the Settings view
      Navigation.change(Views.Settings);
      // Set focus on the category item in Settings view when transitioning from HostSettings view
      const navItem = document.getElementById(Views.Settings.view.current());
      if (navItem) {
        navItem.focus();
      }
    },
    press: function() {},
    switch: function() {
      document.getElementById(this.view.current()).focus();
    },
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  InputSettings: {
    view: new ListView(() => [
      'rumbleFeedbackBtn',
      'mouseEmulationBtn',
      'flipABfaceButtonsBtn',
      'flipXYfaceButtonsBtn'
    ]),
    up: function() {
      this.view.prevOption();
      document.getElementById(this.view.current()).focus();
    },
    down: function() {
      this.view.nextOption();
      document.getElementById(this.view.current()).focus();
    },
    left: function() {},
    right: function() {},
    select: function() {
      // Determine the appropriate click handling method depending on the Tizen platform version
      if (currentPlatformVer === 6.0) {
        // For Tizen 6.0, directly invoke the click event on the current element reference
        this.view.current().click();
      } else {
        // For other Tizen OS versions, obtain the element by its ID and invoke its click for proper functionality
        const currentItem = document.getElementById(this.view.current());
        // Check if the current item contains a checkbox input
        const toggleInput = currentItem.querySelector('input[type="checkbox"]');
        if (toggleInput) {
          // Click the input to toggle
          toggleInput.click();
        } else {
          // Click the element
          currentItem.click();
        }
      }
    },
    accept: function() {
      document.getElementById(this.view.current()).click();
    },
    back: function() {
      // Remove focus from the current element before changing the view
      document.getElementById(this.view.current()).blur();
      // Reset the current settings view before navigating to the next settings view
      resetSettingsView();
      // Navigate to the Settings view
      Navigation.change(Views.Settings);
      // Set focus on the category item in Settings view when transitioning from InputSettings view
      const navItem = document.getElementById(Views.Settings.view.current());
      if (navItem) {
        navItem.focus();
      }
    },
    press: function() {},
    switch: function() {
      document.getElementById(this.view.current()).focus();
    },
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  AudioSettings: {
    view: new ListView(() => [
      'selectAudio',
      'audioSyncBtn'
    ]),
    up: function() {
      this.view.prevOption();
      document.getElementById(this.view.current()).focus();
    },
    down: function() {
      this.view.nextOption();
      document.getElementById(this.view.current()).focus();
    },
    left: function() {},
    right: function() {},
    select: function() {
      // Determine the appropriate click handling method depending on the Tizen platform version
      if (currentPlatformVer === 6.0) {
        // For Tizen 6.0, directly invoke the click event on the current element reference
        this.view.current().click();
      } else {
        // For other Tizen OS versions, obtain the element by its ID and invoke its click for proper functionality
        const currentItem = document.getElementById(this.view.current());
        // Check if the current item contains a checkbox input
        const toggleInput = currentItem.querySelector('input[type="checkbox"]');
        if (toggleInput) {
          // Click the input to toggle
          toggleInput.click();
        } else {
          // Click the element
          currentItem.click();
        }
      }
    },
    accept: function() {
      document.getElementById(this.view.current()).click();
    },
    back: function() {
      // Remove focus from the current element before changing the view
      document.getElementById(this.view.current()).blur();
      // Reset the current settings view before navigating to the next settings view
      resetSettingsView();
      // Navigate to the Settings view
      Navigation.change(Views.Settings);
      // Set focus on the category item in Settings view when transitioning from AudioSettings view
      const navItem = document.getElementById(Views.Settings.view.current());
      if (navItem) {
        navItem.focus();
      }
    },
    press: function() {},
    switch: function() {
      document.getElementById(this.view.current()).focus();
    },
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  SelectAudioMenu: {
    isActive: () => isPopupActive('audioConfigMenu'),
    view: new ListView(() => 
      document.getElementById('audioConfigMenu')
      .parentNode.children[3].children[1].children),
    up: function() {
      this.view.prevOption();
      document.getElementById(this.view.current()).focus();
    },
    down: function() {
      this.view.nextOption();
      document.getElementById(this.view.current()).focus();
    },
    left: function() {},
    right: function() {},
    select: function() {
      this.view.current().click();
      document.getElementById('selectAudio').focus();
      // Show the required Restart Moonlight dialog and push the view
      setTimeout(() => requiredRestartAppDialog(), 800);
    },
    accept: function() {
      this.view.current().click();
      Navigation.pop();
      document.getElementById('selectAudio').focus();
      // Show the required Restart Moonlight dialog and push the view
      setTimeout(() => requiredRestartAppDialog(), 800);
    },
    back: function() {
      document.getElementById('selectAudio').click();
      document.getElementById('selectAudio').focus();
    },
    press: function() {},
    switch: function() {},
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  VideoSettings: {
    view: new ListView(() => [
      'selectCodec',
      'hdrModeBtn',
      'fullRangeBtn',
      'disableWarningsBtn',
      'performanceStatsBtn'
    ]),
    up: function() {
      this.view.prevOption();
      document.getElementById(this.view.current()).focus();
    },
    down: function() {
      this.view.nextOption();
      document.getElementById(this.view.current()).focus();
    },
    left: function() {},
    right: function() {},
    select: function() {
      // Determine the appropriate click handling method depending on the Tizen platform version
      if (currentPlatformVer === 6.0) {
        // For Tizen 6.0, directly invoke the click event on the current element reference
        this.view.current().click();
      } else {
        // For other Tizen OS versions, obtain the element by its ID and invoke its click for proper functionality
        const currentItem = document.getElementById(this.view.current());
        // Check if the current item contains a checkbox input
        const toggleInput = currentItem.querySelector('input[type="checkbox"]');
        if (toggleInput) {
          // Click the input to toggle
          toggleInput.click();
        } else {
          // Click the element
          currentItem.click();
        }
      }
    },
    accept: function() {
      document.getElementById(this.view.current()).click();
    },
    back: function() {
      // Remove focus from the current element before changing the view
      document.getElementById(this.view.current()).blur();
      // Reset the current settings view before navigating to the next settings view
      resetSettingsView();
      // Navigate to the Settings view
      Navigation.change(Views.Settings);
      // Set focus on the category item in Settings view when transitioning from VideoSettings view
      const navItem = document.getElementById(Views.Settings.view.current());
      if (navItem) {
        navItem.focus();
      }
    },
    press: function() {},
    switch: function() {
      document.getElementById(this.view.current()).focus();
    },
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  SelectCodecMenu: {
    isActive: () => isPopupActive('videoCodecMenu'),
    view: new ListView(() => 
      document.getElementById('videoCodecMenu')
      .parentNode.children[3].children[1].children),
    up: function() {
      this.view.prevOption();
      document.getElementById(this.view.current()).focus();
    },
    down: function() {
      this.view.nextOption();
      document.getElementById(this.view.current()).focus();
    },
    left: function() {},
    right: function() {},
    select: function() {
      this.view.current().click();
      document.getElementById('selectCodec').focus();
      // Show the required Restart Moonlight dialog and push the view
      setTimeout(() => requiredRestartAppDialog(), 800);
    },
    accept: function() {
      this.view.current().click();
      Navigation.pop();
      document.getElementById('selectCodec').focus();
      // Show the required Restart Moonlight dialog and push the view
      setTimeout(() => requiredRestartAppDialog(), 800);
    },
    back: function() {
      document.getElementById('selectCodec').click();
      document.getElementById('selectCodec').focus();
    },
    press: function() {},
    switch: function() {},
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  AboutSettings: {
    view: new ListView(() => [
      'systemInfoBtn',
      'navigationGuideBtn',
      'checkUpdatesBtn',
      'restartAppBtn'
    ]),
    up: function() {
      this.view.prevOption();
      document.getElementById(this.view.current()).focus();
    },
    down: function() {
      this.view.nextOption();
      document.getElementById(this.view.current()).focus();
    },
    left: function() {},
    right: function() {},
    select: function() {
      // Determine the appropriate click handling method depending on the Tizen platform version
      if (currentPlatformVer === 6.0) {
        // For Tizen 6.0, directly invoke the click event on the current element reference
        this.view.current().click();
      } else {
        // For other Tizen OS versions, obtain the element by its ID and invoke its click for proper functionality
        const currentItem = document.getElementById(this.view.current());
        // Check if the current item contains a checkbox input
        const toggleInput = currentItem.querySelector('input[type="checkbox"]');
        if (toggleInput) {
          // Click the input to toggle
          toggleInput.click();
        } else {
          // Click the element
          currentItem.click();
        }
      }
    },
    accept: function() {
      document.getElementById(this.view.current()).click();
    },
    back: function() {
      // Remove focus from the current element before changing the view
      document.getElementById(this.view.current()).blur();
      // Reset the current settings view before navigating to the next settings view
      resetSettingsView();
      // Navigate to the Settings view
      Navigation.change(Views.Settings);
      // Set focus on the category item in Settings view when transitioning from AboutSettings view
      const navItem = document.getElementById(Views.Settings.view.current());
      if (navItem) {
        navItem.focus();
      }
    },
    press: function() {},
    switch: function() {
      document.getElementById(this.view.current()).focus();
    },
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  NavigationGuideDialog: {
    view: new ListView(() => [
      'closeNavGuide'
    ]),
    up: function() {
      document.getElementById('closeNavGuide').blur();
    },
    down: function() {
      document.getElementById('closeNavGuide').focus();
    },
    left: function() {},
    right: function() {},
    select: function() {
      this.view.current().click();
    },
    accept: function() {
      document.getElementById(this.view.current()).click();
    },
    back: function() {
      document.getElementById('closeNavGuide').click();
    },
    press: function() {},
    switch: function() {},
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  UpdateMoonlightDialog: {
    view: new ListView(() => [
      'closeUpdateApp'
    ]),
    up: function() {
      document.getElementById('closeUpdateApp').blur();
    },
    down: function() {
      document.getElementById('closeUpdateApp').focus();
    },
    left: function() {},
    right: function() {},
    select: function() {
      this.view.current().click();
    },
    accept: function() {
      document.getElementById(this.view.current()).click();
    },
    back: function() {
      document.getElementById('closeUpdateApp').click();
    },
    press: function() {},
    switch: function() {
      document.getElementById(this.view.current()).focus();
    },
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  RestoreDefaultsDialog: {
    view: new ListView(() => [
      'continueRestoreDefaults',
      'cancelRestoreDefaults'
    ]),
    up: function() {},
    down: function() {},
    left: function() {
      this.view.prev();
      document.getElementById('continueRestoreDefaults').focus();
    },
    right: function() {
      this.view.next();
      document.getElementById('cancelRestoreDefaults').focus();
    },
    select: function() {
      this.view.current().click();
    },
    accept: function() {
      document.getElementById(this.view.current()).click();
    },
    back: function() {
      document.getElementById('cancelRestoreDefaults').click();
    },
    press: function() {},
    switch: function() {},
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  Apps: {
    view: new ListView(() => document.getElementById('game-grid').children),
    up: function() {
      // If there are more rows behind, then go to the previous row
      if (this.view.prevCardRow(6)) {
        document.getElementById(this.view.current()).focus();
      } else {
        // If there are no more rows, navigate to the AppsNav view
        Navigation.change(Views.AppsNav);
        // Set focus on the first navigation item in AppsNav view when transitioning from Apps view
        const navItem = document.getElementById(Views.AppsNav.view.current());
        if (navItem) {
          navItem.focus();
        }
      }
    },
    down: function() {
      // If there are more rows after, then go to the next row
      if (this.view.nextCardRow(6)) {
        document.getElementById(this.view.current()).focus();
      }
    },
    left: function() {
      this.view.prevCard(6);
      document.getElementById(this.view.current()).focus();
    },
    right: function() {
      this.view.nextCard(6);
      document.getElementById(this.view.current()).focus();
    },
    select: function() {
      this.view.current().click();
    },
    accept: function() {
      this.view.current().click();
    },
    back: function() {
      document.getElementById('goBackBtn').click();
    },
    press: function() {},
    switch: function() {
      this.view.currentCardRow(6);
    },
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  AppsNav: {
    view: new ListView(() => [
      'goBackBtn',
      'quitRunningAppBtn'
    ]),
    up: function() {},
    down: function() {
      // Navigate to the Apps view
      Navigation.change(Views.Apps);
      // Set focus on the first navigation item in Apps view when transitioning from AppsNav view
      const navItem = document.getElementById(Views.Apps.view.current());
      if (navItem) {
        navItem.focus();
      }
    },
    left: function() {
      this.view.prev();
      document.getElementById(this.view.current()).focus();
    },
    right: function() {
      this.view.next();
      document.getElementById(this.view.current()).focus();
    },
    select: function() {
      this.view.current().click();
    },
    accept: function() {
      document.getElementById(this.view.current()).click();
    },
    back: function() {
      document.getElementById('goBackBtn').click();
    },
    press: function() {},
    switch: function() {
      document.getElementById(this.view.current()).focus();
    },
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  QuitAppDialog: {
    view: new ListView(() => [
      'continueQuitApp',
      'cancelQuitApp'
    ]),
    up: function() {},
    down: function() {},
    left: function() {
      this.view.prev();
      document.getElementById('continueQuitApp').focus();
    },
    right: function() {
      this.view.next();
      document.getElementById('cancelQuitApp').focus();
    },
    select: function() {
      this.view.current().click();
    },
    accept: function() {
      document.getElementById(this.view.current()).click();
    },
    back: function() {
      document.getElementById('cancelQuitApp').click();
    },
    press: function() {},
    switch: function() {},
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  RestartMoonlightDialog: {
    view: new ListView(() => [
      'continueRestartApp',
      'cancelRestartApp'
    ]),
    up: function() {},
    down: function() {},
    left: function() {
      this.view.prev();
      document.getElementById('continueRestartApp').focus();
    },
    right: function() {
      this.view.next();
      document.getElementById('cancelRestartApp').focus();
    },
    select: function() {
      this.view.current().click();
    },
    accept: function() {
      document.getElementById(this.view.current()).click();
    },
    back: function() {
      document.getElementById('cancelRestartApp').click();
    },
    press: function() {},
    switch: function() {},
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  ExitMoonlightDialog: {
    view: new ListView(() => [
      'continueExitApp',
      'cancelExitApp'
    ]),
    up: function() {},
    down: function() {},
    left: function() {
      this.view.prev();
      document.getElementById('continueExitApp').focus();
    },
    right: function() {
      this.view.next();
      document.getElementById('cancelExitApp').focus();
    },
    select: function() {
      this.view.current().click();
    },
    accept: function() {
      document.getElementById(this.view.current()).click();
    },
    back: function() {
      document.getElementById('cancelExitApp').click();
    },
    press: function() {},
    switch: function() {},
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
};

const Navigation = (function() {
  let hasFocus = false;

  function loseFocus() {
    if (hasFocus) {
      hasFocus = false;
      Stack.get().leave();
    }
  }

  function focus() {
    if (!hasFocus) {
      hasFocus = true;
      Stack.get().enter();
    }
  }

  function runOp(name) {
    return () => {
      if (!State.isRunning()) {
        return;
      }

      if (!hasFocus) {
        focus();
        return;
      }

      const view = Stack.get();
      if (view[name]) {
        view[name]();
      }
    };
  }

  const Stack = (function() {
    const viewStack = [];

    function get() {
      return viewStack[viewStack.length - 1];
    }

    function push(view, hostname) {
      if (get()) {
        get().leave();
      }
      if (hostname !== undefined) {
        view.hostname = hostname;
      }
      viewStack.push(view);
      get().enter();
    }

    function change(view) {
      get().leave();
      viewStack[viewStack.length - 1] = view;
      get().enter();
    }

    function pop() {
      if (viewStack.length > 1) {
        get().leave();
        viewStack.pop();
        get().enter();
      }
    }

    return {
      get,
      push,
      change,
      pop
    };
  })();

  const State = (function() {
    let running = false;

    function start() {
      if (!running) {
        running = true;
        window.addEventListener('mousemove', loseFocus);
      }
    }

    function stop() {
      if (running) {
        running = false;
        window.removeEventListener('mousemove', loseFocus);
      }
    }

    function isRunning() {
      return running;
    }

    return {
      start,
      stop,
      isRunning
    };
  })();

  return {
    up: runOp('up'),
    down: runOp('down'),
    left: runOp('left'),
    right: runOp('right'),
    select: runOp('select'),
    accept: runOp('accept'),
    back: runOp('back'),
    press: runOp('press'),
    switch: runOp('switch'),
    push: Stack.push,
    change: Stack.change,
    pop: Stack.pop,
    start: State.start,
    stop: State.stop,
  };
})();
