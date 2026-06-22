const EXTENSION_SETTINGS_STORAGE_KEY = 'emzk_lite_extension_settings_v1';

const MIN_RECENT_STORAGE_LIMIT = 50;
const MAX_RECENT_STORAGE_LIMIT = 200;
const DEFAULT_RECENT_STORAGE_LIMIT = 60;

const RECENT_STORAGE_LIMIT_CHANGED_MESSAGE =
  'EMZK_LITE_RECENT_STORAGE_LIMIT_CHANGED';

const DEFAULT_SETTINGS = {
  experimentalKeyupEnabled: false,
  experimentalBothPhaseEnabled: false,
  recentStorageLimit: DEFAULT_RECENT_STORAGE_LIMIT,
};

const keyupCheckbox = document.getElementById('experimentalKeyupEnabled');
const bothCheckbox = document.getElementById('experimentalBothPhaseEnabled');
const recentStorageLimitRange = document.getElementById('recentStorageLimitRange');
const recentStorageLimitValue = document.getElementById('recentStorageLimitValue');
const reloadButton = document.getElementById('reloadButton');
const statusText = document.getElementById('statusText');

let currentSettings = normalizeSettings(DEFAULT_SETTINGS);

initPopup();

async function initPopup() {
  const settings = await readSettings();

  currentSettings = settings;

  applySettingsToControls(settings);

  keyupCheckbox.addEventListener('change', handleSettingsChange);
  bothCheckbox.addEventListener('change', handleSettingsChange);

  recentStorageLimitRange.addEventListener('input', handleRecentLimitInput);
  recentStorageLimitRange.addEventListener('change', handleSettingsChange);

  reloadButton.addEventListener('click', reloadCurrentChzzkTab);
}

function handleRecentLimitInput() {
  updateRecentStorageLimitLabel(recentStorageLimitRange.value);
}

async function handleSettingsChange() {
  const previousSettings = currentSettings;
  const nextSettings = getSettingsFromControls();

  const recentStorageLimitChanged =
    previousSettings.recentStorageLimit !== nextSettings.recentStorageLimit;

  applySettingsToControls(nextSettings);

  await writeSettings(nextSettings);

  currentSettings = nextSettings;

  if (recentStorageLimitChanged) {
    await notifyRecentStorageLimitChanged(nextSettings.recentStorageLimit);

    setStatus('저장됨. 현재 치지직 탭을 새로고침하면 반영됩니다.');
    return;
  }

  setStatus('저장됨. 열린 이모티콘 패널에 즉시 반영됩니다.');
}

async function readSettings() {
  const result = await chrome.storage.local.get(EXTENSION_SETTINGS_STORAGE_KEY);

  return normalizeSettings(result?.[EXTENSION_SETTINGS_STORAGE_KEY]);
}

async function writeSettings(settings) {
  await chrome.storage.local.set({
    [EXTENSION_SETTINGS_STORAGE_KEY]: normalizeSettings(settings),
  });
}

function getSettingsFromControls() {
  const experimentalKeyupEnabled = Boolean(keyupCheckbox.checked);

  return normalizeSettings({
    experimentalKeyupEnabled,
    experimentalBothPhaseEnabled:
      experimentalKeyupEnabled &&
      Boolean(bothCheckbox.checked),
    recentStorageLimit: recentStorageLimitRange.value,
  });
}

function applySettingsToControls(settings) {
  const normalizedSettings = normalizeSettings(settings);

  keyupCheckbox.checked = normalizedSettings.experimentalKeyupEnabled;
  bothCheckbox.checked = normalizedSettings.experimentalBothPhaseEnabled;
  bothCheckbox.disabled = !normalizedSettings.experimentalKeyupEnabled;

  recentStorageLimitRange.value = String(normalizedSettings.recentStorageLimit);
  updateRecentStorageLimitLabel(normalizedSettings.recentStorageLimit);
}

function normalizeSettings(settings) {
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

function normalizeRecentStorageLimit(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return DEFAULT_RECENT_STORAGE_LIMIT;
  }

  return clampNumber(
    Math.round(number),
    MIN_RECENT_STORAGE_LIMIT,
    MAX_RECENT_STORAGE_LIMIT
  );
}

function updateRecentStorageLimitLabel(value) {
  recentStorageLimitValue.textContent =
    `${normalizeRecentStorageLimit(value)}개`;
}

function clampNumber(value, min, max) {
  return Math.min(
    max,
    Math.max(min, value)
  );
}

async function notifyRecentStorageLimitChanged(limit) {
  const normalizedLimit = normalizeRecentStorageLimit(limit);

  try {
    const tabs = await chrome.tabs.query({
      url: [
        'https://chzzk.naver.com/*',
        'https://*.chzzk.naver.com/*',
      ],
    });

    await Promise.allSettled(
      tabs.map((tab) => {
        if (!tab?.id) {
          return Promise.resolve();
        }

        return chrome.tabs.sendMessage(tab.id, {
          type: RECENT_STORAGE_LIMIT_CHANGED_MESSAGE,
          limit: normalizedLimit,
        });
      })
    );
  } catch (error) {
    console.debug('[Emozzk Lite] failed to notify recent storage limit:', error);
  }
}

async function reloadCurrentChzzkTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!tab?.id) {
    setStatus('현재 탭을 찾을 수 없습니다.');
    return;
  }

  if (!isChzzkUrl(tab.url)) {
    setStatus('치지직 탭에서만 새로고침할 수 있습니다.');
    return;
  }

  await chrome.tabs.reload(tab.id);

  setStatus('새로고침했습니다.');
}

function isChzzkUrl(url) {
  return /^https:\/\/chzzk\.naver\.com\//.test(String(url || ''));
}

function setStatus(message) {
  statusText.textContent = message;

  window.setTimeout(() => {
    if (statusText.textContent === message) {
      statusText.textContent = '';
    }
  }, 2200);
}