import {
  getRecentEmoteId,
  normalizeRecentEmotes,
} from './recent-emote-storage.js';

import {
  mergeReorderedFavoriteSubset,
} from './emote-favorite-groups.js';

const FAVORITE_RECENT_EMOTES_STORAGE_KEY = 'emozzk_lite_favorite_recent_emotes_v1';
const FAVORITE_RECENT_EMOTES_STORAGE_VERSION = 2;
const MAX_FAVORITE_RECENT_EMOTE_COUNT = 200;

let favoriteEmotesCache = [];
let favoriteSetOrdersCache = {};
let initialized = false;

let initializePromise = null;
let storageSyncStarted = false;
let writeQueue = Promise.resolve();
let storageChangeRevision = 0;
let pendingWriteCount = 0;

export function initFavoriteRecentEmoteStorage() {
  if (initializePromise) {
    return initializePromise;
  }

  startFavoriteRecentEmoteStorageSync();

  const revisionBeforeRead = storageChangeRevision;

  initializePromise = readStorage()
					.then((storage) => {
			const normalizedStorage = normalizeFavoriteRecentEmoteStorage(
				storage[FAVORITE_RECENT_EMOTES_STORAGE_KEY]
			);

      if (storageChangeRevision === revisionBeforeRead) {
        favoriteEmotesCache = normalizedStorage.favorites;
        favoriteSetOrdersCache = normalizedStorage.setOrders;
      }

			initialized = true;

      return getCachedFavoriteRecentEmotes();
    })
    .catch((error) => {
      console.error(
        '[Emozzk Lite] failed to initialize favorite recent emotes:',
        error
      );

      if (storageChangeRevision === revisionBeforeRead) {
        favoriteEmotesCache = [];
        favoriteSetOrdersCache = {};
      }
			initialized = true;
      return [];
    });

  return initializePromise;
}

export function startFavoriteRecentEmoteStorageSync() {
  if (storageSyncStarted) return;

  storageSyncStarted = true;

  if (!globalThis.chrome?.storage?.onChanged?.addListener) {
    return;
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;

    const change = changes[FAVORITE_RECENT_EMOTES_STORAGE_KEY];

    if (!change) return;
    if (pendingWriteCount > 0) return;

		const normalizedStorage = normalizeFavoriteRecentEmoteStorage(change.newValue);

    storageChangeRevision += 1;
		favoriteEmotesCache = normalizedStorage.favorites;
		favoriteSetOrdersCache = normalizedStorage.setOrders;
		initialized = true;
  });
}

export function getCachedFavoriteRecentEmotes() {
  return [...favoriteEmotesCache];
}

export async function getFavoriteRecentEmotes() {
  await ensureInitialized();

  return getCachedFavoriteRecentEmotes();
}

export async function setFavoriteRecentEmotes(emotes) {
  await ensureInitialized();

  const snapshot = await writeFavoriteRecentEmoteStorage({
    favorites: emotes,
    setOrders: favoriteSetOrdersCache,
  });

  favoriteEmotesCache = snapshot.favorites;
  favoriteSetOrdersCache = snapshot.setOrders;

  return getCachedFavoriteRecentEmotes();
}

export async function setFavoriteRecentSetOrder(setId, order) {
  await ensureInitialized();

  const id = normalizeSetId(setId);

  if (!id) {
    return {
      changed: false,
      setOrders: getCachedFavoriteRecentSetOrders(),
    };
  }

  const nextSetOrders = {
    ...favoriteSetOrdersCache,
    [id]: normalizeFavoriteRecentSetOrder(
      order,
      getFavoriteRecentEmoteIds()
    ),
  };

  const snapshot = await writeFavoriteRecentEmoteStorage({
    favorites: favoriteEmotesCache,
    setOrders: nextSetOrders,
  });

  favoriteEmotesCache = snapshot.favorites;
  favoriteSetOrdersCache = snapshot.setOrders;

  return {
    changed: true,
    setOrders: getCachedFavoriteRecentSetOrders(),
  };
}

