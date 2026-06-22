import {
  getAssignableEmoteButtons,
  getEmoteIdFromButton,
} from './emote-buttons.js';

import {
  findEmotePanel,
} from './emote-panel.js';

import {
  getShortcutBadgeAssignments,
} from './shortcut-badge-map.js';

import {
  renderEmoteBadges,
  clearEmoteBadges,
} from './badge-render.js';

import {
  EMOTE_BIND_MODE_CHANGED_EVENT,
  getEmoteBindModeState,
  isEmoteBindClearMode,
} from './emote-bind-mode-state.js';

import {
  SHORTCUT_BINDINGS_CHANGED_EVENT,
} from './shortcut-storage.js';

const BADGE_CLASS = 'emzk-lite-badge';
const BADGE_TARGET_ATTR = 'data-emzk-lite-badge-target';

const EMOJI_AREA_SELECTOR = '#emoji_area';
const EMOJI_ITEM_SELECTOR = 'li[id^="emoji_"]';
const EMOTE_BUTTON_SELECTOR = 'button[type="button"] img[alt^="{:"]';

let rafId = 0;
let started = false;
let observer = null;
let lastHadPanel = false;

export function startBadgeOverlay() {
  if (started) return;

  started = true;

  document.addEventListener('click', handlePossibleBadgeUpdate, true);
  document.addEventListener('keydown', handlePossibleBadgeUpdate, true);
  document.addEventListener('scroll', handlePossibleBadgeUpdate, true);

  window.addEventListener('resize', scheduleBadgeUpdate, true);

  window.addEventListener(
    SHORTCUT_BINDINGS_CHANGED_EVENT,
    handleBadgeStateChanged
  );

  window.addEventListener(
    EMOTE_BIND_MODE_CHANGED_EVENT,
    handleBadgeStateChanged
  );

  startPanelMutationObserver();
  scheduleBadgeUpdate();
}

export function stopBadgeOverlay() {
  if (!started) return;

  started = false;

  document.removeEventListener('click', handlePossibleBadgeUpdate, true);
  document.removeEventListener('keydown', handlePossibleBadgeUpdate, true);
  document.removeEventListener('scroll', handlePossibleBadgeUpdate, true);

  window.removeEventListener('resize', scheduleBadgeUpdate, true);

  window.removeEventListener(
    SHORTCUT_BINDINGS_CHANGED_EVENT,
    handleBadgeStateChanged
  );

  window.removeEventListener(
    EMOTE_BIND_MODE_CHANGED_EVENT,
    handleBadgeStateChanged
  );

  stopPanelMutationObserver();

  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }

  lastHadPanel = false;
  clearEmoteBadges();
}

export function scheduleBadgeUpdate() {
  if (!started) return;
  if (rafId) return;

  rafId = requestAnimationFrame(() => {
    rafId = 0;
    updateBadgeOverlay();
  });
}

export function updateBadgeOverlay() {
  const panel = findEmotePanel();

  if (!panel) {
    if (lastHadPanel) {
      clearEmoteBadges();
      lastHadPanel = false;
    }

    return;
  }

  lastHadPanel = true;

  const shortcutAssignments = getShortcutBadgeAssignments(panel);
  const assignments = isEmoteBindClearMode()
    ? applyClearModeSelectionBadges({
      panel,
      shortcutAssignments,
    })
    : shortcutAssignments;

  renderEmoteBadges({
    panel,
    assignments,
  });
}

function applyClearModeSelectionBadges({
  panel,
  shortcutAssignments,
}) {
  const selectedEmojiIds = getSelectedClearEmojiIdSet();

  if (!selectedEmojiIds.size) {
    return shortcutAssignments;
  }

  const assignmentByEmojiId = new Map();

  shortcutAssignments.forEach((assignment) => {
    const emojiId = normalizeText(assignment?.emojiId);

    if (!emojiId) return;

    assignmentByEmojiId.set(emojiId, assignment);
  });

  const result = shortcutAssignments.map((assignment) => {
    const emojiId = normalizeText(assignment?.emojiId);

    if (!emojiId) {
      return assignment;
    }

    if (!selectedEmojiIds.has(emojiId)) {
      return assignment;
    }

    return {
      ...assignment,
      label: '',
      title: '해제 후보',
      badgeType: 'unlink',
    };
  });

  getAssignableEmoteButtons(panel).forEach((button) => {
    const emojiId = normalizeText(getEmoteIdFromButton(button));

    if (!emojiId) return;
    if (!selectedEmojiIds.has(emojiId)) return;
    if (assignmentByEmojiId.has(emojiId)) return;

    result.push({
      emojiId,
      label: '',
      title: '해제 후보',
      badgeType: 'unlink',
    });
  });

  return result;
}

