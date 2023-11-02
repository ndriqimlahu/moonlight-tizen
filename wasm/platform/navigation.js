const hoveredClassName = 'hovered';

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
      Navigation.change(Views.HostsNav);
      // Set focus on the first navigation item in HostsNav view when transitioning from Hosts view
      const navItem = document.getElementById(Views.HostsNav.view.current());
      if (navItem) {
        navItem.focus();
      }
    },
    down: function() {
      Navigation.change(Views.Hosts);
    },
    left: function() {
      this.view.prev();
    },
    right: function() {
      this.view.next();
    },
    accept: function() {
      const element = this.view.current();
      if (element.id === 'addHostCell') {
        element.click();
      } else {
        element.children[0].click();
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
      Navigation.change(Views.Hosts);
    },
    left: function() {
      this.view.prev();
      document.getElementById(this.view.current()).focus();
    },
    right: function() {
      this.view.next();
      document.getElementById(this.view.current()).focus();
    },
    accept: function() {
      const currentItem = document.getElementById(this.view.current());
      if (currentItem.id === 'externalAudioBtn' || currentItem.id === 'optimizeGamesBtn' || 
          currentItem.id === 'framePacingBtn' || currentItem.id === 'audioSyncBtn') {
        currentItem.click();
      } else if (currentItem.id === 'removeAllHosts' || currentItem.id === 'supportCenter') {
        this.view.current().click();
      } else {
        // For other elements like 'selectResolution', 'selectFramerate' and 'bitrateField'
        currentItem.click();
      }
    },
    back: function() {
      Navigation.change(Views.Hosts);
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
      document.getElementById('dialogInputHost').focus();
    },
    down: function() {
      document.getElementById('continueAddHost').focus();
    },
    left: function() {
      this.view.prev();
      document.getElementById('continueAddHost').focus();
    },
    right: function() {
      this.view.next();
      document.getElementById('cancelAddHost').focus();
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
  DeleteHostDialog: {
    view: new ListView(() => [
      'continueDeleteHost',
      'cancelDeleteHost']),
    up: function() {},
    down: function() {
      document.getElementById('continueDeleteHost').focus();
    },
    left: function() {
      this.view.prev();
      document.getElementById('continueDeleteHost').focus();
    },
    right: function() {
      this.view.next();
      document.getElementById('cancelDeleteHost').focus();
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
      this.view.prev();
    },
    down: function() {
      this.view.next();
    },
    left: function() {},
    right: function() {},
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
    view: new ListView(
        () => document
            .getElementById('framerateMenu')
            .parentNode
            .children[1]
            .children[1]
            .children),
    up: function() {
      this.view.prev();
    },
    down: function() {
      this.view.next();
    },
    left: function() {},
    right: function() {},
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
    isActive: () => isPopupActive('bandwidthMenu'),
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
    accept: function() {
      this.view.current().click();
      document.getElementById('bitrateField').focus();
    },
    back: function() {
      document.getElementById('bitrateField').click();
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
      document.getElementById('cancelPairingDialog').focus();
    },
    left: function() {},
    right: function() {},
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
  Apps: {
    view: new ListView(() => document.getElementById('game-grid').children),
    up: function() {
      Navigation.change(Views.AppsNav);
      // Set focus on the first navigation item in AppsNav view when transitioning from Apps view
      const navItem = document.getElementById(Views.AppsNav.view.current());
      if (navItem) {
        navItem.focus();
      }
    },
    down: function() {
      Navigation.change(Views.Apps);
    },
    left: function() {
      this.view.prev();
    },
    right: function() {
      this.view.next();
    },
    accept: function() {
      this.view.current().click();
    },
    back: function() {
      document.getElementById('backIcon').click();
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
      Navigation.change(Views.Apps);
    },
    left: function() {
      this.view.prev();
      document.getElementById(this.view.current()).focus();
    },
    right: function() {
      this.view.next();
      document.getElementById(this.view.current()).focus();
    },
    accept: function() {
      this.view.current().click();
    },
    back: function() {
      document.getElementById('backIcon').click();
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
      document.getElementById('continueQuitApp').focus();
    },
    left: function() {
      this.view.prev();
      document.getElementById('continueQuitApp').focus();
    },
    right: function() {
      this.view.next();
      document.getElementById('cancelQuitApp').focus();
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
  SupportDialog: {
    view: new ListView(() => ['closeSupportDialog']),
    up: function() {},
    down: function() {
      document.getElementById('closeSupportDialog').focus();
    },
    left: function() {},
    right: function() {},
    accept: function() {
      this.view.current().click();
      document.getElementById('supportCenter').focus();
    },
    back: function() {
      document.getElementById('closeSupportDialog').click();
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
      document.getElementById('continueTerminateMoonlight').focus();
    },
    left: function() {
      this.view.prev();
      document.getElementById('continueTerminateMoonlight').focus();
    },
    right: function() {
      this.view.next();
      document.getElementById('cancelTerminateMoonlight').focus();
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

    return {get, push, change, pop};
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

    return {start, stop, isRunning};
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
