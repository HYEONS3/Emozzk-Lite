import {
  openEmotePanel,
} from './emote-trigger.js';

import {
  clickVisibleEmoteByCode,
} from './emote-buttons.js';

import {
  getReadyEmotePanelState,
  waitForEmotePanelReady,
} from './emote-panel-ready.js';

import {
  focusChatInputAtEnd,
  scheduleChatInputNormalizeAfterEmoteSettle,
} from './chat-input.js';

import {
  scheduleBadgeUpdate,
} from './badge-overlay.js';

let openingPromise = null;

export async function quickInsertEmoteByCode(code) {
  const readyState = getReadyEmotePanelState();

  if (readyState?.panel) {
    return insertEmoteFromPanel({
      code,
      panel: readyState.panel,
    });
  }

  const readyPanel = await ensureEmotePanelReady();

  if (!readyPanel) {
    console.debug('[Emozzk Lite] emote panel not ready for quick insert');
    return false;
  }

  return insertEmoteFromPanel({
    code,
    panel: readyPanel,
  });
}

async function ensureEmotePanelReady() {
  if (!openingPromise) {
    const opened = openEmotePanel();

    if (!opened) {
      return null;
    }

    openingPromise = waitForEmotePanelReady()
      .then((readyState) => {
        return readyState?.panel ?? null;
      })
      .finally(() => {
        openingPromise = null;
      });
  }

  return openingPromise;
}

function insertEmoteFromPanel({
  code,
  panel,
}) {
  focusChatInputAtEnd();

  const clicked = clickVisibleEmoteByCode(code, panel);

  if (!clicked) {
    console.debug('[Emozzk Lite] quick insert target not found:', code);
    return false;
  }

  scheduleChatInputNormalizeAfterEmoteSettle();
  scheduleBadgeUpdate();

  return true;
}