export async function resetFavoriteRecentSetOrder(setId) {
  await ensureInitialized();

  const id = normalizeSetId(setId);

  if (!id || !favoriteSetOrdersCache[id]) {
    return {
      changed: false,
      setOrders: getCachedFavoriteRecentSetOrders(),
    };
  }

  const nextSetOrders = {
    ...favoriteSetOrdersCache,
  };

  delete nextSetOrders[id];

  const snapshot = await writeFavoriteRecentEmoteStorage({
    favorites: favoriteEmotesCache,
    setOrders: nextSetOrders,
  });

  favoriteEmotesCache = snapshot.favorites;
  favoriteSetOrdersCache = snapshot.setOrders;

  return {
    changed: true,
    setOrders: getCachedFavoriteRecentSetOrders(),
  };
}

export function getCachedFavoriteRecentSetOrders() {
  return cloneSetOrders(favoriteSetOrdersCache);
}

export async function getFavoriteRecentSetOrders() {
  await ensureInitialized();

  return getCachedFavoriteRecentSetOrders();
}

export function getCachedFavoriteRecentSetOrder(setId) {
  const id = normalizeSetId(setId);

  if (!id) return null;

  return cloneSetOrder(favoriteSetOrdersCache[id] ?? null);
}

export async function getFavoriteRecentSetOrder(setId) {
  await ensureInitialized();

  return getCachedFavoriteRecentSetOrder(setId);
}

export function hasCustomFavoriteRecentSetOrder(setId) {
  const id = normalizeSetId(setId);

  if (!id) return false;

  return favoriteSetOrdersCache[id]?.customized === true;
}

export async function reorderFavoriteRecentEmotesByIds(orderedIds) {
  await ensureInitialized();

  const normalizedIds = normalizeOrderedIds(orderedIds);

  if (!normalizedIds.length) {
    return createReorderResult({
      changed: false,
    });
  }

  const itemById = new Map();

  favoriteEmotesCache.forEach((item) => {
    const id = getRecentEmoteId(item);

    if (!id) return;
    if (itemById.has(id)) return;

    itemById.set(id, item);
  });

  const seen = new Set();
  const orderedItems = [];

  normalizedIds.forEach((id) => {
    if (seen.has(id)) return;

    const item = itemById.get(id);

    if (!item) return;

    seen.add(id);
    orderedItems.push(item);
  });

  const remainingItems = favoriteEmotesCache.filter((item) => {
    const id = getRecentEmoteId(item);

    if (!id) return false;

    return !seen.has(id);
  });

  const next = normalizeFavoriteRecentEmotes([
    ...orderedItems,
    ...remainingItems,
  ]);

  if (isSameFavoriteOrder(favoriteEmotesCache, next)) {
    return createReorderResult({
      changed: false,
    });
  }

  await setFavoriteRecentEmotes(next);

  return createReorderResult({
    changed: true,
  });
}


export async function ensureFavoriteRecentEmoteAppended(emote) {
  await ensureInitialized();

  const id = getRecentEmoteId(emote);

  if (!id) {
    return createToggleResult({
      changed: false,
      added: false,
      removed: false,
    });
  }

  if (isFavoriteRecentEmoteId(id)) {
    return createToggleResult({
      changed: false,
      added: false,
      removed: false,
    });
  }

  const next = normalizeFavoriteRecentEmotes([
    ...favoriteEmotesCache,
    emote,
  ]);

  await setFavoriteRecentEmotes(next);

  return createToggleResult({
    changed: true,
    added: true,
    removed: false,
  });
}

export async function reorderFavoriteRecentEmoteSubset({
  subsetEmojiIds,
  reorderedSubsetEmojiIds,
}) {
  await ensureInitialized();

  const next = normalizeFavoriteRecentEmotes(
    mergeReorderedFavoriteSubset({
      favorites: favoriteEmotesCache,
      subsetEmojiIds,
      reorderedSubsetEmojiIds,
    })
  );

  if (isSameFavoriteOrder(favoriteEmotesCache, next)) {
    return createReorderResult({
      changed: false,
    });
  }

  await setFavoriteRecentEmotes(next);

  return createReorderResult({
    changed: true,
  });
}

export async function addFavoriteRecentEmote(emote) {
  await ensureInitialized();

  const id = getRecentEmoteId(emote);

  if (!id) {
    return createToggleResult({
      changed: false,
      added: false,
      removed: false,
    });
  }

  const next = normalizeFavoriteRecentEmotes([
    emote,
    ...favoriteEmotesCache.filter((item) => {
      return getRecentEmoteId(item) !== id;
    }),
  ]);

  await setFavoriteRecentEmotes(next);

  return createToggleResult({
    changed: true,
    added: true,
    removed: false,
  });
}

