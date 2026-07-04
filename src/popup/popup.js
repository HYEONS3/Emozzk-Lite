import {
  getRecentStorageLimitFromRangeValue,
  getRecentStorageLimitRangeValue,
  normalizeRecentStorageLimit,
} from '../shared/recent-storage-limit.js';

import {
  DEFAULT_EXTENSION_SETTINGS,
  EXTENSION_SETTINGS_STORAGE_KEY,
  normalizeExtensionSettings,
} from '../shared/extension-settings.js';

import {
  getShortcutCodeFromKeyboardEvent,
  getShortcutCodeLabel,
  normalizeStoredShortcutCode,
} from '../shared/shortcut-key-code.js';

const SHORTCUT_BINDINGS_STORAGE_KEY = 'emzk_lite_shortcut_bindings_v1';

const MIN_SHORTCUT_SET_COUNT = 1;
const MAX_SHORTCUT_SET_COUNT = 9;
const DEFAULT_SHORTCUT_SET_COUNT = 2;

const SHORTCUT_BINDING_SETS_VERSION = 4;
const SHORTCUT_BINDING_SET_OFF = 'off';

const SHORTCUT_SET_TARGET_PREVIOUS = 'previous';
const SHORTCUT_SET_TARGET_NEXT = 'next';

const RECENT_STORAGE_LIMIT_CHANGED_MESSAGE =
  'EMZK_LITE_RECENT_STORAGE_LIMIT_CHANGED';


const keyupCheckbox = document.getElementById('experimentalKeyupEnabled');
const bothCheckbox = document.getElementById('experimentalBothPhaseEnabled');
const shortcutSetCountRange = document.getElementById('shortcutSetCountRange');
const shortcutSetCountValue = document.getElementById('shortcutSetCountValue');

const previousShortcutSetButton = document.getElementById('previousShortcutSetButton');
const previousShortcutSetClearButton = document.getElementById('previousShortcutSetClearButton');
const nextShortcutSetButton = document.getElementById('nextShortcutSetButton');
const nextShortcutSetClearButton = document.getElementById('nextShortcutSetClearButton');

const recentStorageLimitRange = document.getElementById('recentStorageLimitRange');
const recentStorageLimitValue = document.getElementById('recentStorageLimitValue');

const statusText = document.getElementById('statusText');
const versionText = document.querySelector('.popup-version');


let listeningShortcutSetTarget = '';
let currentSettings = normalizeExtensionSettings(DEFAULT_EXTENSION_SETTINGS);
let currentShortcutSetState = createDefaultShortcutBindingSetState();

initPopup();

async function initPopup() {
  renderPopupVersion();

  const [
    settings,
    shortcutSetState,
  ] = await Promise.all([
    readSettings(),
    readShortcutBindingSetState(),
  ]);

  currentSettings = settings;
  currentShortcutSetState = shortcutSetState;

  applySettingsToControls(settings);
  applyShortcutSetStateToControls(shortcutSetState);

  keyupCheckbox.addEventListener('change', handleSettingsChange);
  bothCheckbox.addEventListener('change', handleSettingsChange);

  shortcutSetCountRange.addEventListener('input', handleShortcutSetCountInput);
  shortcutSetCountRange.addEventListener('change', handleShortcutSetCountChange);

  recentStorageLimitRange.addEventListener('input', handleRecentLimitInput);
  recentStorageLimitRange.addEventListener('change', handleSettingsChange);

  previousShortcutSetButton.addEventListener('click', () => {
    toggleShortcutSetCodeListening(SHORTCUT_SET_TARGET_PREVIOUS);
  });

  nextShortcutSetButton.addEventListener('click', () => {
    toggleShortcutSetCodeListening(SHORTCUT_SET_TARGET_NEXT);
  });

  previousShortcutSetClearButton.addEventListener('click', () => {
    void clearShortcutSetCode(SHORTCUT_SET_TARGET_PREVIOUS);
  });

  nextShortcutSetClearButton.addEventListener('click', () => {
    void clearShortcutSetCode(SHORTCUT_SET_TARGET_NEXT);
  });

  document.addEventListener(
    'keydown',
    handleShortcutSetCodeKeyDown,
    true
  );
}

