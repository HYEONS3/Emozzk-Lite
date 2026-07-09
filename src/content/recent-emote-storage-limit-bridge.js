import {
  getFavoritesChangedEventName,
} from './emote-favorites-event-name.js';

import {
  getFavoriteRecentEmoteIds,
} from './favorite-recent-emote-storage.js';

import {
  DEFAULT_RECENT_STORAGE_LIMIT,
  normalizeRecentStorageLimit,
} from '../shared/recent-storage-limit.js';

import {
  EXTENSION_SETTINGS_STORAGE_KEY,
} from '../shared/extension-settings.js';

import {
  createEventListenerGroup,
} from './event-listener-group.js';

const RECENT_STORAGE_LIMIT_MESSAGE =
  'EMZK_LITE_RECENT_STORAGE_LIMIT_CHANGED';

let started = false;
let injected = false;
let injecting = false;
let bridgeGeneration = 0;
let cachedRecentStorageLimit = DEFAULT_RECENT_STORAGE_LIMIT;
const eventListeners = createEventListenerGroup();

export function startRecentEmoteStorageLimitBridge() {
  if (started) {
    return;
  }

  started = true;
  bridgeGeneration += 1;

  injectPageScript();

  void syncRecentStorageLimitFromSettings({
    generation: bridgeGeneration,
  });

  eventListeners.add(
    document,
    getFavoritesChangedEventName(),
    handleFavoritesChanged
  );

  globalThis.chrome?.storage?.onChanged?.addListener?.(handleStorageChanged);
}

export function stopRecentEmoteStorageLimitBridge() {
  if (!started) {
    return;
  }

  started = false;
  bridgeGeneration += 1;

  eventListeners.removeAll();
  globalThis.chrome?.storage?.onChanged?.removeListener?.(handleStorageChanged);
}

export function getCachedRecentStorageLimit() {
  return cachedRecentStorageLimit;
}

export function syncRecentStorageLimitBridgeState() {
  postRecentStorageLimitToPage(cachedRecentStorageLimit);
}

function injectPageScript() {
  if (
    injected ||
    injecting
  ) {
    return;
  }

  const generation = bridgeGeneration;
  const getRuntimeUrl = globalThis.chrome?.runtime?.getURL;

  if (typeof getRuntimeUrl !== 'function') {
    console.error('[Emozzk Lite] chrome.runtime.getURL is not available.');
    return;
  }

  const script = document.createElement('script');

  injecting = true;

  script.src = getRuntimeUrl('inject.js');
  script.async = false;

  script.onload = () => {
    injecting = false;
    injected = true;
    script.remove();

    if (
      !started ||
      generation !== bridgeGeneration
    ) {
      return;
    }

    postRecentStorageLimitToPage(cachedRecentStorageLimit);
  };

  script.onerror = () => {
    injecting = false;
    console.error('[Emozzk Lite] failed to inject page script.');
    script.remove();
  };

  try {
    (document.documentElement || document.head || document.body)
      .appendChild(script);
  } catch (error) {
    injecting = false;
    console.error('[Emozzk Lite] failed to append page script:', error);
    script.remove();
  }
}

async function syncRecentStorageLimitFromSettings({
  generation = bridgeGeneration,
} = {}) {
  const settings = await readExtensionSettings();

  if (
    !started ||
    generation !== bridgeGeneration
  ) {
    return;
  }

  const limit = normalizeRecentStorageLimit(settings?.recentStorageLimit);

  if (setCachedRecentStorageLimit(limit)) {
    postRecentStorageLimitToPage(limit);
    return;
  }

  postRecentStorageLimitToPage(cachedRecentStorageLimit);
}

async function readExtensionSettings() {
  try {
    if (!globalThis.chrome?.storage?.local?.get) {
      return {};
    }

    const result = await globalThis.chrome.storage.local.get(
      EXTENSION_SETTINGS_STORAGE_KEY
    );

    return result?.[EXTENSION_SETTINGS_STORAGE_KEY] || {};
  } catch (error) {
    console.error('[Emozzk Lite] failed to read extension settings:', error);
    return {};
  }
}

function handleStorageChanged(changes, areaName) {
  if (!started) {
    return;
  }

  if (areaName !== 'local') {
    return;
  }

  const change = changes?.[EXTENSION_SETTINGS_STORAGE_KEY];

  if (!change) {
    return;
  }

  const limit = normalizeRecentStorageLimit(
    change.newValue?.recentStorageLimit
  );

  if (!setCachedRecentStorageLimit(limit)) {
    return;
  }

  postRecentStorageLimitToPage(limit);
}

function handleFavoritesChanged() {
  if (!started) {
    return;
  }

  postRecentStorageLimitToPage(cachedRecentStorageLimit);
}

function setCachedRecentStorageLimit(limit) {
  const normalizedLimit = normalizeRecentStorageLimit(limit);

  if (cachedRecentStorageLimit === normalizedLimit) {
    return false;
  }

  cachedRecentStorageLimit = normalizedLimit;
  return true;
}

function postRecentStorageLimitToPage(limit) {
  if (!started) {
    return;
  }

  window.postMessage({
    source: 'emzk-lite',
    type: RECENT_STORAGE_LIMIT_MESSAGE,
    limit: normalizeRecentStorageLimit(limit),
    favoriteIds: getFavoriteRecentEmoteIds(),
  }, window.location.origin);
}
