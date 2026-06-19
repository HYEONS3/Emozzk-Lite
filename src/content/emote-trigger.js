import { findChatInput } from './chat-input.js';

export function openEmotePanel() {
  const trigger = findEmoteTriggerButton();

  if (!trigger) {
    console.debug('[Emozzk Lite] emote trigger not found');
    return false;
  }

  console.debug('[Emozzk Lite] emote trigger:', trigger);

  trigger.click();
  return true;
}

function findEmoteTriggerButton() {
  const input = findChatInput();

  if (!input) {
    console.debug('[Emozzk Lite] chat input not found');
    return null;
  }

  const root = input.parentElement;
  if (!root) return null;

  const buttons = Array.from(root.querySelectorAll('button[type="button"]'));

  // 입력창 뒤에 있는 버튼만 본다.
  // 같은 parent 안에서 프로필 버튼은 textarea 앞에 있고,
  // 이모티콘 버튼은 textarea 뒤에 있음.
  const inputIndex = getChildIndex(input);

  const candidates = buttons.filter((button) => {
    return getChildIndex(button) > inputIndex;
  });

  return candidates.find(isEmoteTriggerButton) ?? null;
}

function isEmoteTriggerButton(button) {
  if (!isVisible(button)) return false;

  const name = getElementName(button);

  // 부분 일치보다 정확 일치 우선.
  // "내 사용중인 프로필 팝업" 같은 버튼 오검출 방지.
  if (name === '이모티콘') return true;

  return false;
}

function getElementName(element) {
  return [
    element.getAttribute('aria-label'),
    element.getAttribute('title'),
    element.textContent,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getChildIndex(element) {
  if (!element?.parentElement) return -1;

  return Array.from(element.parentElement.children).indexOf(element);
}

function isVisible(element) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth &&
    style.display !== 'none' &&
    style.visibility !== 'hidden'
  );
}