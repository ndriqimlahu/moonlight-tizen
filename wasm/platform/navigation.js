const hoveredClassName = 'hovered';
let navigationTimer = null;
const delayBetweenNavigation = 120; // 120ms (milliseconds)

function unmarkElementById(id) {
  unmarkElement(document.getElementById(id));
}

function unmarkElement(element) {
  if (element) {
    element.classList.remove(hoveredClassName);
    element.dispatchEvent(new Event('mouseleave'));
  }
}

function markElementById(id) {
  markElement(document.getElementById(id));
}

function markElement(element) {
  if (element) {
    element.classList.add(hoveredClassName);
    element.dispatchEvent(new Event('mouseenter'));
  }
}

function mark(value) {
  if (typeof value === 'string') {
    markElementById(value);
  } else if (typeof value === 'object') {
    markElement(value);
  }
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
    .children[1]
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
      // Show the dialog and push the view
      showTerminateMoonlightDialog();
    },
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  TerminateMoonlightDialog: {
    view: new ListView(() => [
      'continueTerminateMoonlight',
      'cancelTerminateMoonlight']),
    up: function() {},
    down: function() {},
    left: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.prev();
        document.getElementById('continueTerminateMoonlight').focus();
      }, delayBetweenNavigation);
    },
    right: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.next();
        document.getElementById('cancelTerminateMoonlight').focus();
      }, delayBetweenNavigation);
    },
    select: function() {
      this.view.current().click();
    },
    accept: function() {
      document.getElementById(this.view.current()).click();
    },
    back: function() {
      document.getElementById('cancelTerminateMoonlight').click();
    },
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  AddHostDialog: {
    view: new ListView(() => [
      'dialogInputHost',
      'continueAddHost',
      'cancelAddHost']),
    up: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        document.getElementById('dialogInputHost').focus();
      }, delayBetweenNavigation);
    },
    down: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        document.getElementById('continueAddHost').focus();
      }, delayBetweenNavigation);
    },
    left: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.prev();
        document.getElementById('continueAddHost').focus();
      }, delayBetweenNavigation);
    },
    right: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.next();
        document.getElementById('cancelAddHost').focus();
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
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  PairingDialog: {
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
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  HostsNav: {
    view: new ListView(() => [
      'selectResolution',
      'selectFramerate',
      'selectBitrate',
      'externalAudioBtn',
      'optimizeGamesBtn',
      'framePacingBtn',
      'audioSyncBtn',
      'removeAllHostsBtn',
      'supportCenterBtn']),
    up: function() {},
    down: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        // Remove focus from the current element before changing the view
        document.getElementById(this.view.current()).blur();
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
      const currentItem = document.getElementById(this.view.current());
      if (currentItem.id === 'externalAudioBtn' || currentItem.id === 'optimizeGamesBtn' || 
          currentItem.id === 'framePacingBtn' || currentItem.id === 'audioSyncBtn') {
        currentItem.click();
      } else if (currentItem.id === 'removeAllHostsBtn' || currentItem.id === 'supportCenterBtn') {
        this.view.current().click();
      } else {
        // For other elements like 'selectResolution', 'selectFramerate' and 'selectBitrate'
        currentItem.click();
      }
    },
    accept: function() {
      document.getElementById(this.view.current()).click();
    },
    back: function() {
      // Remove focus from the current element before changing the view
      document.getElementById(this.view.current()).blur();
      Navigation.change(Views.Hosts);
    },
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
      .parentNode.children[1].children[1].children),
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
      document.getElementById('selectResolution').focus();
    },
    back: function() {
      document.getElementById('selectResolution').click();
      document.getElementById('selectResolution').focus();
    },
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
      .parentNode.children[1].children[1].children),
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
      document.getElementById('selectFramerate').focus();
    },
    back: function() {
      document.getElementById('selectFramerate').click();
      document.getElementById('selectFramerate').focus();
    },
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
      .parentNode.children[1].children[1].children),
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
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  SupportDialog: {
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
    enter: function() {
      mark(this.view.current());
    },
    leave: function() {
      unmark(this.view.current());
    },
  },
  CloseAppDialog: {
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
    push: Stack.push,
    change: Stack.change,
    pop: Stack.pop,
    start: State.start,
    stop: State.stop,
  };
})();
