import {
  getAssignableEmoteButtons,
  getEmoteIdFromButton,
  getEmoteLabelFromButton,
  isRealEmoteButton,
} from './emote-buttons.js';

import {
  isTypingTarget,
} from './shortcut-guard.js';

import {
  findEmotePanel,
} from './emote-panel.js';

import {
  scheduleBadgeUpdate,
} from './badge-overlay.js';

import {
  scheduleFavoriteEmoteSectionRender,
} from './emote-favorites-render.js';

import {
  EMOTE_BIND_MODE_CHANGED_EVENT,
  exitEmoteBindMode,
  isEmoteBindAssignMode,
  isEmoteBindClearMode,
  isEmoteBindKeyListening,
  selectEmoteBindTarget,
  setEmoteBindCode,
  startEmoteBindKeyListening,
  toggleEmoteBindClearSelection,
} from './emote-bind-mode-state.js';

import {
  findShortcutBadgeAssignmentByEmojiId,
} from './shortcut-badge-map.js';

import {
  getShortcutCodeFromKeyboardEvent,
  isImeKeyboardEvent,
} from '../shared/shortcut-key-code.js';

const BADGE_CLASS = 'emzk-lite-badge';

let attached = false;
let observer = null;
let boundaryCheckRafId = 0;
let bindModePanelSignature = '';

export function attachEmoteBindEvents() {
  if (attached) return;

  attached = true;

  document.addEventListener('pointerdown', handleBindModePointerDown, true);
  document.addEventListener('dragstart', handleBindModeDragStart, true);

  document.addEventListener('click', handleBindModeClick, true);
  document.addEventListener('keydown', handleBindModeKeyDown, true);

  window.addEventListener(
    EMOTE_BIND_MODE_CHANGED_EVENT,
    handleBindModeChanged
  );

  startBindBoundaryObserver();
}

export function detachEmoteBindEvents() {
  if (!attached) return;

  attached = false;

  document.removeEventListener('pointerdown', handleBindModePointerDown, true);
  document.removeEventListener('dragstart', handleBindModeDragStart, true);

  document.removeEventListener('click', handleBindModeClick, true);
  document.removeEventListener('keydown', handleBindModeKeyDown, true);

  window.removeEventListener(
    EMOTE_BIND_MODE_CHANGED_EVENT,
    handleBindModeChanged
  );

  stopBindBoundaryObserver();

  if (boundaryCheckRafId) {
    cancelAnimationFrame(boundaryCheckRafId);
    boundaryCheckRafId = 0;
  }

  bindModePanelSignature = '';
}

function handleBindModePointerDown(event) {
	if (
		isEmoteBindInteractionModeActive() &&
		isTypingTarget(event.target)
	) {
    exitCurrentBindMode();
    return;
  }

  if (!isEmoteBindClearMode()) {
    return;
  }

  if (isBadgeEvent(event)) {
    blockEvent(event);
  }
}

function handleBindModeDragStart(event) {
  if (!isEmoteBindClearMode()) {
    return;
  }

  blockEvent(event);
}

function handleBindModeClick(event) {
	if (!isEmoteBindInteractionModeActive()) {
		return;
	}

  if (isBadgeEvent(event)) {
    blockEvent(event);
    return;
  }

  const button = findEmoteButtonFromEvent(event);

  if (!button) {
    return;
  }

  blockEvent(event);

  handleBindModeEmoteButtonClick(button);
}

function handleBindModeKeyDown(event) {
	if (!isEmoteBindInteractionModeActive()) {
		return;
	}

  if (shouldIgnoreBindControlKeyDown(event)) {
    return;
  }

  if (isEmoteBindKeyListening()) {
    handleKeyListeningKeyDown(event);
    return;
  }

  if (
    event.code === 'Escape' &&
    !hasAnyModifier(event)
  ) {
    blockEvent(event);
    exitCurrentBindMode();

    return;
  }

  if (shouldBlockBindModeKeyDown(event)) {
    blockEvent(event);
  }
}

