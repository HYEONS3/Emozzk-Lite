import {
  attachShortcutController,
} from './shortcut-controller.js';

import {
  startBadgeOverlay,
} from './badge-overlay.js';

import {
  attachEmoteFavoriteEvents,
} from './emote-favorites-events.js';

import {
  attachEmoteClickFocusRestore,
} from './emote-click-focus.js';

console.debug('[Emozzk Lite] content script loaded');

attachShortcutController();
startBadgeOverlay();

// 중요:
// Alt+클릭을 일반 이모티콘 입력보다 먼저 가로채야 하므로
// favorite events를 click focus restore보다 먼저 등록한다.
attachEmoteFavoriteEvents();
attachEmoteClickFocusRestore();