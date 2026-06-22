const EXTENSION_SETTINGS_STORAGE_KEY = 'emzk_lite_extension_settings_v1';

const DEFAULT_SETTINGS = {
  experimentalKeyupEnabled: false,
  experimentalBothPhaseEnabled: false,
};

const keyupCheckbox = document.getElementById('experimentalKeyupEnabled');
const bothCheckbox = document.getElementById('experimentalBothPhaseEnabled');
const reloadButton = document.getElementById('reloadButton');
const statusText = document.getElementById('statusText');

initPopup();

async function initPopup() {
  const settings = await readSettings();

  applySettingsToControls(settings);

  keyupCheckbox.addEventListener('change', handleSettingsChange);
  bothCheckbox.addEventListener('change', handleSettingsChange);
  reloadButton.addEventListener('click', reloadCurrentChzzkTab);
}

async function handleSettingsChange() {
  const nextSettings = getSettingsFromControls();

  applySettingsToControls(nextSettings);

  await writeSettings(nextSettings);

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
  });
}

function applySettingsToControls(settings) {
  const normalizedSettings = normalizeSettings(settings);

  keyupCheckbox.checked = normalizedSettings.experimentalKeyupEnabled;
  bothCheckbox.checked = normalizedSettings.experimentalBothPhaseEnabled;
  bothCheckbox.disabled = !normalizedSettings.experimentalKeyupEnabled;
}

function normalizeSettings(settings) {
  const experimentalKeyupEnabled = Boolean(settings?.experimentalKeyupEnabled);

  return {
    experimentalKeyupEnabled,
    experimentalBothPhaseEnabled: Boolean(
      experimentalKeyupEnabled &&
      settings?.experimentalBothPhaseEnabled
    ),
  };
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