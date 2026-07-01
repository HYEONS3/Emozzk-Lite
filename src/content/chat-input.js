const QUICK_EMOTE_INPUT_READY_TIMEOUT_MS = 240;
const QUICK_EMOTE_CLEANUP_DELAY_MS = 40;

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

/*
 * 단축키 이모티콘 삽입 전용.
 *
 * CHZZK 입력창은 상황에 따라 textarea와 pre[contenteditable]를 오간다.
 * 단축키 삽입에서는 원본 이모티콘 button.click() 전에 입력창을 가능한 한
 * rich input 쪽으로 준비하고 caret을 끝으로 둔다.
 */
export async function prepareChatInputForQuickEmoteInsert() {
  const currentEditable = findChatContentEditableInput();

  if (currentEditable) {
    focusElement(currentEditable);
    moveContentEditableCaretToEnd(currentEditable);

    await waitAnimationFrame();

    const settledEditable = findChatContentEditableInput() || currentEditable;

    if (!settledEditable.isConnected) {
      return false;
    }

    focusElement(settledEditable);
    moveContentEditableCaretToEnd(settledEditable);

    return isFocused(settledEditable);
  }

  const input = findChatInput();

  if (!input) {
    console.debug('[Emozzk Lite] chat input not found for quick insert prepare');
    return false;
  }

  focusElement(input);
  moveCaretToEnd(input);

  const editable = await waitForChatContentEditableInput(
    QUICK_EMOTE_INPUT_READY_TIMEOUT_MS
  );

  /*
   * CHZZK가 textarea 상태를 유지하는 상황도 있으므로
   * contenteditable을 못 찾았다고 즉시 실패 처리하지 않는다.
   */
  if (!editable) {
    return isFocused(input);
  }

  focusElement(editable);
  moveContentEditableCaretToEnd(editable);

  await waitAnimationFrame();

  const settledEditable = findChatContentEditableInput() || editable;

  if (!settledEditable.isConnected) {
    return false;
  }

  focusElement(settledEditable);
  moveContentEditableCaretToEnd(settledEditable);

  return isFocused(settledEditable);
}

/*
 * 단축키 이모티콘 click 전 cleanup.
 *
 * 텍스트를 입력했다가 Backspace로 모두 지우면 CHZZK 입력창이
 * 아래처럼 technical filler <br>만 가진 상태가 될 수 있다.
 *
 *   <pre contenteditable="true"><br></pre>
 *
 * 이 상태에서 이모티콘을 넣으면 CHZZK가 기존 <br>을 빈 값으로 보지 않고
 * <br> 뒤에 img를 붙여 개행처럼 보이게 만든다.
 */
export function cleanupQuickInsertInputBeforeClick() {
  const input = findChatContentEditableInput();

  if (!input) {
    return false;
  }

  const changed = removeTechnicalEmptyBreaks(input);

  if (changed) {
    dispatchInputEvent(input);
  }

  focusElement(input);
  moveContentEditableCaretToEnd(input);

  return changed;
}

/*
 * 단축키 이모티콘 click 후 cleanup.
 *
 * 이모티콘 삽입 후 아래처럼 되면 선두 technical <br>을 제거한다.
 *
 *   <br><img ...>
 *   <br><br><img ...>
 */
export function scheduleQuickInsertInputCleanupAfterClick() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        cleanupQuickInsertInputAfterClick();
      }, QUICK_EMOTE_CLEANUP_DELAY_MS);
    });
  });
}

export function scheduleChatInputFocusEndAfterQuickInsert() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const input = findChatContentEditableInput();

      if (input) {
        focusElement(input);
        moveContentEditableCaretToEnd(input);
        return;
      }

      focusChatInputAtEnd();
    });
  });
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

export function focusChatInputAfterEmote() {
  /*
   * 기존 이름 호환용.
   * 여기서는 contenteditable DOM normalize나 <br> 제거를 하지 않는다.
   */
  const input = findChatInput();

  if (!input) {
    console.debug('[Emozzk Lite] chat input not found after emote');
    return false;
  }

  focusElement(input);
  moveCaretToEnd(input);

  return isFocused(input);
}

