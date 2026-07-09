import {
  createSelectEmoteIdAction,
  normalizeShortcutBinding,
} from './shortcut-bindings.js';

import {
  normalizeStoredShortcutCode,
} from '../shared/shortcut-key-code.js';

import {
  createStorageWriteQueue,
} from './storage-write-queue.js';

export const SHORTCUT_BINDINGS_STORAGE_KEY = 'emzk_lite_shortcut_bindings_v1';
export const SHORTCUT_BINDINGS_CHANGED_EVENT = 'emzk-lite-shortcut-bindings-changed';

export const SHORTCUT_PHASE_DOWN = 'down';
export const SHORTCUT_PHASE_UP = 'up';
export const SHORTCUT_PHASE_BOTH = 'both';

export const SHORTCUT_BINDING_SET_OFF = 'off';

export const SHORTCUT_BINDING_SET_MIN_COUNT = 1;
export const SHORTCUT_BINDING_SET_MAX_COUNT = 9;
export const SHORTCUT_BINDING_SET_DEFAULT_COUNT = 2;

/*
 * 기존 import 호환용.
 * 신규 로직은 createShortcutBindingSetId(index)를 기준으로 처리한다.
 */
export const SHORTCUT_BINDING_SET_1 = 'set_1';
export const SHORTCUT_BINDING_SET_2 = 'set_2';
export const SHORTCUT_BINDING_SET_3 = 'set_3';

const SHORTCUT_BINDING_SETS_VERSION = 5;

const USER_BINDING_SOURCE = 'user';

let cachedShortcutBindingSetState = createDefaultShortcutBindingSetState();
let storageSyncStarted = false;
let storageChangeRevision = 0;
const storageWriteQueue = createStorageWriteQueue();

export async function initShortcutBindingsStorage() {
  startShortcutBindingsStorageSync();

  const revisionBeforeRead = storageChangeRevision;
  const storageEntry = await readShortcutBindingsStorageEntry();

  if (storageChangeRevision === revisionBeforeRead) {
    cachedShortcutBindingSetState = normalizeShortcutBindingSetState({
      storedValue: storageEntry.value,
      hasStoredValue: storageEntry.hasStoredValue,
    });
  }

  if (
    storageChangeRevision === revisionBeforeRead &&
    shouldMigrateShortcutBindingStorage(storageEntry)
  ) {
    await writeShortcutBindingSetStateToStorage(cachedShortcutBindingSetState);
  }

  dispatchShortcutBindingsChanged();

  return getCachedShortcutBindings();
}

export function startShortcutBindingsStorageSync() {
  if (storageSyncStarted) {
    return;
  }

  storageSyncStarted = true;

  if (!globalThis.chrome?.storage?.onChanged?.addListener) {
    return;
  }

  chrome.storage.onChanged.addListener(handleShortcutBindingsStorageChanged);
}

export function stopShortcutBindingsStorageSync() {
  if (!storageSyncStarted) {
    return;
  }

  storageSyncStarted = false;

  chrome.storage?.onChanged?.removeListener?.(
    handleShortcutBindingsStorageChanged
  );
}

function handleShortcutBindingsStorageChanged(changes, areaName) {
	if (!storageSyncStarted) {
		return;
	}

	if (areaName !== 'local') {
		return;
	}

	const change = changes[SHORTCUT_BINDINGS_STORAGE_KEY];

	if (!change) {
		return;
	}

  if (storageWriteQueue.hasPending()) {
    return;
  }

	const nextState = normalizeShortcutBindingSetState({
		storedValue: change.newValue,
		hasStoredValue: Boolean(change.newValue),
	});

  storageChangeRevision += 1;

	if (isSameShortcutBindingSetState(
		cachedShortcutBindingSetState,
		nextState
	)) {
		return;
	}

	cachedShortcutBindingSetState = nextState;

	dispatchShortcutBindingsChanged();

}