function getSelectedClearEmojiIdSet() {
  const bindState = getEmoteBindModeState();
  const result = new Set();

  if (!Array.isArray(bindState.selectedClearEmojiIds)) {
    return result;
  }

  bindState.selectedClearEmojiIds.forEach((emojiId) => {
    const normalizedEmojiId = normalizeText(emojiId);

    if (normalizedEmojiId) {
      result.add(normalizedEmojiId);
    }
  });

  return result;
}

function handlePossibleBadgeUpdate(event) {
  const target = event.target;

  if (target instanceof Element) {
    if (target.closest(`.${BADGE_CLASS}`)) {
      return;
    }
  }

  scheduleBadgeUpdate();
}

function handleBadgeStateChanged() {
  scheduleBadgeUpdate();
}

function startPanelMutationObserver() {
  if (observer) return;

  observer = new MutationObserver((mutations) => {
    const hasRelevantMutation = mutations.some((mutation) => {
      return isRelevantMutation(mutation);
    });

    if (!hasRelevantMutation) {
      return;
    }

    scheduleBadgeUpdate();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      'class',
      'style',
      'aria-hidden',
      BADGE_TARGET_ATTR,
    ],
  });
}

function stopPanelMutationObserver() {
  if (!observer) return;

  observer.disconnect();
  observer = null;
}

function isRelevantMutation(mutation) {
  if (isOwnBadgeMutation(mutation)) {
    return false;
  }

  if (mutation.type === 'attributes') {
    return isRelevantAttributeMutation(mutation);
  }

  if (mutation.type === 'childList') {
    return (
      hasRelevantNodes(mutation.addedNodes) ||
      hasRelevantNodes(mutation.removedNodes)
    );
  }

  return false;
}

function isRelevantAttributeMutation(mutation) {
  const target = mutation.target;

  if (!(target instanceof Element)) {
    return false;
  }

  if (isInsideCurrentEmotePanel(target)) {
    return true;
  }

  return isEmotePanelCandidate(target);
}

function hasRelevantNodes(nodes) {
  if (!nodes || !nodes.length) {
    return false;
  }

  return Array.from(nodes).some((node) => {
    if (!(node instanceof Element)) {
      return false;
    }

    if (node.closest?.(`.${BADGE_CLASS}`)) {
      return false;
    }

    if (isInsideCurrentEmotePanel(node)) {
      return true;
    }

    return isEmotePanelCandidate(node);
  });
}

function isInsideCurrentEmotePanel(element) {
  const panel = findEmotePanel();

  return Boolean(panel && panel.contains(element));
}

function isEmotePanelCandidate(element) {
  if (!(element instanceof Element)) {
    return false;
  }

  return (
    element.matches?.(EMOJI_AREA_SELECTOR) ||
    element.matches?.(EMOJI_ITEM_SELECTOR) ||
    element.matches?.(EMOTE_BUTTON_SELECTOR) ||
    Boolean(element.querySelector?.(EMOJI_AREA_SELECTOR)) ||
    Boolean(element.querySelector?.(EMOJI_ITEM_SELECTOR)) ||
    Boolean(element.querySelector?.(EMOTE_BUTTON_SELECTOR))
  );
}

function isOwnBadgeMutation(mutation) {
  if (mutation.type === 'attributes') {
    if (mutation.attributeName === BADGE_TARGET_ATTR) {
      return true;
    }

    if (mutation.target instanceof Element) {
      return Boolean(mutation.target.closest(`.${BADGE_CLASS}`));
    }
  }

  if (mutation.type === 'childList') {
    return (
      areOnlyBadgeNodes(mutation.addedNodes) &&
      areOnlyBadgeNodes(mutation.removedNodes)
    );
  }

  return false;
}

function areOnlyBadgeNodes(nodes) {
  if (!nodes || !nodes.length) {
    return true;
  }

  return Array.from(nodes).every((node) => {
    if (!(node instanceof Element)) {
      return false;
    }

    return (
      node.classList.contains(BADGE_CLASS) ||
      Boolean(node.querySelector?.(`.${BADGE_CLASS}`))
    );
  });
}

function normalizeText(value) {
  return String(value ?? '').trim();
}