function handleShortcutSetCountInput() {
  updateShortcutSetCountLabel(shortcutSetCountRange.value);
}

async function handleShortcutSetCountChange() {
  try {
    const currentState = await readShortcutBindingSetState();
    const setCount = normalizeShortcutSetCount(shortcutSetCountRange.value);

    const nextState = normalizeShortcutBindingSetState({
      ...currentState,
      setCount,
      activeSetId: normalizeActiveSetIdForSetCount({
        activeSetId: currentState.activeSetId,
        setCount,
      }),
    });

    await writeShortcutBindingSetState(nextState);

    currentShortcutSetState = nextState;

    applyShortcutSetStateToControls(nextState);
    setStatus('저장됨. 열린 이모티콘 패널에 즉시 반영됩니다.');
  } catch (error) {
    console.debug('[Emozzk Lite] failed to save shortcut set count:', error);

    applyShortcutSetStateToControls(currentShortcutSetState);
    setStatus('저장에 실패했습니다.');
  }
}

function handleShortcutSetCodeKeyDown(event) {
  const target = listeningShortcutSetTarget;

  if (!target) {
    return;
  }

  blockPopupEvent(event);

  if (event.repeat) {
    return;
  }

  if (
    event.code === 'Escape' &&
    !hasAnyModifier(event)
  ) {
    listeningShortcutSetTarget = '';

    applyShortcutSetCodesToControls(currentSettings);
    return;
  }

  const code = getShortcutCodeFromKeyboardEvent(event);

  if (!code) {
    return;
  }

  void assignShortcutSetCode({
    target,
    code,
  });
}

async function assignShortcutSetCode({
  target,
  code,
}) {
  const normalizedCode = normalizeStoredShortcutCode(code);

  if (!normalizedCode) {
    return;
  }

  if (normalizedCode === 'KeyE') {
    setStatus('이모티콘 패널 열기 단축키와 중복됩니다.');
    return;
  }

  const otherCode = target === SHORTCUT_SET_TARGET_PREVIOUS
    ? currentSettings.nextShortcutSetCode
    : currentSettings.previousShortcutSetCode;

  if (
    normalizedCode === normalizeStoredShortcutCode(otherCode)
  ) {
    setStatus('다른 세트 전환 단축키와 중복됩니다.');
    return;
  }

  if (
    hasShortcutBindingCode(
      currentShortcutSetState,
      normalizedCode
    )
  ) {
    setStatus('이모티콘 단축키와 중복됩니다.');
    return;
  }

  await saveShortcutSetCode({
    target,
    code: normalizedCode,
  });
}

function hasShortcutBindingCode(state, code) {
  const normalizedCode = normalizeStoredShortcutCode(code);

  if (!normalizedCode) {
    return false;
  }

  const normalizedState = normalizeShortcutBindingSetState(state);

  return normalizedState.sets.some((set) => {
    return set.bindings.some((binding) => {
      return (
        normalizeStoredShortcutCode(binding?.code) ===
        normalizedCode
      );
    });
  });
}

function blockPopupEvent(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
}

function hasAnyModifier(event) {
  return Boolean(
    event.ctrlKey ||
    event.altKey ||
    event.metaKey ||
    event.shiftKey
  );
}

function handleRecentLimitInput() {
  updateRecentStorageLimitLabel(
    getRecentStorageLimitFromRangeValue(recentStorageLimitRange.value)
  );
}

