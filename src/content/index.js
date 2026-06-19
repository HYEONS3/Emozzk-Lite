import { attachShortcutController } from './shortcut-controller.js';
import { startBadgeOverlay } from './badge-overlay.js';

console.debug('[Emozzk Lite] content script loaded');

attachShortcutController();
startBadgeOverlay();