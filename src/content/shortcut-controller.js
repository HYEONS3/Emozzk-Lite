import { shouldIgnoreShortcut } from './shortcut-guard.js';
import { openEmotePanel } from './emote-trigger.js';

export function attachShortcutController() {
  document.addEventListener('keydown', handleKeyDown, true);
}

function handleKeyDown(event) {
  if (shouldIgnoreShortcut(event)) return;

  if (event.code !== 'KeyE') return;

  event.preventDefault();
  openEmotePanel();
}