import {
  findEmoteTriggerButton,
} from './emote-trigger.js';

import {
  getShortcutSetPreviewLabel,
} from './shortcut-set-label.js';

import {
  isShortcutSetSwitchVisible,
} from './shortcut-set-switch-controller.js';

import {
  getCachedShortcutBindingSetState,
} from './shortcut-storage.js';

import {
  SHORTCUT_SET_DIRECTION_NEXT,
  SHORTCUT_SET_DIRECTION_PREVIOUS,
} from './shortcut-set-navigation.js';

const SHORTCUT_SET_SWITCH_FEEDBACK_CLASS =
  'emzk-lite-shortcut-set-switch-feedback';

const SHORTCUT_SET_SWITCH_FEEDBACK_HOLD_MS = 800;
const SHORTCUT_SET_SWITCH_FEEDBACK_HIDE_MS = 100;
const SHORTCUT_SET_SWITCH_FEEDBACK_REMOVE_MS = 200;

const FEEDBACK_DIRECTION_INITIAL = 'initial';
const FEEDBACK_DIRECTION_NEXT = 'next';
const FEEDBACK_DIRECTION_PREVIOUS = 'previous';


const INITIAL_FEEDBACK_HOLD_MS = 2000;
const INITIAL_FEEDBACK_START_DELAY_MS = 250;
const INITIAL_FEEDBACK_RETRY_INTERVAL_MS = 100;
const INITIAL_FEEDBACK_MAX_ATTEMPTS = 30;

let currentFeedback = null;
let feedbackHoldTimer = 0;
let feedbackFrameId = 0;
let initialFeedbackTimer = 0;
let initialFeedbackAttempt = 0;

export function showShortcutSetSwitchFeedback({
  setId,
  label,
  direction = '',
  holdMs = SHORTCUT_SET_SWITCH_FEEDBACK_HOLD_MS,
}) {
  cancelInitialShortcutSetSwitchFeedback();

  if (isShortcutSetSwitchVisible()) {
    hideShortcutSetSwitchFeedback();
    return;
  }

  const trigger = findEmoteTriggerButton();

  if (!(trigger instanceof HTMLElement)) {
    return;
  }

  const displayLabel = getShortcutSetPreviewLabel({
    setId,
    label,
  });

  if (!displayLabel) {
    return;
  }

  const rect = trigger.getBoundingClientRect();

  if (
    rect.width <= 0 ||
    rect.height <= 0
  ) {
    return;
  }

  const motionDirection = normalizeFeedbackDirection(direction);

  clearShortcutSetSwitchFeedbackTimers();

  /*
   * 현재 표시 중인 피드백이 있으면
   * 새 세트의 이동 방향 반대로 퇴장시킨다.
   */
  if (
    currentFeedback instanceof HTMLElement &&
    currentFeedback.isConnected
  ) {
    startShortcutSetSwitchFeedbackLeave({
      feedback: currentFeedback,
      direction: motionDirection,
    });
  }

  const feedback = createShortcutSetSwitchFeedback();

  feedback.textContent = displayLabel;
	feedback.style.left = `${rect.right}px`;
  feedback.style.top = `${rect.top + rect.height / 2}px`;

  feedback.setAttribute(
    'data-direction',
    motionDirection || FEEDBACK_DIRECTION_INITIAL
  );

  feedback.setAttribute('data-state', 'enter');

  document.body.appendChild(feedback);

  currentFeedback = feedback;

  feedbackFrameId = requestAnimationFrame(() => {
    feedbackFrameId = 0;

    if (
      currentFeedback !== feedback ||
      !feedback.isConnected
    ) {
      return;
    }

    feedback.setAttribute('data-state', 'open');
  });

  feedbackHoldTimer = window.setTimeout(() => {
    feedbackHoldTimer = 0;

    if (currentFeedback === feedback) {
      currentFeedback = null;
    }

    dismissShortcutSetSwitchFeedback(feedback);
  }, holdMs);
}

function createShortcutSetSwitchFeedback() {
  const feedback = document.createElement('span');

  feedback.className = SHORTCUT_SET_SWITCH_FEEDBACK_CLASS;
  feedback.setAttribute('aria-hidden', 'true');

  return feedback;
}

