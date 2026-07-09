import {
  findEmotePanel,
} from './emote-panel.js';

import {
  createFrameScheduler,
} from './frame-scheduler.js';

const listeners = new Set();

let bodyObserver = null;
let panelObserver = null;
let observedPanel = null;
const panelObserverRefreshScheduler = createFrameScheduler(() => {
  refreshPanelObserver();
});

export function subscribePanelDomMutations(listener) {
  if (typeof listener !== 'function') {
    return;
  }

  listeners.add(listener);
  panelObserverRefreshScheduler.start();
  ensureObserver();
}

export function unsubscribePanelDomMutations(listener) {
  listeners.delete(listener);

  if (listeners.size) {
    return;
  }

  disconnectObservers();
}

function ensureObserver() {
  if (bodyObserver || !document.body) {
    return;
  }

  bodyObserver = new MutationObserver((mutations) => {
    schedulePanelObserverRefresh();
    dispatchMutations(mutations);
  });

  bodyObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  refreshPanelObserver();
}

function schedulePanelObserverRefresh() {
  panelObserverRefreshScheduler.schedule();
}

function refreshPanelObserver() {
  if (!listeners.size) return;

  const panel = findEmotePanel();

  if (panel === observedPanel) {
    return;
  }

  disconnectPanelObserver();

  if (!(panel instanceof Element)) {
    observedPanel = null;
    return;
  }

  observedPanel = panel;
  panelObserver = new MutationObserver(dispatchMutations);

  panelObserver.observe(panel, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      'class',
      'style',
      'aria-hidden',
      'data-emzk-lite-badge-target',
    ],
  });
}

function disconnectObservers() {
  panelObserverRefreshScheduler.stop();

  if (bodyObserver) {
    bodyObserver.disconnect();
    bodyObserver = null;
  }

  disconnectPanelObserver();
}

function disconnectPanelObserver() {
  if (panelObserver) {
    panelObserver.disconnect();
    panelObserver = null;
  }

  observedPanel = null;
}

function dispatchMutations(mutations) {
  listeners.forEach((listener) => {
    try {
      listener(mutations);
    } catch (error) {
      console.error(
        '[Emozzk Lite] failed to handle panel DOM mutations:',
        error
      );
    }
  });
}
