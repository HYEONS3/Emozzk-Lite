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

  if (
    normalizedActiveSetId === SHORTCUT_BINDING_SET_OFF ||
    activeIndex < 1 ||
    activeIndex > normalizedSetCount
  ) {
    return createShortcutBindingSetId(
      direction === SHORTCUT_SET_DIRECTION_PREVIOUS
        ? normalizedSetCount
        : 1
    );
  }

  if (direction === SHORTCUT_SET_DIRECTION_PREVIOUS) {
    return createShortcutBindingSetId(
      activeIndex === 1
        ? normalizedSetCount
        : activeIndex - 1
    );
  }

  if (direction === SHORTCUT_SET_DIRECTION_NEXT) {
    return createShortcutBindingSetId(
      activeIndex === normalizedSetCount
        ? 1
        : activeIndex + 1
    );
  }

  return '';
}