async function handleSettingsChange() {
  const previousSettings = currentSettings;
  const controlSettings = getSettingsFromControls();
  const nextSettings = withExperimentalPhaseHintPending({
    previousSettings,
    nextSettings: controlSettings,
  });

  const recentStorageLimitChanged =
    previousSettings.recentStorageLimit !== nextSettings.recentStorageLimit;

  applySettingsToControls(nextSettings);

  await writeSettings(nextSettings);

  currentSettings = nextSettings;

  if (recentStorageLimitChanged) {
    setStatus('저장됨. 새 이모티콘 사용 또는 페이지 새로고침 후 반영됩니다.');
    return;
  }

  setStatus('저장됨. 열린 이모티콘 패널에 즉시 반영됩니다.');
}

async function readSettings() {
  const result = await chrome.storage.local.get(EXTENSION_SETTINGS_STORAGE_KEY);

  return normalizeExtensionSettings(result?.[EXTENSION_SETTINGS_STORAGE_KEY]);
}

async function writeSettings(settings) {
  await chrome.storage.local.set({
    [EXTENSION_SETTINGS_STORAGE_KEY]: normalizeExtensionSettings(settings),
  });
}

async function readShortcutBindingSetState() {
  const result = await chrome.storage.local.get(SHORTCUT_BINDINGS_STORAGE_KEY);

  return normalizeShortcutBindingSetState(
    result?.[SHORTCUT_BINDINGS_STORAGE_KEY]
  );
}

async function writeShortcutBindingSetState(state) {
  await chrome.storage.local.set({
    [SHORTCUT_BINDINGS_STORAGE_KEY]: normalizeShortcutBindingSetState(state),
  });
}

function getSettingsFromControls() {
  const experimentalKeyupEnabled = Boolean(keyupCheckbox.checked);

  return normalizeExtensionSettings({
    ...currentSettings,
    experimentalKeyupEnabled,
    experimentalBothPhaseEnabled:
      experimentalKeyupEnabled &&
      Boolean(bothCheckbox.checked),
    recentStorageLimit: getRecentStorageLimitFromRangeValue(
      recentStorageLimitRange.value
    ),
  });
}

function applySettingsToControls(settings) {
  const normalizedSettings = normalizeExtensionSettings(settings);

  keyupCheckbox.checked = normalizedSettings.experimentalKeyupEnabled;
  bothCheckbox.checked = normalizedSettings.experimentalBothPhaseEnabled;
  bothCheckbox.disabled = !normalizedSettings.experimentalKeyupEnabled;

  recentStorageLimitRange.value = String(
    getRecentStorageLimitRangeValue(normalizedSettings.recentStorageLimit)
  );
  updateRecentStorageLimitLabel(normalizedSettings.recentStorageLimit);

  applyShortcutSetCodesToControls(normalizedSettings);
}

function applyShortcutSetCodeToControls({
  code,
  button,
  clearButton,
  isListening = false,
}) {
  button.classList.toggle('is-listening', isListening);

  if (isListening) {
    button.textContent = '키 입력…';
    clearButton.hidden = true;
    return;
  }

  const label = getShortcutCodeLabel(code);

  button.textContent = label || '미지정';
  clearButton.hidden = !label;
}

function applyShortcutSetCodesToControls(settings) {
  const normalizedSettings = normalizeExtensionSettings(settings);

  applyShortcutSetCodeToControls({
    code: normalizedSettings.previousShortcutSetCode,
    button: previousShortcutSetButton,
    clearButton: previousShortcutSetClearButton,
    isListening:
      listeningShortcutSetTarget === SHORTCUT_SET_TARGET_PREVIOUS,
  });

  applyShortcutSetCodeToControls({
    code: normalizedSettings.nextShortcutSetCode,
    button: nextShortcutSetButton,
    clearButton: nextShortcutSetClearButton,
    isListening:
      listeningShortcutSetTarget === SHORTCUT_SET_TARGET_NEXT,
  });
}

function toggleShortcutSetCodeListening(target) {
  listeningShortcutSetTarget =
    listeningShortcutSetTarget === target
      ? ''
      : target;

  applyShortcutSetCodesToControls(currentSettings);
}

