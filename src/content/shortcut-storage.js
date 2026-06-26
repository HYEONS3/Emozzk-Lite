import {
  createSelectEmoteIdAction,
  getDefaultShortcutBindings,
  normalizeShortcutBinding,
} from './shortcut-bindings.js';

import {
  normalizeStoredShortcutCode,
} from './shortcut-key-code.js';

export const SHORTCUT_BINDINGS_STORAGE_KEY = 'emzk_lite_shortcut_bindings_v1';
export const SHORTCUT_BINDINGS_CHANGED_EVENT = 'emzk-lite-shortcut-bindings-changed';

export const SHORTCUT_PHASE_DOWN = 'down';
export const SHORTCUT_PHASE_UP = 'up';
export const SHORTCUT_PHASE_BOTH = 'both';

export const SHORTCUT_BINDING_SET_1 = 'set_1';
export const SHORTCUT_BINDING_SET_2 = 'set_2';

const SHORTCUT_BINDING_SETS_VERSION = 2;

const USER_BINDING_SOURCE = 'user';

const DEFAULT_SHORTCUT_BINDING_SETS = [
  {
    id: SHORTCUT_BINDING_SET_1,
    label: '1',
  },
  {
    id: SHORTCUT_BINDING_SET_2,
    label: '2',
  },
];

let cachedShortcutBindingSetState = createDefaultShortcutBindingSetState();

export async function initShortcutBindingsStorage() {
  const storageEntry = await readShortcutBindingsStorageEntry();

  cachedShortcutBindingSetState = normalizeShortcutBindingSetState({
    storedValue: storageEntry.value,
    hasStoredValue: storageEntry.hasStoredValue,
  });

  dispatchShortcutBindingsChanged();

  return getCachedShortcutBindings();
}

export function getCachedShortcutBindings() {
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
  const normalizedSetId = normalizeShortcutBindingSetId(setId);

  if (!normalizedSetId) {
    return getCachedShortcutBindings();
  }

  if (cachedShortcutBindingSetState.activeSetId === normalizedSetId) {
    return getCachedShortcutBindings();
  }

  cachedShortcutBindingSetState = {
    ...cachedShortcutBindingSetState,
    activeSetId: normalizedSetId,
  };

  await writeShortcutBindingSetStateToStorage(cachedShortcutBindingSetState);

  dispatchShortcutBindingsChanged();

  return getCachedShortcutBindings();
}

export async function setShortcutBindings(bindings) {
  const normalizedBindings = normalizeShortcutBindings(bindings);

  cachedShortcutBindingSetState = setShortcutBindingsForActiveSet({
    state: cachedShortcutBindingSetState,
    bindings: normalizedBindings,
  });

  await writeShortcutBindingSetStateToStorage(cachedShortcutBindingSetState);

  dispatchShortcutBindingsChanged();

  return getCachedShortcutBindings();
}

export async function resetShortcutBindingsToDefault() {
  cachedShortcutBindingSetState = createDefaultShortcutBindingSetState();

  await removeShortcutBindingsFromStorage();

  dispatchShortcutBindingsChanged();

  return getCachedShortcutBindings();
}

export async function clearShortcutBindings() {
  cachedShortcutBindingSetState = setShortcutBindingsForActiveSet({
    state: cachedShortcutBindingSetState,
    bindings: [],
  });

  await writeShortcutBindingSetStateToStorage(cachedShortcutBindingSetState);

  dispatchShortcutBindingsChanged();

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
   * - 같은 code + 같은 emojiId의 기존 down/up은 새 phase로 교체한다.
   *
   * 세트 정책:
   * - assign은 현재 active set에만 적용한다.
   * - set_1의 F1과 set_2의 F1은 서로 독립이다.
   */
  const nextBindings = baseBindings.filter((binding) => {
    const bindingCode = normalizeShortcutCode(binding.code);
    const bindingPhase = normalizeStoredPhase(binding.phase);
    const bindingEmojiId = getBindingEmojiId(binding);

    if (bindingCode !== normalizedCode) {
      return true;
    }

    if (phasesToAssign.includes(bindingPhase)) {
      return false;
    }

    if (bindingEmojiId === normalizedEmojiId) {
      return false;
    }

    return true;
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
    activeSetId: SHORTCUT_BINDING_SET_1,
    sets: DEFAULT_SHORTCUT_BINDING_SETS.map((set) => {
      return {
        ...set,
        bindings: set.id === SHORTCUT_BINDING_SET_1
          ? normalizeShortcutBindings(getDefaultShortcutBindings())
          : [],
      };
    }),
  };
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
    return createShortcutBindingSetState({
      activeSetId: SHORTCUT_BINDING_SET_1,
      set1Bindings: storedValue,
      set2Bindings: [],
    });
  }

  if (!storedValue || typeof storedValue !== 'object') {
    return createDefaultShortcutBindingSetState();
  }

  const sets = normalizeShortcutBindingSets(storedValue.sets);
  const activeSetId = normalizeShortcutBindingSetId(storedValue.activeSetId);

  return {
    version: SHORTCUT_BINDING_SETS_VERSION,
    activeSetId: activeSetId || SHORTCUT_BINDING_SET_1,
    sets,
  };
}

