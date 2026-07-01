import {
  getEmoteAltFromButton,
  isRealEmoteButton,
} from './emote-buttons.js';

import {
  getRecentEmoteIdFromAlt,
  readRecentEmotes,
  writeRecentEmotes,
} from './recent-emote-storage.js';

import {
  reorderFavoriteRecentEmoteSubset,
} from './favorite-recent-emote-storage.js';

import {
  FAVORITE_GROUP_BOUND,
  FAVORITE_GROUP_UNBOUND,
} from './emote-favorite-groups.js';

import {
  mergeFavoriteAndRecentEmotes,
} from './favorite-recent-merge.js';

import {
  getCachedRecentStorageLimit,
} from './recent-emote-storage-limit-bridge.js';

import {
  dispatchFavoritesChanged,
} from './emote-favorites-event-name.js';

import {
  scheduleBadgeUpdate,
} from './badge-overlay.js';

import {
  EMOTE_BIND_MODE_CHANGED_EVENT,
  EMOTE_BIND_MODE_RENAME,
  exitShortcutSetRenameMode,
  getEmoteBindModeState,
  isEmoteBindAssignMode,
  isEmoteBindClearMode,
} from './emote-bind-mode-state.js';

const FAVORITES_LIST_SELECTOR = '.emzk-lite-favorites-list';
const FAVORITES_GROUP_ATTR = 'data-emzk-lite-favorite-group';

const DRAG_ATTACHED_ATTR = 'data-emzk-lite-drag-attached';

const DRAG_ACTIVE_CLASS = 'emzk-lite-favorites-drag-active';
const DRAGGING_ITEM_CLASS = 'emzk-lite-favorites-dragging-item';
const PLACEHOLDER_CLASS = 'emzk-lite-favorites-drag-placeholder';
const DRAG_CURSOR_LOCK_CLASS = 'emzk-lite-favorites-drag-cursor-lock';

const DRAG_START_DISTANCE_PX = 6;

const REORDER_DURATION_MS = 210;
const REORDER_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';

const AUTO_SCROLL_EDGE_PX = 24;
const AUTO_SCROLL_MAX_SPEED_PX_PER_SECOND = 520;

const CLICK_SUPPRESS_MS = 350;

const NO_INSERTION_HIT = Symbol('NO_INSERTION_HIT');

let activeDrag = null;
let suppressClickUntil = 0;
let clickSuppressListenerAttached = false;
let bindModeListenerAttached = false;

export function attachFavoriteEmoteDrag(section) {
  if (!(section instanceof HTMLElement)) return;

  if (section.getAttribute(DRAG_ATTACHED_ATTR) === 'true') {
    disableNativeDraggableChildren(section);
    return;
  }

  section.setAttribute(DRAG_ATTACHED_ATTR, 'true');
  section.addEventListener('pointerdown', handlePointerDown, true);
  section.addEventListener('dragstart', handleNativeDragStart, true);

  disableNativeDraggableChildren(section);

  ensureClickSuppressListener();
  ensureBindModeListener();
}

