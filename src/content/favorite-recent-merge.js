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

  /*
   * 즐겨찾기는 최근 이모티콘 limit에 포함하지 않는다.
   * maxRecentEmoteCount는 "즐겨찾기를 제외한 일반 최근 이모티콘 수"로만 적용한다.
   */
  const normalizedFavorites = normalizeRecentEmotes(favorites);
  const normalizedRecent = normalizeRecentEmotes(recent);

  const favoriteIds = new Set(
    normalizedFavorites
      .map(getRecentEmoteId)
      .filter(Boolean)
  );

  const normalRecent = normalizedRecent
    .filter((emote) => {
      const id = getRecentEmoteId(emote);

      if (!id) return false;

      return !favoriteIds.has(id);
    })
    .slice(0, maxCount);

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