const SHORTCUT_SET_SWITCH_CLASS = 'emzk-lite-shortcut-set-switch';

const SHORTCUT_SET_DRAG_SUPPRESS_CLICK_ATTR =
  'data-emzk-lite-shortcut-set-suppress-click';

const SHORTCUT_SET_DRAGGING_ATTR =
  'data-emzk-lite-shortcut-set-dragging';

const SHORTCUT_SET_DRAG_CURSOR_LOCK_CLASS =
  'emzk-lite-shortcut-set-dragging';

const SHORTCUT_SET_DRAG_PREVIEW_CLASS =
  'emzk-lite-shortcut-set-drag-preview';

const SHORTCUT_SET_DRAG_THRESHOLD = 3;
const SHORTCUT_SET_CLICK_SUPPRESS_MS = 80;
const SHORTCUT_SET_DRAG_PREVIEW_HIDE_MS = 100;

let shortcutSetDragState = null;
let shortcutSetPreviewHideTimer = 0;

export function attachShortcutSetSwitchController({
  wrapper,
  getSets,
  getActiveSetId,
  switchSet,
  closeMenu,
}) {
  if (!(wrapper instanceof HTMLElement)) {
    return;
  }

  wrapper.addEventListener('pointerdown', (event) => {
    handlePointerDown(event, {
      wrapper,
      getSets,
      getActiveSetId,
      switchSet,
      closeMenu,
    });
  });
}

export function clearShortcutSetSwitchFloatingUi() {
  if (shortcutSetDragState) {
    cleanupShortcutSetDrag({
      suppressClick: false,
    });
  }

  removeShortcutSetDragPreview();
}

export function isShortcutSetSwitchVisible() {
  const switches = document.querySelectorAll(
    `.${SHORTCUT_SET_SWITCH_CLASS}`
  );

  return Array.from(switches)
    .some(isVisibleShortcutSetSwitch);
}

function isVisibleShortcutSetSwitch(element) {
  if (
    !(element instanceof HTMLElement) ||
    !element.isConnected
  ) {
    return false;
  }

  const rect = element.getBoundingClientRect();

  if (
    rect.width <= 0 ||
    rect.height <= 0
  ) {
    return false;
  }

  if (
    rect.bottom <= 0 ||
    rect.right <= 0 ||
    rect.top >= window.innerHeight ||
    rect.left >= window.innerWidth
  ) {
    return false;
  }

  const style = window.getComputedStyle(element);

  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    Number(style.opacity) > 0
  );
}

export function isShortcutSetClickSuppressed(button) {
  const wrapper = button?.closest?.(`.${SHORTCUT_SET_SWITCH_CLASS}`);

  return wrapper?.getAttribute(SHORTCUT_SET_DRAG_SUPPRESS_CLICK_ATTR) === 'true';
}

function handlePointerDown(event, options) {
  if (
    event.pointerType === 'mouse' &&
    event.button !== 0
  ) {
    return;
  }

  const {
    wrapper,
    getSets,
    getActiveSetId,
    switchSet,
    closeMenu,
  } = options;

  if (!(wrapper instanceof HTMLElement)) {
    return;
  }

  stopControlEvent(event);
  closeMenu?.();

  const sets = normalizeShortcutSets(getSets?.());
  const rect = wrapper.getBoundingClientRect();

  if (!sets.length || !rect.width) {
    return;
  }

  if (shortcutSetDragState) {
    cleanupShortcutSetDrag({
      suppressClick: false,
    });
  }

  shortcutSetDragState = {
    pointerId: event.pointerId,
    wrapper,
    rect,
    sets,
    getActiveSetId,
    switchSet,
    startClientX: event.clientX,
    latestClientX: event.clientX,
    lastSetId: normalizeSetId(getActiveSetId?.()),
    hasDragged: false,
  };

  try {
    wrapper.setPointerCapture?.(event.pointerId);
  } catch {
    // Pointer capture can fail if the pointer is already released.
  }

  document.addEventListener('pointermove', handlePointerMove, true);
  document.addEventListener('pointerup', handlePointerUp, true);
  document.addEventListener('pointercancel', handlePointerCancel, true);
}

