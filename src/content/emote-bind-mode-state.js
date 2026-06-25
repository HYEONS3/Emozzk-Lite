import {
  SHORTCUT_PHASE_BOTH,
  SHORTCUT_PHASE_DOWN,
  SHORTCUT_PHASE_UP,
  normalizeShortcutPhase,
} from './shortcut-storage.js';

import {
  isExperimentalBothPhaseEnabled,
  isExperimentalKeyupEnabled,
} from './extension-settings-storage.js';

import {
  getShortcutCodeLabel,
} from './shortcut-key-code.js';

export const EMOTE_BIND_MODE_NONE = 'none';
export const EMOTE_BIND_MODE_ASSIGN = 'assign';
export const EMOTE_BIND_MODE_CLEAR = 'clear';

export const EMOTE_BIND_MODE_CHANGED_EVENT = 'emzk-lite-emote-bind-mode-changed';

const DEFAULT_BIND_MODE_STATE = {
  mode: EMOTE_BIND_MODE_NONE,

  selectedEmojiId: '',
  selectedEmojiLabel: '',
  selectedEmojiImageUrl: '',

  selectedCode: '',
  selectedPhase: SHORTCUT_PHASE_DOWN,

  /*
   * clear mode 전용 임시 선택 목록.
   * 실제 단축키 해제는 save 시점에만 수행한다.
   */
  selectedClearEmojiIds: [],

  keyListening: false,
};

let bindModeState = {
  ...DEFAULT_BIND_MODE_STATE,
};

export function getEmoteBindModeState() {
  return {
    ...bindModeState,
    selectedClearEmojiIds: [
      ...bindModeState.selectedClearEmojiIds,
    ],
  };
}

export function setEmoteBindModeState(nextState = {}) {
  const previousState = bindModeState;

  bindModeState = normalizeBindModeState({
    ...previousState,
    ...nextState,
  });

  dispatchEmoteBindModeChanged({
    previousState,
    nextState: bindModeState,
  });

  return getEmoteBindModeState();
}

export function resetEmoteBindModeState() {
  const previousState = bindModeState;

  bindModeState = {
    ...DEFAULT_BIND_MODE_STATE,
    selectedClearEmojiIds: [],
  };

  dispatchEmoteBindModeChanged({
    previousState,
    nextState: bindModeState,
  });

  return getEmoteBindModeState();
}

/*
 * popup 실험실 설정이 바뀌었을 때 현재 selectedPhase가
 * 더 이상 허용되지 않는 값이면 down으로 정규화한다.
 */
export function refreshEmoteBindModeStateForSettings() {
  return setEmoteBindModeState({
    selectedPhase: bindModeState.selectedPhase,
  });
}

export function enterEmoteBindAssignMode() {
  return setEmoteBindModeState({
    mode: EMOTE_BIND_MODE_ASSIGN,
    selectedClearEmojiIds: [],
    keyListening: false,
  });
}

export function enterEmoteBindClearMode() {
  return setEmoteBindModeState({
    mode: EMOTE_BIND_MODE_CLEAR,

    selectedEmojiId: '',
    selectedEmojiLabel: '',
    selectedEmojiImageUrl: '',

    selectedClearEmojiIds: [],
    keyListening: false,
  });
}

export function exitEmoteBindMode() {
  return resetEmoteBindModeState();
}

export function toggleEmoteBindAssignMode() {
  if (isEmoteBindAssignMode()) {
    return exitEmoteBindMode();
  }

  return enterEmoteBindAssignMode();
}

export function toggleEmoteBindClearMode() {
  if (isEmoteBindClearMode()) {
    return exitEmoteBindMode();
  }

  return enterEmoteBindClearMode();
}

export function selectEmoteBindTarget({
  emojiId,
  emojiLabel = '',
  emojiImageUrl = '',
}) {
  if (!isEmoteBindAssignMode()) {
    return getEmoteBindModeState();
  }

  return setEmoteBindModeState({
    selectedEmojiId: normalizeText(emojiId),
    selectedEmojiLabel: normalizeText(emojiLabel),
    selectedEmojiImageUrl: normalizeText(emojiImageUrl),
    keyListening: false,
  });
}

export function clearEmoteBindTarget() {
  return setEmoteBindModeState({
    selectedEmojiId: '',
    selectedEmojiLabel: '',
    selectedEmojiImageUrl: '',
    keyListening: false,
  });
}

export function setEmoteBindCode(code) {
  const normalizedCode = normalizeEmoteBindCode(code);

  if (!normalizedCode) {
    return getEmoteBindModeState();
  }

  return setEmoteBindModeState({
    selectedCode: normalizedCode,
    keyListening: false,
  });
}

