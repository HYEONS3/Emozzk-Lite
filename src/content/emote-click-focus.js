import {
  focusChatInput,
  scheduleChatInputNormalizeAfterEmote,
} from './chat-input.js';

export function attachEmoteClickFocusRestore() {
  document.addEventListener('mousedown', handleEmoteMouseDown, true);
  document.addEventListener('click', handleEmoteClick, false);
}

function handleEmoteMouseDown(event) {
  const button = getRealEmoteButtonFromEvent(event);

  if (!button) return;

  // 버튼으로 focus가 이동하는 것만 막는다.
  // click 자체는 막지 않는다.
  event.preventDefault();

  // 여기서는 caret을 맨 뒤로 보내지 않는다.
  // pre contenteditable에서 불필요한 <br> 생성 가능성을 줄이기 위함.
  focusChatInput();
}

function handleEmoteClick(event) {
  const button = getRealEmoteButtonFromEvent(event);

  if (!button) return;

  // CHZZK의 기본 이모티콘 삽입 click handler가 먼저 실행되게 둔다.
  // 그 직후 선두 filler <br> 정리 + caret 맨 뒤 이동.
  scheduleChatInputNormalizeAfterEmote();
}

function getRealEmoteButtonFromEvent(event) {
  const target = event.target;

  if (!(target instanceof Element)) return null;

  const button = target.closest('button[type="button"]');

  if (!button) return null;
  if (!isRealEmoteButton(button)) return null;

  return button;
}

function isRealEmoteButton(button) {
  const area = button.closest('#emoji_area');

  if (!area) return false;

  const item = button.closest('li[id^="emoji_"]');

  if (!item) return false;

  const image = button.querySelector('img');
  const alt = image?.getAttribute('alt') ?? '';

  return /^\{:[^:]+:\}$/.test(alt);
}