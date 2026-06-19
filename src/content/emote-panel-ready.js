import {
  findEmotePanel,
} from './emote-panel.js';

import {
  getVisibleEmoteButtons,
} from './emote-buttons.js';

const DEFAULT_TIMEOUT_MS = 1200;

export function getReadyEmotePanelState() {
  const panel = findEmotePanel();

  if (!panel) {
    return null;
  }

  const area = panel.querySelector('#emoji_area');

  if (!area || !isVisibleElement(area)) {
    return null;
  }

  const buttons = getVisibleEmoteButtons(panel);

  if (!buttons.length) {
    return null;
  }

  return {
    panel,
    area,
    buttons,
  };
}

export function waitForEmotePanelReady({
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const ready = getReadyEmotePanelState();

  if (ready) {
    return waitForLayoutSettle().then(() => {
      return getReadyEmotePanelState();
    });
  }

  return new Promise((resolve) => {
    let done = false;
    let rafId = 0;
    let timeoutId = 0;
    let observer = null;

    const finish = (result) => {
      if (done) return;

      done = true;

      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }

      if (timeoutId) {
        window.clearTimeout(timeoutId);
        timeoutId = 0;
      }

      if (observer) {
        observer.disconnect();
        observer = null;
      }

      resolve(result);
    };

    const check = () => {
      if (done) return;

      const state = getReadyEmotePanelState();

      if (!state) return;

      waitForLayoutSettle().then(() => {
        if (done) return;

        finish(getReadyEmotePanelState());
      });
    };

    const scheduleCheck = () => {
      if (done || rafId) return;

      rafId = requestAnimationFrame(() => {
        rafId = 0;
        check();
      });
    };

    observer = new MutationObserver(() => {
      scheduleCheck();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'class',
        'style',
        'aria-hidden',
        'aria-modal',
      ],
    });

    timeoutId = window.setTimeout(() => {
      finish(null);
    }, timeoutMs);

    scheduleCheck();
  });
}

function waitForLayoutSettle() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });
}

function isVisibleElement(element) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0'
  );
}