export function setEmoteBindPhase(phase) {
  return setEmoteBindModeState({
    selectedPhase: normalizeEmoteBindPhase(phase),
    keyListening: false,
  });
}

export function cycleEmoteBindPhase() {
  return setEmoteBindPhase(
    getNextEmoteBindPhase(bindModeState.selectedPhase)
  );
}

export function startEmoteBindKeyListening() {
  if (!isEmoteBindAssignMode()) {
    return getEmoteBindModeState();
  }

  return setEmoteBindModeState({
    keyListening: true,
  });
}

export function stopEmoteBindKeyListening() {
  return setEmoteBindModeState({
    keyListening: false,
  });
}

export function setEmoteBindClearSelection(emojiIds) {
  if (!isEmoteBindClearMode()) {
    return getEmoteBindModeState();
  }

  return setEmoteBindModeState({
    selectedClearEmojiIds: normalizeEmojiIdList(emojiIds),
    keyListening: false,
  });
}

export function addEmoteBindClearSelection(emojiId) {
  if (!isEmoteBindClearMode()) {
    return getEmoteBindModeState();
  }

  const normalizedEmojiId = normalizeText(emojiId);

  if (!normalizedEmojiId) {
    return getEmoteBindModeState();
  }

  return setEmoteBindClearSelection([
    ...bindModeState.selectedClearEmojiIds,
    normalizedEmojiId,
  ]);
}

export function removeEmoteBindClearSelection(emojiId) {
  if (!isEmoteBindClearMode()) {
    return getEmoteBindModeState();
  }

  const normalizedEmojiId = normalizeText(emojiId);

  if (!normalizedEmojiId) {
    return getEmoteBindModeState();
  }

  return setEmoteBindClearSelection(
    bindModeState.selectedClearEmojiIds.filter((selectedEmojiId) => {
      return selectedEmojiId !== normalizedEmojiId;
    })
  );
}

export function toggleEmoteBindClearSelection(emojiId) {
  if (!isEmoteBindClearMode()) {
    return getEmoteBindModeState();
  }

  const normalizedEmojiId = normalizeText(emojiId);

  if (!normalizedEmojiId) {
    return getEmoteBindModeState();
  }

  if (hasEmoteBindClearSelection(normalizedEmojiId)) {
    return removeEmoteBindClearSelection(normalizedEmojiId);
  }

  return addEmoteBindClearSelection(normalizedEmojiId);
}

export function clearEmoteBindClearSelection() {
  if (!isEmoteBindClearMode()) {
    return getEmoteBindModeState();
  }

  return setEmoteBindClearSelection([]);
}

export function hasEmoteBindClearSelection(emojiId) {
  const normalizedEmojiId = normalizeText(emojiId);

  if (!normalizedEmojiId) {
    return false;
  }

  return bindModeState.selectedClearEmojiIds.includes(normalizedEmojiId);
}

export function getEmoteBindClearSelectionCount() {
  return bindModeState.selectedClearEmojiIds.length;
}

export function isEmoteBindModeActive() {
  return bindModeState.mode !== EMOTE_BIND_MODE_NONE;
}

export function isEmoteBindAssignMode() {
  return bindModeState.mode === EMOTE_BIND_MODE_ASSIGN;
}

export function isEmoteBindClearMode() {
  return bindModeState.mode === EMOTE_BIND_MODE_CLEAR;
}

export function isEmoteBindKeyListening() {
  return Boolean(bindModeState.keyListening);
}

export function isEmoteBindExperimentalKeyupEnabled() {
  return isExperimentalKeyupEnabled();
}

export function getEmoteBindAvailableCodes() {
  return [
    'F1',
    'F2',
    'F3',
    'F4',
    'F5',
    'F6',
    'F7',
    'F8',
    'F9',
    'F10',
  ];
}

export function getEmoteBindAvailablePhases() {
  if (!isExperimentalKeyupEnabled()) {
    return [SHORTCUT_PHASE_DOWN];
  }

  if (!isExperimentalBothPhaseEnabled()) {
    return [
      SHORTCUT_PHASE_DOWN,
      SHORTCUT_PHASE_UP,
    ];
  }

  return [
    SHORTCUT_PHASE_DOWN,
    SHORTCUT_PHASE_UP,
    SHORTCUT_PHASE_BOTH,
  ];
}

export function getNextEmoteBindPhase(phase) {
  const availablePhases = getEmoteBindAvailablePhases();

  if (!availablePhases.length) {
    return SHORTCUT_PHASE_DOWN;
  }

  const normalizedPhase = normalizeEmoteBindPhase(phase);
  const currentIndex = availablePhases.indexOf(normalizedPhase);

  if (currentIndex < 0) {
    return availablePhases[0];
  }

  return availablePhases[
    (currentIndex + 1) % availablePhases.length
  ];
}

