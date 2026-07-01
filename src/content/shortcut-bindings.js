import {
  normalizeStoredShortcutCode,
} from './shortcut-key-code.js';

export const SHORTCUT_ACTION_SELECT_EMOTE = 'selectEmote';

export const SHORTCUT_TARGET_TYPE_INDEX = 'index';
export const SHORTCUT_TARGET_TYPE_EMOJI_ID = 'emojiId';

const SHORTCUT_PHASE_DOWN = 'down';
const SHORTCUT_PHASE_UP = 'up';

const DEFAULT_SHORTCUT_OPTIONS = {
  enabledInChatInput: true,
  enabledInSearchInput: false,
  preventDefault: true,
  stopPropagation: true,
  allowRepeat: false,
};

const DEFAULT_SHORTCUT_INTERCEPTION = {
  keydown: true,
  keyup: true,
};

export function createSelectEmoteAction(index) {
  return createSelectEmoteIndexAction(index);
}

export function createSelectEmoteIndexAction(index) {
  const normalizedIndex = normalizeIndex(index);

  if (normalizedIndex < 0) {
    return null;
  }

  return {
    action: SHORTCUT_ACTION_SELECT_EMOTE,
    actionArgs: {
      targetType: SHORTCUT_TARGET_TYPE_INDEX,
      index: normalizedIndex,
    },
  };
}

export function createSelectEmoteIdAction(emojiId) {
  const normalizedEmojiId = normalizeText(emojiId);

  if (!normalizedEmojiId) {
    return null;
  }

  return {
    action: SHORTCUT_ACTION_SELECT_EMOTE,
    actionArgs: {
      targetType: SHORTCUT_TARGET_TYPE_EMOJI_ID,
      emojiId: normalizedEmojiId,
    },
  };
}

export function normalizeShortcutBinding(binding) {
  if (!binding || typeof binding !== 'object') {
    return null;
  }

  if (isModernShortcutBindingShape(binding)) {
    return normalizeModernShortcutBinding(binding);
  }

  return normalizeLegacyShortcutBinding(binding);
}

export function isSameShortcutTrigger(left, right) {
  const normalizedLeft = normalizeShortcutTrigger(left);
  const normalizedRight = normalizeShortcutTrigger(right);

  if (
    !normalizedLeft ||
    !normalizedRight
  ) {
    return false;
  }

  return (
    normalizedLeft.code === normalizedRight.code &&
    normalizedLeft.ctrl === normalizedRight.ctrl &&
    normalizedLeft.alt === normalizedRight.alt &&
    normalizedLeft.shift === normalizedRight.shift &&
    normalizedLeft.meta === normalizedRight.meta
  );
}

export function isShortcutActionEnabled(actionConfig) {
  return Boolean(normalizeShortcutActionConfig(actionConfig));
}

export function isShortcutKeyupEnabled(binding) {
  const normalizedBinding = normalizeShortcutBinding(binding);

  if (!normalizedBinding) {
    return false;
  }

  if (isModernShortcutBindingShape(normalizedBinding)) {
    return normalizedBinding.phase === SHORTCUT_PHASE_UP;
  }

  return Boolean(normalizedBinding.onUp);
}

function normalizeModernShortcutBinding(binding) {
  const code = normalizeShortcutCode(binding.code);
  const phase = normalizeStoragePhase(binding.phase);
  const actionConfig = normalizeShortcutActionConfig(binding.actionConfig);

  if (
    !code ||
    !phase ||
    !actionConfig
  ) {
    return null;
  }

  return {
    ...binding,
    id: normalizeBindingId(binding, {
      code,
      phase,
    }),
    code,
    phase,
    actionConfig,
    options: normalizeShortcutOptions(binding.options),
    interception: normalizeShortcutInterception(binding.interception),
  };
}

function normalizeLegacyShortcutBinding(binding) {
  const trigger = normalizeShortcutTrigger(binding.trigger);

  if (!trigger) {
    return null;
  }

  const onDown = normalizeShortcutActionConfig(binding.onDown);
  const onUp = normalizeShortcutActionConfig(binding.onUp);

  if (
    !onDown &&
    !onUp
  ) {
    return null;
  }

  return {
    ...binding,
    id: normalizeBindingId(binding, {
      code: trigger.code,
      phase: onUp && !onDown ? SHORTCUT_PHASE_UP : SHORTCUT_PHASE_DOWN,
    }),
    trigger,
    onDown,
    onUp,
    options: normalizeShortcutOptions(binding.options),
    interception: normalizeShortcutInterception(binding.interception),
  };
}

