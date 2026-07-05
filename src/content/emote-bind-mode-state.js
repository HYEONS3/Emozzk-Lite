import {
  SHORTCUT_PHASE_BOTH,
  SHORTCUT_PHASE_DOWN,
  SHORTCUT_PHASE_UP,
  normalizeShortcutPhase,
} from './shortcut-storage.js';

import {
  consumeExperimentalPhaseHintPending,
  isExperimentalBothPhaseEnabled,
  isExperimentalKeyupEnabled,
  isExperimentalPhaseHintPending,
} from './extension-settings-storage.js';

import {
  getShortcutCodeLabel,
  normalizeStoredShortcutCode,
} from '../shared/shortcut-key-code.js';

export const EMOTE_BIND_MODE_NONE = 'none';
export const EMOTE_BIND_MODE_ASSIGN = 'assign';
export const EMOTE_BIND_MODE_CLEAR = 'clear';
export const EMOTE_BIND_MODE_RENAME = 'rename';




export const EMOTE_BIND_MODE_CHANGED_EVENT = 'emzk-lite-emote-bind-mode-changed';

const DEFAULT_BIND_MODE_STATE = {
  mode: EMOTE_BIND_MODE_NONE,

  selectedEmojiId: '',
  selectedEmojiLabel: '',
  selectedEmojiImageUrl: '',

  selectedCode: '',
  selectedPhase: SHORTCUT_PHASE_DOWN,

  selectedClearEmojiIds: [],

  renameValue: '',
  renameSaving: false,

  keyListening: false,
  isSaving: false,
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

    selectedEmojiId: '',
    selectedEmojiLabel: '',
    selectedEmojiImageUrl: '',
    selectedCode: '',
    selectedPhase: SHORTCUT_PHASE_DOWN,

    selectedClearEmojiIds: [],
    renameValue: '',
    renameSaving: false,

    keyListening: false,
    isSaving: false,
  });
}

export function enterEmoteBindClearMode() {
  return setEmoteBindModeState({
    mode: EMOTE_BIND_MODE_CLEAR,

    selectedEmojiId: '',
    selectedEmojiLabel: '',
    selectedEmojiImageUrl: '',
    selectedCode: '',

    selectedClearEmojiIds: [],
    keyListening: false,
    isSaving: false,
  });
}

export function enterShortcutSetRenameMode({
  renameValue = '',
} = {}) {
  return setEmoteBindModeState({
    mode: EMOTE_BIND_MODE_RENAME,

    selectedEmojiId: '',
    selectedEmojiLabel: '',
    selectedEmojiImageUrl: '',
    selectedCode: '',

    selectedClearEmojiIds: [],
    renameValue: normalizeText(renameValue),
    renameSaving: false,

    keyListening: false,
    isSaving: false,
  });
}

export function exitShortcutSetRenameMode() {
  if (!isShortcutSetRenameMode()) {
    return getEmoteBindModeState();
  }

  return exitEmoteBindMode();
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
  emojiLabel,
  emojiImageUrl,
  code = '',
  phase = '',
}) {
  const previousState = getEmoteBindModeState();
  const selectedCode = normalizeStoredShortcutCode(code);

  setEmoteBindModeState({
    ...previousState,
    selectedEmojiId: normalizeText(emojiId),
    selectedEmojiLabel: normalizeText(emojiLabel),
    selectedEmojiImageUrl: normalizeText(emojiImageUrl),
    selectedCode,
    selectedPhase: selectedCode
      ? normalizeEmoteBindPhase(phase)
      : normalizeEmoteBindPhase(previousState.selectedPhase),
    keyListening: false,
  });
}

export function clearEmoteBindTarget() {
  return setEmoteBindModeState({
    selectedEmojiId: '',
    selectedEmojiLabel: '',
    selectedEmojiImageUrl: '',
    selectedCode: '',
    keyListening: false,
  });
}

export function setEmoteBindCode(code) {
  const previousState = getEmoteBindModeState();
  const selectedCode = normalizeStoredShortcutCode(code);

  if (
    previousState.mode !== EMOTE_BIND_MODE_ASSIGN ||
    !selectedCode
  ) {
    return getEmoteBindModeState();
  }

  setEmoteBindModeState({
    ...previousState,
    selectedCode,
    selectedPhase: normalizeEmoteBindPhase(previousState.selectedPhase),

    /*
     * Save 전까지 다른 키를 입력하면 단축키 후보를 교체할 수 있게 유지한다.
     * Escape는 bind 전체 취소로 처리한다.
     */
    keyListening: true,
  });
}

