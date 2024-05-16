const hoveredClassName = 'hovered';
let navigationTimer = null;
const delayBetweenNavigation = 120; // 120ms (milliseconds)

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

class ListView {
  constructor (func, itemsPerRow) {
    this.index = 0;
    this.itemsPerRow = itemsPerRow || 6;
    this.func = func;
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

  prevOption() {
    const array = this.func();
    if (this.index > 0) {
      unmark(array[this.index]);
      --this.index;
      mark(array[this.index]);
      // Indicate that there are more options
      return true;
    } else {
      // Indicate that there are no more options
      return false;
    }
  }

  nextOption() {
    const array = this.func();
    if (this.index < array.length - 1) {
      unmark(array[this.index]);
      ++this.index;
      mark(array[this.index]);
      // Indicate that there are more options
      return true;
    } else {
      // Indicate that there are no more options
      return false;
    }
  }

  prevRow() {
    const array = this.func();
    const currentRow = Math.floor(this.index / this.itemsPerRow);
    if (currentRow > 0) {
      unmark(array[this.index]);
      this.index -= this.itemsPerRow;
      mark(array[this.index]);
      this.scrollToRow(currentRow - 1);
      // Indicate that there are more rows
      return true;
    } else {
      // Indicate that there are no more rows
      return false;
    }
  }

  nextRow() {
    const array = this.func();
    const rows = Math.ceil(array.length / this.itemsPerRow);
    const currentRow = Math.floor(this.index / this.itemsPerRow);
    if (currentRow < rows - 1) {
      unmark(array[this.index]);
      this.index += this.itemsPerRow;
      mark(array[this.index]);
      this.scrollToRow(currentRow + 1);
      // Indicate that there are more rows
      return true;
    } else {
      // Indicate that there are no more rows
      return false;
    }
  }
  
  scrollToRow(row) {
    const array = this.func();
    const targetItem = array[row * this.itemsPerRow];
    if (targetItem) {
      targetItem.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }

  current() {
    return this.func()[this.index];
  }
};

const Views = {
  Hosts: {
    view: new ListView(() => document.getElementById('host-grid').children),
    up: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        // Navigate to the HostsNav view
        Navigation.change(Views.HostsNav);
        // Set focus on the first navigation item in HostsNav view when transitioning from Hosts view
        const navItem = document.getElementById(Views.HostsNav.view.current());
        if (navItem) {
          navItem.focus();
        }
      }, delayBetweenNavigation);
    },
    down: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        // Navigate to the Hosts view
        Navigation.change(Views.Hosts);
        // Set focus on the first navigation item in Hosts view
        const navItem = document.getElementById(Views.Hosts.view.current());
        if (navItem) {
          navItem.focus();
        }
      }, delayBetweenNavigation);
    },
    left: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.prev();
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
    },
    right: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.next();
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
    },
    select: function() {
      const currentCell = this.view.current();
      if (currentCell.id === 'addHostCell') {
        currentCell.click();
      } else {
        currentCell.children[0].click();
      }
    },
    accept: function() {
      const currentCell = this.view.current();
      if (currentCell.id === 'addHostCell') {
        currentCell.click();
      } else {
        currentCell.children[0].click();
      }
    },
    back: function() {
      // Show the Exit Moonlight dialog and push the view
      showExitMoonlightDialog();
    },
    shortcut: function() {
      const currentCell = this.view.current();
      if (currentCell.id !== 'addHostCell') {
        currentCell.children[1].focus();
        // Show the Delete Host dialog and push the view
        setTimeout(() => currentCell.children[1].click(), 800);
      }
    },
    alternative: function() {},
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  HostsNav: {
    view: new ListView(() => [
      'settingsBtn',
      'supportBtn']),
    up: function() {},
    down: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        // Remove focus from the current element before changing the view
        document.getElementById(this.view.current()).blur();
        // Navigate to the Hosts view
        Navigation.change(Views.Hosts);
        // Set focus on the first navigation item in Hosts view when transitioning from HostsNav view
        const navItem = document.getElementById(Views.Hosts.view.current());
        if (navItem) {
          navItem.focus();
        }
      }, delayBetweenNavigation);
    },
    left: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.prev();
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
    },
    right: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.next();
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
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
    shortcut: function() {},
    alternative: function() {},
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  AddHostDialog: {
    isActive: () => isDialogActive('addHostDialog'),
    view: new ListView(() => {
      if (document.getElementById('ipAddressFieldModeSwitch').checked) {
        return ['ipAddressField1', 'ipAddressField2', 'ipAddressField3', 'ipAddressField4', 'continueAddHost', 'cancelAddHost'];
      } else {
        return ['ipAddressTextInput', 'continueAddHost', 'cancelAddHost'];
      }
    }),
    up: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        if (document.getElementById('ipAddressFieldModeSwitch').checked) {
          const currentItem = this.view.current();
          if (currentItem.startsWith('ipAddressField')) {
            const digitElement = document.getElementById(currentItem);
            const currentValue = parseInt(digitElement.value, 10);
            if (currentValue < 255) {
              digitElement.value = currentValue + 1;
            } else {
              digitElement.value = 0;
            }
          }
        } else {
          document.getElementById('ipAddressTextInput').focus();
        }
      }, delayBetweenNavigation);
    },
    down: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        if (document.getElementById('ipAddressFieldModeSwitch').checked) {
          const currentItem = this.view.current();
          if (currentItem.startsWith('ipAddressField')) {
            const digitElement = document.getElementById(currentItem);
            const currentValue = parseInt(digitElement.value, 10);
            if (currentValue > 0) {
              digitElement.value = currentValue - 1;
            } else {
              digitElement.value = 255;
            }
          }
        } else {
          document.getElementById('continueAddHost').focus();
        }
      }, delayBetweenNavigation);
    },
    left: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
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
          document.getElementById('continueAddHost').focus();
        }
      }, delayBetweenNavigation);
    },
    right: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
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
          document.getElementById('cancelAddHost').focus();
        }
      }, delayBetweenNavigation);
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
    shortcut: function() {},
    alternative: function() {
      document.getElementById('ipAddressFieldModeSwitch').click();
    },
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  PairingDialog: {
    isActive: () => isDialogActive('pairingDialog'),
    view: new ListView(() => ['cancelPairingDialog']),
    up: function() {},
    down: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        document.getElementById('cancelPairingDialog').focus();
      }, delayBetweenNavigation);
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
      document.getElementById('cancelPairingDialog').click();
    },
    shortcut: function() {},
    alternative: function() {},
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  DeleteHostDialog: {
    isActive: () => isDialogActive('deleteHostDialog'),
    view: new ListView(() => [
      'continueDeleteHost',
      'cancelDeleteHost']),
    up: function() {},
    down: function() {},
    left: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.prev();
        document.getElementById('continueDeleteHost').focus();
      }, delayBetweenNavigation);
    },
    right: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.next();
        document.getElementById('cancelDeleteHost').focus();
      }, delayBetweenNavigation);
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
    shortcut: function() {},
    alternative: function() {},
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
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        // If there are more categories behind, then go to the previous category
        if (this.view.prevOption()) {
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
      }, delayBetweenNavigation);
    },
    down: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        // If there are more categories after, then go to the next category
        if (this.view.nextOption()) {
          document.getElementById(this.view.current()).focus();
        }
      }, delayBetweenNavigation);
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
    shortcut: function() {},
    alternative: function() {},
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
      'restoreDefaultsBtn']),
    up: function() {},
    down: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        // Navigate to the Settings view
        Navigation.change(Views.Settings);
        // Set focus on the first navigation item in Settings view when transitioning from SettingsNav view
        const navItem = document.getElementById(Views.Settings.view.current());
        if (navItem) {
          navItem.focus();
        }
      }, delayBetweenNavigation);
    },
    left: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.prev();
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
    },
    right: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.next();
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
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
    shortcut: function() {},
    alternative: function() {},
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  RestoreDefaultsDialog: {
    isActive: () => isDialogActive('restoreDefaultsDialog'),
    view: new ListView(() => [
      'continueRestoreDefaults',
      'cancelRestoreDefaults']),
    up: function() {},
    down: function() {},
    left: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.prev();
        document.getElementById('continueRestoreDefaults').focus();
      }, delayBetweenNavigation);
    },
    right: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.next();
        document.getElementById('cancelRestoreDefaults').focus();
      }, delayBetweenNavigation);
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
    shortcut: function() {},
    alternative: function() {},
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
      'selectBitrate']),
    up: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.prev();
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
    },
    down: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.next();
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
    },
    left: function() {},
    right: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
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
      // Remove the 'hovered' and 'is-focused' classes from all toggle switches
      const toggleSwitches = document.querySelectorAll('.mdl-switch');
      toggleSwitches.forEach(function (toggleSwitch) {
        toggleSwitch.classList.remove('hovered', 'is-focused');
      });
      // Hide the right settings pane which includes settings options
      const settingsOptions = document.querySelectorAll('.settings-options');
      settingsOptions.forEach(function (settingsOption) {
        settingsOption.style.display = 'none';
      });
      // Remove the 'selected' class from all categories
      const settingsCategories = document.querySelectorAll('.category');
      settingsCategories.forEach(function (settingsCategory) {
        settingsCategory.classList.remove('selected');
      });
      // Navigate to the Settings view
      Navigation.change(Views.Settings);
      // Set focus on the category item in Settings view when transitioning from BasicSettings view
      const navItem = document.getElementById(Views.Settings.view.current());
      if (navItem) {
        navItem.focus();
      }
    },
    shortcut: function() {},
    alternative: function() {},
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  SelectResolutionMenu: {
    isActive: () => isPopupActive('resolutionMenu'),
    view: new ListView(() => 
      document.getElementById('resolutionMenu')
      .parentNode.children[3].children[1].children),
    up: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.prev();
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
    },
    down: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.next();
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
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
    shortcut: function() {},
    alternative: function() {},
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  SelectFramerateMenu: {
    isActive: () => isPopupActive('framerateMenu'),
    view: new ListView(() => 
      document.getElementById('framerateMenu')
      .parentNode.children[3].children[1].children),
    up: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.prev();
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
    },
    down: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.next();
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
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
    shortcut: function() {},
    alternative: function() {},
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  SelectBitrateMenu: {
    isActive: () => isPopupActive('bitrateMenu'),
    view: new ListView(() => 
      document.getElementById('bitrateMenu')
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
    shortcut: function() {},
    alternative: function() {},
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
      'optimizeGamesBtn',
      'externalAudioBtn',
      'removeAllHostsBtn']),
    up: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.prev();
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
    },
    down: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.next();
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
    },
    left: function() {},
    right: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
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
      // Remove the 'hovered' and 'is-focused' classes from all toggle switches
      const toggleSwitches = document.querySelectorAll('.mdl-switch');
      toggleSwitches.forEach(function (toggleSwitch) {
        toggleSwitch.classList.remove('hovered', 'is-focused');
      });
      // Hide the right settings pane which includes settings options
      const settingsOptions = document.querySelectorAll('.settings-options');
      settingsOptions.forEach(function (settingsOption) {
        settingsOption.style.display = 'none';
      });
      // Remove the 'selected' class from all categories
      const settingsCategories = document.querySelectorAll('.category');
      settingsCategories.forEach(function (settingsCategory) {
        settingsCategory.classList.remove('selected');
      });
      // Navigate to the Settings view
      Navigation.change(Views.Settings);
      // Set focus on the category item in Settings view when transitioning from HostSettings view
      const navItem = document.getElementById(Views.Settings.view.current());
      if (navItem) {
        navItem.focus();
      }
    },
    shortcut: function() {},
    alternative: function() {},
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  DecoderSettings: {
    view: new ListView(() => [
      'selectCodec',
      'framePacingBtn',
      'audioSyncBtn']),
    up: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.prev();
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
    },
    down: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.next();
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
    },
    left: function() {},
    right: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
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
      // Remove the 'hovered' and 'is-focused' classes from all toggle switches
      const toggleSwitches = document.querySelectorAll('.mdl-switch');
      toggleSwitches.forEach(function (toggleSwitch) {
        toggleSwitch.classList.remove('hovered', 'is-focused');
      });
      // Hide the right settings pane which includes settings options
      const settingsOptions = document.querySelectorAll('.settings-options');
      settingsOptions.forEach(function (settingsOption) {
        settingsOption.style.display = 'none';
      });
      // Remove the 'selected' class from all categories
      const settingsCategories = document.querySelectorAll('.category');
      settingsCategories.forEach(function (settingsCategory) {
        settingsCategory.classList.remove('selected');
      });
      // Navigate to the Settings view
      Navigation.change(Views.Settings);
      // Set focus on the category item in Settings view when transitioning from DecoderSettings view
      const navItem = document.getElementById(Views.Settings.view.current());
      if (navItem) {
        navItem.focus();
      }
    },
    shortcut: function() {},
    alternative: function() {},
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  SelectCodecMenu: {
    isActive: () => isPopupActive('codecMenu'),
    view: new ListView(() => 
      document.getElementById('codecMenu')
      .parentNode.children[3].children[1].children),
    up: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.prev();
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
    },
    down: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.next();
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
    },
    left: function() {},
    right: function() {},
    select: function() {
      this.view.current().click();
      document.getElementById('selectCodec').focus();
      // Show the Restart Moonlight dialog and push the view
      setTimeout(() => showRestartMoonlightDialog(), 1200);
    },
    accept: function() {
      this.view.current().click();
      Navigation.pop();
      document.getElementById('selectCodec').focus();
      // Show the Restart Moonlight dialog and push the view
      setTimeout(() => showRestartMoonlightDialog(), 1200);
    },
    back: function() {
      document.getElementById('selectCodec').click();
      document.getElementById('selectCodec').focus();
    },
    shortcut: function() {},
    alternative: function() {},
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
      'restartAppBtn',
      'exitAppBtn']),
    up: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.prev();
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
    },
    down: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.next();
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
    },
    left: function() {},
    right: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
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
      // Hide the right settings pane which includes settings options
      const settingsOptions = document.querySelectorAll('.settings-options');
      settingsOptions.forEach(function (settingsOption) {
        settingsOption.style.display = 'none';
      });
      // Remove the 'selected' class from all categories
      const settingsCategories = document.querySelectorAll('.category');
      settingsCategories.forEach(function (settingsCategory) {
        settingsCategory.classList.remove('selected');
      });
      // Navigate to the Settings view
      Navigation.change(Views.Settings);
      // Set focus on the category item in Settings view when transitioning from AboutSettings view
      const navItem = document.getElementById(Views.Settings.view.current());
      if (navItem) {
        navItem.focus();
      }
    },
    shortcut: function() {},
    alternative: function() {},
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
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        // If there are more rows behind, then go to the previous row
        if (this.view.prevRow()) {
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
      }, delayBetweenNavigation);
    },
    down: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        // If there are more rows after, then go to the next row
        if (this.view.nextRow()) {
          document.getElementById(this.view.current()).focus();
        }
      }, delayBetweenNavigation);
    },
    left: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.prev();
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
    },
    right: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.next();
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
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
    shortcut: function() {},
    alternative: function() {},
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
      'quitRunningAppBtn']),
    up: function() {},
    down: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        // Navigate to the Apps view
        Navigation.change(Views.Apps);
        // Set focus on the first navigation item in Apps view when transitioning from AppsNav view
        const navItem = document.getElementById(Views.Apps.view.current());
        if (navItem) {
          navItem.focus();
        }
      }, delayBetweenNavigation);
    },
    left: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.prev();
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
    },
    right: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.next();
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
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
    shortcut: function() {},
    alternative: function() {},
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  QuitAppDialog: {
    isActive: () => isDialogActive('quitAppDialog'),
    view: new ListView(() => [
      'continueQuitApp',
      'cancelQuitApp']),
    up: function() {},
    down: function() {},
    left: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.prev();
        document.getElementById('continueQuitApp').focus();
      }, delayBetweenNavigation);
    },
    right: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.next();
        document.getElementById('cancelQuitApp').focus();
      }, delayBetweenNavigation);
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
    shortcut: function() {},
    alternative: function() {},
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  SupportDialog: {
    isActive: () => isDialogActive('supportDialog'),
    view: new ListView(() => ['closeSupportDialog']),
    up: function() {},
    down: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        document.getElementById('closeSupportDialog').focus();
      }, delayBetweenNavigation);
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
      document.getElementById('closeSupportDialog').click();
    },
    shortcut: function() {},
    alternative: function() {},
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  RestartMoonlightDialog: {
    isActive: () => isDialogActive('restartAppDialog'),
    view: new ListView(() => [
      'continueRestartApp',
      'cancelRestartApp']),
    up: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
    },
    down: function() {},
    left: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.prev();
        document.getElementById('continueRestartApp').focus();
      }, delayBetweenNavigation);
    },
    right: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.next();
        document.getElementById('cancelRestartApp').focus();
      }, delayBetweenNavigation);
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
    shortcut: function() {},
    alternative: function() {},
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  ExitMoonlightDialog: {
    isActive: () => isDialogActive('exitAppDialog'),
    view: new ListView(() => [
      'continueExitApp',
      'cancelExitApp']),
    up: function() {},
    down: function() {},
    left: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.prev();
        document.getElementById('continueExitApp').focus();
      }, delayBetweenNavigation);
    },
    right: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.next();
        document.getElementById('cancelExitApp').focus();
      }, delayBetweenNavigation);
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
    shortcut: function() {},
    alternative: function() {},
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

    function push(view) {
      if (get()) {
        get().leave();
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

    function get() {
      return viewStack[viewStack.length - 1];
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
    shortcut: runOp('shortcut'),
    alternative: runOp('alternative'),
    push: Stack.push,
    change: Stack.change,
    pop: Stack.pop,
    start: State.start,
    stop: State.stop,
  };
})();