function hideShortcutSetSwitchFeedback() {
  clearShortcutSetSwitchFeedbackTimers();

  currentFeedback = null;

  document
    .querySelectorAll(`.${SHORTCUT_SET_SWITCH_FEEDBACK_CLASS}`)
    .forEach((feedback) => {
      if (!(feedback instanceof HTMLElement)) {
        return;
      }

      dismissShortcutSetSwitchFeedback(feedback);
    });
}

function clearShortcutSetSwitchFeedbackTimers() {
  if (feedbackHoldTimer) {
    window.clearTimeout(feedbackHoldTimer);
    feedbackHoldTimer = 0;
  }

  if (feedbackFrameId) {
    cancelAnimationFrame(feedbackFrameId);
    feedbackFrameId = 0;
  }
}

export function scheduleInitialShortcutSetSwitchFeedback() {
  cancelInitialShortcutSetSwitchFeedback();

  initialFeedbackAttempt = 0;

  initialFeedbackTimer = window.setTimeout(() => {
    initialFeedbackTimer = 0;

    tryShowInitialShortcutSetSwitchFeedback();
  }, INITIAL_FEEDBACK_START_DELAY_MS);
}

function tryShowInitialShortcutSetSwitchFeedback() {
  if (isShortcutSetSwitchVisible()) {
    cancelInitialShortcutSetSwitchFeedback();
    return;
  }

  const trigger = findEmoteTriggerButton();

  if (trigger instanceof HTMLElement) {
    const state = getCachedShortcutBindingSetState();

    const activeSet = state.sets.find((set) => {
      return set.id === state.activeSetId;
    });

    showShortcutSetSwitchFeedback({
      setId: state.activeSetId,
      label: activeSet?.label,
      holdMs: INITIAL_FEEDBACK_HOLD_MS,
		});

    return;
  }

  initialFeedbackAttempt += 1;

  if (initialFeedbackAttempt >= INITIAL_FEEDBACK_MAX_ATTEMPTS) {
    cancelInitialShortcutSetSwitchFeedback();
    return;
  }

  initialFeedbackTimer = window.setTimeout(() => {
    initialFeedbackTimer = 0;

    tryShowInitialShortcutSetSwitchFeedback();
  }, INITIAL_FEEDBACK_RETRY_INTERVAL_MS);
}

function cancelInitialShortcutSetSwitchFeedback() {
  if (initialFeedbackTimer) {
    window.clearTimeout(initialFeedbackTimer);
    initialFeedbackTimer = 0;
  }

  initialFeedbackAttempt = 0;
}

function startShortcutSetSwitchFeedbackLeave({
  feedback,
  direction,
}) {
  if (!(feedback instanceof HTMLElement)) {
    return;
  }

  feedback.setAttribute(
    'data-direction',
    direction || FEEDBACK_DIRECTION_INITIAL
  );

  feedback.setAttribute(
    'data-state',
    direction
      ? 'replace-leave'
      : 'dismiss'
  );

  scheduleShortcutSetSwitchFeedbackRemoval(feedback);
}

function dismissShortcutSetSwitchFeedback(feedback) {
  if (!(feedback instanceof HTMLElement)) {
    return;
  }

  feedback.setAttribute(
    'data-direction',
    FEEDBACK_DIRECTION_INITIAL
  );

  feedback.setAttribute('data-state', 'dismiss');

  scheduleShortcutSetSwitchFeedbackRemoval(feedback);
}

function scheduleShortcutSetSwitchFeedbackRemoval(feedback) {
  window.setTimeout(() => {
    feedback.remove();
  }, SHORTCUT_SET_SWITCH_FEEDBACK_REMOVE_MS);
}

function normalizeFeedbackDirection(direction) {
  if (direction === SHORTCUT_SET_DIRECTION_NEXT) {
    return FEEDBACK_DIRECTION_NEXT;
  }

  if (direction === SHORTCUT_SET_DIRECTION_PREVIOUS) {
    return FEEDBACK_DIRECTION_PREVIOUS;
  }

  return '';
}