function createShortcutBindingSetState({
  activeSetId,
  set1Bindings,
  set2Bindings,
}) {
  return {
    version: SHORTCUT_BINDING_SETS_VERSION,
    activeSetId: normalizeShortcutBindingSetId(activeSetId) || SHORTCUT_BINDING_SET_1,
    sets: [
      {
        id: SHORTCUT_BINDING_SET_1,
        label: '1',
        bindings: normalizeShortcutBindings(set1Bindings),
      },
      {
        id: SHORTCUT_BINDING_SET_2,
        label: '2',
        bindings: normalizeShortcutBindings(set2Bindings),
      },
    ],
  };
}

function normalizeShortcutBindingSets(sets) {
  const storedSets = Array.isArray(sets) ? sets : [];

  return DEFAULT_SHORTCUT_BINDING_SETS.map((defaultSet) => {
    const storedSet = storedSets.find((set) => {
      return set?.id === defaultSet.id;
    });

    return {
      id: defaultSet.id,
      label: normalizeShortcutBindingSetLabel(storedSet?.label) || defaultSet.label,
      bindings: normalizeShortcutBindings(storedSet?.bindings),
    };
  });
}

function normalizeShortcutBindingSetId(setId) {
  const normalizedSetId = String(setId ?? '').trim();

  if (
    normalizedSetId === SHORTCUT_BINDING_SET_1 ||
    normalizedSetId === SHORTCUT_BINDING_SET_2
  ) {
    return normalizedSetId;
  }

  return '';
}

function normalizeShortcutBindingSetLabel(label) {
  return String(label ?? '').trim();
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
  const activeSetId = normalizeShortcutBindingSetId(state.activeSetId) ||
    SHORTCUT_BINDING_SET_1;

  return {
    ...state,
    activeSetId,
    sets: state.sets.map((set) => {
      if (set.id !== activeSetId) {
        return {
          ...set,
          bindings: normalizeShortcutBindings(set.bindings),
        };
      }

      return {
        ...set,
        bindings: normalizeShortcutBindings(bindings),
      };
    }),
  };
}

function cloneShortcutBindingSetState(state) {
  return {
    version: SHORTCUT_BINDING_SETS_VERSION,
    activeSetId: state.activeSetId,
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
 * 사용자 편집 시점에는 현재 화면에 적용 중인 binding 전체를 기준으로 처리한다.
 * source가 default인 binding도 unbind/replace 대상이 될 수 있어야 한다.
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

  return normalizedBindings;
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

  await chrome.storage.local.set({
    [SHORTCUT_BINDINGS_STORAGE_KEY]: storageValue,
  });
}

function createShortcutBindingSetStorageValue(state) {
  return {
    version: SHORTCUT_BINDING_SETS_VERSION,
    activeSetId: normalizeShortcutBindingSetId(state.activeSetId) ||
      SHORTCUT_BINDING_SET_1,
    sets: state.sets.map((set) => {
      return {
        id: set.id,
        label: set.label,
        bindings: getUserDefinedShortcutBindings(set.bindings),
      };
    }),
  };
}

async function removeShortcutBindingsFromStorage() {
  if (!isChromeStorageAvailable()) {
    removeShortcutBindingsFromLocalStorage();
    return;
  }

  await chrome.storage.local.remove(SHORTCUT_BINDINGS_STORAGE_KEY);
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