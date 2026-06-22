import {
  getRecentEmoteId,
  normalizeRecentEmotes,
} from './recent-emote-storage.js';

const DEFAULT_MAX_RECENT_EMOTE_COUNT = 60;

export function mergeFavoriteAndRecentEmotes({
  favorites,
  recent,
  maxRecentEmoteCount = DEFAULT_MAX_RECENT_EMOTE_COUNT,
}) {
  const maxCount = normalizeMaxCount(maxRecentEmoteCount);

  const normalizedFavorites = normalizeRecentEmotes(favorites)
    .slice(0, maxCount);

  const normalizedRecent = normalizeRecentEmotes(recent);

  const favoriteIds = new Set(
    normalizedFavorites
      .map(getRecentEmoteId)
      .filter(Boolean)
  );

  const remainingCount = Math.max(
    0,
    maxCount - normalizedFavorites.length
  );

  const normalRecent = normalizedRecent
    .filter((emote) => {
      const id = getRecentEmoteId(emote);

      if (!id) return false;

      return !favoriteIds.has(id);
    })
    .slice(0, remainingCount);

  return [
    ...normalizedFavorites,
    ...normalRecent,
  ];
}

export function removeFavoriteEmotesFromRecent({
  favorites,
  recent,
}) {
  const normalizedFavorites = normalizeRecentEmotes(favorites);
  const normalizedRecent = normalizeRecentEmotes(recent);

  const favoriteIds = new Set(
    normalizedFavorites
      .map(getRecentEmoteId)
      .filter(Boolean)
  );

  return normalizedRecent.filter((emote) => {
    const id = getRecentEmoteId(emote);

    if (!id) return false;

    return !favoriteIds.has(id);
  });
}

export function isRecentEmoteInFavorites({
  emote,
  favorites,
}) {
  const id = getRecentEmoteId(emote);

  if (!id) return false;

  return normalizeRecentEmotes(favorites).some((favorite) => {
    return getRecentEmoteId(favorite) === id;
  });
}

export function getRecentEmoteIds(emotes) {
  return normalizeRecentEmotes(emotes)
    .map(getRecentEmoteId)
    .filter(Boolean);
}

function normalizeMaxCount(value) {
  const count = Number(value);

  if (!Number.isFinite(count)) {
    return DEFAULT_MAX_RECENT_EMOTE_COUNT;
  }

  return Math.max(0, Math.floor(count));
}