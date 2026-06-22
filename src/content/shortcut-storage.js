import {
  createSelectEmoteIdAction,
  getDefaultShortcutBindings,
  normalizeShortcutBinding,
} from './shortcut-bindings.js';

export const SHORTCUT_BINDINGS_STORAGE_KEY = 'emzk_lite_shortcut_bindings_v1';
export const SHORTCUT_BINDINGS_CHANGED_EVENT = 'emzk-lite-shortcut-bindings-changed';

export const SHORTCUT_PHASE_DOWN = 'down';
export const SHORTCUT_PHASE_UP = 'up';
export const SHORTCUT_PHASE_BOTH = 'both';

const USER_BINDING_SOURCE = 'user';

let cachedShortcutBindings = [];

export async function initShortcutBindingsStorage() {
  const storageEntry = await readShortcutBindingsStorageEntry();

  cachedShortcutBindings = storageEntry.hasStoredValue
    ? normalizeShortcutBindings(storageEntry.bindings)
    : normalizeShortcutBindings(getDefaultShortcutBindings());

  dispatchShortcutBindingsChanged();

  return getCachedShortcutBindings();
}

export function getCachedShortcutBindings() {
  return [...cachedShortcutBindings];
}

export async function setShortcutBindings(bindings) {
  const normalizedBindings = normalizeShortcutBindings(bindings);

  cachedShortcutBindings = normalizedBindings;

  await writeShortcutBindingsToStorage(normalizedBindings);

  dispatchShortcutBindingsChanged();

  return getCachedShortcutBindings();
}

export async function resetShortcutBindingsToDefault() {
  cachedShortcutBindings = normalizeShortcutBindings(getDefaultShortcutBindings());

  await removeShortcutBindingsFromStorage();

  dispatchShortcutBindingsChanged();

  return getCachedShortcutBindings();
}

export async function clearShortcutBindings() {
  cachedShortcutBindings = [];

  await writeShortcutBindingsToStorage([]);

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
  const baseBindings = getEditableShortcutBindings(cachedShortcutBindings);

  /*
   * 저장 정책:
   * - 저장소에는 both를 직접 저장하지 않고 down/up 두 개로 저장한다.
   * - 같은 code + phase 조합은 하나만 유지한다.
   * - 같은 code + 같은 emojiId의 기존 down/up은 새 phase로 교체한다.
   *
   * 예:
   * - F1 both → F1 down 저장 시 기존 F1 up도 제거
   * - F1 both → F1 up 저장 시 기존 F1 down도 제거
   * - F1 down → F1 both 저장 시 기존 F1 down 제거 후 down/up 저장
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
  const baseBindings = getEditableShortcutBindings(cachedShortcutBindings);

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

  const baseBindings = getEditableShortcutBindings(cachedShortcutBindings);

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
    !phase
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
  const normalizedCode = String(code ?? '').trim();

  if (!normalizedCode) {
    return '';
  }

  if (isBlockedShortcutCode(normalizedCode)) {
    return '';
  }

  return normalizedCode;
}

function normalizeEmojiId(emojiId) {
  return String(emojiId ?? '').trim();
}

function isBlockedShortcutCode(code) {
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
    bindings: Array.isArray(result?.[SHORTCUT_BINDINGS_STORAGE_KEY])
      ? result[SHORTCUT_BINDINGS_STORAGE_KEY]
      : [],
  };
}

async function writeShortcutBindingsToStorage(bindings) {
  const userBindings = getUserDefinedShortcutBindings(bindings);

  if (!isChromeStorageAvailable()) {
    writeShortcutBindingsToLocalStorage(userBindings);
    return;
  }

  await chrome.storage.local.set({
    [SHORTCUT_BINDINGS_STORAGE_KEY]: userBindings,
  });
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
        bindings: [],
      };
    }

    const parsed = JSON.parse(raw);

    return {
      hasStoredValue: true,
      bindings: Array.isArray(parsed) ? parsed : [],
    };
  } catch (error) {
    console.warn('[Emozzk Lite] failed to read shortcut bindings:', error);

    return {
      hasStoredValue: false,
      bindings: [],
    };
  }
}

function writeShortcutBindingsToLocalStorage(bindings) {
  try {
    window.localStorage.setItem(
      SHORTCUT_BINDINGS_STORAGE_KEY,
      JSON.stringify(bindings)
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
      },
    })
  );
}