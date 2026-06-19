import { findChatInput } from './chat-input.js';

export function openEmotePanel() {
  const trigger = findEmoteTriggerButton();

  if (!trigger) {
    console.debug('[Emozzk Lite] emote trigger not found');
    return false;
  }

  trigger.click();
  return true;
}

export function toggleEmotePanel() {
  const trigger = findEmoteTriggerButton();

  if (!trigger) {
    console.debug('[Emozzk Lite] emote trigger not found');
    return false;
  }

  trigger.click();
  return true;
}

export function findEmoteTriggerButton() {
  const input = findChatInput();

  if (!input) {
    console.debug('[Emozzk Lite] chat input not found');
    return null;
  }

  const root = input.parentElement;
  if (!root) return null;

  const buttons = Array.from(root.querySelectorAll('button[type="button"]'));
  const inputIndex = getChildIndex(input);

  const candidates = buttons.filter((button) => {
    return getChildIndex(button) > inputIndex;
  });

  return candidates.find(isEmoteTriggerButton) ?? null;
}

function isEmoteTriggerButton(button) {
  if (!isVisible(button)) return false;

  const name = getElementName(button);

  return name === '이모티콘';
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