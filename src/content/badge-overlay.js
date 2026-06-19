import { findEmotePanel } from './emote-panel.js';
import { getVisibleEmoteButtons } from './emote-buttons.js';
import {
  renderEmoteBadges,
  clearEmoteBadges,
} from './badge-render.js';

let rafId = 0;
let started = false;
let observer = null;

const UPDATE_BURST_DELAYS = [0, 50, 100, 180, 300];

export function startBadgeOverlay() {
  if (started) return;

  started = true;

  document.addEventListener('click', scheduleBadgeUpdate, true);
  document.addEventListener('keydown', scheduleBadgeUpdate, true);
  window.addEventListener('resize', scheduleBadgeUpdate, true);
  window.addEventListener('scroll', scheduleBadgeUpdate, true);

  startPanelMutationObserver();
  scheduleBadgeUpdateBurst();
}

export function scheduleBadgeUpdate() {
  if (rafId) {
    cancelAnimationFrame(rafId);
  }

  rafId = requestAnimationFrame(() => {
    rafId = 0;
    updateBadgeOverlay();
  });
}

export function scheduleBadgeUpdateBurst() {
  UPDATE_BURST_DELAYS.forEach((delay) => {
    window.setTimeout(scheduleBadgeUpdate, delay);
  });
}

export function updateBadgeOverlay() {
  const panel = findEmotePanel();

  if (!panel) {
    clearEmoteBadges();
    return;
  }

  const buttons = getVisibleEmoteButtons(panel);

  if (!buttons.length) {
    clearEmoteBadges();
    return;
  }

  renderEmoteBadges(buttons);
}

export function stopBadgeOverlay() {
  if (!started) return;

  started = false;

  document.removeEventListener('click', scheduleBadgeUpdate, true);
  document.removeEventListener('keydown', scheduleBadgeUpdate, true);
  window.removeEventListener('resize', scheduleBadgeUpdate, true);
  window.removeEventListener('scroll', scheduleBadgeUpdate, true);

  stopPanelMutationObserver();

  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }

  clearEmoteBadges();
}

function startPanelMutationObserver() {
  if (observer) return;

  observer = new MutationObserver(() => {
    scheduleBadgeUpdate();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function stopPanelMutationObserver() {
  if (!observer) return;

  observer.disconnect();
  observer = null;
}