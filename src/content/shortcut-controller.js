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

export function attachShortcutController() {
  document.addEventListener('keydown', handleKeyDown, true);
}

function handleKeyDown(event) {
  if (event.defaultPrevented) return;
  if (event.isComposing) return;

  const panel = findEmotePanel();

  // 패널이 열린 상태에서는 F1~F10을 먼저 처리한다.
  // 채팅 입력창에 focus가 남아 있어도 이모티콘 선택은 동작해야 함.
  if (panel && isSelectCode(event.code)) {
    event.preventDefault();
    event.stopImmediatePropagation();

    clickVisibleEmoteByCode(event.code, panel);
    scheduleBadgeUpdate();
    return;
  }

  const isTyping =
    isTypingTarget(event.target) ||
    isTypingTarget(document.activeElement);

  // 채팅 입력 중에는 KeyE를 절대 처리하지 않는다.
  // 한글 ㄷ도 물리 키 기준 KeyE라서 여기서 막아야 함.
  if (isTyping) return;

  if (event.ctrlKey || event.altKey || event.metaKey) return;

  if (event.code === 'KeyE') {
    event.preventDefault();
    event.stopImmediatePropagation();

    toggleEmotePanel();

    // 패널 DOM이 React/portal로 늦게 생기므로 burst 갱신 필요.
    scheduleBadgeUpdateBurst();
  }
}