export function getCachedShortcutBindings() {
  if (cachedShortcutBindingSetState.activeSetId === SHORTCUT_BINDING_SET_OFF) {
    return [];
  }

  return getShortcutBindingsForSet(
    cachedShortcutBindingSetState,
    cachedShortcutBindingSetState.activeSetId
  );
}

export function getCachedShortcutBindingSetState() {
  return cloneShortcutBindingSetState(cachedShortcutBindingSetState);
}

export function getCachedActiveShortcutBindingSetId() {
  return cachedShortcutBindingSetState.activeSetId;
}

export async function setActiveShortcutBindingSet(setId) {
  const normalizedSetId = normalizeVisibleShortcutBindingSetId({
    setId,
    setCount: cachedShortcutBindingSetState.setCount,
  });

  if (!normalizedSetId) {
    return getCachedShortcutBindings();
  }

  if (cachedShortcutBindingSetState.activeSetId === normalizedSetId) {
    return getCachedShortcutBindings();
  }

  const nextState = {
    ...cachedShortcutBindingSetState,
    activeSetId: normalizedSetId,
  };

  await persistShortcutBindingSetState(nextState);

  return getCachedShortcutBindings();
}

export async function setShortcutBindingSetCount(count) {
  const setCount = normalizeShortcutBindingSetCount(count);

  const nextState = normalizeShortcutBindingSetStateValue({
    ...cachedShortcutBindingSetState,
    setCount,
    activeSetId: normalizeActiveShortcutBindingSetIdForCount({
      activeSetId: cachedShortcutBindingSetState.activeSetId,
      setCount,
    }),
  });

  await persistShortcutBindingSetState(nextState);

  return getCachedShortcutBindingSetState();
}

export async function setShortcutBindings(bindings) {
  const normalizedBindings = normalizeShortcutBindings(bindings);

  const nextState = setShortcutBindingsForActiveSet({
    state: cachedShortcutBindingSetState,
    bindings: normalizedBindings,
  });

  await persistShortcutBindingSetState(nextState);

  return getCachedShortcutBindings();
}

export async function resetShortcutBindingsToDefault() {
  await persistShortcutBindingSetState(
    createDefaultShortcutBindingSetState(),
    {
      removeStorage: true,
    }
  );

  return getCachedShortcutBindings();
}

export async function clearShortcutBindings() {
  const nextState = setShortcutBindingsForActiveSet({
    state: cachedShortcutBindingSetState,
    bindings: [],
  });

  await persistShortcutBindingSetState(nextState);

  return getCachedShortcutBindings();
}

export async function assignShortcutBindingTarget({
  code,
  phase,
  emojiId,
}) {
  const normalizedCode = normalizeShortcutCode(code);
  const normalizedPhase = normalizeShortcutPhase(phase);
  const normalizedEmojiId = normalizeEmojiId(emojiId);

  if (
    !normalizedCode ||
    !normalizedPhase ||
    !normalizedEmojiId
  ) {
    return getCachedShortcutBindings();
  }

  const phasesToAssign = getStoragePhasesFromPhase(normalizedPhase);
  const baseBindings = getEditableShortcutBindings(getCachedShortcutBindings());

  /*
   * 저장 정책:
   * - 저장소에는 both를 직접 저장하지 않고 down/up 두 개로 저장한다.
   * - 같은 code + phase 조합은 하나만 유지한다.
   * - 한 이모티콘은 현재 세트에서 하나의 논리적 단축키만 가진다.
   * - 같은 emojiId의 기존 바인딩은 code/phase와 관계없이 모두 교체한다.
   *
   * 세트 정책:
   * - assign은 현재 active set에만 적용한다.
   * - set_1의 F1과 set_2의 F1은 서로 독립이다.
   */
  const nextBindings = baseBindings.filter((binding) => {
    const bindingCode = normalizeShortcutCode(binding.code);
    const bindingPhase = normalizeStoredPhase(binding.phase);
    const bindingEmojiId = getBindingEmojiId(binding);

    if (bindingEmojiId === normalizedEmojiId) {
      return false;
    }

    if (bindingCode !== normalizedCode) {
      return true;
    }

    return !phasesToAssign.includes(bindingPhase);
  });

  phasesToAssign.forEach((phaseToAssign) => {
    nextBindings.push(createEmojiShortcutBinding({
      code: normalizedCode,
      phase: phaseToAssign,
      emojiId: normalizedEmojiId,
    }));
  });

  return setShortcutBindings(nextBindings);
}