function handleKeyListeningKeyDown(event) {
  if (
    event.code === 'Escape' &&
    !hasAnyModifier(event)
  ) {
    blockEvent(event);
    exitCurrentBindMode();
    return;
  }

  if (shouldRejectBindShortcutKey(event)) {
    blockEvent(event);
    return;
  }

  const shortcutCode = getShortcutCodeFromKeyboardEvent(event);

  if (!shortcutCode) {
    if (!isModifierOnlyCode(event.code)) {
      blockEvent(event);
    }

    return;
  }

  blockEvent(event);

  setEmoteBindCode(shortcutCode);

  scheduleFavoriteEmoteSectionRender();
  scheduleBadgeUpdate();
}

function handleBindModeEmoteButtonClick(button) {
  const emojiId = getEmoteIdFromButton(button);

  if (!emojiId) {
    return;
  }

  if (isEmoteBindAssignMode()) {
    handleAssignModeClick({
      button,
      emojiId,
    });

    return;
  }

  if (isEmoteBindClearMode()) {
    handleClearModeClick({
      emojiId,
    });
  }
}

function handleAssignModeClick({
  button,
  emojiId,
}) {
  const emojiLabel = getEmoteLabelFromButton(button) || emojiId;
  const emojiImageUrl = getEmoteImageUrlFromButton(button);

  selectEmoteBindTarget({
    emojiId,
    emojiLabel,
    emojiImageUrl,
  });

  startEmoteBindKeyListening();

  scheduleFavoriteEmoteSectionRender();
  scheduleBadgeUpdate();
}

function handleClearModeClick({
  emojiId,
}) {
  if (!canSelectClearEmojiId(emojiId)) {
    return;
  }

  toggleEmoteBindClearSelection(emojiId);

  scheduleFavoriteEmoteSectionRender();
  scheduleBadgeUpdate();
}

function canSelectClearEmojiId(emojiId) {
  if (!emojiId) {
    return false;
  }

  const panel = findEmotePanel();

  if (!panel) {
    return false;
  }

  const assignment = findShortcutBadgeAssignmentByEmojiId({
    emojiId,
    panel,
  });

  return Boolean(assignment);
}

function handleBindModeChanged() {
	if (!isEmoteBindInteractionModeActive()) {
		bindModePanelSignature = '';
		return;
	}

  scheduleBindBoundaryCheck({
    resetSignatureIfEmpty: false,
  });
}

