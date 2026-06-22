import {
  getRecentEmoteId,
  normalizeRecentEmotes,
} from './recent-emote-storage.js';

const FAVORITE_RECENT_EMOTES_STORAGE_KEY = 'emozzk_lite_favorite_recent_emotes_v1';
const MAX_FAVORITE_RECENT_EMOTE_COUNT = 200;

let favoriteEmotesCache = [];
let initialized = false;
let initializePromise = null;

export function initFavoriteRecentEmoteStorage() {
  if (initializePromise) {
    return initializePromise;
  }

  initializePromise = readStorage()
    .then((storage) => {
      favoriteEmotesCache = normalizeFavoriteRecentEmotes(
        storage[FAVORITE_RECENT_EMOTES_STORAGE_KEY]
      );

      initialized = true;

      return getCachedFavoriteRecentEmotes();
    })
    .catch((error) => {
      console.error(
        '[Emozzk Lite] failed to initialize favorite recent emotes:',
        error
      );

      favoriteEmotesCache = [];
      initialized = true;

      return [];
    });

  return initializePromise;
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

  const normalized = normalizeFavoriteRecentEmotes(emotes);

  await writeStorage({
    [FAVORITE_RECENT_EMOTES_STORAGE_KEY]: normalized,
  });

  favoriteEmotesCache = normalized;

  return getCachedFavoriteRecentEmotes();
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

  const id = String(emoteId || '');

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
  const id = String(emoteId || '');

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
  if (initialized) return;

  await initFavoriteRecentEmoteStorage();
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