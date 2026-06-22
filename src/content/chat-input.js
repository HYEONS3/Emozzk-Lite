export function findChatInput() {
  const active = document.activeElement;

  if (isLikelyChatInput(active)) {
    return active;
  }

  const candidates = getChatInputCandidates();

  return candidates
    .filter(isLikelyChatInput)
    .sort(compareChatInputPriority)[0] ?? null;
}

export function focusChatInput() {
  const input = findChatInput();

  if (!input) {
    console.debug('[Emozzk Lite] chat input not found for focus');
    return false;
  }

  focusElement(input);

  return isFocused(input);
}

export function focusChatInputAtEnd() {
  const input = findChatInput();

  if (!input) {
    console.debug('[Emozzk Lite] chat input not found for caret');
    return false;
  }

  focusElement(input);
  moveCaretToEnd(input);

  return isFocused(input);
}

export function scheduleChatInputFocus() {
  requestAnimationFrame(() => {
    focusChatInput();
  });
}

export function scheduleChatInputFocusEnd() {
  requestAnimationFrame(() => {
    focusChatInputAtEnd();
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

export function normalizeChatInputAfterEmote() {
  const input = findChatInput();

  if (!input) {
    console.debug('[Emozzk Lite] chat input not found for normalize');
    return false;
  }

  focusElement(input);

  if (isEditableElement(input)) {
    removeLeadingFillerBreak(input);
  }

  moveCaretToEnd(input);

  return isFocused(input);
}

export function scheduleChatInputNormalizeAfterEmote() {
  requestAnimationFrame(() => {
    normalizeChatInputAfterEmote();
  });
}

export function scheduleChatInputNormalizeAfterEmoteSettle() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      normalizeChatInputAfterEmote();
    });
  });
}

function getChatInputCandidates() {
  return Array.from(
    document.querySelectorAll([
      'textarea',
      'input',
      '[contenteditable="true"]',
      '[contenteditable="plaintext-only"]',
      '[role="textbox"]',
    ].join(', '))
  );
}

function isLikelyChatInput(element) {
  if (!(element instanceof HTMLElement)) return false;
  if (!isVisible(element)) return false;
  if (!isEditableInputLikeElement(element)) return false;

  const name = getInputName(element);

  if (/채팅|chat/i.test(name)) {
    return true;
  }

  /*
   * CHZZK 입력창의 accessible name이 바뀌는 경우를 대비한 fallback.
   * contenteditable/role=textbox이고, 실제로 포커스된 상태라면 채팅 입력창으로 본다.
   */
  if (
    document.activeElement === element &&
    (
      isEditableElement(element) ||
      element.getAttribute('role') === 'textbox'
    )
  ) {
    return true;
  }

  return false;
}

function isEditableInputLikeElement(element) {
  return (
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLInputElement ||
    isEditableElement(element) ||
    element.getAttribute('role') === 'textbox'
  );
}

function isEditableElement(element) {
  return (
    element instanceof HTMLElement &&
    element.isContentEditable
  );
}

function getInputName(element) {
  return [
    element.getAttribute('placeholder'),
    element.getAttribute('aria-label'),
    element.getAttribute('title'),
    element.getAttribute('data-placeholder'),
    element.textContent,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compareChatInputPriority(a, b) {
  return getChatInputPriority(b) - getChatInputPriority(a);
}

function getChatInputPriority(element) {
  let score = 0;

  if (document.activeElement === element) {
    score += 100;
  }

  if (isEditableElement(element)) {
    score += 30;
  }

  if (element.getAttribute('role') === 'textbox') {
    score += 20;
  }

  if (element instanceof HTMLTextAreaElement) {
    score += 15;
  }

  if (/채팅|chat/i.test(getInputName(element))) {
    score += 50;
  }

  const rect = element.getBoundingClientRect();

  /*
   * 채팅 입력창은 보통 화면 하단에 있으므로 약한 보정만 둔다.
   * 절대 조건으로 쓰지 않는다.
   */
  if (rect.top > window.innerHeight * 0.4) {
    score += 5;
  }

  return score;
}

function focusElement(element) {
  try {
    element.focus({
      preventScroll: true,
    });
  } catch {
    element.focus();
  }
}

function isFocused(element) {
  return (
    document.activeElement === element ||
    element.contains?.(document.activeElement)
  );
}

function moveCaretToEnd(input) {
  if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
    moveTextControlCaretToEnd(input);
    return;
  }

  if (isEditableElement(input)) {
    moveContentEditableCaretToEnd(input);
  }
}

function moveTextControlCaretToEnd(input) {
  if (typeof input.setSelectionRange !== 'function') return;

  const length = input.value.length;

  try {
    input.setSelectionRange(length, length);
  } catch {
    /*
     * 일부 input type은 setSelectionRange를 지원하지 않는다.
     */
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

function removeLeadingFillerBreak(root) {
  removeLeadingEmptyTextNodes(root);

  const first = root.firstChild;

  if (!(first instanceof HTMLBRElement)) return;

  /*
   * <br> 뒤에 실제 내용이 있을 때만 제거한다.
   * 완전히 빈 contenteditable의 placeholder용 <br>은 건드리지 않는다.
   */
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

function isVisible(element) {
  if (!(element instanceof Element)) {
    return false;
  }

  const rect = element.getBoundingClientRect();

  if (
    rect.width <= 0 ||
    rect.height <= 0 ||
    rect.bottom <= 0 ||
    rect.right <= 0 ||
    rect.top >= window.innerHeight ||
    rect.left >= window.innerWidth
  ) {
    return false;
  }

  const style = window.getComputedStyle(element);

  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0'
  );
}