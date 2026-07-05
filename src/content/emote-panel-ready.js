import {
  getAssignableEmoteButtons,
} from './emote-buttons.js';

import {
  findEmotePanel,
} from './emote-panel.js';

const DEFAULT_READY_TIMEOUT_MS = 1200;

let pendingReadyPromise = null;

export function getReadyEmotePanelState() {
  const panel = findEmotePanel();

  if (!isUsablePanel(panel)) {
    return {
      panel: null,
      buttons: [],
      ready: false,
    };
  }

  const buttons = getReadyEmoteButtons(panel);

  return {
    panel,
    buttons,
    ready: buttons.length > 0,
  };
}

export function waitForEmotePanelReady({
  timeoutMs = DEFAULT_READY_TIMEOUT_MS,
} = {}) {
  if (pendingReadyPromise) {
    return pendingReadyPromise;
  }

  pendingReadyPromise = waitForReadyState({
    timeoutMs,
  })
    .finally(() => {
      pendingReadyPromise = null;
    });

  return pendingReadyPromise;
}

async function waitForReadyState({
  timeoutMs,
}) {
  const startedAt = performance.now();

  while (performance.now() - startedAt <= timeoutMs) {
    const readyState = getReadyEmotePanelState();

    if (readyState.ready) {
      return readyState;
    }

    await waitNextFrame();
  }

  return getReadyEmotePanelState();
}

function getReadyEmoteButtons(panel) {
  if (!isUsablePanel(panel)) {
    return [];
  }

  return getAssignableEmoteButtons(panel)
    .filter(isReadyEmoteButton);
}

function isReadyEmoteButton(button) {
  if (!(button instanceof HTMLElement)) {
    return false;
  }

  if (!button.isConnected) {
    return false;
  }

  if (button.disabled) {
    return false;
  }

  const rect = button.getBoundingClientRect();

  if (
    rect.width <= 0 ||
    rect.height <= 0
  ) {
    return false;
  }

  const image = button.querySelector('img');

  if (!(image instanceof HTMLImageElement)) {
    return false;
  }

  const alt = String(image.getAttribute('alt') || '').trim();

  return alt.startsWith('{:') && alt.endsWith(':}');
}

function isUsablePanel(panel) {
  if (!(panel instanceof Element)) {
    return false;
  }

  if (!panel.isConnected) {
    return false;
  }

  if (
    panel.hidden ||
    panel.getAttribute('aria-hidden') === 'true'
  ) {
    return false;
  }

  const rect = panel.getBoundingClientRect();

  return rect.width > 0 && rect.height > 0;
}

function waitNextFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(resolve);
  });
}