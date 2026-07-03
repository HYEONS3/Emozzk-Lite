const MODIFIER_CODES = new Set([
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
]);

const BLOCKED_BASE_CODES = new Set([
  'Escape',
  'Tab',
  'Enter',
  'NumpadEnter',
  'CapsLock',
  'ContextMenu',
  'HangulMode',
]);

const MODIFIER_ORDER = [
  'Ctrl',
  'Alt',
  'Shift',
  'Meta',
];

const MODIFIER_ALIASES = new Map([
  ['Control', 'Ctrl'],
  ['ControlLeft', 'Ctrl'],
  ['ControlRight', 'Ctrl'],
  ['Ctrl', 'Ctrl'],

  ['Alt', 'Alt'],
  ['AltLeft', 'Alt'],
  ['AltRight', 'Alt'],

  ['Shift', 'Shift'],
  ['ShiftLeft', 'Shift'],
  ['ShiftRight', 'Shift'],

  ['Meta', 'Meta'],
  ['MetaLeft', 'Meta'],
  ['MetaRight', 'Meta'],
  ['Command', 'Meta'],
  ['Cmd', 'Meta'],
  ['Win', 'Meta'],
]);

const CODE_ALIASES = new Map([
  ['Spacebar', 'Space'],
  ['Esc', 'Escape'],

  ['`', 'Backquote'],
  ['-', 'Minus'],
  ['=', 'Equal'],
  ['[', 'BracketLeft'],
  [']', 'BracketRight'],
  ['\\', 'Backslash'],
  [';', 'Semicolon'],
  ["'", 'Quote'],
  [',', 'Comma'],
  ['.', 'Period'],
  ['/', 'Slash'],

  ['↑', 'ArrowUp'],
  ['↓', 'ArrowDown'],
  ['←', 'ArrowLeft'],
  ['→', 'ArrowRight'],
  ['Up', 'ArrowUp'],
  ['Down', 'ArrowDown'],
  ['Left', 'ArrowLeft'],
  ['Right', 'ArrowRight'],
]);

const BASE_CODE_LABELS = new Map([
  ['Space', 'Space'],
  ['Backspace', 'Backspace'],
  ['Delete', 'Delete'],
  ['Insert', 'Insert'],
  ['Home', 'Home'],
  ['End', 'End'],
  ['PageUp', 'Page Up'],
  ['PageDown', 'Page Down'],

  ['Backquote', '`'],
  ['Minus', '-'],
  ['Equal', '='],
  ['BracketLeft', '['],
  ['BracketRight', ']'],
  ['Backslash', '\\'],
  ['Semicolon', ';'],
  ['Quote', "'"],
  ['Comma', ','],
  ['Period', '.'],
  ['Slash', '/'],

  ['ArrowUp', '↑'],
  ['ArrowDown', '↓'],
  ['ArrowLeft', '←'],
  ['ArrowRight', '→'],
]);

const NUMPAD_CODE_ALIASES = new Map([
  ['numpadadd', 'NumpadAdd'],
  ['numpadsubtract', 'NumpadSubtract'],
  ['numpadmultiply', 'NumpadMultiply'],
  ['numpaddivide', 'NumpadDivide'],
  ['numpaddecimal', 'NumpadDecimal'],
  ['numpadenter', 'NumpadEnter'],
]);

const NAMED_BASE_CODES = new Set(BASE_CODE_LABELS.keys());

export function getShortcutCodeFromKeyboardEvent(event) {
  if (isImeKeyboardEvent(event)) {
    return '';
  }

  const baseCode = normalizeBaseCodePart(event?.code);

  if (!isAssignableBaseCode(baseCode)) {
    return '';
  }

  const modifiers = [];

  if (event.ctrlKey) {
    modifiers.push('Ctrl');
  }

  if (event.altKey) {
    modifiers.push('Alt');
  }

  if (event.shiftKey) {
    modifiers.push('Shift');
  }

  if (event.metaKey) {
    modifiers.push('Meta');
  }

	if (
		!hasCommandModifier(event) &&
		isKoreanTextKeyEvent(event)
	) {
		return '';
	}

  return [
    ...modifiers,
    baseCode,
  ].join('+');
}

function isKoreanTextKeyEvent(event) {
  const key = normalizeText(event?.key);

  return /^[ㄱ-ㅎㅏ-ㅣ가-힣]$/.test(key);
}

function hasCommandModifier(event) {
  return Boolean(
    event?.ctrlKey ||
    event?.altKey ||
    event?.metaKey
  );
}

export function normalizeStoredShortcutCode(code) {
  const normalizedCode = normalizeText(code);

  if (!normalizedCode) {
    return '';
  }

  const rawParts = normalizedCode
    .split('+')
    .map(normalizeText)
    .filter(Boolean);

  if (!rawParts.length) {
    return '';
  }

  const modifiers = new Set();
  let baseCode = '';

  for (const part of rawParts) {
    const modifier = normalizeModifierPart(part);

    if (modifier) {
      modifiers.add(modifier);
      continue;
    }

    const normalizedBaseCode = normalizeBaseCodePart(part);

    if (!normalizedBaseCode) {
      return '';
    }

    /*
     * 단축키 하나에는 base code가 하나만 있어야 한다.
     * 예: Ctrl+KeyA+KeyB 는 무효.
     */
    if (baseCode) {
      return '';
    }

    baseCode = normalizedBaseCode;
  }

  if (!isAssignableBaseCode(baseCode)) {
    return '';
  }

  return [
    ...getOrderedModifiers(modifiers),
    baseCode,
  ].join('+');
}