export function getShortcutBindingForEmojiId({
  emojiId,
} = {}) {
  const normalizedEmojiId = normalizeEmojiId(emojiId);

  if (!normalizedEmojiId) {
    return null;
  }

  const matchingBindings = getCachedShortcutBindings().filter((binding) => {
    return getBindingEmojiId(binding) === normalizedEmojiId;
  });

  if (!matchingBindings.length) {
    return null;
  }

	const code = normalizeShortcutCode(
		matchingBindings[0]?.code
	);

  if (!code) {
    return null;
  }

  const phases = new Set(
    matchingBindings
      .filter((binding) => normalizeShortcutCode(binding.code) === code)
      .map((binding) => normalizeStoredPhase(binding.phase))
  );

  const phase = phases.has(SHORTCUT_PHASE_DOWN) && phases.has(SHORTCUT_PHASE_UP)
    ? SHORTCUT_PHASE_BOTH
    : phases.has(SHORTCUT_PHASE_UP)
      ? SHORTCUT_PHASE_UP
      : SHORTCUT_PHASE_DOWN;

  return {
    code,
    phase,
  };
}

export async function clearShortcutBindingTarget({
  code,
  phase,
}) {
  const normalizedCode = normalizeShortcutCode(code);
  const normalizedPhase = normalizeShortcutPhase(phase);

  if (
    !normalizedCode ||
    !normalizedPhase
  ) {
    return getCachedShortcutBindings();
  }

  const phasesToClear = getStoragePhasesFromPhase(normalizedPhase);
  const baseBindings = getEditableShortcutBindings(getCachedShortcutBindings());

  const nextBindings = baseBindings.filter((binding) => {
    const bindingCode = normalizeShortcutCode(binding.code);
    const bindingPhase = normalizeStoredPhase(binding.phase);

    if (bindingCode !== normalizedCode) {
      return true;
    }

    return !phasesToClear.includes(bindingPhase);
  });

  return setShortcutBindings(nextBindings);
}

export async function clearShortcutBindingsByEmojiId({
  emojiId,
}) {
  const normalizedEmojiId = normalizeEmojiId(emojiId);

  if (!normalizedEmojiId) {
    return getCachedShortcutBindings();
  }

  const baseBindings = getEditableShortcutBindings(getCachedShortcutBindings());

  const nextBindings = baseBindings.filter((binding) => {
    return getBindingEmojiId(binding) !== normalizedEmojiId;
  });

  return setShortcutBindings(nextBindings);
}

export async function clearShortcutBindingsByEmojiIds({
  emojiIds,
}) {
  const targetEmojiIds = new Set(
    Array.isArray(emojiIds)
      ? emojiIds.map(normalizeEmojiId).filter(Boolean)
      : []
  );

  if (!targetEmojiIds.size) {
    return getCachedShortcutBindings();
  }

  const baseBindings = getEditableShortcutBindings(getCachedShortcutBindings());

  const nextBindings = baseBindings.filter((binding) => {
    return !targetEmojiIds.has(getBindingEmojiId(binding));
  });

  return setShortcutBindings(nextBindings);
}

export function createShortcutBindingSetId(index) {
  const normalizedIndex = Number(index);

  if (
    !Number.isInteger(normalizedIndex) ||
    normalizedIndex < SHORTCUT_BINDING_SET_MIN_COUNT ||
    normalizedIndex > SHORTCUT_BINDING_SET_MAX_COUNT
  ) {
    return '';
  }

  return `set_${normalizedIndex}`;
}

export function getShortcutBindingSetIndex(setId) {
  const match = String(setId ?? '').trim().match(/^set_(\d+)$/);

  if (!match) {
    return 0;
  }

  return Number(match[1]) || 0;
}