function handlePointerDown(event) {
  if (activeDrag) return;

  /*
   * assign / clear mode에서는 이모티콘 클릭·드래그가 설정 동작이다.
   *
   * assign:
   * - 이모티콘 클릭 → 단축키 지정 대상 임시 선택
   *
   * clear:
   * - 이모티콘 클릭/드래그 → 해제 후보 다중 선택
   *
   * 따라서 즐겨찾기 위치 이동 drag reorder는 assign / clear 중에는 시작하지 않는다.
   * rename은 입력 상태일 뿐이므로 drag reorder를 여기서 막지 않는다.
   */
  if (isEmoteBindInteractionModeActive()) return;

  if (!isPrimaryPointerEvent(event)) return;
  if (hasAnyModifier(event)) return;

  const section = event.currentTarget;

  if (!(section instanceof HTMLElement)) return;

  const list = section.querySelector(FAVORITES_LIST_SELECTOR);

  if (!(list instanceof HTMLElement)) return;

  const item = getFavoriteItemFromEvent({
    event,
    list,
  });

  if (!item) return;

  const group = getFavoriteGroupFromItem(item);

  if (!group) return;

  exitShortcutSetRenameModeBeforeDragIfNeeded();

  disableNativeDraggableChildren(item);

  const itemRect = item.getBoundingClientRect();

  activeDrag = {
    pointerId: event.pointerId,
    section,
    list,
    item,

    ghostItem: null,
    ghostMetrics: null,

    startX: event.clientX,
    startY: event.clientY,

    /*
     * pointerdown 당시에는 실제 누른 위치를 보관한다.
     * drag가 실제로 시작되는 순간 startDrag()에서 ghost 중심 offset으로 재설정한다.
     */
    pointerOffsetX: event.clientX - itemRect.left,
    pointerOffsetY: event.clientY - itemRect.top,

    latestClientX: event.clientX,
    latestClientY: event.clientY,

    group,
    startOrder: [],
    placeholder: null,
    dragMetrics: null,
    scrollContainer: null,

		insertionLockItem: null,

    frameId: 0,
    autoScrollFrameId: 0,
    lastAutoScrollTime: 0,

    started: false,
    cancelled: false,
  };

  document.addEventListener('pointermove', handlePointerMove, true);
  document.addEventListener('pointerup', handlePointerUp, true);
  document.addEventListener('pointercancel', handlePointerCancel, true);
}

function handlePointerMove(event) {
  if (!activeDrag) return;
  if (event.pointerId !== activeDrag.pointerId) return;

  if (isEmoteBindInteractionModeActive()) {
    cancelActiveDrag();
    return;
  }

  activeDrag.latestClientX = event.clientX;
  activeDrag.latestClientY = event.clientY;

  if (!activeDrag.started) {
    const distance = getPointerDistance({
      startX: activeDrag.startX,
      startY: activeDrag.startY,
      currentX: event.clientX,
      currentY: event.clientY,
    });

    if (distance < DRAG_START_DISTANCE_PX) {
      return;
    }

    startDrag(event);
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  scheduleDragFrame();
  scheduleAutoScrollFrame();
}

function handlePointerUp(event) {
  if (!activeDrag) return;
  if (event.pointerId !== activeDrag.pointerId) return;

  const shouldSave =
    activeDrag.started &&
    !activeDrag.cancelled &&
    !isEmoteBindInteractionModeActive();

  if (shouldSave) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    suppressClickUntil = Date.now() + CLICK_SUPPRESS_MS;
  }

  const context = activeDrag;

  cleanupDrag({
    restoreOrder: !shouldSave,
  });

  if (!shouldSave) return;

  const nextOrder = getFavoriteIdsFromListByGroup({
    list: context.list,
    group: context.group,
  });

  if (isSameOrder(context.startOrder, nextOrder)) {
    return;
  }

  saveFavoriteSubsetOrder({
    subsetEmojiIds: context.startOrder,
    reorderedSubsetEmojiIds: nextOrder,
  });
}

function handlePointerCancel(event) {
  if (!activeDrag) return;
  if (event.pointerId !== activeDrag.pointerId) return;

  cleanupDrag({
    restoreOrder: true,
  });
}

