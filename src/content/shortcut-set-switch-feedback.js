import {
  findEmoteTriggerButton,
} from './emote-trigger.js';

import {
  getShortcutSetSegmentLabel,
} from './shortcut-set-label.js';

import {
  isShortcutSetSwitchVisible,
} from './shortcut-set-switch-controller.js';

const SHORTCUT_SET_SWITCH_FEEDBACK_CLASS =
  'emzk-lite-shortcut-set-switch-feedback';

const SHORTCUT_SET_SWITCH_FEEDBACK_HOLD_MS = 800;
const SHORTCUT_SET_SWITCH_FEEDBACK_HIDE_MS = 100;

let feedbackHoldTimer = 0;
let feedbackHideTimer = 0;
let feedbackFrameId = 0;

export function showShortcutSetSwitchFeedback({
  setId,
  label,
}) {
  if (isShortcutSetSwitchVisible()) {
    hideShortcutSetSwitchFeedback();
    return;
  }

  const trigger = findEmoteTriggerButton();

  if (!(trigger instanceof HTMLElement)) {
    return;
  }

  const displayLabel = getShortcutSetSegmentLabel({
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

  const feedback = getShortcutSetSwitchFeedback();

  clearShortcutSetSwitchFeedbackTimers();

  feedback.textContent = displayLabel;
  feedback.hidden = false;
  feedback.style.left = `${rect.left + rect.width / 2}px`;
  feedback.style.top = `${rect.top - 7}px`;
  feedback.setAttribute('data-state', 'enter');

  feedbackFrameId = requestAnimationFrame(() => {
    feedbackFrameId = 0;

    if (
      !feedback.isConnected ||
      feedback.hidden
    ) {
      return;
    }

    feedback.setAttribute('data-state', 'open');
  });

  feedbackHoldTimer = window.setTimeout(() => {
    feedbackHoldTimer = 0;

    hideShortcutSetSwitchFeedback();
  }, SHORTCUT_SET_SWITCH_FEEDBACK_HOLD_MS);
}

function getShortcutSetSwitchFeedback() {
  let feedback = document.querySelector(
    `.${SHORTCUT_SET_SWITCH_FEEDBACK_CLASS}`
  );

  if (feedback instanceof HTMLElement) {
    return feedback;
  }

  feedback = document.createElement('span');
  feedback.className = SHORTCUT_SET_SWITCH_FEEDBACK_CLASS;
  feedback.hidden = true;
  feedback.setAttribute('aria-hidden', 'true');

  document.body.appendChild(feedback);

  return feedback;
}

function hideShortcutSetSwitchFeedback() {
  const feedback = document.querySelector(
    `.${SHORTCUT_SET_SWITCH_FEEDBACK_CLASS}`
  );

  if (!(feedback instanceof HTMLElement)) {
    return;
  }

  if (feedback.hidden) {
    feedback.removeAttribute('data-state');
    return;
  }

  if (feedbackHoldTimer) {
    window.clearTimeout(feedbackHoldTimer);
    feedbackHoldTimer = 0;
  }

  if (feedbackHideTimer) {
    window.clearTimeout(feedbackHideTimer);
  }

  feedback.setAttribute('data-state', 'leave');

  feedbackHideTimer = window.setTimeout(() => {
    feedback.hidden = true;
    feedback.removeAttribute('data-state');

    feedbackHideTimer = 0;
  }, SHORTCUT_SET_SWITCH_FEEDBACK_HIDE_MS);
}

function clearShortcutSetSwitchFeedbackTimers() {
  if (feedbackHoldTimer) {
    window.clearTimeout(feedbackHoldTimer);
    feedbackHoldTimer = 0;
  }

  if (feedbackHideTimer) {
    window.clearTimeout(feedbackHideTimer);
    feedbackHideTimer = 0;
  }

  if (feedbackFrameId) {
    cancelAnimationFrame(feedbackFrameId);
    feedbackFrameId = 0;
  }
}