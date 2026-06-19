import {
  isTypingTarget,
} from './shortcut-guard.js';

import {
  openEmotePanel,
} from './emote-trigger.js';

import {
  findEmotePanel,
} from './emote-panel.js';

import {
  isSelectCode,
} from './emote-buttons.js';

import {
  scheduleBadgeUpdate,
} from './badge-overlay.js';

import {
  scheduleChatInputFocus,
} from './chat-input.js';

import {
  waitForEmotePanelReady,
} from './emote-panel-ready.js';

import {
  quickInsertEmoteByCode,
} from './quick-emote-insert.js';

export function attachShortcutController() {
  document.addEventListener('keydown', handleKeyDown, true);
}

function handleKeyDown(event) {
  if (event.defaultPrevented) return;
  if (event.isComposing) return;
  if (event.repeat) return;

  const hasModifier =
    event.ctrlKey ||
    event.altKey ||
    event.metaKey ||
    event.shiftKey;

  const panel = findEmotePanel();

  const isTyping =
    isTypingTarget(event.target) ||
    isTypingTarget(document.activeElement);

  const isEmoteSelectShortcut =
    isSelectCode(event.code) &&
    !hasModifier &&
    (panel || isTyping);

  if (isEmoteSelectShortcut) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    quickInsertEmoteByCode(event.code);
    return;
  }

  if (isTyping) return;
  if (hasModifier) return;

  if (event.code === 'KeyE') {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    openPanelFromShortcut();
  }
}

function openPanelFromShortcut() {
  const opened = openEmotePanel();

  if (!opened) return;

  scheduleChatInputFocus();

  waitForEmotePanelReady()
    .then((readyState) => {
      if (!readyState) return;

      scheduleChatInputFocus();
      scheduleBadgeUpdate();
    });
}