function handlePointerMove(event) {
  const state = shortcutSetDragState;

  if (!state || event.pointerId !== state.pointerId) {
    return;
  }

  stopControlEvent(event);

  state.latestClientX = event.clientX;

  if (
    !state.hasDragged &&
    Math.abs(event.clientX - state.startClientX) >= SHORTCUT_SET_DRAG_THRESHOLD
  ) {
    state.hasDragged = true;
    setShortcutSetDragging(state.wrapper, true);
    lockShortcutSetDragCursor();
  }

  if (!state.hasDragged) {
    return;
  }

  const shortcutSet = getShortcutSetFromPointerPosition({
    rect: state.rect,
    sets: state.sets,
    clientX: event.clientX,
  });

  if (!shortcutSet) {
    return;
  }

  showShortcutSetDragPreview({
    rect: state.rect,
    setCount: state.sets.length,
    shortcutSet,
  });

  switchShortcutSetIfNeeded({
    state,
    setId: shortcutSet.setId,
  });
}

function handlePointerUp(event) {
  const state = shortcutSetDragState;

  if (!state || event.pointerId !== state.pointerId) {
    return;
  }

  stopControlEvent(event);

  if (!state.hasDragged) {
    const shortcutSet = getShortcutSetFromPointerPosition({
      rect: state.rect,
      sets: state.sets,
      clientX: event.clientX,
    });

    if (shortcutSet?.setId) {
      switchShortcutSetIfNeeded({
        state,
        setId: shortcutSet.setId,
      });
    }
  }

  cleanupShortcutSetDrag({
    suppressClick: true,
  });
}

function handlePointerCancel(event) {
  const state = shortcutSetDragState;

  if (!state || event.pointerId !== state.pointerId) {
    return;
  }

  cleanupShortcutSetDrag({
    suppressClick: false,
  });
}

function cleanupShortcutSetDrag({
  suppressClick,
} = {}) {
  const state = shortcutSetDragState;

  if (!state) {
    return;
  }

  document.removeEventListener('pointermove', handlePointerMove, true);
  document.removeEventListener('pointerup', handlePointerUp, true);
  document.removeEventListener('pointercancel', handlePointerCancel, true);

  try {
    if (state.wrapper?.hasPointerCapture?.(state.pointerId)) {
      state.wrapper.releasePointerCapture(state.pointerId);
    }
  } catch {
    // Ignore stale pointer capture cleanup failures.
  }

  unlockShortcutSetDragCursor();
  hideShortcutSetDragPreview();
  clearShortcutSetDraggingAttributes();

  if (suppressClick && state.wrapper instanceof HTMLElement) {
    suppressNextShortcutSetClick(state.wrapper);
  }

  shortcutSetDragState = null;
}

function switchShortcutSetIfNeeded({
  state,
  setId,
}) {
  const normalizedSetId = normalizeSetId(setId);

  if (!normalizedSetId) {
    return;
  }

  if (normalizedSetId === state.lastSetId) {
    return;
  }

  state.lastSetId = normalizedSetId;

  if (normalizeSetId(state.getActiveSetId?.()) === normalizedSetId) {
    return;
  }

  Promise.resolve(state.switchSet?.(normalizedSetId))
    .catch((error) => {
      console.error('[Emozzk Lite] failed to switch shortcut set:', error);
    });
}

function getShortcutSetFromPointerPosition({
  rect,
  sets,
  clientX,
}) {
  if (!rect?.width || !Array.isArray(sets) || !sets.length) {
    return null;
  }

  const clampedClientX = Math.min(
    rect.right - 0.1,
    Math.max(rect.left, clientX)
  );

  const ratio = (clampedClientX - rect.left) / rect.width;
  const index = Math.min(
    sets.length - 1,
    Math.max(0, Math.floor(ratio * sets.length))
  );

  const set = sets[index];
  const setId = normalizeSetId(set?.id);

  if (!setId) {
    return null;
  }

  return {
    setId,
    previewLabel: getShortcutSetPreviewText(set) || setId,
    index,
  };
}

function getShortcutSetPreviewText(set) {
  /*
   * segmentLabel may be shortened for the compact header.
   * The floating drag preview must keep the full set label.
   */
  return normalizeText(set?.previewLabel) ||
    normalizeText(set?.label) ||
    normalizeText(set?.title) ||
    normalizeText(set?.segmentLabel);
}

function getShortcutSetDragPreview() {
  let preview = document.querySelector(
    `.${SHORTCUT_SET_DRAG_PREVIEW_CLASS}`
  );

  if (preview instanceof HTMLElement) {
    return preview;
  }

  preview = document.createElement('span');
  preview.className = SHORTCUT_SET_DRAG_PREVIEW_CLASS;
  preview.hidden = true;
  preview.setAttribute('aria-hidden', 'true');

  document.body.appendChild(preview);

  return preview;
}

