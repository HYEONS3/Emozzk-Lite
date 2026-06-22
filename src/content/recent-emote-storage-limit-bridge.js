const EXTENSION_SETTINGS_STORAGE_KEY = 'emzk_lite_extension_settings_v1';

const RECENT_STORAGE_LIMIT_MESSAGE =
  'EMZK_LITE_RECENT_STORAGE_LIMIT_CHANGED';

const DEFAULT_RECENT_STORAGE_LIMIT = 60;
const MIN_RECENT_STORAGE_LIMIT = 50;
const MAX_RECENT_STORAGE_LIMIT = 200;

let started = false;
let injected = false;
let cachedRecentStorageLimit = DEFAULT_RECENT_STORAGE_LIMIT;

export function startRecentEmoteStorageLimitBridge() {
  if (started) {
    return;
  }

  started = true;

  injectPageScript();

  void syncRecentStorageLimitFromSettings();

  chrome.runtime.onMessage.addListener(handleRuntimeMessage);
  chrome.storage.onChanged.addListener(handleStorageChanged);
}

export function getCachedRecentStorageLimit() {
  return cachedRecentStorageLimit;
}

function injectPageScript() {
  if (injected) {
    return;
  }

  injected = true;

  const script = document.createElement('script');

  script.src = chrome.runtime.getURL('inject.js');
  script.async = false;

  script.onload = () => {
    script.remove();

    postRecentStorageLimitToPage(cachedRecentStorageLimit);
  };

  script.onerror = () => {
    console.error('[Emozzk Lite] failed to inject page script.');
    script.remove();
  };

  (document.documentElement || document.head || document.body)
    .appendChild(script);
}

async function syncRecentStorageLimitFromSettings() {
  const settings = await readExtensionSettings();
  const limit = normalizeRecentStorageLimit(settings?.recentStorageLimit);

  setCachedRecentStorageLimit(limit);
  postRecentStorageLimitToPage(limit);
}

async function readExtensionSettings() {
  try {
    const result = await chrome.storage.local.get(EXTENSION_SETTINGS_STORAGE_KEY);

    return result?.[EXTENSION_SETTINGS_STORAGE_KEY] || {};
  } catch (error) {
    console.error('[Emozzk Lite] failed to read extension settings:', error);
    return {};
  }
}

function handleRuntimeMessage(message) {
  if (message?.type !== RECENT_STORAGE_LIMIT_MESSAGE) {
    return;
  }

  const limit = normalizeRecentStorageLimit(message.limit);

  setCachedRecentStorageLimit(limit);
  postRecentStorageLimitToPage(limit);
}

function handleStorageChanged(changes, areaName) {
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

  setCachedRecentStorageLimit(limit);
  postRecentStorageLimitToPage(limit);
}

function setCachedRecentStorageLimit(limit) {
  cachedRecentStorageLimit = normalizeRecentStorageLimit(limit);
}

function postRecentStorageLimitToPage(limit) {
  window.postMessage({
    type: RECENT_STORAGE_LIMIT_MESSAGE,
    limit: normalizeRecentStorageLimit(limit),
  }, '*');
}

function normalizeRecentStorageLimit(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return DEFAULT_RECENT_STORAGE_LIMIT;
  }

  return Math.min(
    MAX_RECENT_STORAGE_LIMIT,
    Math.max(MIN_RECENT_STORAGE_LIMIT, Math.round(number))
  );
}