export async function removeFavoriteRecentEmoteById(emoteId) {
  await ensureInitialized();

	const id = String(emoteId ?? '').trim();
  if (!id) {
    return createToggleResult({
      changed: false,
      added: false,
      removed: false,
    });
  }

  const next = favoriteEmotesCache.filter((item) => {
    return getRecentEmoteId(item) !== id;
  });

  if (next.length === favoriteEmotesCache.length) {
    return createToggleResult({
      changed: false,
      added: false,
      removed: false,
    });
  }

  await setFavoriteRecentEmotes(next);

  return createToggleResult({
    changed: true,
    added: false,
    removed: true,
  });
}

export async function toggleFavoriteRecentEmote(emote) {
  await ensureInitialized();

  const id = getRecentEmoteId(emote);

  if (!id) {
    return createToggleResult({
      changed: false,
      added: false,
      removed: false,
    });
  }

  if (isFavoriteRecentEmoteId(id)) {
    return removeFavoriteRecentEmoteById(id);
  }

  return addFavoriteRecentEmote(emote);
}

export function isFavoriteRecentEmoteId(emoteId) {
  const id = String(emoteId ?? '').trim();
  
	if (!id) return false;

  return favoriteEmotesCache.some((item) => {
    return getRecentEmoteId(item) === id;
  });
}

export function getFavoriteRecentEmoteIds() {
  return favoriteEmotesCache
    .map(getRecentEmoteId)
    .filter(Boolean);
}

export function normalizeFavoriteRecentEmotes(emotes) {
  return normalizeRecentEmotes(emotes)
    .slice(0, MAX_FAVORITE_RECENT_EMOTE_COUNT);
}

async function ensureInitialized() {
  if (!initialized) {
    await initFavoriteRecentEmoteStorage();
  }

  startFavoriteRecentEmoteStorageSync();
}

function createToggleResult({
  changed,
  added,
  removed,
}) {
  return {
    changed,
    added,
    removed,
    favorites: getCachedFavoriteRecentEmotes(),
  };
}

function createReorderResult({
  changed,
}) {
  return {
    changed,
    reordered: changed,
    added: false,
    removed: false,
    favorites: getCachedFavoriteRecentEmotes(),
  };
}

function normalizeOrderedIds(ids) {
  if (!Array.isArray(ids)) {
    return [];
  }

  const seen = new Set();
  const result = [];

  ids.forEach((id) => {
    const normalized = String(id || '').trim();

    if (!normalized) return;
    if (seen.has(normalized)) return;

    seen.add(normalized);
    result.push(normalized);
  });

  return result;
}

function isSameFavoriteOrder(a, b) {
  const aIds = a
    .map(getRecentEmoteId)
    .filter(Boolean);

  const bIds = b
    .map(getRecentEmoteId)
    .filter(Boolean);

  if (aIds.length !== bIds.length) {
    return false;
  }

  return aIds.every((id, index) => {
    return id === bIds[index];
  });
}

function readStorage() {
  return new Promise((resolve, reject) => {
    const storage = getChromeLocalStorage();

    if (!storage) {
      reject(new Error('[Emozzk Lite] chrome.storage.local is not available.'));
      return;
    }

    storage.get([FAVORITE_RECENT_EMOTES_STORAGE_KEY], (result) => {
      const error = chrome.runtime.lastError;

      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve(result ?? {});
    });
  });
}

function writeStorage(value) {
  return new Promise((resolve, reject) => {
    const storage = getChromeLocalStorage();

    if (!storage) {
      reject(new Error('[Emozzk Lite] chrome.storage.local is not available.'));
      return;
    }

    storage.set(value, () => {
      const error = chrome.runtime.lastError;

      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve();
    });
  });
}

function getChromeLocalStorage() {
  return globalThis.chrome?.storage?.local ?? null;
}

