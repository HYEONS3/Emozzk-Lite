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

export function attachShortcutController() {
  document.addEventListener('keydown', handleKeyDown, true);
}

function handleKeyDown(event) {
  if (event.defaultPrevented) return;
  if (event.isComposing) return;

  const panel = findEmotePanel();

  if (panel && isSelectCode(event.code)) {
    event.preventDefault();
    event.stopImmediatePropagation();

    clickVisibleEmoteByCode(event.code, panel);
    return;
  }

  const isTyping =
    isTypingTarget(event.target) ||
    isTypingTarget(document.activeElement);

  if (isTyping) return;
  if (event.ctrlKey || event.altKey || event.metaKey) return;

  if (event.code === 'KeyE') {
    event.preventDefault();
    event.stopImmediatePropagation();

    toggleEmotePanel();
  }
}