function showShortcutSetDragPreview({
  rect,
  setCount,
  shortcutSet,
}) {
  if (!rect?.width || !shortcutSet) {
    return;
  }

  const preview = getShortcutSetDragPreview();
  const normalizedSetCount = Math.max(1, setCount || 1);
  const slotWidth = rect.width / normalizedSetCount;

  const left = rect.left + slotWidth * shortcutSet.index + slotWidth / 2;
  const top = rect.top - 7;

  if (shortcutSetPreviewHideTimer) {
    window.clearTimeout(shortcutSetPreviewHideTimer);
    shortcutSetPreviewHideTimer = 0;
  }

  preview.textContent = normalizeText(shortcutSet.previewLabel) || shortcutSet.setId;
  preview.hidden = false;
  preview.style.left = `${left}px`;
  preview.style.top = `${top}px`;

  if (preview.getAttribute('data-state') !== 'open') {
    preview.setAttribute('data-state', 'enter');

    requestAnimationFrame(() => {
      if (!preview.isConnected || preview.hidden) {
        return;
      }

      preview.setAttribute('data-state', 'open');
    });
  }
}

function hideShortcutSetDragPreview() {
  const preview = document.querySelector(
    `.${SHORTCUT_SET_DRAG_PREVIEW_CLASS}`
  );

  if (!(preview instanceof HTMLElement)) {
    return;
  }

  if (preview.hidden) {
    preview.removeAttribute('data-state');
    return;
  }

  if (shortcutSetPreviewHideTimer) {
    window.clearTimeout(shortcutSetPreviewHideTimer);
  }

  preview.setAttribute('data-state', 'leave');

  shortcutSetPreviewHideTimer = window.setTimeout(() => {
    preview.hidden = true;
    preview.removeAttribute('data-state');
    shortcutSetPreviewHideTimer = 0;
  }, SHORTCUT_SET_DRAG_PREVIEW_HIDE_MS);
}

function removeShortcutSetDragPreview() {
  if (shortcutSetPreviewHideTimer) {
    window.clearTimeout(shortcutSetPreviewHideTimer);
    shortcutSetPreviewHideTimer = 0;
  }

  document
    .querySelectorAll(`.${SHORTCUT_SET_DRAG_PREVIEW_CLASS}`)
    .forEach((preview) => {
      preview.remove();
    });

  clearShortcutSetDraggingAttributes();
  unlockShortcutSetDragCursor();
}

function setShortcutSetDragging(wrapper, dragging) {
  if (!(wrapper instanceof Element)) {
    return;
  }

  if (dragging) {
    wrapper.setAttribute(SHORTCUT_SET_DRAGGING_ATTR, 'true');
    return;
  }

  wrapper.removeAttribute(SHORTCUT_SET_DRAGGING_ATTR);
}

function clearShortcutSetDraggingAttributes() {
  document
    .querySelectorAll(`[${SHORTCUT_SET_DRAGGING_ATTR}]`)
    .forEach((element) => {
      element.removeAttribute(SHORTCUT_SET_DRAGGING_ATTR);
    });
}

function suppressNextShortcutSetClick(wrapper) {
  wrapper.setAttribute(SHORTCUT_SET_DRAG_SUPPRESS_CLICK_ATTR, 'true');

  window.setTimeout(() => {
    wrapper.removeAttribute(SHORTCUT_SET_DRAG_SUPPRESS_CLICK_ATTR);
  }, SHORTCUT_SET_CLICK_SUPPRESS_MS);
}

function lockShortcutSetDragCursor() {
  document.documentElement.classList.add(SHORTCUT_SET_DRAG_CURSOR_LOCK_CLASS);
}

function unlockShortcutSetDragCursor() {
  document.documentElement.classList.remove(SHORTCUT_SET_DRAG_CURSOR_LOCK_CLASS);
}

function normalizeShortcutSets(sets) {
  if (!Array.isArray(sets)) {
    return [];
  }

  return sets
    .map((set) => {
      const id = normalizeSetId(set?.id);

      if (!id) {
        return null;
      }

      return {
        ...set,
        id,
        segmentLabel: normalizeText(set?.segmentLabel),
        previewLabel: normalizeText(set?.previewLabel),
      };
    })
    .filter(Boolean);
}

function normalizeSetId(setId) {
  return String(setId ?? '').trim();
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function stopControlEvent(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
}