export function normalizeShortcutBindingSetCount(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return SHORTCUT_BINDING_SET_DEFAULT_COUNT;
  }

  return Math.min(
    SHORTCUT_BINDING_SET_MAX_COUNT,
    Math.max(
      SHORTCUT_BINDING_SET_MIN_COUNT,
      Math.round(number)
    )
  );
}

export function normalizeShortcutBindingSetId(setId) {
  const normalizedSetId = String(setId ?? '').trim();

  if (normalizedSetId === SHORTCUT_BINDING_SET_OFF) {
    return SHORTCUT_BINDING_SET_OFF;
  }

  const index = getShortcutBindingSetIndex(normalizedSetId);

  if (
    index >= SHORTCUT_BINDING_SET_MIN_COUNT &&
    index <= SHORTCUT_BINDING_SET_MAX_COUNT
  ) {
    return createShortcutBindingSetId(index);
  }

  return '';
}

export function normalizeShortcutPhase(phase) {
  if (phase === SHORTCUT_PHASE_UP) {
    return SHORTCUT_PHASE_UP;
  }

  if (phase === SHORTCUT_PHASE_BOTH) {
    return SHORTCUT_PHASE_BOTH;
  }

  return SHORTCUT_PHASE_DOWN;
}

export function getStoragePhasesFromPhase(phase) {
  const normalizedPhase = normalizeShortcutPhase(phase);

  if (normalizedPhase === SHORTCUT_PHASE_BOTH) {
    return [
      SHORTCUT_PHASE_DOWN,
      SHORTCUT_PHASE_UP,
    ];
  }

  return [normalizedPhase];
}

export function isStorageShortcutPhase(phase) {
  return (
    phase === SHORTCUT_PHASE_DOWN ||
    phase === SHORTCUT_PHASE_UP
  );
}

export function getBindingEmojiId(binding) {
  return normalizeEmojiId(
    binding?.actionConfig?.actionArgs?.emojiId ||
    binding?.actionConfig?.args?.emojiId ||
    binding?.actionConfig?.target?.emojiId ||
    binding?.action?.actionArgs?.emojiId ||
    binding?.action?.args?.emojiId ||
    binding?.action?.target?.emojiId ||
    binding?.onDown?.actionArgs?.emojiId ||
    binding?.onDown?.args?.emojiId ||
    binding?.onDown?.target?.emojiId ||
    binding?.onUp?.actionArgs?.emojiId ||
    binding?.onUp?.args?.emojiId ||
    binding?.onUp?.target?.emojiId ||
    binding?.emojiId
  );
}

export function isUserDefinedShortcutBinding(binding) {
  return binding?.source === USER_BINDING_SOURCE;
}

function createDefaultShortcutBindingSetState() {
  return {
    version: SHORTCUT_BINDING_SETS_VERSION,
    activeSetId: createShortcutBindingSetId(1),
    setCount: SHORTCUT_BINDING_SET_DEFAULT_COUNT,
    sets: [],
  };
}

function shouldMigrateShortcutBindingStorage({
  value,
  hasStoredValue,
}) {
  if (!hasStoredValue) {
    return false;
  }

  const storedVersion = Number(value?.version) || 0;

  return storedVersion < SHORTCUT_BINDING_SETS_VERSION;
}

function normalizeShortcutBindingSetState({
  storedValue,
  hasStoredValue,
}) {
  if (!hasStoredValue) {
    return createDefaultShortcutBindingSetState();
  }

  /*
   * v1 호환:
   * 기존 저장값이 배열이면 set_1로 마이그레이션한다.
   */
  if (Array.isArray(storedValue)) {
    return normalizeShortcutBindingSetStateValue({
      activeSetId: createShortcutBindingSetId(1),
      setCount: SHORTCUT_BINDING_SET_DEFAULT_COUNT,
      sets: [
        {
          id: createShortcutBindingSetId(1),
          label: '',
          bindings: storedValue,
        },
      ],
    });
  }

  if (!storedValue || typeof storedValue !== 'object') {
    return createDefaultShortcutBindingSetState();
  }

  return normalizeShortcutBindingSetStateValue(storedValue);
}