function normalizeShortcutActionConfig(actionConfig) {
  if (!actionConfig || typeof actionConfig !== 'object') {
    return null;
  }

  const action = normalizeText(actionConfig.action || actionConfig.type);

  if (action !== SHORTCUT_ACTION_SELECT_EMOTE) {
    return null;
  }

  const actionArgs = normalizeShortcutActionArgs(
    actionConfig.actionArgs ||
    actionConfig.args ||
    actionConfig.target ||
    actionConfig
  );

  if (!actionArgs) {
    return null;
  }

  return {
    action: SHORTCUT_ACTION_SELECT_EMOTE,
    actionArgs,
  };
}

function normalizeShortcutActionArgs(actionArgs) {
  if (!actionArgs || typeof actionArgs !== 'object') {
    return null;
  }

  const targetType = getActionTargetType(actionArgs);

  if (
    targetType === SHORTCUT_TARGET_TYPE_EMOJI_ID ||
    (!targetType && 'emojiId' in actionArgs)
  ) {
    const emojiId = normalizeText(actionArgs.emojiId);

    if (!emojiId) {
      return null;
    }

    return {
      targetType: SHORTCUT_TARGET_TYPE_EMOJI_ID,
      emojiId,
    };
  }

  if (
    targetType === SHORTCUT_TARGET_TYPE_INDEX ||
    (!targetType && 'index' in actionArgs)
  ) {
    const index = normalizeIndex(actionArgs.index);

    if (index < 0) {
      return null;
    }

    return {
      targetType: SHORTCUT_TARGET_TYPE_INDEX,
      index,
    };
  }

  return null;
}

function normalizeShortcutTrigger(trigger) {
  if (!trigger || typeof trigger !== 'object') {
    return null;
  }

  const code = normalizeShortcutCode(trigger.code);

  if (!code) {
    return null;
  }

  return {
    code,
    ctrl: Boolean(trigger.ctrl),
    alt: Boolean(trigger.alt),
    shift: Boolean(trigger.shift),
    meta: Boolean(trigger.meta),
  };
}

function normalizeShortcutOptions(options) {
  if (!options || typeof options !== 'object') {
    return {
      ...DEFAULT_SHORTCUT_OPTIONS,
    };
  }

  return {
    ...DEFAULT_SHORTCUT_OPTIONS,
    ...options,
    enabledInChatInput: options.enabledInChatInput !== false,
    enabledInSearchInput: options.enabledInSearchInput === true,
    preventDefault: options.preventDefault !== false,
    stopPropagation: options.stopPropagation !== false,
    allowRepeat: options.allowRepeat === true,
  };
}

function normalizeShortcutInterception(interception) {
  if (!interception || typeof interception !== 'object') {
    return {
      ...DEFAULT_SHORTCUT_INTERCEPTION,
    };
  }

  return {
    ...DEFAULT_SHORTCUT_INTERCEPTION,
    ...interception,
    keydown: interception.keydown !== false,
    keyup: interception.keyup !== false,
  };
}

function normalizeBindingId(binding, {
  code,
  phase,
}) {
  const currentId = normalizeText(binding?.id);

  if (currentId) {
    return currentId;
  }

  return [
    normalizeText(binding?.source) || 'shortcut',
    code,
    phase,
  ]
    .filter(Boolean)
    .join('__');
}

function isModernShortcutBindingShape(binding) {
  return Boolean(
    normalizeStoredShortcutCode(binding?.code) &&
    'phase' in binding &&
    binding?.actionConfig
  );
}

function normalizeStoragePhase(phase) {
  if (phase === SHORTCUT_PHASE_UP) {
    return SHORTCUT_PHASE_UP;
  }

  return SHORTCUT_PHASE_DOWN;
}

function normalizeShortcutCode(code) {
  return normalizeStoredShortcutCode(code);
}

function normalizeIndex(value) {
  const number = Number(value);

  if (!Number.isInteger(number)) return -1;
  if (number < 0) return -1;

  return number;
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function getActionTargetType(actionArgs) {
  const targetType = normalizeText(actionArgs?.targetType);

  if (
    targetType === SHORTCUT_TARGET_TYPE_EMOJI_ID ||
    targetType === SHORTCUT_TARGET_TYPE_INDEX
  ) {
    return targetType;
  }

  const type = normalizeText(actionArgs?.type);

  if (
    type === SHORTCUT_TARGET_TYPE_EMOJI_ID ||
    type === SHORTCUT_TARGET_TYPE_INDEX
  ) {
    return type;
  }

  return '';
}