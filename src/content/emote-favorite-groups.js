import {
  getRecentEmoteId,
  normalizeRecentEmotes,
} from './recent-emote-storage.js';

export const FAVORITE_GROUP_BOUND = 'bound';
export const FAVORITE_GROUP_UNBOUND = 'unbound';

export function getEmojiIdFromBinding(binding) {
  return String(
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
    binding?.emojiId ||
    ''
  ).trim();
}

export function getBoundEmojiIdsFromBindings(bindings) {
  const seen = new Set();
  const result = [];

  (Array.isArray(bindings) ? bindings : []).forEach((binding) => {
    const emojiId = getEmojiIdFromBinding(binding);

    if (!emojiId) return;
    if (seen.has(emojiId)) return;

    seen.add(emojiId);
    result.push(emojiId);
  });

  return result;
}

export function normalizeFavoriteEmotes(favorites) {
  return normalizeRecentEmotes(favorites);
}

export function getFavoriteEmojiIds(items) {
  return normalizeEmojiIds(
    normalizeFavoriteEmotes(items)
      .map(getRecentEmoteId)
  );
}

export function splitFavoriteEmotesByBindings({
  favorites,
  bindings,
}) {
  const boundIdSet = new Set(getBoundEmojiIdsFromBindings(bindings));
  const bound = [];
  const unbound = [];

  normalizeFavoriteEmotes(favorites).forEach((item) => {
    const emojiId = getRecentEmoteId(item);

    if (!emojiId) return;

    if (boundIdSet.has(emojiId)) {
      bound.push(item);
      return;
    }

    unbound.push(item);
  });

  return {
    bound,
    unbound,
  };
}

export function getFavoriteGroupsForActiveSet({
  favorites,
  activeSetId,
  bindings,
  setOrders,
}) {
  const normalizedFavorites = normalizeFavoriteEmotes(favorites);
  const setId = normalizeFavoriteSetId(activeSetId);

  if (!setId) {
    return {
      mode: 'off',
      activeSetId: 'off',
      items: normalizedFavorites,
      itemIds: getFavoriteEmojiIds(normalizedFavorites),
      boundItems: [],
      boundIds: [],
      unboundItems: [],
      unboundIds: [],
      hasCustomOrder: false,
      inheritedFromOff: true,
    };
  }

  const {
    bound,
    unbound,
  } = splitFavoriteEmotesByBindings({
    favorites: normalizedFavorites,
    bindings,
  });

  const setOrder = getFavoriteSetOrder(setOrders, setId);
  const hasCustomOrder = setOrder?.customized === true;

  const boundItems = hasCustomOrder
    ? applyFavoriteOrder(bound, setOrder.bound)
    : bound;

  const unboundItems = hasCustomOrder
    ? applyFavoriteOrder(unbound, setOrder.unbound)
    : unbound;

  const items = [
    ...boundItems,
    ...unboundItems,
  ];

  return {
    mode: 'set',
    activeSetId: setId,
    items,
    itemIds: getFavoriteEmojiIds(items),
    boundItems,
    boundIds: getFavoriteEmojiIds(boundItems),
    unboundItems,
    unboundIds: getFavoriteEmojiIds(unboundItems),
    hasCustomOrder,
    inheritedFromOff: !hasCustomOrder,
  };
}

export function applyFavoriteOrder(items, orderedEmojiIds) {
  const normalizedItems = normalizeFavoriteEmotes(items);
  const normalizedOrderedIds = normalizeEmojiIds(orderedEmojiIds);

  if (!normalizedItems.length || !normalizedOrderedIds.length) {
    return normalizedItems;
  }

  const itemById = new Map();

  normalizedItems.forEach((item) => {
    const emojiId = getRecentEmoteId(item);

    if (!emojiId) return;
    if (itemById.has(emojiId)) return;

    itemById.set(emojiId, item);
  });

  const seen = new Set();
  const result = [];

  normalizedOrderedIds.forEach((emojiId) => {
    if (seen.has(emojiId)) return;

    const item = itemById.get(emojiId);

    if (!item) return;

    seen.add(emojiId);
    result.push(item);
  });

  normalizedItems.forEach((item) => {
    const emojiId = getRecentEmoteId(item);

    if (!emojiId) return;
    if (seen.has(emojiId)) return;

    seen.add(emojiId);
    result.push(item);
  });

  return result;
}

export function mergeReorderedFavoriteSubset({
  favorites,
  subsetEmojiIds,
  reorderedSubsetEmojiIds,
}) {
  const normalizedFavorites = normalizeFavoriteEmotes(favorites);
  const normalizedSubsetIds = normalizeEmojiIds(subsetEmojiIds);
  const normalizedReorderedIds = normalizeEmojiIds(reorderedSubsetEmojiIds);

  if (!normalizedSubsetIds.length || !normalizedReorderedIds.length) {
    return normalizedFavorites;
  }

  const itemById = new Map();

  normalizedFavorites.forEach((item) => {
    const emojiId = getRecentEmoteId(item);

    if (!emojiId) return;
    if (itemById.has(emojiId)) return;

    itemById.set(emojiId, item);
  });

  const subsetSet = new Set(normalizedSubsetIds);
  const reorderedSubsetSet = new Set(normalizedReorderedIds);
  const queue = normalizedReorderedIds.filter((emojiId) => {
    return subsetSet.has(emojiId) && itemById.has(emojiId);
  });

  normalizedSubsetIds.forEach((emojiId) => {
    if (reorderedSubsetSet.has(emojiId)) return;
    if (!itemById.has(emojiId)) return;

    queue.push(emojiId);
  });

  return normalizedFavorites.map((item) => {
    const emojiId = getRecentEmoteId(item);

    if (!subsetSet.has(emojiId)) {
      return item;
    }

    const nextEmojiId = queue.shift();

    return itemById.get(nextEmojiId) ?? item;
  });
}

function getFavoriteSetOrder(setOrders, setId) {
  if (!setOrders || typeof setOrders !== 'object') {
    return null;
  }

  const order = setOrders[setId];

  if (!order || typeof order !== 'object') {
    return null;
  }

  return {
    customized: order.customized === true,
    bound: normalizeEmojiIds(order.bound),
    unbound: normalizeEmojiIds(order.unbound),
  };
}

function normalizeFavoriteSetId(activeSetId) {
  const setId = String(activeSetId ?? '').trim();

  if (!setId) return '';
  if (setId.toLowerCase() === 'off') return '';

  return setId;
}

function normalizeEmojiIds(ids) {
  if (!Array.isArray(ids)) {
    return [];
  }

  const seen = new Set();
  const result = [];

  ids.forEach((id) => {
    const emojiId = String(id ?? '').trim();

    if (!emojiId) return;
    if (seen.has(emojiId)) return;

    seen.add(emojiId);
    result.push(emojiId);
  });

  return result;
}