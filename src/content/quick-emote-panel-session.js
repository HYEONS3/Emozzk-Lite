import {
  findEmotePanel,
} from './emote-panel.js';

import {
  closeEmotePanel,
  findEmoteTriggerButton,
} from './emote-trigger.js';

import {
  EXTENSION_SETTINGS_CHANGED_EVENT,
  getCachedExtensionSettings,
} from './extension-settings-storage.js';

const STEALTH_ROOT_CLASS = 'emzk-lite-quick-insert-panel-stealth';
const TRIGGER_SNAPSHOT_CLASS = 'emzk-lite-quick-insert-trigger-snapshot';
const IDLE_RELEASE_DELAY_MS = 300;
const PANEL_CLOSE_TIMEOUT_MS = 700;
const PANEL_CLOSE_POLL_INTERVAL_MS = 16;

let attached = false;
let ownsHiddenPanel = false;
let releaseTimer = 0;
let releasePromise = null;
let sessionId = 0;
let triggerSnapshot = null;
let hiddenTriggerState = null;

export function attachQuickEmotePanelSession() {
  if (attached) return;

  attached = true;

  document.addEventListener('click', handleDocumentClick, true);
  window.addEventListener(
    EXTENSION_SETTINGS_CHANGED_EVENT,
    handleExtensionSettingsChanged
  );
}

export function beginQuickEmotePanelSession() {
  cancelQuickEmotePanelSessionRelease();

  if (
    !isQuickInsertPanelHiddenEnabled() ||
    findEmotePanel()
  ) {
    return false;
  }

	sessionId += 1;
	ownsHiddenPanel = true;

	showInactiveTriggerSnapshot();
	document.documentElement.classList.add(STEALTH_ROOT_CLASS);

	return true;
}

export function keepQuickEmotePanelSessionAlive() {
  cancelQuickEmotePanelSessionRelease();
}

export function scheduleQuickEmotePanelSessionRelease() {
  if (!ownsHiddenPanel) {
    return;
  }

  cancelQuickEmotePanelSessionRelease();

  const targetSessionId = sessionId;

  releaseTimer = window.setTimeout(() => {
    releaseTimer = 0;

    if (
      !ownsHiddenPanel ||
      targetSessionId !== sessionId
    ) {
      return;
    }

    startQuickEmotePanelSessionRelease({
      targetSessionId,
    });
  }, IDLE_RELEASE_DELAY_MS);
}

export function abortQuickEmotePanelSession() {
  if (!ownsHiddenPanel) {
    return;
  }

  cancelQuickEmotePanelSessionRelease();

  startQuickEmotePanelSessionRelease({
    targetSessionId: sessionId,
  });
}

export function revealQuickEmotePanelForUser() {
  if (!ownsHiddenPanel) {
    return false;
  }

  cancelQuickEmotePanelSessionRelease();

	ownsHiddenPanel = false;
	sessionId += 1;

	removeInactiveTriggerSnapshot();
	document.documentElement.classList.remove(STEALTH_ROOT_CLASS);

	return true;
}

export function waitForQuickEmotePanelSessionRelease() {
  return releasePromise ?? Promise.resolve();
}

function isQuickInsertPanelHiddenEnabled() {
  return Boolean(
    getCachedExtensionSettings().experimentalQuickInsertPanelHidden
  );
}

function handleExtensionSettingsChanged() {
  if (isQuickInsertPanelHiddenEnabled()) {
    return;
  }

  revealQuickEmotePanelForUser();
}

function cancelQuickEmotePanelSessionRelease() {
  if (!releaseTimer) {
    return;
  }

  window.clearTimeout(releaseTimer);
  releaseTimer = 0;
}

function startQuickEmotePanelSessionRelease({
  targetSessionId,
}) {
  if (releasePromise) {
    return releasePromise;
  }

  const pendingRelease = releaseOwnedHiddenPanel({
    targetSessionId,
  })
    .finally(() => {
      if (releasePromise === pendingRelease) {
        releasePromise = null;
      }
    });

  releasePromise = pendingRelease;

  return pendingRelease;
}

async function releaseOwnedHiddenPanel({
  targetSessionId,
}) {
  if (
    !ownsHiddenPanel ||
    targetSessionId !== sessionId
  ) {
    return;
  }

  const panel = findEmotePanel();

  if (panel) {
    closeEmotePanel();
    await waitForPanelToClose(panel);
  }

  if (
    !ownsHiddenPanel ||
    targetSessionId !== sessionId
  ) {
    return;
  }

	ownsHiddenPanel = false;
	document.documentElement.classList.remove(STEALTH_ROOT_CLASS);
	removeInactiveTriggerSnapshot();
}

function showInactiveTriggerSnapshot() {
  removeInactiveTriggerSnapshot();

  const trigger = findEmoteTriggerButton();

  if (
    !(trigger instanceof HTMLElement) ||
    !trigger.isConnected
  ) {
    return;
  }

  const rect = trigger.getBoundingClientRect();

  if (
    rect.width <= 0 ||
    rect.height <= 0
  ) {
    return;
  }

  const snapshot = trigger.cloneNode(true);

  if (!(snapshot instanceof HTMLElement)) {
    return;
  }

  snapshot.classList.add(TRIGGER_SNAPSHOT_CLASS);
  snapshot.removeAttribute('id');
  snapshot.setAttribute('aria-hidden', 'true');
  snapshot.setAttribute('tabindex', '-1');

  snapshot.querySelectorAll('[id]').forEach((element) => {
    element.removeAttribute('id');
  });

  snapshot.style.left = `${rect.left}px`;
  snapshot.style.top = `${rect.top}px`;
  snapshot.style.width = `${rect.width}px`;
  snapshot.style.height = `${rect.height}px`;

  hiddenTriggerState = {
    element: trigger,
    opacityValue: trigger.style.getPropertyValue('opacity'),
    opacityPriority: trigger.style.getPropertyPriority('opacity'),
  };

  document.body.append(snapshot);

  trigger.style.setProperty(
    'opacity',
    '0',
    'important'
  );

  triggerSnapshot = snapshot;
}

function removeInactiveTriggerSnapshot() {
  if (hiddenTriggerState) {
    const {
      element,
      opacityValue,
      opacityPriority,
    } = hiddenTriggerState;

    if (element instanceof HTMLElement) {
      if (opacityValue) {
        element.style.setProperty(
          'opacity',
          opacityValue,
          opacityPriority
        );
      } else {
        element.style.removeProperty('opacity');
      }
    }

    hiddenTriggerState = null;
  }

  if (triggerSnapshot) {
    triggerSnapshot.remove();
    triggerSnapshot = null;
  }
}

async function waitForPanelToClose(panel) {
  const startedAt = performance.now();

  while (performance.now() - startedAt <= PANEL_CLOSE_TIMEOUT_MS) {
    if (
      !(panel instanceof Element) ||
      !panel.isConnected ||
      !findEmotePanel()
    ) {
      return;
    }

    await waitDelay(PANEL_CLOSE_POLL_INTERVAL_MS);
  }
}

function handleDocumentClick(event) {
  if (!ownsHiddenPanel || !event.isTrusted) {
    return;
  }

  const target = event.target;

  if (!(target instanceof Element)) {
    return;
  }

  const clickedButton = target.closest('button[type="button"]');
  const trigger = findEmoteTriggerButton();

  if (
    !clickedButton ||
    !trigger ||
    clickedButton !== trigger
  ) {
    return;
  }

  const panel = findEmotePanel();

  revealQuickEmotePanelForUser();

  if (!panel) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

function waitDelay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
