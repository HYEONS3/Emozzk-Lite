import {
  findChatInput,
} from './chat-input.js';

import {
  findEmotePanel,
} from './emote-panel.js';

export function openEmotePanel() {
  if (findEmotePanel()) {
    return true;
  }

  const trigger = findEmoteTriggerButton();

  if (!trigger) {
    console.debug('[Emozzk Lite] emote trigger not found');
    return false;
  }

  trigger.click();
  return true;
}

export function closeEmotePanel() {
  const panel = findEmotePanel();

  if (!panel) {
    return false;
  }

  const trigger = findEmoteTriggerButton();

  if (!trigger) {
    console.debug('[Emozzk Lite] emote trigger not found for close');
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

  const roots = getSearchRoots(input);

  for (const root of roots) {
    const trigger = findTriggerButtonInRoot({
      root,
      input,
      preferAfterInput: true,
    });

    if (trigger) {
      return trigger;
    }
  }

  for (const root of roots) {
    const trigger = findTriggerButtonInRoot({
      root,
      input,
      preferAfterInput: false,
    });

    if (trigger) {
      return trigger;
    }
  }

  return null;
}

function getSearchRoots(input) {
  const roots = [];
  let current = input.parentElement;

  while (current && current !== document.body) {
    roots.push(current);

    if (roots.length >= 8) {
      break;
    }

    current = current.parentElement;
  }

  return roots;
}

function findTriggerButtonInRoot({
  root,
  input,
  preferAfterInput,
}) {
  if (!(root instanceof Element)) {
    return null;
  }

  const buttons = Array.from(
    root.querySelectorAll('button[type="button"]')
  );

  const candidates = buttons.filter((button) => {
    if (!isEmoteTriggerButton(button)) return false;

    if (!preferAfterInput) return true;

    return isElementAfterInput({
      input,
      element: button,
    });
  });

  return candidates[0] ?? null;
}

function isElementAfterInput({
  input,
  element,
}) {
  if (!(input instanceof Node)) return false;
  if (!(element instanceof Node)) return false;

  const position = input.compareDocumentPosition(element);

  return Boolean(position & Node.DOCUMENT_POSITION_FOLLOWING);
}

function isEmoteTriggerButton(button) {
  if (!(button instanceof HTMLButtonElement)) return false;
  if (!isEnabledButton(button)) return false;
  if (!isVisible(button)) return false;

  return getElementNameCandidates(button)
    .some(isEmoteTriggerName);
}

function isEmoteTriggerName(name) {
  const normalized = normalizeName(name);

  if (!normalized) return false;

  return (
    normalized === '이모티콘' ||
    normalized === '이모티콘 열기' ||
    normalized === '이모티콘 닫기' ||
    /^이모티콘\s*(열기|닫기|선택)?$/.test(normalized)
  );
}

function getElementNameCandidates(element) {
  return [
    element.getAttribute('aria-label'),
    element.getAttribute('title'),
    element.textContent,
  ]
    .map(normalizeName)
    .filter(Boolean);
}

function normalizeName(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isEnabledButton(button) {
  return (
    !button.disabled &&
    button.getAttribute('aria-disabled') !== 'true'
  );
}

function isVisible(element) {
  if (!(element instanceof Element)) {
    return false;
  }

  if (!element.isConnected) {
    return false;
  }

  const rect = element.getBoundingClientRect();

  if (
    rect.width <= 0 ||
    rect.height <= 0
  ) {
    return false;
  }

  const style = window.getComputedStyle(element);

  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden'
  );
}