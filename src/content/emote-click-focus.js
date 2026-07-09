import {
  scheduleChatInputFocusEnd,
} from './chat-input.js';

import {
  isRealEmoteButton,
} from './emote-buttons.js';

import {
  isEmoteBindAssignMode,
  isEmoteBindClearMode,
} from './emote-bind-mode-state.js';

import {
  isQuickEmoteInsertInProgress,
} from './quick-emote-insert.js';

import {
  createEventListenerGroup,
} from './event-listener-group.js';

let attached = false;
const eventListeners = createEventListenerGroup();

export function attachEmoteClickFocusRestore() {
  if (attached) return;

  attached = true;

  /*
   * 사용자 직접 클릭에는 focus restore를 걸지 않는다.
   *
   * 이유:
   * CHZZK 기본 동작은 이모티콘 패널 쪽 조작 흐름을 유지한다.
   * 여기서 채팅창으로 focus를 보내면 사용자가 클릭 / Enter 등으로
   * 이모티콘을 연속 입력하려던 흐름이 채팅 전송으로 바뀔 수 있다.
   */
  eventListeners.add(document, 'click', handleEmoteClick, false);
}

export function detachEmoteClickFocusRestore() {
  if (!attached) return;

  attached = false;

  eventListeners.removeAll();
}

function handleEmoteClick(event) {
  if (!attached) return;
  if (isEmoteBindInteractionModeActive()) return;
  if (isFavoriteToggleEvent(event)) return;

  const button = getRealEmoteButtonFromEvent(event);

  if (!button) return;

  /*
   * 직접 마우스로 누른 이모티콘은 CHZZK 기본 UX를 그대로 둔다.
   * 단축키 삽입 과정에서 발생한 programmatic click만 normalize한다.
   */
  if (!isQuickEmoteInsertInProgress()) {
    return;
  }

  scheduleChatInputFocusEnd();
}

function isEmoteBindInteractionModeActive() {
  return (
    isEmoteBindAssignMode() ||
    isEmoteBindClearMode()
  );
}

function getRealEmoteButtonFromEvent(event) {
  const target = event.target;

  if (!(target instanceof Element)) return null;

  const button = target.closest('button[type="button"]');

  if (!button) return null;
  if (!isRealEmoteButton(button)) return null;

  return button;
}

function isFavoriteToggleEvent(event) {
  return (
    event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey
  );
}
