import {
  DEFAULT_RECENT_STORAGE_LIMIT,
  normalizeRecentStorageLimit,
} from './shared/recent-storage-limit.js';

const RECENT_EMOTE_KEY_PREFIX = 'livechat-emoticon#';

const RECENT_STORAGE_LIMIT_MESSAGE =
  'EMZK_LITE_RECENT_STORAGE_LIMIT_CHANGED';

const PATCH_FLAG = '__EMZK_LITE_RECENT_EMOTE_STORAGE_PATCHED__';

let recentStorageLimit = DEFAULT_RECENT_STORAGE_LIMIT;
let favoriteRecentEmoteIds = new Set();

installRecentEmoteStorageLimitPatch();

function installRecentEmoteStorageLimitPatch() {
  if (window[PATCH_FLAG]) {
    return;
  }

  if (
    typeof Storage === 'undefined' ||
    !Storage.prototype?.setItem ||
    !window.localStorage
  ) {
    return;
  }

  const originalSetItem = Storage.prototype.setItem;

  window.addEventListener('message', (event) => {
    if (event.source !== window) {
      return;
    }

    if (event.origin !== window.location.origin) {
      return;
    }

    if (event.data?.source !== 'emzk-lite') {
      return;
    }

    if (event.data?.type !== RECENT_STORAGE_LIMIT_MESSAGE) {
      return;
    }

    recentStorageLimit = normalizeRecentStorageLimit(event.data.limit);
    favoriteRecentEmoteIds = normalizeFavoriteRecentEmoteIds(
      event.data.favoriteIds
    );
  });

  Storage.prototype.setItem = function patchedSetItem(key, value) {
    if (
      this !== window.localStorage ||
      !isRecentEmoteStorageKey(key)
    ) {
      return originalSetItem.apply(this, arguments);
    }

    try {
      const nextFromChzzk = parseRecentEmoteArray(value);
      const currentStored = parseRecentEmoteArray(
        window.localStorage.getItem(key)
      );

      const merged = mergeRecentEmotes([
        ...nextFromChzzk,
        ...currentStored,
      ]);

      const limited = limitRecentEmotesWithFavorites({
        emotes: merged,
        maxNormalRecentCount: recentStorageLimit,
        favoriteIds: favoriteRecentEmoteIds,
      });

      return originalSetItem.call(
        this,
        key,
        JSON.stringify(limited)
      );
    } catch (error) {
      console.error('[Emozzk Lite] failed to patch recent emote storage:', error);

      return originalSetItem.apply(this, arguments);
    }
  };

  window[PATCH_FLAG] = true;
}

function isRecentEmoteStorageKey(key) {
  return (
    typeof key === 'string' &&
    key.startsWith(RECENT_EMOTE_KEY_PREFIX) &&
    key.length > RECENT_EMOTE_KEY_PREFIX.length
  );
}

function parseRecentEmoteArray(value) {
  try {
    if (!value) {
      return [];
    }

    const parsed = JSON.parse(String(value));

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isValidRecentEmoteObject);
  } catch {
    return [];
  }
}

function mergeRecentEmotes(emotes) {
  const seen = new Set();
  const result = [];

  emotes.forEach((emote) => {
    const id = getRecentEmoteId(emote);

    if (!id) return;
    if (seen.has(id)) return;

    seen.add(id);
    result.push(emote);
  });

  return result;
}

function limitRecentEmotesWithFavorites({
  emotes,
  maxNormalRecentCount,
  favoriteIds,
}) {
  const normalRecentLimit = normalizeRecentStorageLimit(maxNormalRecentCount);
  const favoriteIdSet = favoriteIds instanceof Set
    ? favoriteIds
    : new Set();

  const seen = new Set();
  const favorites = [];
  const normalRecent = [];

  emotes.forEach((emote) => {
    const id = getRecentEmoteId(emote);

    if (!id) return;
    if (seen.has(id)) return;

    seen.add(id);

    if (favoriteIdSet.has(id)) {
      favorites.push(emote);
      return;
    }

    if (normalRecent.length < normalRecentLimit) {
      normalRecent.push(emote);
    }
  });

  return [
    ...favorites,
    ...normalRecent,
  ];
}

function normalizeFavoriteRecentEmoteIds(ids) {
  if (!Array.isArray(ids)) {
    return new Set();
  }

  return new Set(
    ids
      .map(normalizeText)
      .filter(Boolean)
  );
}

function isValidRecentEmoteObject(emote) {
  return Boolean(getRecentEmoteId(emote));
}

function getRecentEmoteId(emote) {
  if (!emote || typeof emote !== 'object') {
    return '';
  }

  return normalizeText(
    emote.emojiId ??
    emote.emoteId ??
    emote.id ??
    emote.emoji?.emojiId ??
    emote.emote?.emoteId ??
    ''
  );
}

function normalizeText(value) {
  return String(value ?? '').trim();
}