function handleNativeDragStart(event) {
  const target = event.target;

  if (!(target instanceof Element)) return;

  const item = target.closest('li');

  if (!(item instanceof HTMLElement)) return;
  if (!isDraggableFavoriteItem(item)) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

function handleBindModeChanged() {
  if (!activeDrag) {
    return;
  }

  /*
   * drag reorder 도중 clear/assign mode로 바뀌면 위치 변경을 폐기한다.
   */
  if (isEmoteBindInteractionModeActive()) {
    cancelActiveDrag();
  }
}

function cancelActiveDrag() {
  if (!activeDrag) return;

  cleanupDrag({
    restoreOrder: true,
  });
}

function startDrag(event) {
  if (!activeDrag) return;
  if (activeDrag.started) return;

  if (isEmoteBindInteractionModeActive()) {
    cancelActiveDrag();
    return;
  }

  const {
    item,
    list,
    section,
  } = activeDrag;

  activeDrag.started = true;
  activeDrag.startOrder = getFavoriteIdsFromListByGroup({
    list,
    group: activeDrag.group,
  });
  activeDrag.dragMetrics = getDragMetrics(item);
  activeDrag.placeholder = createPlaceholder(activeDrag.dragMetrics);
  activeDrag.placeholder.setAttribute(FAVORITES_GROUP_ATTR, activeDrag.group);
  activeDrag.scrollContainer = getAutoScrollContainer(list);

  activeDrag.ghostItem = createDragGhostItem({
    item,
  });

  if (!activeDrag.ghostItem) {
    cancelActiveDrag();
    return;
  }

  activeDrag.ghostMetrics = getGhostMetrics(activeDrag.ghostItem);

  /*
   * drag가 실제로 시작되는 순간부터 커서가 ghost 이미지의 중심을 잡도록 한다.
   */
  activeDrag.pointerOffsetX = activeDrag.ghostMetrics.widthNumber / 2;
  activeDrag.pointerOffsetY = activeDrag.ghostMetrics.heightNumber / 2;

  list.insertBefore(activeDrag.placeholder, item);
  hideOriginalDraggedItem(item);

  document.body.appendChild(activeDrag.ghostItem);

  section.classList.add(DRAG_ACTIVE_CLASS);
  item.classList.add(DRAGGING_ITEM_CLASS);
  document.documentElement.classList.add(DRAG_CURSOR_LOCK_CLASS);

  moveDraggedItem();
  scheduleDragFrame();
  scheduleAutoScrollFrame();
}

function scheduleDragFrame() {
  if (!activeDrag) return;
  if (activeDrag.frameId) return;

  activeDrag.frameId = requestAnimationFrame(updateDragFrame);
}

function updateDragFrame() {
  if (!activeDrag) return;

  activeDrag.frameId = 0;

  if (isEmoteBindInteractionModeActive()) {
    cancelActiveDrag();
    return;
  }

  moveDraggedItem();

  if (
    activeDrag.insertionLockItem instanceof HTMLElement &&
    !isPointInsideElement({
      x: activeDrag.latestClientX,
      y: activeDrag.latestClientY,
      element: activeDrag.insertionLockItem,
    })
  ) {
    activeDrag.insertionLockItem = null;
  }

  const insertion = getInsertionBeforeElementByHitPosition({
    x: activeDrag.latestClientX,
    y: activeDrag.latestClientY,
    list: activeDrag.list,
    placeholder: activeDrag.placeholder,
    draggedItem: activeDrag.item,
    group: activeDrag.group,
    lockedItem: activeDrag.insertionLockItem,
  });

  if (insertion === NO_INSERTION_HIT) {
    return;
  }

  const moved = movePlaceholder({
    list: activeDrag.list,
    placeholder: activeDrag.placeholder,
    beforeElement: insertion.beforeElement ?? getGroupAppendBeforeElement({
      list: activeDrag.list,
      group: activeDrag.group,
      placeholder: activeDrag.placeholder,
    }),
  });

  if (moved) {
    activeDrag.insertionLockItem = insertion.hitItem;
  }
}

function moveDraggedItem() {
  if (!activeDrag) return;

  const {
    ghostItem,
    latestClientX,
    latestClientY,
    pointerOffsetX,
    pointerOffsetY,
  } = activeDrag;

  if (!(ghostItem instanceof HTMLElement)) {
    return;
  }

  const x = Math.round(latestClientX - pointerOffsetX);
  const y = Math.round(latestClientY - pointerOffsetY);

  ghostItem.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.04)`;
}

function getInsertionBeforeElementByHitPosition({
  x,
  y,
  list,
  placeholder,
  draggedItem,
  group,
  lockedItem = null,
}) {
  if (!(list instanceof HTMLElement)) {
    return NO_INSERTION_HIT;
  }

  if (!(placeholder instanceof HTMLElement)) {
    return NO_INSERTION_HIT;
  }

  if (!isFavoriteGroup(group)) {
    return NO_INSERTION_HIT;
  }

  const orderedItems = getOrderedItemsIncludingPlaceholder({
    list,
    placeholder,
    draggedItem,
    group,
  });

  if (!orderedItems.length) {
    return NO_INSERTION_HIT;
  }

  const hitItem = findHitFavoriteItem({
    x,
    y,
    items: orderedItems.filter((item) => {
      return item !== placeholder;
    }),
  });

  if (!hitItem) {
    return NO_INSERTION_HIT;
  }

  /*
   * 직전에 이 item 때문에 placeholder가 이동했다면,
   * 커서가 이 item 영역 안에 남아 있는 동안은 같은 item으로 재이동하지 않는다.
   *
   * 이 lock이 없으면:
   * - 뒤 item 위에서 insert after
   * - placeholder가 이동한 뒤 같은 item이 앞 item으로 재해석됨
   * - 즉시 insert before
   * - 다시 insert after
   * 의 왕복이 발생한다.
   */
  if (hitItem === lockedItem) {
    return NO_INSERTION_HIT;
  }

  const placeholderIndex = orderedItems.indexOf(placeholder);
  const hitIndex = orderedItems.indexOf(hitItem);

  if (
    placeholderIndex < 0 ||
    hitIndex < 0 ||
    placeholderIndex === hitIndex
  ) {
    return NO_INSERTION_HIT;
  }

  if (hitIndex > placeholderIndex) {
    return {
      hitItem,
      beforeElement: getBeforeElementForInsertAfter({
        orderedItems,
        hitItem,
        list,
        group,
        placeholder,
      }),
    };
  }

  return {
    hitItem,
    beforeElement: hitItem,
  };
}

function getOrderedItemsIncludingPlaceholder({
  list,
  placeholder,
  draggedItem,
  group,
}) {
  return Array.from(list.querySelectorAll(':scope > li'))
    .filter((item) => {
      if (!(item instanceof HTMLElement)) return false;
      if (item === draggedItem) return false;

      if (item === placeholder) {
        return true;
      }

      return (
        isElementVisibleForOrdering(item) &&
        isDraggableFavoriteItem(item) &&
        getFavoriteGroupFromItem(item) === group
      );
    });
}

function findHitFavoriteItem({
  x,
  y,
  items,
}) {
  return items.find((item) => {
    return isPointInsideElement({
      x,
      y,
      element: item,
    });
  }) ?? null;
}

function isPointInsideElement({
  x,
  y,
  element,
}) {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const rect = element.getBoundingClientRect();

  return (
    x >= rect.left &&
    x <= rect.right &&
    y >= rect.top &&
    y <= rect.bottom
  );
}

function getBeforeElementForInsertAfter({
  orderedItems,
  hitItem,
  list,
  group,
  placeholder,
}) {
  const hitIndex = orderedItems.indexOf(hitItem);

  if (hitIndex < 0) {
    return NO_INSERTION_HIT;
  }

  for (let index = hitIndex + 1; index < orderedItems.length; index += 1) {
    const nextItem = orderedItems[index];

    if (!(nextItem instanceof HTMLElement)) {
      continue;
    }

    if (nextItem === placeholder) {
      continue;
    }

    return nextItem;
  }

  return getGroupAppendBeforeElement({
    list,
    group,
    placeholder,
  });
}


function movePlaceholder({
  list,
  placeholder,
  beforeElement,
}) {
  if (!list || !placeholder) return false;

  if (beforeElement && placeholder.nextElementSibling === beforeElement) {
    return false;
  }

  if (!beforeElement && placeholder === list.lastElementChild) {
    return false;
  }

  const previousRects = getFavoriteItemRects(list);

  if (beforeElement) {
    list.insertBefore(placeholder, beforeElement);
  } else {
    list.appendChild(placeholder);
  }

  animateFavoriteReflow(list, previousRects);

  return true;
}

function scheduleAutoScrollFrame() {
  if (!activeDrag) return;
  if (!activeDrag.scrollContainer) return;
  if (activeDrag.autoScrollFrameId) return;

  activeDrag.autoScrollFrameId = requestAnimationFrame(updateAutoScrollFrame);
}

function updateAutoScrollFrame(timestamp) {
  if (!activeDrag) return;

  activeDrag.autoScrollFrameId = 0;

  if (isEmoteBindInteractionModeActive()) {
    cancelActiveDrag();
    return;
  }

  const scrollContainer = activeDrag.scrollContainer;

  if (!scrollContainer) return;

  const velocityY = getAutoScrollVelocityY({
    scrollContainer,
    clientY: activeDrag.latestClientY,
  });

  if (velocityY === 0) {
    activeDrag.lastAutoScrollTime = 0;
    return;
  }

  const elapsedMs = activeDrag.lastAutoScrollTime
    ? timestamp - activeDrag.lastAutoScrollTime
    : 16.67;

  activeDrag.lastAutoScrollTime = timestamp;

  const deltaY = velocityY * (elapsedMs / 1000);

  const previousScrollTop = scrollContainer.scrollTop;
  const nextScrollTop = clampNumber({
    value: previousScrollTop + deltaY,
    min: 0,
    max: getMaxScrollTop(scrollContainer),
  });

  if (nextScrollTop === previousScrollTop) {
    activeDrag.lastAutoScrollTime = 0;
    return;
  }

  scrollContainer.scrollTop = nextScrollTop;

  scheduleDragFrame();
  scheduleAutoScrollFrame();
}

function cleanupDrag({
  restoreOrder,
}) {
  if (!activeDrag) return;

  const {
    item,
    ghostItem,
    section,
    list,
    placeholder,
    startOrder,
    frameId,
    autoScrollFrameId,
  } = activeDrag;

  if (frameId) {
    cancelAnimationFrame(frameId);
  }

  if (autoScrollFrameId) {
    cancelAnimationFrame(autoScrollFrameId);
  }

  document.removeEventListener('pointermove', handlePointerMove, true);
  document.removeEventListener('pointerup', handlePointerUp, true);
  document.removeEventListener('pointercancel', handlePointerCancel, true);

  if (ghostItem?.isConnected) {
    ghostItem.remove();
  }

  if (placeholder?.isConnected) {
    placeholder.replaceWith(item);
  }

  resetDraggedItem(item);

  section.classList.remove(DRAG_ACTIVE_CLASS);
  item.classList.remove(DRAGGING_ITEM_CLASS);
  document.documentElement.classList.remove(DRAG_CURSOR_LOCK_CLASS);

  clearInlineAnimationState(list);

  if (restoreOrder) {
    restoreFavoriteGroupOrder({
      list,
      group: activeDrag?.group,
      orderedIds: startOrder,
    });
  }

  activeDrag = null;
}

function getDragMetrics(item) {
  const rect = item.getBoundingClientRect();

  const widthNumber = Math.round(rect.width);
  const heightNumber = Math.round(rect.height);

  return {
    widthNumber,
    heightNumber,
    width: `${widthNumber}px`,
    height: `${heightNumber}px`,
  };
}

function createDragGhostItem({
  item,
}) {
  const image = getEmoteImageFromItem(item);

  if (!(image instanceof HTMLImageElement)) {
    return null;
  }

  const imageRect = image.getBoundingClientRect();

  const widthNumber = Math.max(
    1,
    Math.round(imageRect.width || image.width || image.naturalWidth || 32)
  );

  const heightNumber = Math.max(
    1,
    Math.round(imageRect.height || image.height || image.naturalHeight || 32)
  );

  const ghost = image.cloneNode(true);

  ghost.classList.add('emzk-lite-favorites-drag-ghost');
  ghost.setAttribute('aria-hidden', 'true');
  ghost.setAttribute('draggable', 'false');

  Object.assign(ghost.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    right: 'auto',
    bottom: 'auto',
    width: `${widthNumber}px`,
    height: `${heightNumber}px`,
    minWidth: `${widthNumber}px`,
    minHeight: `${heightNumber}px`,
    maxWidth: `${widthNumber}px`,
    maxHeight: `${heightNumber}px`,
    boxSizing: 'border-box',
    zIndex: '2147483647',
    margin: '0',

    pointerEvents: 'none',

    userSelect: 'none',
    touchAction: 'none',
    transition: 'none',
    transform: '',
    opacity: '0.96',
    filter: 'drop-shadow(0 6px 10px rgba(0, 0, 0, 0.38))',
  });

  return ghost;
}

function getGhostMetrics(ghostItem) {
  const rect = ghostItem.getBoundingClientRect();

  const widthNumber = Math.max(
    1,
    Math.round(rect.width || Number.parseFloat(ghostItem.style.width) || 32)
  );

  const heightNumber = Math.max(
    1,
    Math.round(rect.height || Number.parseFloat(ghostItem.style.height) || 32)
  );

  return {
    widthNumber,
    heightNumber,
    width: `${widthNumber}px`,
    height: `${heightNumber}px`,
  };
}

function getEmoteImageFromItem(item) {
  if (!(item instanceof Element)) {
    return null;
  }

  const button = item.querySelector('button[type="button"]');

  if (!button) {
    return null;
  }

  const image = button.querySelector('img');

  if (!(image instanceof HTMLImageElement)) {
    return null;
  }

  return image;
}

function hideOriginalDraggedItem(item) {
  Object.assign(item.style, {
    display: 'none',
    pointerEvents: 'none',
    transition: 'none',
    transform: '',
  });
}

function resetDraggedItem(item) {
  Object.assign(item.style, {
    display: '',
    pointerEvents: '',
    transition: '',
    transform: '',
  });
}

function createPlaceholder(dragMetrics) {
  const placeholder = document.createElement('li');

  placeholder.className = PLACEHOLDER_CLASS;
  placeholder.setAttribute('aria-hidden', 'true');

  Object.assign(placeholder.style, {
    width: dragMetrics.width,
    height: dragMetrics.height,
    minWidth: dragMetrics.width,
    minHeight: dragMetrics.height,
    maxWidth: dragMetrics.width,
    maxHeight: dragMetrics.height,
    boxSizing: 'border-box',
  });

  return placeholder;
}

function getSortableItems(list) {
  return Array.from(list.querySelectorAll(':scope > li'))
    .filter((item) => {
      if (!(item instanceof HTMLElement)) return false;

      if (item.classList.contains(PLACEHOLDER_CLASS)) {
        return true;
      }

      return (
        isElementVisibleForOrdering(item) &&
        isDraggableFavoriteItem(item)
      );
    });
}

function getFavoriteItemRects(list) {
  const rects = new Map();

  getSortableItems(list)
    .filter((item) => {
      return (
        !item.classList.contains(PLACEHOLDER_CLASS) &&
        !item.classList.contains(DRAGGING_ITEM_CLASS)
      );
    })
    .forEach((item) => {
      rects.set(item, item.getBoundingClientRect());
    });

  return rects;
}

function animateFavoriteReflow(list, previousRects) {
  const items = getSortableItems(list)
    .filter((item) => {
      return (
        !item.classList.contains(PLACEHOLDER_CLASS) &&
        !item.classList.contains(DRAGGING_ITEM_CLASS)
      );
    });

  items.forEach((item) => {
    const previousRect = previousRects.get(item);

    if (!previousRect) return;

    const nextRect = item.getBoundingClientRect();

    const deltaX = previousRect.left - nextRect.left;
    const deltaY = previousRect.top - nextRect.top;

    if (deltaX === 0 && deltaY === 0) return;

    item.getAnimations().forEach((animation) => {
      animation.cancel();
    });

    if (isLongWrapReflow({
      deltaX,
      deltaY,
      rect: nextRect,
    })) {
      animateWrapReflow(item);
      return;
    }

    item.animate(
      [
        {
          transform: `translate3d(${deltaX}px, ${deltaY}px, 0)`,
        },
        {
          transform: 'translate3d(0, 0, 0)',
        },
      ],
      {
        duration: REORDER_DURATION_MS,
        easing: REORDER_EASING,
      }
    );
  });
}

function isLongWrapReflow({
  deltaX,
  deltaY,
  rect,
}) {
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);

  return (
    Math.abs(deltaX) > width * 1.8 &&
    Math.abs(deltaY) > height * 0.5
  );
}

function animateWrapReflow(item) {
  item.animate(
    [
      {
        opacity: '0.72',
        transform: 'scale(0.94)',
      },
      {
        opacity: '1',
        transform: 'scale(1)',
      },
    ],
    {
      duration: 90,
      easing: REORDER_EASING,
    }
  );
}

function clearInlineAnimationState(list) {
  getSortableItems(list).forEach((item) => {
    item.style.transition = '';
    item.style.transform = '';
  });
}

function restoreFavoriteGroupOrder({
  list,
  group,
  orderedIds,
}) {
  if (!isFavoriteGroup(group)) return;

  const itemById = new Map();

  getSortableItems(list).forEach((item) => {
    if (item.classList.contains(PLACEHOLDER_CLASS)) return;
    if (getFavoriteGroupFromItem(item) !== group) return;

    const id = getFavoriteIdFromItem(item);

    if (!id) return;
    if (itemById.has(id)) return;

    itemById.set(id, item);
  });

  orderedIds.forEach((id) => {
    const item = itemById.get(id);

    if (!item) return;

    list.insertBefore(item, getGroupAppendBeforeElement({
      list,
      group,
    }));
  });
}

function getFavoriteItemFromEvent({
  event,
  list,
}) {
  const target = event.target;

  if (!(target instanceof Element)) return null;

  const item = target.closest('li');

  if (!(item instanceof HTMLElement)) return null;
  if (!list.contains(item)) return null;
  if (!isDraggableFavoriteItem(item)) return null;

  return item;
}

function isDraggableFavoriteItem(item) {
  const button = item.querySelector('button[type="button"]');

  if (!button) return false;

  return isRealEmoteButton(button);
}

function getFavoriteIdsFromListByGroup({
  list,
  group,
}) {
  if (!isFavoriteGroup(group)) {
    return [];
  }

  return Array.from(list.querySelectorAll(':scope > li'))
    .filter((item) => {
      return (
        item instanceof HTMLElement &&
        !item.classList.contains(PLACEHOLDER_CLASS) &&
        isElementVisibleForOrdering(item) &&
        getFavoriteGroupFromItem(item) === group
      );
    })
    .map(getFavoriteIdFromItem)
    .filter(Boolean);
}

function getFavoriteIdFromItem(item) {
  const button = item.querySelector('button[type="button"]');

  if (!button) return '';

  const alt = getEmoteAltFromButton(button);

  return getRecentEmoteIdFromAlt(alt);
}

async function saveFavoriteSubsetOrder({
  subsetEmojiIds,
  reorderedSubsetEmojiIds,
}) {
  try {
    const result = await reorderFavoriteRecentEmoteSubset({
      subsetEmojiIds,
      reorderedSubsetEmojiIds,
    });

    if (!result.changed) {
      return;
    }

    const mergedRecentEmotes = syncRecentLocalStorageWithFavorites({
      favorites: result.favorites,
    });

    dispatchFavoritesChanged({
      reordered: true,
      changed: true,
      favorites: result.favorites,
      mergedRecentEmotes,
    });

    scheduleBadgeUpdate();
  } catch (error) {
    console.error('[Emozzk Lite] failed to reorder favorite recent emotes:', error);
  }
}

function syncRecentLocalStorageWithFavorites({
  favorites,
}) {
  const recent = readRecentEmotes();

  const merged = mergeFavoriteAndRecentEmotes({
    favorites,
    recent,
    maxRecentEmoteCount: getCachedRecentStorageLimit(),
  });

  writeRecentEmotes(merged);

  return merged;
}

function getAutoScrollContainer(element) {
  let current = element.parentElement;

  while (current && current !== document.body) {
    if (isScrollableY(current)) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

function isScrollableY(element) {
  const style = window.getComputedStyle(element);
  const overflowY = style.overflowY;

  const canScroll =
    overflowY === 'auto' ||
    overflowY === 'scroll' ||
    overflowY === 'overlay';

  return (
    canScroll &&
    element.scrollHeight > element.clientHeight
  );
}

function getAutoScrollVelocityY({
  scrollContainer,
  clientY,
}) {
  if (!scrollContainer) return 0;
  if (scrollContainer.scrollHeight <= scrollContainer.clientHeight) return 0;

  const rect = scrollContainer.getBoundingClientRect();

  const topEdge = rect.top + AUTO_SCROLL_EDGE_PX;
  const bottomEdge = rect.bottom - AUTO_SCROLL_EDGE_PX;

  if (clientY < topEdge) {
    const ratio = clampNumber({
      value: (topEdge - clientY) / AUTO_SCROLL_EDGE_PX,
      min: 0,
      max: 1,
    });

    const easedRatio = ratio * ratio;

    return -AUTO_SCROLL_MAX_SPEED_PX_PER_SECOND * easedRatio;
  }

  if (clientY > bottomEdge) {
    const ratio = clampNumber({
      value: (clientY - bottomEdge) / AUTO_SCROLL_EDGE_PX,
      min: 0,
      max: 1,
    });

    const easedRatio = ratio * ratio;

    return AUTO_SCROLL_MAX_SPEED_PX_PER_SECOND * easedRatio;
  }

  return 0;
}

function getMaxScrollTop(scrollContainer) {
  return Math.max(
    0,
    scrollContainer.scrollHeight - scrollContainer.clientHeight
  );
}

function clampNumber({
  value,
  min,
  max,
}) {
  return Math.min(
    max,
    Math.max(min, value)
  );
}

function ensureClickSuppressListener() {
  if (clickSuppressListenerAttached) return;

  clickSuppressListenerAttached = true;

  document.addEventListener('click', suppressClickAfterDrag, true);
}

function ensureBindModeListener() {
  if (bindModeListenerAttached) return;

  bindModeListenerAttached = true;

  window.addEventListener(
    EMOTE_BIND_MODE_CHANGED_EVENT,
    handleBindModeChanged
  );
}

function suppressClickAfterDrag(event) {
  if (Date.now() > suppressClickUntil) return;

  const target = event.target;

  if (!(target instanceof Element)) return;

  if (!target.closest(FAVORITES_SECTION_SELECTOR)) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

function isPrimaryPointerEvent(event) {
  if (!event.isPrimary) return false;

  if (event.pointerType === 'mouse') {
    return event.button === 0;
  }

  return true;
}

function hasAnyModifier(event) {
  return (
    event.ctrlKey ||
    event.altKey ||
    event.metaKey ||
    event.shiftKey
  );
}

function getPointerDistance({
  startX,
  startY,
  currentX,
  currentY,
}) {
  return Math.hypot(
    currentX - startX,
    currentY - startY
  );
}

function getFavoriteGroupFromItem(item) {
  const group = item?.getAttribute?.(FAVORITES_GROUP_ATTR) || '';

  return isFavoriteGroup(group) ? group : '';
}

function isFavoriteGroup(group) {
  return (
    group === FAVORITE_GROUP_BOUND ||
    group === FAVORITE_GROUP_UNBOUND
  );
}

function getGroupAppendBeforeElement({
  list,
  group,
  placeholder = null,
}) {
  if (group !== FAVORITE_GROUP_BOUND) {
    return null;
  }

  return Array.from(list.children).find((child) => {
    if (!(child instanceof HTMLElement)) return false;
    if (child === placeholder) return false;

    return getFavoriteGroupFromItem(child) !== FAVORITE_GROUP_BOUND;
  }) ?? null;
}

function isSameOrder(a, b) {
  if (a.length !== b.length) return false;

  return a.every((value, index) => {
    return value === b[index];
  });
}

function isElementVisibleForOrdering(element) {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  return element.style.display !== 'none';
}

function disableNativeDraggableChildren(root) {
  if (!(root instanceof Element)) return;

  root
    .querySelectorAll('img, a, button')
    .forEach((element) => {
      element.setAttribute('draggable', 'false');
    });
}

function isEmoteBindInteractionModeActive() {
  return (
    isEmoteBindAssignMode() ||
    isEmoteBindClearMode()
  );
}

function exitShortcutSetRenameModeBeforeDragIfNeeded() {
  const bindState = getEmoteBindModeState();

  if (bindState.mode !== EMOTE_BIND_MODE_RENAME) {
    return false;
  }

  exitShortcutSetRenameMode();
  return true;
}