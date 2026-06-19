import { findEmotePanel } from './emote-panel.js';
import { getVisibleEmoteButtons } from './emote-buttons.js';

import {
  renderEmoteBadges,
  clearEmoteBadges,
} from './badge-render.js';

let rafId = 0;
let started = false;
let observer = null;


export function startBadgeOverlay() {
  if (started) return;

  started = true;

  document.addEventListener('click', scheduleBadgeUpdate, true);
  document.addEventListener('keydown', scheduleBadgeUpdate, true);
  document.addEventListener('scroll', scheduleBadgeUpdate, true);
  window.addEventListener('resize', scheduleBadgeUpdate, true);

  startPanelMutationObserver();
  scheduleBadgeUpdate();
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
  document.removeEventListener('scroll', scheduleBadgeUpdate, true);
  window.removeEventListener('resize', scheduleBadgeUpdate, true);

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