function normalizeShortcutBindingSetStateValue(value) {
  const setCount = normalizeShortcutBindingSetCount(value?.setCount);
  const sets = normalizeShortcutBindingSets(value?.sets);
  const activeSetId = normalizeActiveShortcutBindingSetIdForCount({
    activeSetId: value?.activeSetId,
    setCount,
  });

  return {
    version: SHORTCUT_BINDING_SETS_VERSION,
    activeSetId,
    setCount,
    sets,
  };
}

function normalizeActiveShortcutBindingSetIdForCount({
  activeSetId,
  setCount,
}) {
  const normalizedActiveSetId = normalizeShortcutBindingSetId(activeSetId);

  if (normalizedActiveSetId === SHORTCUT_BINDING_SET_OFF) {
    return SHORTCUT_BINDING_SET_OFF;
  }

  const activeIndex = getShortcutBindingSetIndex(normalizedActiveSetId);

  if (
    activeIndex >= SHORTCUT_BINDING_SET_MIN_COUNT &&
    activeIndex <= setCount
  ) {
    return normalizedActiveSetId;
  }

  return createShortcutBindingSetId(1);
}

function normalizeVisibleShortcutBindingSetId({
  setId,
  setCount,
}) {
  const normalizedSetId = normalizeShortcutBindingSetId(setId);

  if (normalizedSetId === SHORTCUT_BINDING_SET_OFF) {
    return SHORTCUT_BINDING_SET_OFF;
  }

  const index = getShortcutBindingSetIndex(normalizedSetId);

  if (
    index >= SHORTCUT_BINDING_SET_MIN_COUNT &&
    index <= setCount
  ) {
    return normalizedSetId;
  }

  return '';
}

function normalizeShortcutBindingSets(sets) {
  const storedSets = Array.isArray(sets) ? sets : [];
  const setById = new Map();

  storedSets.forEach((set) => {
    const setId = normalizeShortcutBindingSetId(set?.id);

    if (!setId || setId === SHORTCUT_BINDING_SET_OFF) {
      return;
    }

    setById.set(setId, {
      id: setId,
      label: normalizeShortcutBindingSetLabel({
        setId,
        label: set?.label,
      }),
      bindings: normalizeShortcutBindings(set?.bindings),
    });
  });

  return sortShortcutBindingSets(Array.from(setById.values()));
}

function normalizeShortcutBindingSetLabel({
  setId,
  label,
}) {
  const normalizedLabel = String(label ?? '').trim();
  const defaultLabel = getShortcutBindingSetDefaultLabel(setId);

  if (!normalizedLabel) {
    return '';
  }

  /*
   * 기존 저장 데이터 호환:
   * set_1 label "1", set_2 label "2" 같은 자동 기본 숫자는
   * 사용자 지정 이름으로 보지 않고 빈 label로 정규화한다.
   */
  if (normalizedLabel === defaultLabel) {
    return '';
  }

  return normalizedLabel;
}

function getShortcutBindingSetDefaultLabel(setId) {
  const index = getShortcutBindingSetIndex(setId);

  if (!index) {
    return '';
  }

  return String(index);
}

function getShortcutBindingsForSet(state, setId) {
  const normalizedSetId = normalizeShortcutBindingSetId(setId);

  const set = state.sets.find((candidate) => {
    return candidate.id === normalizedSetId;
  });

  return normalizeShortcutBindings(set?.bindings);
}

function setShortcutBindingsForActiveSet({
  state,
  bindings,
}) {
  const setCount = normalizeShortcutBindingSetCount(state.setCount);
  const activeSetId = normalizeShortcutBindingSetId(state.activeSetId) ||
    createShortcutBindingSetId(1);

  const sets = normalizeShortcutBindingSets(state.sets);

  if (activeSetId === SHORTCUT_BINDING_SET_OFF) {
    return {
      ...state,
      setCount,
      activeSetId,
      sets,
    };
  }

  const normalizedBindings = normalizeShortcutBindings(bindings);
  let found = false;

  const nextSets = sets.map((set) => {
    if (set.id !== activeSetId) {
      return set;
    }

    found = true;

    return {
      ...set,
      bindings: normalizedBindings,
    };
  });

  if (!found) {
    nextSets.push({
      id: activeSetId,
      label: '',
      bindings: normalizedBindings,
    });
  }

  return {
    ...state,
    setCount,
    activeSetId,
    sets: sortShortcutBindingSets(nextSets),
  };
}