function applyShortcutSetStateToControls(state) {
  const normalizedState = normalizeShortcutBindingSetState(state);

  shortcutSetCountRange.value = String(normalizedState.setCount);
  updateShortcutSetCountLabel(normalizedState.setCount);
}

function withExperimentalPhaseHintPending({
  previousSettings,
  nextSettings,
}) {
  const normalizedPrevious = normalizeExtensionSettings(previousSettings);
  const normalizedNext = normalizeExtensionSettings(nextSettings);

  const phaseOptionEnabled = Boolean(
    normalizedNext.experimentalKeyupEnabled ||
    normalizedNext.experimentalBothPhaseEnabled
  );

  if (!phaseOptionEnabled) {
    return {
      ...normalizedNext,
      experimentalPhaseHintPending: false,
    };
  }

  const phaseOptionTurnedOn = Boolean(
    (
      !normalizedPrevious.experimentalKeyupEnabled &&
      normalizedNext.experimentalKeyupEnabled
    ) ||
    (
      !normalizedPrevious.experimentalBothPhaseEnabled &&
      normalizedNext.experimentalBothPhaseEnabled
    )
  );

  return {
    ...normalizedNext,
    experimentalPhaseHintPending: Boolean(
      normalizedPrevious.experimentalPhaseHintPending ||
      phaseOptionTurnedOn
    ),
  };
}

function createDefaultShortcutBindingSetState() {
  return {
    version: SHORTCUT_BINDING_SETS_VERSION,
    activeSetId: createShortcutBindingSetId(1),
    setCount: DEFAULT_SHORTCUT_SET_COUNT,
    sets: [],
  };
}

function normalizeShortcutBindingSetState(state) {
  if (!state || typeof state !== 'object') {
    return createDefaultShortcutBindingSetState();
  }

  const setCount = normalizeShortcutSetCount(state?.setCount);
  const activeSetId = normalizeActiveSetIdForSetCount({
    activeSetId: state?.activeSetId,
    setCount,
  });

  return {
    version: SHORTCUT_BINDING_SETS_VERSION,
    activeSetId,
    setCount,
    sets: normalizeShortcutBindingSets(state?.sets),
  };
}

function normalizeShortcutBindingSets(sets) {
  if (!Array.isArray(sets)) {
    return [];
  }

  return sets
    .map(normalizeShortcutBindingSet)
    .filter(Boolean)
    .sort((a, b) => {
      return getShortcutBindingSetIndex(a.id) - getShortcutBindingSetIndex(b.id);
    });
}

function normalizeShortcutBindingSet(set) {
  const setId = normalizeShortcutBindingSetId(set?.id);

  if (
    !setId ||
    setId === SHORTCUT_BINDING_SET_OFF
  ) {
    return null;
  }

  return {
    id: setId,
    label: normalizeShortcutBindingSetLabel({
      setId,
      label: set?.label,
    }),
    bindings: Array.isArray(set?.bindings)
      ? set.bindings
      : [],
  };
}

function normalizeShortcutBindingSetId(setId) {
  const normalizedSetId = String(setId ?? '').trim();

  if (normalizedSetId === SHORTCUT_BINDING_SET_OFF) {
    return SHORTCUT_BINDING_SET_OFF;
  }

  const index = getShortcutBindingSetIndex(normalizedSetId);

  return createShortcutBindingSetId(index);
}

function normalizeShortcutBindingSetLabel({
  setId,
  label,
}) {
  const normalizedLabel = String(label ?? '').trim();
  const defaultLabel = String(getShortcutBindingSetIndex(setId) || '');

  if (!normalizedLabel) {
    return '';
  }

  if (normalizedLabel === defaultLabel) {
    return '';
  }

  return normalizedLabel;
}