function normalizeFavoriteRecentEmoteStorage(value) {
  if (Array.isArray(value)) {
    const favorites = normalizeFavoriteRecentEmotes(value);

    return {
      version: FAVORITE_RECENT_EMOTES_STORAGE_VERSION,
      favorites,
      setOrders: {},
    };
  }

  if (!value || typeof value !== 'object') {
    return {
      version: FAVORITE_RECENT_EMOTES_STORAGE_VERSION,
      favorites: [],
      setOrders: {},
    };
  }

  const favorites = normalizeFavoriteRecentEmotes(value.favorites);
  const setOrders = normalizeFavoriteRecentSetOrders(
    value.setOrders,
    favorites
  );

  return {
    version: FAVORITE_RECENT_EMOTES_STORAGE_VERSION,
    favorites,
    setOrders,
  };
}

function normalizeFavoriteRecentSetOrders(setOrders, favorites) {
  if (!setOrders || typeof setOrders !== 'object') {
    return {};
  }

  const result = {};
  const favoriteIds = favorites
    .map(getRecentEmoteId)
    .filter(Boolean);

  Object.entries(setOrders).forEach(([setId, order]) => {
    const normalizedSetId = normalizeSetId(setId);

    if (!normalizedSetId) return;

    const normalizedOrder = normalizeFavoriteRecentSetOrder(
      order,
      favoriteIds
    );

    if (!normalizedOrder.customized) return;

    result[normalizedSetId] = normalizedOrder;
  });

  return result;
}

function normalizeFavoriteRecentSetOrder(order, favoriteIds) {
  const allowedIds = new Set(
    normalizeOrderedIds(favoriteIds)
  );

  const seen = new Set();

  const bound = normalizeSetOrderIds(
    order?.bound,
    allowedIds,
    seen
  );

  const unbound = normalizeSetOrderIds(
    order?.unbound,
    allowedIds,
    seen
  );

  return {
    customized: bound.length > 0 || unbound.length > 0,
    bound,
    unbound,
  };
}

function normalizeSetOrderIds(ids, allowedIds, seen) {
  if (!Array.isArray(ids)) {
    return [];
  }

  const result = [];

  ids.forEach((id) => {
    const normalized = String(id ?? '').trim();

    if (!normalized) return;
    if (!allowedIds.has(normalized)) return;
    if (seen.has(normalized)) return;

    seen.add(normalized);
    result.push(normalized);
  });

  return result;
}

function normalizeSetId(setId) {
  const id = String(setId ?? '').trim();

  if (!id) return '';
  if (id.toLowerCase() === 'off') return '';

  return id;
}

function cloneSetOrders(setOrders) {
  if (!setOrders || typeof setOrders !== 'object') {
    return {};
  }

  const result = {};

  Object.entries(setOrders).forEach(([setId, order]) => {
    result[setId] = cloneSetOrder(order);
  });

  return result;
}

function cloneSetOrder(order) {
  if (!order || typeof order !== 'object') {
    return null;
  }

  return {
    customized: order.customized === true,
    bound: Array.isArray(order.bound) ? [...order.bound] : [],
    unbound: Array.isArray(order.unbound) ? [...order.unbound] : [],
  };
}

function createFavoriteRecentEmoteStorageSnapshot({
  favorites,
  setOrders,
}) {
  const normalizedFavorites = normalizeFavoriteRecentEmotes(favorites);

  return {
    version: FAVORITE_RECENT_EMOTES_STORAGE_VERSION,
    favorites: normalizedFavorites,
    setOrders: normalizeFavoriteRecentSetOrders(
      setOrders,
      normalizedFavorites
    ),
  };
}

async function writeFavoriteRecentEmoteStorage({
  favorites,
  setOrders,
}) {
  const snapshot = createFavoriteRecentEmoteStorageSnapshot({
    favorites,
    setOrders,
  });

  /*
   * 캐시를 await 이전에 갱신해야 같은 컨텍스트에서 연속으로 들어온
   * read-modify-write가 모두 같은 과거 스냅샷을 기반으로 계산되지 않는다.
   * 실제 저장은 queue로 직렬화해 완료 순서가 호출 순서를 뒤집지 않게 한다.
   */
  favoriteEmotesCache = snapshot.favorites;
  favoriteSetOrdersCache = snapshot.setOrders;
  pendingWriteCount += 1;

  const writeTask = writeQueue.then(() => {
    return writeStorage({
      [FAVORITE_RECENT_EMOTES_STORAGE_KEY]: snapshot,
    });
  });

  writeQueue = writeTask.catch(() => {});

  try {
    await writeTask;
  } finally {
    pendingWriteCount -= 1;
  }

  return snapshot;
}