function sortShortcutBindingSets(sets) {
  return [...sets].sort((a, b) => {
    return getShortcutBindingSetIndex(a.id) - getShortcutBindingSetIndex(b.id);
  });
}

function cloneShortcutBindingSetState(state) {
  return {
    version: SHORTCUT_BINDING_SETS_VERSION,
    activeSetId: state.activeSetId,
    setCount: normalizeShortcutBindingSetCount(state.setCount),
    sets: state.sets.map((set) => {
      return {
        id: set.id,
        label: set.label,
        bindings: normalizeShortcutBindings(set.bindings),
      };
    }),
  };
}

function createEmojiShortcutBinding({
  code,
  phase,
  emojiId,
}) {
  return {
    id: createShortcutBindingId({
      code,
      phase,
      emojiId,
    }),
    source: USER_BINDING_SOURCE,
    code,
    phase,
    actionConfig: createSelectEmoteIdAction(emojiId),
  };
}

function createShortcutBindingId({
  code,
  phase,
  emojiId,
}) {
  return [
    USER_BINDING_SOURCE,
    code,
    phase,
    emojiId,
  ]
    .map((part) => String(part ?? '').replace(/[^a-zA-Z0-9_-]+/g, '_'))
    .join('__');
}

/*
 * 사용자 편집 시점에는 현재 세트의 binding 전체를 기준으로 처리한다.
 * 저장 시에는 user binding만 남기되, 빈 배열도 명시적 사용자 설정으로 저장한다.
 */
function getEditableShortcutBindings(bindings) {
  return normalizeShortcutBindings(bindings)
    .map((binding) => {
      return {
        ...binding,
        source: USER_BINDING_SOURCE,
      };
    });
}

function getUserDefinedShortcutBindings(bindings) {
  return normalizeShortcutBindings(bindings)
    .filter(isUserDefinedShortcutBinding);
}

function normalizeShortcutBindings(bindings) {
  if (!Array.isArray(bindings)) {
    return [];
  }

  const normalizedBindings = [];
  const seenKey = new Set();

  bindings.forEach((binding) => {
    const normalizedBinding = normalizeStoredShortcutBinding(binding);

    if (!normalizedBinding) {
      return;
    }

    const key = getShortcutBindingKey(normalizedBinding);

    if (seenKey.has(key)) {
      return;
    }

    seenKey.add(key);
    normalizedBindings.push(normalizedBinding);
  });

	const firstCodeByEmojiId = new Map();

	normalizedBindings.forEach((binding) => {
		const emojiId = getBindingEmojiId(binding);

		if (!emojiId || firstCodeByEmojiId.has(emojiId)) {
			return;
		}

		firstCodeByEmojiId.set(emojiId, binding.code);
	});

	return normalizedBindings.filter((binding) => {
		const emojiId = getBindingEmojiId(binding);

		if (!emojiId) {
			return true;
		}

		return firstCodeByEmojiId.get(emojiId) === binding.code;
	});
}

function normalizeStoredShortcutBinding(binding) {
  const normalizedBinding = normalizeShortcutBinding?.(binding) ?? binding;

  if (!normalizedBinding || typeof normalizedBinding !== 'object') {
    return null;
  }

  const code = normalizeShortcutCode(normalizedBinding.code);
  const phase = normalizeStoredPhase(normalizedBinding.phase);

  if (
    !code ||
    !phase ||
    !normalizedBinding.actionConfig
  ) {
    return null;
  }

  return {
    ...normalizedBinding,
    id: normalizeShortcutBindingId(normalizedBinding, {
      code,
      phase,
    }),
    code,
    phase,
  };
}