export function setEmoteBindPhase(phase) {
  const previousState = getEmoteBindModeState();

  if (previousState.mode !== EMOTE_BIND_MODE_ASSIGN) {
    return getEmoteBindModeState();
  }

  setEmoteBindModeState({
    ...previousState,
    selectedPhase: normalizeEmoteBindPhase(phase),
  });
}

export function setShortcutSetRenameValue(value) {
  if (!isShortcutSetRenameMode()) {
    return getEmoteBindModeState();
  }

  return setEmoteBindModeState({
    renameValue: normalizeInputText(value),
  });
}

export function setShortcutSetRenameSaving(isSaving) {
  if (!isShortcutSetRenameMode()) {
    return getEmoteBindModeState();
  }

  return setEmoteBindModeState({
    renameSaving: Boolean(isSaving),
  });
}

export function cycleEmoteBindPhase() {
  return setEmoteBindPhase(
    getNextEmoteBindPhase(bindModeState.selectedPhase)
  );
}

export function startEmoteBindKeyListening() {
  const previousState = getEmoteBindModeState();

  if (previousState.mode !== EMOTE_BIND_MODE_ASSIGN) {
    return;
  }

  if (!normalizeText(previousState.selectedEmojiId)) {
    return;
  }

  setEmoteBindModeState({
    ...previousState,
    keyListening: true,
  });
}

export function stopEmoteBindKeyListening() {
  return setEmoteBindModeState({
    keyListening: false,
  });
}

export function setEmoteBindSaving(isSaving) {
  if (
    !isEmoteBindAssignMode() &&
    !isEmoteBindClearMode()
  ) {
    return getEmoteBindModeState();
  }

  return setEmoteBindModeState({
    isSaving: Boolean(isSaving),
    keyListening: false,
  });
}

export function isEmoteBindSaving() {
  return Boolean(bindModeState.isSaving);
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

export function shouldShowEmoteBindPhaseFirstHint() {
  return Boolean(
    isExperimentalKeyupEnabled() &&
    isExperimentalPhaseHintPending()
  );
}

export async function consumeEmoteBindPhaseFirstHint() {
  if (!shouldShowEmoteBindPhaseFirstHint()) {
    return;
  }

  await consumeExperimentalPhaseHintPending();
}

export function isShortcutSetRenameMode() {
  return bindModeState.mode === EMOTE_BIND_MODE_RENAME;
}

export function isShortcutSetRenameSaving() {
  return Boolean(bindModeState.renameSaving);
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

    selectedCode: normalizedMode === EMOTE_BIND_MODE_ASSIGN
      ? normalizeEmoteBindCode(state.selectedCode) ||
        DEFAULT_BIND_MODE_STATE.selectedCode
      : '',
    selectedPhase: normalizedMode === EMOTE_BIND_MODE_ASSIGN
      ? normalizeEmoteBindPhase(state.selectedPhase)
      : SHORTCUT_PHASE_DOWN,

    selectedClearEmojiIds: normalizedMode === EMOTE_BIND_MODE_CLEAR
      ? normalizeEmojiIdList(state.selectedClearEmojiIds)
      : [],

		renameValue: normalizedMode === EMOTE_BIND_MODE_RENAME
			? normalizeInputText(state.renameValue)
			: '',
    renameSaving: normalizedMode === EMOTE_BIND_MODE_RENAME
      ? Boolean(state.renameSaving)
      : false,

    keyListening: normalizedMode === EMOTE_BIND_MODE_ASSIGN
      ? Boolean(state.keyListening) && !Boolean(state.isSaving)
      : false,

		isSaving: (
			normalizedMode === EMOTE_BIND_MODE_ASSIGN ||
			normalizedMode === EMOTE_BIND_MODE_CLEAR
		)
			? Boolean(state.isSaving)
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

  if (mode === EMOTE_BIND_MODE_RENAME) {
    return EMOTE_BIND_MODE_RENAME;
  }

  return EMOTE_BIND_MODE_NONE;
}

function normalizeEmoteBindCode(code) {
  return normalizeStoredShortcutCode(code);
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
        previousState: cloneBindModeStateForEvent(previousState),
        nextState: cloneBindModeStateForEvent(nextState),
      },
    })
  );
}

function cloneBindModeStateForEvent(state) {
  return {
    ...state,
    selectedClearEmojiIds: [
      ...(state.selectedClearEmojiIds || []),
    ],
  };
}



function normalizeInputText(value) {
  return String(value ?? '');
}