function startBindBoundaryObserver() {
  if (observer) return;
  if (!document.body) return;

  observer = new MutationObserver(() => {
    if (!isEmoteBindInteractionModeActive()) {
      return;
    }

    scheduleBindBoundaryCheck({
      resetSignatureIfEmpty: false,
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      'class',
      'style',
      'aria-hidden',
      'hidden',
    ],
  });
}

function stopBindBoundaryObserver() {
  if (!observer) return;

  observer.disconnect();
  observer = null;
}

function scheduleBindBoundaryCheck({
  resetSignatureIfEmpty = false,
} = {}) {
  if (boundaryCheckRafId) return;

  boundaryCheckRafId = requestAnimationFrame(() => {
    boundaryCheckRafId = 0;

    checkBindModeBoundary({
      resetSignatureIfEmpty,
    });
  });
}

function checkBindModeBoundary({
  resetSignatureIfEmpty = false,
} = {}) {
	if (!isEmoteBindInteractionModeActive()) {
		bindModePanelSignature = '';
		return;
	}
  const panel = findEmotePanel();

  if (!panel || !isPanelVisible(panel)) {
    exitCurrentBindMode();
    return;
  }

  const signature = getPanelEmoteSignature(panel);

  if (!signature) {
    if (resetSignatureIfEmpty) {
      bindModePanelSignature = '';
    }

    return;
  }

  if (!bindModePanelSignature) {
    bindModePanelSignature = signature;
    return;
  }

  if (bindModePanelSignature !== signature) {
    exitCurrentBindMode();
  }
}

function getPanelEmoteSignature(panel) {
  const ids = new Set();

  getAssignableEmoteButtons(panel)
    .map(getEmoteIdFromButton)
    .filter(Boolean)
    .forEach((emojiId) => {
      ids.add(emojiId);
    });

  return Array.from(ids)
    .sort()
    .join('|');
}

function exitCurrentBindMode() {
  exitEmoteBindMode();

  bindModePanelSignature = '';

  scheduleFavoriteEmoteSectionRender();
  scheduleBadgeUpdate();
}

function findEmoteButtonFromEvent(event) {
  const element = getElementFromTarget(event.target);

  if (!element) {
    return null;
  }

  if (element.closest(`.${BADGE_CLASS}`)) {
    return null;
  }

  return findEmoteButtonFromElement(element);
}

function findEmoteButtonFromElement(element) {
  if (!(element instanceof Element)) {
    return null;
  }

  const button = element.closest('button[type="button"]');

  if (!button) {
    return null;
  }

  const panel = findEmotePanel();

  if (!panel || !panel.contains(button)) {
    return null;
  }

  if (!isRealEmoteButton(button)) {
    return null;
  }

  return button;
}

function getElementFromTarget(target) {
  if (!target) {
    return null;
  }

  if (target instanceof Element) {
    return target;
  }

  if (target instanceof Node) {
    return target.parentElement;
  }

  return null;
}

function getEmoteImageUrlFromButton(button) {
  const image = button?.querySelector?.('img');

  return image?.currentSrc || image?.src || '';
}

function isBadgeEvent(event) {
  const element = getElementFromTarget(event.target);

  return Boolean(element?.closest?.(`.${BADGE_CLASS}`));
}

function isPanelVisible(panel) {
  if (!(panel instanceof Element)) {
    return false;
  }

  if (!panel.isConnected) {
    return false;
  }

  if (
    panel.hidden ||
    panel.getAttribute('aria-hidden') === 'true'
  ) {
    return false;
  }

  const rect = panel.getBoundingClientRect();

  return rect.width > 0 && rect.height > 0;
}

function isEmoteBindInteractionModeActive() {
  return (
    isEmoteBindAssignMode() ||
    isEmoteBindClearMode()
  );
}

function shouldRejectBindShortcutKey(event) {
  if (isImeKeyboardEvent(event)) {
    return true;
  }

  if (
    event.code === 'Space' ||
    event.code === 'Enter'
  ) {
    return true;
  }

  return false;
}

function shouldBlockBindModeKeyDown(event) {
  if (isImeKeyboardEvent(event)) {
    return false;
  }

  if (
    event.ctrlKey ||
    event.altKey ||
    event.metaKey
  ) {
    return false;
  }

  if (isModifierOnlyCode(event.code)) {
    return false;
  }

  return true;
}

function shouldIgnoreBindControlKeyDown(event) {
  const element = getElementFromTarget(event.target);

  if (!element) {
    return false;
  }

  const control = element.closest('button, [role="button"], [role="group"]');

  if (!control) {
    return false;
  }

  const panel = findEmotePanel();

  if (!panel || !panel.contains(control)) {
    return false;
  }

  /*
   * 실제 이모티콘 버튼은 무시 대상이 아니다.
   * 여기서 무시해야 하는 건 phase/save/cancel/set switch 같은 bind UI 컨트롤이다.
   */
  if (
    control instanceof HTMLButtonElement &&
    isRealEmoteButton(control)
  ) {
    return false;
  }

  return true;
}

function blockEvent(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
}

function hasAnyModifier(event) {
  return (
    event.ctrlKey ||
    event.altKey ||
    event.metaKey ||
    event.shiftKey
  );
}


function isModifierOnlyCode(code) {
  return (
    code === 'ShiftLeft' ||
    code === 'ShiftRight' ||

    code === 'ControlLeft' ||
    code === 'ControlRight' ||

    code === 'AltLeft' ||
    code === 'AltRight' ||

    code === 'MetaLeft' ||
    code === 'MetaRight'
  );
}