import {
  DEFAULT_EXTENSION_SETTINGS,
  EXTENSION_SETTINGS_STORAGE_KEY,
  normalizeExtensionSettings,
} from '../shared/extension-settings.js';

import {
  normalizeStoredShortcutCode,
} from '../shared/shortcut-key-code.js';

import {
  createStorageWriteQueue,
} from './storage-write-queue.js';

export const EXTENSION_SETTINGS_CHANGED_EVENT = 'emzk-lite-extension-settings-changed';

let cachedExtensionSettings = {
  ...DEFAULT_EXTENSION_SETTINGS,
};

let storageSyncStarted = false;
let storageSyncGeneration = 0;
let storageChangeRevision = 0;
const storageWriteQueue = createStorageWriteQueue();

export async function initExtensionSettingsStorage() {
  startExtensionSettingsStorageSync();

  const generationBeforeRead = storageSyncGeneration;
  const revisionBeforeRead = storageChangeRevision;
  const storedSettings = await readExtensionSettingsFromStorage();

  if (
    storageSyncStarted &&
    storageSyncGeneration === generationBeforeRead &&
    storageChangeRevision === revisionBeforeRead
  ) {
    cachedExtensionSettings = storedSettings;
  }

  if (
    storageSyncStarted &&
    storageSyncGeneration === generationBeforeRead
  ) {
    dispatchExtensionSettingsChanged();
  }

  return getCachedExtensionSettings();
}

export function startExtensionSettingsStorageSync() {
  if (storageSyncStarted) {
    return;
  }

  storageSyncStarted = true;
  storageSyncGeneration += 1;

  if (!globalThis.chrome?.storage?.onChanged?.addListener) {
    return;
  }

  globalThis.chrome.storage.onChanged.addListener(
    handleExtensionSettingsStorageChanged
  );
}

export function stopExtensionSettingsStorageSync() {
  if (!storageSyncStarted) {
    return;
  }

  storageSyncStarted = false;
  storageSyncGeneration += 1;

  globalThis.chrome?.storage?.onChanged?.removeListener?.(
    handleExtensionSettingsStorageChanged
  );
}

function handleExtensionSettingsStorageChanged(changes, areaName) {
  if (!storageSyncStarted) {
    return;
  }

  if (areaName !== 'local') {
    return;
  }

  const change = changes[EXTENSION_SETTINGS_STORAGE_KEY];

  if (!change) {
    return;
  }

  if (storageWriteQueue.hasPending()) {
    return;
  }

  const nextSettings = normalizeExtensionSettings(change.newValue);

  storageChangeRevision += 1;

  if (isSameExtensionSettings(cachedExtensionSettings, nextSettings)) {
    return;
  }

  cachedExtensionSettings = nextSettings;

  dispatchExtensionSettingsChanged();
}

export function getCachedExtensionSettings() {
  return {
    ...cachedExtensionSettings,
  };
}

export async function setExtensionSettings(nextSettings = {}) {
  const previousSettings = cachedExtensionSettings;
  const normalizedSettings = normalizeExtensionSettings({
    ...cachedExtensionSettings,
    ...nextSettings,
  });

  if (isSameExtensionSettings(cachedExtensionSettings, normalizedSettings)) {
    return getCachedExtensionSettings();
  }

  cachedExtensionSettings = normalizedSettings;

  try {
    await writeExtensionSettingsToStorage(cachedExtensionSettings);
  } catch (error) {
    if (cachedExtensionSettings === normalizedSettings) {
      cachedExtensionSettings = previousSettings;
    }

    throw error;
  }

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

export function isExperimentalPhaseHintPending() {
  return Boolean(
    cachedExtensionSettings.experimentalKeyupEnabled &&
    cachedExtensionSettings.experimentalPhaseHintPending
  );
}

export async function consumeExperimentalPhaseHintPending() {
  if (!isExperimentalPhaseHintPending()) {
    return getCachedExtensionSettings();
  }

  return setExtensionSettings({
    experimentalPhaseHintPending: false,
  });
}

async function readExtensionSettingsFromStorage() {
  if (!isChromeStorageAvailable()) {
    return readExtensionSettingsFromLocalStorage();
  }

  const result = await globalThis.chrome.storage.local.get(
    EXTENSION_SETTINGS_STORAGE_KEY
  );

  return normalizeExtensionSettings(result?.[EXTENSION_SETTINGS_STORAGE_KEY]);
}

async function writeExtensionSettingsToStorage(settings) {
  const normalizedSettings = normalizeExtensionSettings(settings);

  if (!isChromeStorageAvailable()) {
    writeExtensionSettingsToLocalStorage(normalizedSettings);
    return;
  }

  await storageWriteQueue.run(() => {
    return globalThis.chrome.storage.local.set({
      [EXTENSION_SETTINGS_STORAGE_KEY]: normalizedSettings,
    });
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
    normalizedLeft.experimentalPhaseHintPending ===
      normalizedRight.experimentalPhaseHintPending &&
    normalizedLeft.experimentalQuickInsertPanelHidden ===
      normalizedRight.experimentalQuickInsertPanelHidden &&
    normalizedLeft.recentStorageLimit ===
      normalizedRight.recentStorageLimit &&
		normalizedLeft.previousShortcutSetCode ===
			normalizedRight.previousShortcutSetCode &&
		normalizedLeft.nextShortcutSetCode ===
			normalizedRight.nextShortcutSetCode	
		);
}

export function isShortcutSetNavigationCode(code) {
  const normalizedCode = normalizeStoredShortcutCode(code);

  if (!normalizedCode) {
    return false;
  }

  return (
    normalizedCode === cachedExtensionSettings.previousShortcutSetCode ||
    normalizedCode === cachedExtensionSettings.nextShortcutSetCode
  );
}
