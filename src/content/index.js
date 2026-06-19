import { attachShortcutController } from './shortcut-controller.js';
import { startBadgeOverlay } from './badge-overlay.js';
import { attachEmoteClickFocusRestore } from './emote-click-focus.js';

console.debug('[Emozzk Lite] content script loaded');

attachShortcutController();
startBadgeOverlay();
attachEmoteClickFocusRestore();