export function getEmoteBindPhaseLabel(phase) {
  const normalizedPhase = normalizeEmoteBindPhase(phase);

  if (normalizedPhase === SHORTCUT_PHASE_UP) {
    return '↑';
  }

  if (normalizedPhase === SHORTCUT_PHASE_BOTH) {
    return '↓↑';
  }

  return '↓';
}

export function getEmoteBindPhaseDescription(phase) {
  const normalizedPhase = normalizeEmoteBindPhase(phase);

  if (normalizedPhase === SHORTCUT_PHASE_UP) {
    return '키를 뗄 때';
  }

  if (normalizedPhase === SHORTCUT_PHASE_BOTH) {
    return '키를 누를 때와 뗄 때';
  }

  return '키를 누를 때';
}

export function getEmoteBindCodeLabel(code) {
  const label = getShortcutCodeLabel(code);

  if (!label) {
    return 'KEY';
  }

  return label;
}

function normalizeBindModeState(state) {
  const normalizedMode = normalizeBindMode(state.mode);

  return {
    mode: normalizedMode,

    selectedEmojiId: normalizedMode === EMOTE_BIND_MODE_ASSIGN
      ? normalizeText(state.selectedEmojiId)
      : '',
    selectedEmojiLabel: normalizedMode === EMOTE_BIND_MODE_ASSIGN
      ? normalizeText(state.selectedEmojiLabel)
      : '',
    selectedEmojiImageUrl: normalizedMode === EMOTE_BIND_MODE_ASSIGN
      ? normalizeText(state.selectedEmojiImageUrl)
      : '',

    selectedCode: normalizeEmoteBindCode(state.selectedCode) ||
      DEFAULT_BIND_MODE_STATE.selectedCode,
    selectedPhase: normalizeEmoteBindPhase(state.selectedPhase),

    selectedClearEmojiIds: normalizedMode === EMOTE_BIND_MODE_CLEAR
      ? normalizeEmojiIdList(state.selectedClearEmojiIds)
      : [],

    keyListening: normalizedMode === EMOTE_BIND_MODE_ASSIGN
      ? Boolean(state.keyListening)
      : false,
  };
}

function normalizeBindMode(mode) {
  if (mode === EMOTE_BIND_MODE_ASSIGN) {
    return EMOTE_BIND_MODE_ASSIGN;
  }

  if (mode === EMOTE_BIND_MODE_CLEAR) {
    return EMOTE_BIND_MODE_CLEAR;
  }

  return EMOTE_BIND_MODE_NONE;
}

function normalizeEmoteBindCode(code) {
  const normalizedCode = normalizeText(code);

  if (!normalizedCode) {
    return '';
  }

  if (isBlockedBindCode(normalizedCode)) {
    return '';
  }

  return normalizedCode;
}

function normalizeEmoteBindPhase(phase) {
  const availablePhases = getEmoteBindAvailablePhases();
  const normalizedPhase = normalizeShortcutPhase(phase);

  if (availablePhases.includes(normalizedPhase)) {
    return normalizedPhase;
  }

  return SHORTCUT_PHASE_DOWN;
}

function normalizeEmojiIdList(values) {
  const result = [];
  const seen = new Set();

  if (!Array.isArray(values)) {
    return result;
  }

  values.forEach((value) => {
    const emojiId = normalizeText(value);

    if (!emojiId) return;
    if (seen.has(emojiId)) return;

    seen.add(emojiId);
    result.push(emojiId);
  });

  return result;
}

function isBlockedBindCode(code) {
  return (
    code === 'Escape' ||
    code === 'Tab' ||
    code === 'CapsLock' ||
    code === 'ContextMenu' ||

    code === 'ShiftLeft' ||
    code === 'ShiftRight' ||

    code === 'ControlLeft' ||
    code === 'ControlRight' ||

    code === 'AltLeft' ||
    code === 'AltRight' ||

    code === 'MetaLeft' ||
    code === 'MetaRight'
  );
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function dispatchEmoteBindModeChanged({
  previousState,
  nextState,
}) {
  window.dispatchEvent(
    new CustomEvent(EMOTE_BIND_MODE_CHANGED_EVENT, {
      detail: {
        previousState: {
          ...previousState,
          selectedClearEmojiIds: [
            ...(previousState.selectedClearEmojiIds || []),
          ],
        },
        nextState: {
          ...nextState,
          selectedClearEmojiIds: [
            ...(nextState.selectedClearEmojiIds || []),
          ],
        },
      },
    })
  );
}