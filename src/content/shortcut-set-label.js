import {
  getShortcutBindingSetIndex,
  SHORTCUT_BINDING_SET_OFF,
} from './shortcut-storage.js';

const HANGUL_INITIALS = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ',
  'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ',
  'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];

export function getShortcutSetFallbackLabel(setId) {
  if (setId === SHORTCUT_BINDING_SET_OFF) {
    return 'OFF';
  }

  const setIndex = getShortcutBindingSetIndex(setId);

  if (!setIndex) {
    return '';
  }

  return String(setIndex);
}

export function getShortcutSetSegmentLabel(options) {
  const setId = typeof options === 'object'
    ? options?.setId
    : options;

  const label = typeof options === 'object'
    ? options?.label
    : '';

  const customLabel = getShortcutSetCustomLabel({
    setId,
    label,
  });

  return getShortcutSetInitialLabel(customLabel) ||
    getShortcutSetFallbackLabel(setId);
}

export function getShortcutSetPreviewLabel({
  setId,
  label,
}) {
  return getShortcutSetCustomLabel({
    setId,
    label,
  }) || getShortcutSetFallbackLabel(setId);
}

function getShortcutSetCustomLabel({
  setId,
  label,
}) {
  const normalizedLabel = normalizeText(label);
  const fallbackLabel = getShortcutSetFallbackLabel(setId);

  if (!normalizedLabel) {
    return '';
  }

  if (normalizedLabel === fallbackLabel) {
    return '';
  }

  return normalizedLabel;
}

function getShortcutSetInitialLabel(label) {
  const normalizedLabel = normalizeText(label);

  if (!normalizedLabel) {
    return '';
  }

  const firstGrapheme = getFirstGrapheme(normalizedLabel);

  if (!firstGrapheme) {
    return '';
  }

  const hangulInitial = getHangulInitial(firstGrapheme);

  if (hangulInitial) {
    return hangulInitial;
  }

  return firstGrapheme.toLocaleUpperCase('ko-KR');
}

function getFirstGrapheme(value) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return '';
  }

  if (
    typeof Intl !== 'undefined' &&
    typeof Intl.Segmenter === 'function'
  ) {
    const segmenter = new Intl.Segmenter('ko-KR', {
      granularity: 'grapheme',
    });

    const iterator = segmenter.segment(normalizedValue)[Symbol.iterator]();
    const first = iterator.next();

    return first.done
      ? ''
      : first.value.segment;
  }

  return Array.from(normalizedValue)[0] || '';
}

function getHangulInitial(value) {
  const codePoint = String(value || '').codePointAt(0);

  if (!Number.isInteger(codePoint)) {
    return '';
  }

  const HANGUL_SYLLABLE_START = 0xac00;
  const HANGUL_SYLLABLE_END = 0xd7a3;

  if (
    codePoint < HANGUL_SYLLABLE_START ||
    codePoint > HANGUL_SYLLABLE_END
  ) {
    return '';
  }

  const initialIndex = Math.floor(
    (codePoint - HANGUL_SYLLABLE_START) / 588
  );

  return HANGUL_INITIALS[initialIndex] || '';
}

function normalizeText(value) {
  return String(value ?? '').trim();
}