function normalizeStoredPhase(phase) {
  if (phase === SHORTCUT_PHASE_UP) {
    return SHORTCUT_PHASE_UP;
  }

  if (phase === SHORTCUT_PHASE_DOWN) {
    return SHORTCUT_PHASE_DOWN;
  }

  /*
   * 저장소에는 both를 직접 저장하지 않는다.
   * 혹시 과거/수동 데이터에 both가 들어와도 down으로 접어서 안전하게 처리한다.
   */
  return SHORTCUT_PHASE_DOWN;
}

function normalizeShortcutBindingId(binding, {
  code,
  phase,
}) {
  const currentId = String(binding?.id ?? '').trim();

  if (currentId) {
    return currentId;
  }

  const emojiId = getBindingEmojiId(binding);

  return createShortcutBindingId({
    code,
    phase,
    emojiId,
  });
}

function getShortcutBindingKey(binding) {
  return `${binding.code}:${binding.phase}`;
}

function normalizeShortcutCode(code) {
  return normalizeStoredShortcutCode(code);
}

function normalizeEmojiId(emojiId) {
  return String(emojiId ?? '').trim();
}

async function readShortcutBindingsStorageEntry() {
  if (!isChromeStorageAvailable()) {
    return readShortcutBindingsStorageEntryFromLocalStorage();
  }

  const result = await chrome.storage.local.get(SHORTCUT_BINDINGS_STORAGE_KEY);
  const hasStoredValue = Object.prototype.hasOwnProperty.call(
    result,
    SHORTCUT_BINDINGS_STORAGE_KEY
  );

  return {
    hasStoredValue,
    value: result?.[SHORTCUT_BINDINGS_STORAGE_KEY],
  };
}

async function writeShortcutBindingSetStateToStorage(state) {
  const storageValue = createShortcutBindingSetStorageValue(state);

  if (!isChromeStorageAvailable()) {
    writeShortcutBindingsToLocalStorage(storageValue);
    return;
  }

  await storageWriteQueue.run(() => {
    return chrome.storage.local.set({
      [SHORTCUT_BINDINGS_STORAGE_KEY]: storageValue,
    });
  });
}

async function persistShortcutBindingSetState(
  nextState,
  {
    removeStorage = false,
  } = {}
) {
  const previousState = cachedShortcutBindingSetState;
  const normalizedNextState = normalizeShortcutBindingSetStateValue(nextState);

  cachedShortcutBindingSetState = normalizedNextState;

  try {
    if (removeStorage) {
      await removeShortcutBindingsFromStorage();
    } else {
      await writeShortcutBindingSetStateToStorage(normalizedNextState);
    }
  } catch (error) {
    if (cachedShortcutBindingSetState === normalizedNextState) {
      cachedShortcutBindingSetState = previousState;
    }

    throw error;
  }

  dispatchShortcutBindingsChanged();
}

function createShortcutBindingSetStorageValue(state) {
  const normalizedState = normalizeShortcutBindingSetStateValue(state);

  return {
    version: SHORTCUT_BINDING_SETS_VERSION,
    activeSetId: normalizeActiveShortcutBindingSetIdForCount({
      activeSetId: normalizedState.activeSetId,
      setCount: normalizedState.setCount,
    }),
    setCount: normalizedState.setCount,
    sets: normalizedState.sets
      .map((set) => {
        return {
          id: set.id,
          label: set.label,
          bindings: getUserDefinedShortcutBindings(set.bindings),
        };
      })
      .filter(shouldPersistShortcutBindingSet),
  };
}

function shouldPersistShortcutBindingSet(set) {
  if (!set?.id) {
    return false;
  }

  if (getUserDefinedShortcutBindings(set.bindings).length > 0) {
    return true;
  }

  return Boolean(
    normalizeShortcutBindingSetLabel({
      setId: set.id,
      label: set.label,
    })
  );
}

