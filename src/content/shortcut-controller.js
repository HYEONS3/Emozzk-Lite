import {
  isTypingTarget,
} from './shortcut-guard.js';

import {
  toggleEmotePanel,
} from './emote-trigger.js';

import {
  findEmotePanel,
} from './emote-panel.js';

import {
  isSelectCode,
  clickVisibleEmoteByCode,
} from './emote-buttons.js';

import {
  scheduleBadgeUpdate,
  scheduleBadgeUpdateBurst,
} from './badge-overlay.js';

import {
  scheduleChatInputFocusBurst,
  scheduleChatInputNormalizeAfterEmoteBurst,
} from './chat-input.js';

export function attachShortcutController() {
  document.addEventListener('keydown', handleKeyDown, true);
}

function handleKeyDown(event) {
  if (event.defaultPrevented) return;
  if (event.isComposing) return;

  const hasModifier =
    event.ctrlKey ||
    event.altKey ||
    event.metaKey ||
    event.shiftKey;

  const panel = findEmotePanel();

  if (panel && isSelectCode(event.code) && !hasModifier) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const clicked = clickVisibleEmoteByCode(event.code, panel);

    if (clicked) {
      scheduleChatInputNormalizeAfterEmoteBurst();
      scheduleBadgeUpdate();
    }

    return;
  }

  const isTyping =
    isTypingTarget(event.target) ||
    isTypingTarget(document.activeElement);

  if (isTyping) return;
  if (hasModifier) return;

  if (event.code === 'KeyE') {
    event.preventDefault();
    event.stopImmediatePropagation();

    toggleEmotePanel();

    scheduleChatInputFocusBurst();
    scheduleBadgeUpdateBurst();
  }
}