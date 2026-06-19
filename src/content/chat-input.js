export function findChatInput() {
  const candidates = Array.from(
    document.querySelectorAll('textarea, input, [contenteditable="true"], [role="textbox"]')
  );

  return candidates.find(isLikelyChatInput) ?? null;
}

export function focusChatInput() {
  const input = findChatInput();

  if (!input) {
    console.debug('[Emozzk Lite] chat input not found for focus');
    return false;
  }

  input.focus({
    preventScroll: true,
  });

  return document.activeElement === input;
}

export function focusChatInputAtEnd() {
  const input = findChatInput();

  if (!input) {
    console.debug('[Emozzk Lite] chat input not found for caret');
    return false;
  }

  input.focus({
    preventScroll: true,
  });

  moveCaretToEnd(input);

  return document.activeElement === input;
}

export function scheduleChatInputFocus() {
  requestAnimationFrame(() => {
    focusChatInput();
  });
}

export function scheduleChatInputFocusBurst() {
  [0, 30, 80, 150, 250].forEach((delay) => {
    window.setTimeout(() => {
      focusChatInput();
    }, delay);
  });
}

export function scheduleChatInputFocusEnd() {
  requestAnimationFrame(() => {
    focusChatInputAtEnd();
  });
}

export function scheduleChatInputFocusEndBurst() {
  [0, 30, 80, 150, 250].forEach((delay) => {
    window.setTimeout(() => {
      focusChatInputAtEnd();
    }, delay);
  });
}

export function scheduleChatInputFocusEndSoft() {
  requestAnimationFrame(() => {
    focusChatInputAtEnd();

    requestAnimationFrame(() => {
      focusChatInputAtEnd();
    });
  });
}

function isLikelyChatInput(element) {
  if (!element || !isVisible(element)) return false;

  const name = [
    element.getAttribute('placeholder'),
    element.getAttribute('aria-label'),
    element.getAttribute('title'),
  ]
    .filter(Boolean)
    .join(' ');

  if (!/채팅|chat/i.test(name)) {
    return false;
  }

  return (
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLInputElement ||
    element.isContentEditable ||
    element.getAttribute('role') === 'textbox'
  );
}

function moveCaretToEnd(input) {
  if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
    moveTextControlCaretToEnd(input);
    return;
  }

  if (input.isContentEditable) {
    moveContentEditableCaretToEnd(input);
  }
}

function moveTextControlCaretToEnd(input) {
  if (typeof input.setSelectionRange !== 'function') return;

  const length = input.value.length;

  try {
    input.setSelectionRange(length, length);
  } catch {
    // 일부 input type은 setSelectionRange를 지원하지 않음.
  }
}

function moveContentEditableCaretToEnd(element) {
  const selection = window.getSelection();

  if (!selection) return;

  const range = document.createRange();

  range.selectNodeContents(element);
  range.collapse(false);

  selection.removeAllRanges();
  selection.addRange(range);
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
    style.visibility !== 'hidden' &&
    style.opacity !== '0'
  );
}

export function normalizeChatInputAfterEmote() {
  const input = findChatInput();

  if (!input) {
    console.debug('[Emozzk Lite] chat input not found for normalize');
    return false;
  }

  input.focus({
    preventScroll: true,
  });

  if (input.isContentEditable) {
    removeLeadingFillerBreak(input);
  }

  moveCaretToEnd(input);

  return document.activeElement === input;
}

export function scheduleChatInputNormalizeAfterEmote() {
  requestAnimationFrame(() => {
    normalizeChatInputAfterEmote();
  });
}

export function scheduleChatInputNormalizeAfterEmoteBurst() {
  [0, 30, 80, 150].forEach((delay) => {
    window.setTimeout(() => {
      normalizeChatInputAfterEmote();
    }, delay);
  });
}

function removeLeadingFillerBreak(root) {
  removeLeadingEmptyTextNodes(root);

  const first = root.firstChild;

  if (!(first instanceof HTMLBRElement)) return;

  // <br> 뒤에 실제 내용이 있을 때만 제거한다.
  // 완전히 빈 contenteditable의 placeholder용 <br>은 건드리지 않음.
  if (!hasMeaningfulContentAfter(first)) return;

  first.remove();

  removeLeadingEmptyTextNodes(root);
}

function removeLeadingEmptyTextNodes(root) {
  while (
    root.firstChild &&
    root.firstChild.nodeType === Node.TEXT_NODE &&
    isEmptyText(root.firstChild.textContent)
  ) {
    root.firstChild.remove();
  }
}

function hasMeaningfulContentAfter(node) {
  let current = node.nextSibling;

  while (current) {
    if (isMeaningfulNode(current)) {
      return true;
    }

    current = current.nextSibling;
  }

  return false;
}

function isMeaningfulNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return !isEmptyText(node.textContent);
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }

  if (node instanceof HTMLBRElement) {
    return false;
  }

  return true;
}

function isEmptyText(value) {
  return String(value ?? '')
    .replace(/\u200B/g, '')
    .replace(/\u00A0/g, ' ')
    .trim() === '';
}