function cleanupQuickInsertInputAfterClick() {
  const input = findChatContentEditableInput();

  if (!input) {
    return false;
  }

  const changed = removeLeadingBreaksBeforeMeaningfulContent(input);

  if (changed) {
    dispatchInputEvent(input);
  }

  focusElement(input);
  moveContentEditableCaretToEnd(input);

  return changed;
}

function removeTechnicalEmptyBreaks(root) {
  /*
   * 의미 있는 내용이 없을 때만 제거한다.
   *
   * 대상:
   *   <br>
   *   <br><br>
   *   #text("")<br>
   *
   * 비대상:
   *   <br><img ...>
   *   <br>text
   */
  if (hasMeaningfulContent(root)) {
    return false;
  }

  let changed = false;

  while (root.firstChild) {
    const first = root.firstChild;

    if (first instanceof HTMLBRElement || isEmptyTextNode(first)) {
      first.remove();
      changed = true;
      continue;
    }

    break;
  }

  return changed;
}

function removeLeadingBreaksBeforeMeaningfulContent(root) {
  /*
   * 의미 있는 내용이 뒤에 있을 때만 선두 <br>/빈 텍스트를 제거한다.
   *
   * 대상:
   *   <br><img ...>
   *   <br><br><img ...>
   *   #text("")<br><img ...>
   *
   * 비대상:
   *   <br>
   *   <br><br>
   */
  if (!hasMeaningfulContent(root)) {
    return false;
  }

  let changed = false;

  while (root.firstChild) {
    const first = root.firstChild;

    if (first instanceof HTMLBRElement || isEmptyTextNode(first)) {
      first.remove();
      changed = true;
      continue;
    }

    break;
  }

  return changed;
}

function hasMeaningfulContent(root) {
  for (const node of root.childNodes) {
    if (isMeaningfulNode(node)) {
      return true;
    }
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

function isEmptyTextNode(node) {
  return (
    node.nodeType === Node.TEXT_NODE &&
    isEmptyText(node.textContent)
  );
}

function isEmptyText(value) {
  return String(value ?? '')
    .replace(/\u200B/g, '')
    .replace(/\u00A0/g, ' ')
    .trim() === '';
}

function dispatchInputEvent(element) {
  try {
    element.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      cancelable: false,
      inputType: 'deleteContentBackward',
      data: null,
    }));
  } catch {
    element.dispatchEvent(new Event('input', {
      bubbles: true,
      cancelable: false,
    }));
  }
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

function findChatContentEditableInput() {
  const active = document.activeElement;

  if (
    isEditableElement(active) &&
    isVisible(active)
  ) {
    return active;
  }

  const candidates = getChatInputCandidates();

  return candidates
    .filter((element) => {
      return (
        isEditableElement(element) &&
        isVisible(element) &&
        isLikelyChatContentEditableInput(element)
      );
    })
    .sort(compareChatInputPriority)[0] ?? null;
}

function isLikelyChatContentEditableInput(element) {
  if (!isEditableElement(element)) {
    return false;
  }

  const name = getInputName(element);

  if (/채팅|chat/i.test(name)) {
    return true;
  }

  if (document.activeElement === element) {
    return true;
  }

  if (
    element.matches?.('pre') &&
    element.closest?.('[id="aside-chatting"], [class*="chat"], [class*="Chat"]')
  ) {
    return true;
  }

  return false;
}

async function waitForChatContentEditableInput(timeoutMs) {
  const startedAt = performance.now();

  while (performance.now() - startedAt <= timeoutMs) {
    const input = findChatContentEditableInput();

    if (input) {
      return input;
    }

    await waitAnimationFrame();
  }

  return null;
}

function waitAnimationFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
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
    style.visibility !== 'hidden' &&
    style.visibility !== 'collapse' &&
    Number.parseFloat(style.opacity || '1') > 0
  );
}