async function removeShortcutBindingsFromStorage() {
  if (!isChromeStorageAvailable()) {
    removeShortcutBindingsFromLocalStorage();
    return;
  }

  await storageWriteQueue.run(() => {
    return chrome.storage.local.remove(SHORTCUT_BINDINGS_STORAGE_KEY);
  });
}

function readShortcutBindingsStorageEntryFromLocalStorage() {
  try {
    const raw = window.localStorage.getItem(SHORTCUT_BINDINGS_STORAGE_KEY);

    if (raw === null) {
      return {
        hasStoredValue: false,
        value: null,
      };
    }

    return {
      hasStoredValue: true,
      value: JSON.parse(raw),
    };
  } catch (error) {
    console.warn('[Emozzk Lite] failed to read shortcut bindings:', error);

    return {
      hasStoredValue: false,
      value: null,
    };
  }
}

function writeShortcutBindingsToLocalStorage(value) {
  try {
    window.localStorage.setItem(
      SHORTCUT_BINDINGS_STORAGE_KEY,
      JSON.stringify(value)
    );
  } catch (error) {
    console.warn('[Emozzk Lite] failed to write shortcut bindings:', error);
  }
}

function removeShortcutBindingsFromLocalStorage() {
  try {
    window.localStorage.removeItem(SHORTCUT_BINDINGS_STORAGE_KEY);
  } catch (error) {
    console.warn('[Emozzk Lite] failed to remove shortcut bindings:', error);
  }
}

function isChromeStorageAvailable() {
  return Boolean(
    globalThis.chrome?.storage?.local?.get &&
    globalThis.chrome?.storage?.local?.set &&
    globalThis.chrome?.storage?.local?.remove
  );
}

function dispatchShortcutBindingsChanged() {
  window.dispatchEvent(
    new CustomEvent(SHORTCUT_BINDINGS_CHANGED_EVENT, {
      detail: {
        bindings: getCachedShortcutBindings(),
        activeSetId: getCachedActiveShortcutBindingSetId(),
        setState: getCachedShortcutBindingSetState(),
      },
    })
  );
}

export async function renameShortcutBindingSet({
  setId,
  label,
}) {
  const normalizedSetId = normalizeShortcutBindingSetId(setId);
  const normalizedLabel = normalizeShortcutBindingSetLabel({
    setId: normalizedSetId,
    label,
  });

  if (
    !normalizedSetId ||
    normalizedSetId === SHORTCUT_BINDING_SET_OFF
  ) {
    return getCachedShortcutBindingSetState();
  }

  const sets = normalizeShortcutBindingSets(
    cachedShortcutBindingSetState.sets
  );

  let found = false;

  const nextSets = sets.map((set) => {
    if (set.id !== normalizedSetId) {
      return set;
    }

    found = true;

    return {
      ...set,
      label: normalizedLabel,
    };
  });

  if (!found && normalizedLabel) {
    nextSets.push({
      id: normalizedSetId,
      label: normalizedLabel,
      bindings: [],
    });
  }

	const nextState = normalizeShortcutBindingSetStateValue({
		...cachedShortcutBindingSetState,
		sets: nextSets,
	});

	if (isSameShortcutBindingSetState(
    cachedShortcutBindingSetState,
    nextState
  )) {
		return getCachedShortcutBindingSetState();
	}

	await persistShortcutBindingSetState(nextState);

	return getCachedShortcutBindingSetState();
}

function isSameShortcutBindingSetState(a, b) {
  return JSON.stringify(createShortcutBindingSetStorageValue(a)) ===
    JSON.stringify(createShortcutBindingSetStorageValue(b));
}

export function hasShortcutBindingForEmojiIdInAnySet({
  emojiId,
} = {}) {
  const normalizedEmojiId = normalizeEmojiId(emojiId);

  if (!normalizedEmojiId) {
    return false;
  }

  return normalizeShortcutBindingSets(
    cachedShortcutBindingSetState.sets
  ).some((set) => {
    return getEditableShortcutBindings(set.bindings).some((binding) => {
      return getBindingEmojiId(binding) === normalizedEmojiId;
    });
  });
}
