import {
  DEFAULT_RECENT_STORAGE_LIMIT,
  normalizeRecentStorageLimit,
} from '../shared/recent-storage-limit.js';

export const EXTENSION_SETTINGS_STORAGE_KEY = 'emzk_lite_extension_settings_v1';
export const EXTENSION_SETTINGS_CHANGED_EVENT = 'emzk-lite-extension-settings-changed';

const DEFAULT_EXTENSION_SETTINGS = {
  experimentalKeyupEnabled: false,
  experimentalBothPhaseEnabled: false,
  recentStorageLimit: DEFAULT_RECENT_STORAGE_LIMIT,
};

let cachedExtensionSettings = {
  ...DEFAULT_EXTENSION_SETTINGS,
};

let storageSyncStarted = false;

export async function initExtensionSettingsStorage() {
  cachedExtensionSettings = await readExtensionSettingsFromStorage();

  startExtensionSettingsStorageSync();
  dispatchExtensionSettingsChanged();

  return getCachedExtensionSettings();
}

export function startExtensionSettingsStorageSync() {
  if (storageSyncStarted) {
    return;
  }

  storageSyncStarted = true;

  if (!globalThis.chrome?.storage?.onChanged?.addListener) {
    return;
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') {
      return;
    }

    const change = changes[EXTENSION_SETTINGS_STORAGE_KEY];

    if (!change) {
      return;
    }

    const nextSettings = normalizeExtensionSettings(change.newValue);

    if (isSameExtensionSettings(cachedExtensionSettings, nextSettings)) {
      return;
    }

    cachedExtensionSettings = nextSettings;

    dispatchExtensionSettingsChanged();
  });
}

export function getCachedExtensionSettings() {
  return {
    ...cachedExtensionSettings,
  };
}

export async function setExtensionSettings(nextSettings = {}) {
  const normalizedSettings = normalizeExtensionSettings({
    ...cachedExtensionSettings,
    ...nextSettings,
  });

  if (isSameExtensionSettings(cachedExtensionSettings, normalizedSettings)) {
    return getCachedExtensionSettings();
  }

  cachedExtensionSettings = normalizedSettings;

  await writeExtensionSettingsToStorage(cachedExtensionSettings);

  dispatchExtensionSettingsChanged();

  return getCachedExtensionSettings();
}

export function isExperimentalKeyupEnabled() {
  return Boolean(cachedExtensionSettings.experimentalKeyupEnabled);
}

export function isExperimentalBothPhaseEnabled() {
  return Boolean(
    cachedExtensionSettings.experimentalKeyupEnabled &&
    cachedExtensionSettings.experimentalBothPhaseEnabled
  );
}

async function readExtensionSettingsFromStorage() {
  if (!isChromeStorageAvailable()) {
    return readExtensionSettingsFromLocalStorage();
  }

  const result = await chrome.storage.local.get(EXTENSION_SETTINGS_STORAGE_KEY);

  return normalizeExtensionSettings(result?.[EXTENSION_SETTINGS_STORAGE_KEY]);
}

async function writeExtensionSettingsToStorage(settings) {
  const normalizedSettings = normalizeExtensionSettings(settings);

  if (!isChromeStorageAvailable()) {
    writeExtensionSettingsToLocalStorage(normalizedSettings);
    return;
  }

  await chrome.storage.local.set({
    [EXTENSION_SETTINGS_STORAGE_KEY]: normalizedSettings,
  });
}

function readExtensionSettingsFromLocalStorage() {
  try {
    const raw = window.localStorage.getItem(EXTENSION_SETTINGS_STORAGE_KEY);

    if (!raw) {
      return {
        ...DEFAULT_EXTENSION_SETTINGS,
      };
    }

    return normalizeExtensionSettings(JSON.parse(raw));
  } catch {
    return {
      ...DEFAULT_EXTENSION_SETTINGS,
    };
  }
}

function writeExtensionSettingsToLocalStorage(settings) {
  try {
    window.localStorage.setItem(
      EXTENSION_SETTINGS_STORAGE_KEY,
      JSON.stringify(normalizeExtensionSettings(settings))
    );
  } catch {
    /*
     * localStorage fallback 실패는 무시한다.
     * chrome.storage.local이 없는 환경에서만 사용된다.
     */
  }
}

function normalizeExtensionSettings(settings) {
  const experimentalKeyupEnabled = Boolean(settings?.experimentalKeyupEnabled);

  return {
    experimentalKeyupEnabled,
    experimentalBothPhaseEnabled: Boolean(
      experimentalKeyupEnabled &&
      settings?.experimentalBothPhaseEnabled
    ),
    recentStorageLimit: normalizeRecentStorageLimit(
      settings?.recentStorageLimit
    ),
  };
}

function dispatchExtensionSettingsChanged() {
  window.dispatchEvent(
    new CustomEvent(EXTENSION_SETTINGS_CHANGED_EVENT, {
      detail: {
        settings: getCachedExtensionSettings(),
      },
    })
  );
}

function isChromeStorageAvailable() {
  return Boolean(
    globalThis.chrome?.storage?.local?.get &&
    globalThis.chrome?.storage?.local?.set
  );
}

function isSameExtensionSettings(left, right) {
  const normalizedLeft = normalizeExtensionSettings(left);
  const normalizedRight = normalizeExtensionSettings(right);

  return (
    normalizedLeft.experimentalKeyupEnabled ===
      normalizedRight.experimentalKeyupEnabled &&
    normalizedLeft.experimentalBothPhaseEnabled ===
      normalizedRight.experimentalBothPhaseEnabled &&
    normalizedLeft.recentStorageLimit ===
      normalizedRight.recentStorageLimit
  );
}