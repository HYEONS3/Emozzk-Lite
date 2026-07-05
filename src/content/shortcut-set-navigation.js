import {
  createShortcutBindingSetId,
  getShortcutBindingSetIndex,
  normalizeShortcutBindingSetCount,
  normalizeShortcutBindingSetId,
  SHORTCUT_BINDING_SET_OFF,
} from './shortcut-storage.js';

export const SHORTCUT_SET_DIRECTION_PREVIOUS = 'previous';
export const SHORTCUT_SET_DIRECTION_NEXT = 'next';

export function getAdjacentShortcutBindingSetId({
  activeSetId,
  setCount,
  direction,
}) {
  const normalizedSetCount = normalizeShortcutBindingSetCount(setCount);
  const normalizedActiveSetId = normalizeShortcutBindingSetId(activeSetId);

  const activeIndex = getShortcutBindingSetIndex(normalizedActiveSetId);

  const isOffOrInvalid = (
    normalizedActiveSetId === SHORTCUT_BINDING_SET_OFF ||
    activeIndex < 1 ||
    activeIndex > normalizedSetCount
  );

  if (direction === SHORTCUT_SET_DIRECTION_PREVIOUS) {
    if (isOffOrInvalid) {
      return createShortcutBindingSetId(normalizedSetCount);
    }

    if (activeIndex === 1) {
      return SHORTCUT_BINDING_SET_OFF;
    }

    return createShortcutBindingSetId(activeIndex - 1);
  }

  if (direction === SHORTCUT_SET_DIRECTION_NEXT) {
    if (isOffOrInvalid) {
      return createShortcutBindingSetId(1);
    }

    if (activeIndex === normalizedSetCount) {
      return SHORTCUT_BINDING_SET_OFF;
    }

    return createShortcutBindingSetId(activeIndex + 1);
  }

  return '';
}