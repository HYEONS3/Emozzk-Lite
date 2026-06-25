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
  'CapsLock',
  'ContextMenu',
]);

export function getShortcutCodeFromKeyboardEvent(event) {
  const baseCode = normalizeText(event?.code);

  if (!baseCode) {
    return '';
  }

  if (
    MODIFIER_CODES.has(baseCode) ||
    BLOCKED_BASE_CODES.has(baseCode)
  ) {
    return '';
  }

  const parts = [];

  if (event.ctrlKey) {
    parts.push('Ctrl');
  }

  if (event.altKey) {
    parts.push('Alt');
  }

  if (event.shiftKey) {
    parts.push('Shift');
  }

  if (event.metaKey) {
    parts.push('Meta');
  }

  parts.push(baseCode);

  return parts.join('+');
}

export function getShortcutCodeLabel(code) {
  const normalizedCode = normalizeText(code);

  if (!normalizedCode) {
    return '';
  }

  return normalizedCode
    .split('+')
    .map(getShortcutCodePartLabel)
    .filter(Boolean)
    .join('+');
}

function getShortcutCodePartLabel(part) {
  const normalizedPart = normalizeText(part);

  if (!normalizedPart) {
    return '';
  }

  if (
    normalizedPart === 'Ctrl' ||
    normalizedPart === 'Alt' ||
    normalizedPart === 'Shift' ||
    normalizedPart === 'Meta'
  ) {
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

  if (normalizedPart === 'Space') {
    return 'Space';
  }

  if (normalizedPart === 'Backquote') {
    return '`';
  }

  if (normalizedPart === 'Minus') {
    return '-';
  }

  if (normalizedPart === 'Equal') {
    return '=';
  }

  if (normalizedPart === 'BracketLeft') {
    return '[';
  }

  if (normalizedPart === 'BracketRight') {
    return ']';
  }

  if (normalizedPart === 'Backslash') {
    return '\\';
  }

  if (normalizedPart === 'Semicolon') {
    return ';';
  }

  if (normalizedPart === 'Quote') {
    return "'";
  }

  if (normalizedPart === 'Comma') {
    return ',';
  }

  if (normalizedPart === 'Period') {
    return '.';
  }

  if (normalizedPart === 'Slash') {
    return '/';
  }

  if (normalizedPart === 'ArrowUp') {
    return '↑';
  }

  if (normalizedPart === 'ArrowDown') {
    return '↓';
  }

  if (normalizedPart === 'ArrowLeft') {
    return '←';
  }

  if (normalizedPart === 'ArrowRight') {
    return '→';
  }

  return normalizedPart;
}

function normalizeText(value) {
  return String(value ?? '').trim();
}