function normalizeActiveSetIdForSetCount({
  activeSetId,
  setCount,
}) {
  const normalizedActiveSetId = normalizeShortcutBindingSetId(activeSetId);

  if (normalizedActiveSetId === SHORTCUT_BINDING_SET_OFF) {
    return SHORTCUT_BINDING_SET_OFF;
  }

  const activeIndex = getShortcutBindingSetIndex(normalizedActiveSetId);

  if (
    activeIndex >= MIN_SHORTCUT_SET_COUNT &&
    activeIndex <= setCount
  ) {
    return normalizedActiveSetId;
  }

  return createShortcutBindingSetId(1);
}

function createShortcutBindingSetId(index) {
  const normalizedIndex = Number(index);

  if (
    !Number.isInteger(normalizedIndex) ||
    normalizedIndex < MIN_SHORTCUT_SET_COUNT ||
    normalizedIndex > MAX_SHORTCUT_SET_COUNT
  ) {
    return '';
  }

  return `set_${normalizedIndex}`;
}

function getShortcutBindingSetIndex(setId) {
  const match = String(setId ?? '').trim().match(/^set_(\d+)$/);

  if (!match) {
    return 0;
  }

  return Number(match[1]) || 0;
}

function getShortcutSetCodeSettingKey(target) {
  if (target === SHORTCUT_SET_TARGET_PREVIOUS) {
    return 'previousShortcutSetCode';
  }

  if (target === SHORTCUT_SET_TARGET_NEXT) {
    return 'nextShortcutSetCode';
  }

  return '';
}

async function saveShortcutSetCode({
  target,
  code,
}) {
  const settingKey = getShortcutSetCodeSettingKey(target);

  if (!settingKey) {
    return false;
  }

  const nextSettings = normalizeExtensionSettings({
    ...currentSettings,
    [settingKey]: code,
  });

  try {
    await writeSettings(nextSettings);

    currentSettings = nextSettings;
    listeningShortcutSetTarget = '';

    applyShortcutSetCodesToControls(currentSettings);
    setStatus('저장됨. 열린 페이지에 즉시 반영됩니다.');

    return true;
  } catch (error) {
    console.debug(
      '[Emozzk Lite] failed to save shortcut set code:',
      error
    );

    applyShortcutSetCodesToControls(currentSettings);
    setStatus('저장에 실패했습니다.');

    return false;
  }
}

async function clearShortcutSetCode(target) {
  await saveShortcutSetCode({
    target,
    code: '',
  });
}

function normalizeShortcutSetCount(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return DEFAULT_SHORTCUT_SET_COUNT;
  }

  return clampNumber(
    Math.round(number),
    MIN_SHORTCUT_SET_COUNT,
    MAX_SHORTCUT_SET_COUNT
  );
}

function updateShortcutSetCountLabel(value) {
  shortcutSetCountValue.textContent =
    `${normalizeShortcutSetCount(value)}개`;

  updateRangeProgress(shortcutSetCountRange);
}

function updateRecentStorageLimitLabel(value) {
  recentStorageLimitValue.textContent =
    `${normalizeRecentStorageLimit(value)}개`;

  updateRangeProgress(recentStorageLimitRange);
}

function clampNumber(value, min, max) {
  return Math.min(
    max,
    Math.max(min, value)
  );
}


function setStatus(message) {
  statusText.textContent = message;

  window.setTimeout(() => {
    if (statusText.textContent === message) {
      statusText.textContent = '';
    }
  }, 2200);
}

function renderPopupVersion() {
  if (!versionText) return;

  try {
    const version = chrome.runtime.getManifest?.().version;

    versionText.textContent = version
      ? `v${version}`
      : '';
  } catch {
    versionText.textContent = '';
  }
}

function updateRangeProgress(range) {
  if (!(range instanceof HTMLInputElement)) return;

  const min = Number(range.min || 0);
  const max = Number(range.max || 100);
  const value = Number(range.value || min);

  const progress = max > min
    ? ((value - min) / (max - min)) * 100
    : 0;

  range.style.setProperty(
    '--popup-range-progress',
    `${clampNumber(progress, 0, 100)}%`
  );
}