const hoveredClassName = 'hovered';
let navigationTimer = null;
const delayBetweenNavigation = 125;

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

function playSound(src, callback) {
  const audio = new Audio();
  audio.src = src;
  audio.addEventListener('loadeddata', () => {
    audio.play();
    if (callback) {
      callback();
    }
  });
}

function playNavigationMoveSound() {
  playSound('../static/sounds/navigation_move_direction.mp3');
}

function playNavigationSelectSound() {
  playSound('../static/sounds/navigation_select_action.mp3');
}

function playNavigationReturnSound() {
  playSound('../static/sounds/navigation_return_action.mp3');
}

class ListView {
  constructor(func) {
    this.index = 0;
    this.func = func;
  }

  prev() {
    if (this.index > 0 ) {
      const array = this.func();
      unmark(array[this.index]);
      --this.index;
      mark(array[this.index]);
    }
  }

  next() {
    const array = this.func();
    if (this.index < array.length - 1) {
      unmark(array[this.index]);
      ++this.index;
      mark(array[this.index]);
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
        playNavigationMoveSound();
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
        playNavigationMoveSound();
      }, delayBetweenNavigation);
    },
    left: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.prev();
        playNavigationMoveSound();
      }, delayBetweenNavigation);
    },
    right: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.next();
        playNavigationMoveSound();
      }, delayBetweenNavigation);
    },
    accept: function() {
      const element = this.view.current();
      if (element.id === 'addHostCell') {
        element.click();
        playNavigationSelectSound();
      } else {
        element.children[0].click();
        playNavigationSelectSound();
      }
    },
    back: function() {
      playNavigationReturnSound();
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
  HostsNav: {
    view: new ListView(() => [
      'selectResolution',
      'selectFramerate',
      'bitrateField',
      'externalAudioBtn',
      'optimizeGamesBtn',
      'framePacingBtn',
      'audioSyncBtn',
      'removeAllHosts',
      'supportCenter']),
    up: function() {},
    down: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        // Remove focus from the current element before changing the view
        document.getElementById(this.view.current()).blur();
        Navigation.change(Views.Hosts);
        playNavigationMoveSound();
      }, delayBetweenNavigation);
    },
    left: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.prev();
        playNavigationMoveSound();
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
    },
    right: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.next();
        playNavigationMoveSound();
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
    },
    accept: function() {
      const currentItem = document.getElementById(this.view.current());
      if (currentItem.id === 'externalAudioBtn' || currentItem.id === 'optimizeGamesBtn' || 
          currentItem.id === 'framePacingBtn' || currentItem.id === 'audioSyncBtn') {
        currentItem.click();
        playNavigationSelectSound();
      } else if (currentItem.id === 'removeAllHosts' || currentItem.id === 'supportCenter') {
        this.view.current().click();
        playNavigationSelectSound();
      } else {
        // For other elements like 'selectResolution', 'selectFramerate' and 'bitrateField'
        currentItem.click();
        playNavigationSelectSound();
      }
    },
    back: function() {
      // Remove focus from the current element before changing the view
      document.getElementById(this.view.current()).blur();
      Navigation.change(Views.Hosts);
      playNavigationReturnSound();
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
        playNavigationMoveSound();
        document.getElementById('dialogInputHost').focus();
      }, delayBetweenNavigation);
    },
    down: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        playNavigationMoveSound();
        document.getElementById('continueAddHost').focus();
      }, delayBetweenNavigation);
    },
    left: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.prev();
        playNavigationMoveSound();
        document.getElementById('continueAddHost').focus();
      }, delayBetweenNavigation);
    },
    right: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.next();
        playNavigationMoveSound();
        document.getElementById('cancelAddHost').focus();
      }, delayBetweenNavigation);
    },
    accept: function() {
      document.getElementById(this.view.current()).click();
      playNavigationSelectSound();
    },
    back: function() {
      document.getElementById('cancelAddHost').click();
      playNavigationReturnSound();
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
    down: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        playNavigationMoveSound();
        document.getElementById('continueDeleteHost').focus();
      }, delayBetweenNavigation);
    },
    left: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.prev();
        playNavigationMoveSound();
        document.getElementById('continueDeleteHost').focus();
      }, delayBetweenNavigation);
    },
    right: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.next();
        playNavigationMoveSound();
        document.getElementById('cancelDeleteHost').focus();
      }, delayBetweenNavigation);
    },
    accept: function() {
      document.getElementById(this.view.current()).click();
      playNavigationSelectSound();
    },
    back: function() {
      document.getElementById('cancelDeleteHost').click();
      playNavigationReturnSound();
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
    view: new ListView(
        () => document
            .getElementById('resolutionMenu')
            .parentNode
            .children[1]
            .children[1]
            .children),
    up: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.prev();
        playNavigationMoveSound();
      }, delayBetweenNavigation);
    },
    down: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.next();
        playNavigationMoveSound();
      }, delayBetweenNavigation);
    },
    left: function() {},
    right: function() {},
    accept: function() {
      this.view.current().click();
      playNavigationSelectSound();
      document.getElementById('selectResolution').focus();
    },
    back: function() {
      document.getElementById('selectResolution').click();
      playNavigationReturnSound();
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
    view: new ListView(
        () => document
            .getElementById('framerateMenu')
            .parentNode
            .children[1]
            .children[1]
            .children),
    up: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.prev();
        playNavigationMoveSound();
      }, delayBetweenNavigation);
    },
    down: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.next();
        playNavigationMoveSound();
      }, delayBetweenNavigation);
    },
    left: function() {},
    right: function() {},
    accept: function() {
      this.view.current().click();
      playNavigationSelectSound();
      document.getElementById('selectFramerate').focus();
    },
    back: function() {
      document.getElementById('selectFramerate').click();
      playNavigationReturnSound();
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
    isActive: () => isPopupActive('bandwidthMenu'),
    up: function() {},
    down: function() {},
    left: function() {
      bitrateSlider.stepDown();
      bitrateSlider.dispatchEvent(new Event('input'));
      playNavigationMoveSound();
    },
    right: function() {
      bitrateSlider.stepUp();
      bitrateSlider.dispatchEvent(new Event('input'));
      playNavigationMoveSound();
    },
    accept: function() {
      this.view.current().click();
      playNavigationSelectSound();
      document.getElementById('bitrateField').focus();
    },
    back: function() {
      document.getElementById('bitrateField').click();
      playNavigationReturnSound();
      document.getElementById('bitrateField').focus();
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
        playNavigationMoveSound();
        document.getElementById('cancelPairingDialog').focus();
      }, delayBetweenNavigation);
    },
    left: function() {},
    right: function() {},
    accept: function() {
      document.getElementById(this.view.current()).click();
      playNavigationSelectSound();
    },
    back: function() {
      document.getElementById('cancelPairingDialog').click();
      playNavigationReturnSound();
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
        Navigation.change(Views.AppsNav);
        playNavigationReturnSound();
        // Set focus on the first navigation item in AppsNav view when transitioning from Apps view
        const navItem = document.getElementById(Views.AppsNav.view.current());
        if (navItem) {
          navItem.focus();
        }
      }, delayBetweenNavigation);
    },
    down: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        Navigation.change(Views.Apps);
        playNavigationMoveSound();
      }, delayBetweenNavigation);
    },
    left: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.prev();
        playNavigationMoveSound();
      }, delayBetweenNavigation);
    },
    right: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.next();
        playNavigationMoveSound();
      }, delayBetweenNavigation);
    },
    accept: function() {
      this.view.current().click();
      playNavigationSelectSound();
    },
    back: function() {
      document.getElementById('backIcon').click();
      playNavigationReturnSound();
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
      'backIcon',
      'quitCurrentApp']),
    up: function() {},
    down: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        Navigation.change(Views.Apps);
        playNavigationMoveSound();
      }, delayBetweenNavigation);
    },
    left: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.prev();
        playNavigationMoveSound();
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
    },
    right: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.next();
        playNavigationMoveSound();
        document.getElementById(this.view.current()).focus();
      }, delayBetweenNavigation);
    },
    accept: function() {
      this.view.current().click();
      playNavigationSelectSound();
    },
    back: function() {
      document.getElementById('backIcon').click();
      playNavigationReturnSound();
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
    down: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        playNavigationMoveSound();
        document.getElementById('continueQuitApp').focus();
      }, delayBetweenNavigation);
    },
    left: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.prev();
        playNavigationMoveSound();
        document.getElementById('continueQuitApp').focus();
      }, delayBetweenNavigation);
    },
    right: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.next();
        playNavigationMoveSound();
        document.getElementById('cancelQuitApp').focus();
      }, delayBetweenNavigation);
    },
    accept: function() {
      document.getElementById(this.view.current()).click();
      playNavigationSelectSound();
    },
    back: function() {
      document.getElementById('cancelQuitApp').click();
      playNavigationReturnSound();
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
        playNavigationMoveSound();
        document.getElementById('closeSupportDialog').focus();
      }, delayBetweenNavigation);
    },
    left: function() {},
    right: function() {},
    accept: function() {
      this.view.current().click();
      playNavigationSelectSound();
      document.getElementById('supportCenter').focus();
    },
    back: function() {
      document.getElementById('closeSupportDialog').click();
      playNavigationReturnSound();
      document.getElementById('supportCenter').focus();
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
    down: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        playNavigationMoveSound();
        document.getElementById('continueTerminateMoonlight').focus();
      }, delayBetweenNavigation);
    },
    left: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.prev();
        playNavigationMoveSound();
        document.getElementById('continueTerminateMoonlight').focus();
      }, delayBetweenNavigation);
    },
    right: function() {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        this.view.next();
        playNavigationMoveSound();
        document.getElementById('cancelTerminateMoonlight').focus();
      }, delayBetweenNavigation);
    },
    accept: function() {
      document.getElementById(this.view.current()).click();
      playNavigationSelectSound();
    },
    back: function() {
      document.getElementById('cancelTerminateMoonlight').click();
      playNavigationReturnSound();
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
    accept: runOp('accept'),
    back: runOp('back'),
    left: runOp('left'),
    right: runOp('right'),
    up: runOp('up'),
    down: runOp('down'),
    push: Stack.push,
    change: Stack.change,
    pop: Stack.pop,
    start: State.start,
    stop: State.stop,
  };
})();