export function getShortcutCodeLabel(code) {
  const normalizedCode = normalizeStoredShortcutCode(code);

  if (!normalizedCode) {
    return '';
  }

  return normalizedCode
    .split('+')
    .map(getShortcutCodePartLabel)
    .filter(Boolean)
    .join('+');
}

export function isImeKeyboardEvent(event) {
  return Boolean(
    event?.isComposing ||
    event?.key === 'Process' ||
    event?.keyCode === 229
  );
}

function normalizeModifierPart(part) {
  const normalizedPart = normalizeText(part);

  if (!normalizedPart) {
    return '';
  }

  if (MODIFIER_ALIASES.has(normalizedPart)) {
    return MODIFIER_ALIASES.get(normalizedPart);
  }

  const lowerPart = normalizedPart.toLowerCase();
	
  if (lowerPart === 'ctrl' || lowerPart === 'control') {
    return 'Ctrl';
  }

  if (lowerPart === 'alt') {
    return 'Alt';
  }

  if (lowerPart === 'shift') {
    return 'Shift';
  }

  if (
    lowerPart === 'meta' ||
    lowerPart === 'cmd' ||
    lowerPart === 'command' ||
    lowerPart === 'win'
  ) {
    return 'Meta';
  }

  return '';
}

function normalizeBaseCodePart(part) {
  const normalizedPart = normalizeText(part);

  if (!normalizedPart) {
    return '';
  }

  if (CODE_ALIASES.has(normalizedPart)) {
    return CODE_ALIASES.get(normalizedPart);
  }
  
	const lowerPart = normalizedPart.toLowerCase();

  if (NUMPAD_CODE_ALIASES.has(lowerPart)) {
    return NUMPAD_CODE_ALIASES.get(lowerPart);
  }

  if (/^Key[A-Za-z]$/.test(normalizedPart)) {
    return `Key${normalizedPart.slice(3).toUpperCase()}`;
  }

  if (/^key[a-z]$/i.test(normalizedPart)) {
    return `Key${normalizedPart.slice(3).toUpperCase()}`;
  }

  if (/^Digit\d$/.test(normalizedPart)) {
    return normalizedPart;
  }

  if (/^digit\d$/i.test(normalizedPart)) {
    return `Digit${normalizedPart.slice(5)}`;
  }

  if (/^Numpad.+$/.test(normalizedPart)) {
    return normalizedPart;
  }

  if (/^numpad.+$/i.test(normalizedPart)) {
    return `Numpad${normalizedPart.slice(6)}`;
  }

  if (/^Arrow(?:Up|Down|Left|Right)$/.test(normalizedPart)) {
    return normalizedPart;
  }

  if (/^arrow(?:up|down|left|right)$/i.test(normalizedPart)) {
    const direction = normalizedPart.slice(5).toLowerCase();

    return {
      up: 'ArrowUp',
      down: 'ArrowDown',
      left: 'ArrowLeft',
      right: 'ArrowRight',
    }[direction] || '';
  }

  if (/^F\d{1,2}$/.test(normalizedPart)) {
    return normalizedPart;
  }

  if (/^f\d{1,2}$/i.test(normalizedPart)) {
    return normalizedPart.toUpperCase();
  }

  if (/^[A-Za-z]$/.test(normalizedPart)) {
    return `Key${normalizedPart.toUpperCase()}`;
  }

  if (/^\d$/.test(normalizedPart)) {
    return `Digit${normalizedPart}`;
  }

  if (/^Num\s*\d$/i.test(normalizedPart)) {
    return `Numpad${normalizedPart.replace(/^Num\s*/i, '')}`;
  }

  if (NAMED_BASE_CODES.has(normalizedPart)) {
    return normalizedPart;
  }

  return '';
}

function isAssignableBaseCode(baseCode) {
  if (!baseCode) {
    return false;
  }

  if (
    MODIFIER_CODES.has(baseCode) ||
    BLOCKED_BASE_CODES.has(baseCode)
  ) {
    return false;
  }

  if (/^Key[A-Z]$/.test(baseCode)) {
    return true;
  }

  if (/^Digit\d$/.test(baseCode)) {
    return true;
  }

  if (/^Numpad.+$/.test(baseCode)) {
    return true;
  }

  if (/^F\d{1,2}$/.test(baseCode)) {
    return true;
  }

  if (/^Arrow(?:Up|Down|Left|Right)$/.test(baseCode)) {
    return true;
  }

  return NAMED_BASE_CODES.has(baseCode);
}

function getOrderedModifiers(modifiers) {
  return MODIFIER_ORDER.filter((modifier) => {
    return modifiers.has(modifier);
  });
}

function getShortcutCodePartLabel(part) {
  const normalizedPart = normalizeText(part);

  if (!normalizedPart) {
    return '';
  }

  if (MODIFIER_ORDER.includes(normalizedPart)) {
    return normalizedPart;
  }

  if (normalizedPart.startsWith('Key')) {
    return normalizedPart.slice(3).toUpperCase();
  }

  if (normalizedPart.startsWith('Digit')) {
    return normalizedPart.slice(5);
  }

  if (normalizedPart.startsWith('Numpad')) {
    return `Num ${normalizedPart.slice(6)}`;
  }

  if (BASE_CODE_LABELS.has(normalizedPart)) {
    return BASE_CODE_LABELS.get(normalizedPart);
  }

  return normalizedPart;
}

function normalizeText(value) {
  return String(value ?? '').trim();
}