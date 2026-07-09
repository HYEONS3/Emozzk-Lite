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
  subscribePanelDomMutations,
  unsubscribePanelDomMutations,
} from './panel-dom-mutations.js';

import {
  EMOTE_BIND_MODE_CHANGED_EVENT,
  getEmoteBindModeState,
  isEmoteBindAssignMode,
  isEmoteBindClearMode,
} from './emote-bind-mode-state.js';

import {
  normalizeShortcutPhase,
  SHORTCUT_BINDINGS_CHANGED_EVENT,
  SHORTCUT_PHASE_BOTH,
  SHORTCUT_PHASE_DOWN,
  SHORTCUT_PHASE_UP,
} from './shortcut-storage.js';

import {
  normalizeStoredShortcutCode,
} from '../shared/shortcut-key-code.js';

import {
  createFrameScheduler,
} from './frame-scheduler.js';

import {
  createEventListenerGroup,
} from './event-listener-group.js';

const BADGE_CLASS = 'emzk-lite-badge';
const BADGE_TARGET_ATTR = 'data-emzk-lite-badge-target';

const EMOJI_AREA_SELECTOR = '#emoji_area';
const EMOJI_ITEM_SELECTOR = 'li[id^="emoji_"]';
const EMOTE_BUTTON_SELECTOR = 'button[type="button"] img[alt^="{:"]';

let started = false;
let lastHadPanel = false;
const badgeUpdateScheduler = createFrameScheduler(() => {
  updateBadgeOverlay();
});
const eventListeners = createEventListenerGroup();

export function startBadgeOverlay() {
  if (started) return;

  started = true;
  badgeUpdateScheduler.start();

  eventListeners.add(document, 'click', handlePossibleBadgeUpdate, true);
  eventListeners.add(document, 'keydown', handlePossibleBadgeUpdate, true);
  eventListeners.add(document, 'scroll', handlePossibleBadgeUpdate, true);
  eventListeners.add(window, 'resize', scheduleBadgeUpdate, true);
  eventListeners.add(
    window,
    SHORTCUT_BINDINGS_CHANGED_EVENT,
    handleBadgeStateChanged
  );
  eventListeners.add(
    window,
    EMOTE_BIND_MODE_CHANGED_EVENT,
    handleBadgeStateChanged
  );

  startPanelMutationObserver();
  scheduleBadgeUpdate();
}

export function stopBadgeOverlay() {
  if (!started) return;

  started = false;

  eventListeners.removeAll();

  stopPanelMutationObserver();

  badgeUpdateScheduler.stop();

  lastHadPanel = false;
  clearEmoteBadges();
}

export function scheduleBadgeUpdate() {
  if (!started) return;

  badgeUpdateScheduler.schedule();
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

  let assignments = shortcutAssignments;

  if (isEmoteBindClearMode()) {
    assignments = applyClearModeSelectionBadges({
      panel,
      shortcutAssignments,
    });
  } else if (isEmoteBindAssignMode()) {
    assignments = applyAssignModeConflictBadges({
      shortcutAssignments,
    });
  }

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

function applyAssignModeConflictBadges({
  shortcutAssignments,
}) {
  const bindState = getEmoteBindModeState();

  const selectedEmojiId = normalizeText(bindState?.selectedEmojiId);
  const selectedCode = normalizeShortcutCode(bindState?.selectedCode);
  const selectedPhase = normalizeShortcutPhase(bindState?.selectedPhase);

  if (
    !selectedEmojiId ||
    !selectedCode ||
    !selectedPhase
  ) {
    return shortcutAssignments;
  }

  return shortcutAssignments.map((assignment) => {
    const emojiId = normalizeText(assignment?.emojiId);

    if (!emojiId) {
      return assignment;
    }

    if (emojiId === selectedEmojiId) {
      return assignment;
    }

    if (!hasShortcutAssignmentConflict({
      assignment,
      selectedCode,
      selectedPhase,
    })) {
      return assignment;
    }

    return {
      ...assignment,
      badgeState: 'conflict',
      title: `${assignment.title || assignment.label || selectedCode} · 교체 대상`,
    };
  });
}

function hasShortcutAssignmentConflict({
  assignment,
  selectedCode,
  selectedPhase,
}) {
  const items = Array.isArray(assignment?.items) && assignment.items.length
    ? assignment.items
    : [assignment];

  return items.some((item) => {
    const itemCode = normalizeShortcutCode(item?.code);
    const itemPhase = normalizeShortcutPhase(item?.phase);

    if (itemCode !== selectedCode) {
      return false;
    }

    return hasPhaseOverlap({
      leftPhase: itemPhase,
      rightPhase: selectedPhase,
    });
  });
}

function hasPhaseOverlap({
  leftPhase,
  rightPhase,
}) {
  const leftPhases = getComparableShortcutPhases(leftPhase);
  const rightPhases = getComparableShortcutPhases(rightPhase);

  return leftPhases.some((phase) => {
    return rightPhases.includes(phase);
  });
}

function getComparableShortcutPhases(phase) {
  if (phase === SHORTCUT_PHASE_BOTH) {
    return [
      SHORTCUT_PHASE_DOWN,
      SHORTCUT_PHASE_UP,
    ];
  }

  if (phase === SHORTCUT_PHASE_UP) {
    return [SHORTCUT_PHASE_UP];
  }

  return [SHORTCUT_PHASE_DOWN];
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
  subscribePanelDomMutations(handlePanelMutations);
}

function stopPanelMutationObserver() {
  unsubscribePanelDomMutations(handlePanelMutations);
}

function handlePanelMutations(mutations) {
  const hasRelevantMutation = mutations.some((mutation) => {
    return isRelevantMutation(mutation);
  });

  if (!hasRelevantMutation) {
    return;
  }

  scheduleBadgeUpdate();
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

function normalizeShortcutCode(value) {
  return normalizeStoredShortcutCode(value);
}
