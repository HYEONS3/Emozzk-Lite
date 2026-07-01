const RECENT_EMOTE_KEY_PREFIX = 'livechat-emoticon#';
const USER_HASH_KEY = 'userStatus.idhash';

export function getChzzkUserHash() {
  return safeGetLocalStorageItem(USER_HASH_KEY);
}

export function getRecentEmoteStorageKey() {
  const userHash = getChzzkUserHash();

  if (!userHash) return '';

  return `${RECENT_EMOTE_KEY_PREFIX}${userHash}`;
}

export function getRecentEmoteStorageKeys() {
  return safeGetLocalStorageKeys()
    .filter(isRecentEmoteStorageKey);
}

export function isRecentEmoteStorageKey(key) {
  return (
    typeof key === 'string' &&
    key.startsWith(RECENT_EMOTE_KEY_PREFIX) &&
    key.length > RECENT_EMOTE_KEY_PREFIX.length
  );
}

export function readRecentEmotes() {
  const key = getRecentEmoteStorageKey();

  if (!key) {
    return [];
  }

  return readRecentEmotesByKey(key);
}

export function readRecentEmotesByKey(key) {
  if (!isRecentEmoteStorageKey(key)) {
    return [];
  }

  try {
    const raw = safeGetLocalStorageItem(key);

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return normalizeRecentEmotes(parsed);
  } catch (error) {
    console.error('[Emozzk Lite] failed to read recent emotes:', error);
    return [];
  }
}

export function writeRecentEmotes(emotes) {
  const key = getRecentEmoteStorageKey();

  if (!key) {
    return false;
  }

  return writeRecentEmotesByKey(key, emotes);
}

export function writeRecentEmotesByKey(key, emotes) {
  if (!isRecentEmoteStorageKey(key)) {
    return false;
  }

  try {
    const normalized = normalizeRecentEmotes(emotes);
    const serialized = JSON.stringify(normalized);

    setLocalStorageItem(key, serialized);

    return true;
  } catch (error) {
    console.error('[Emozzk Lite] failed to write recent emotes:', error);
    return false;
  }
}

export function normalizeRecentEmotes(emotes) {
  if (!Array.isArray(emotes)) {
    return [];
  }

  return dedupeRecentEmotes(
    emotes.filter(isValidRecentEmoteObject)
  );
}

export function dedupeRecentEmotes(emotes) {
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

export function findRecentEmoteById(emotes, emoteId) {
  const id = normalizeRecentEmoteId(emoteId);

  if (!id || !Array.isArray(emotes)) {
    return null;
  }

  return emotes.find((emote) => {
    return getRecentEmoteId(emote) === id;
  }) ?? null;
}

export function findRecentEmoteByAlt(emotes, alt) {
  const emoteId = getRecentEmoteIdFromAlt(alt);

  if (!emoteId) {
    return null;
  }

  return findRecentEmoteById(emotes, emoteId);
}

export function getRecentEmoteId(emote) {
  if (!emote || typeof emote !== 'object') {
    return '';
  }

  return normalizeRecentEmoteId(
    emote.emojiId ??
    emote.emoteId ??
    emote.id ??
    emote.emoji?.emojiId ??
    emote.emote?.emoteId ??
    ''
  );
}

export function getRecentEmoteIdFromAlt(alt) {
  const match = String(alt ?? '').trim().match(/^\{:([^:]+):\}$/);

  return normalizeRecentEmoteId(match?.[1] ?? '');
}

export function getRecentEmoteName(emote) {
  if (!emote || typeof emote !== 'object') {
    return '';
  }

  return normalizeRecentEmoteName(
    emote.emojiName ??
    emote.emoteName ??
    emote.name ??
    emote.emoji?.emojiName ??
    emote.emote?.emoteName ??
    getRecentEmoteId(emote)
  );
}

export function getRecentEmoteAlt(emote) {
  const id = getRecentEmoteId(emote);

  if (!id) return '';

  return `{:${id}:}`;
}

export function getRecentEmoteImageUrl(emote) {
  if (!emote || typeof emote !== 'object') {
    return '';
  }

  return normalizeRecentEmoteUrl(
    emote.imageUrl ??
    emote.url ??
    emote.src ??
    emote.emoji?.imageUrl ??
    emote.emote?.imageUrl ??
    ''
  );
}

export function isValidRecentEmoteObject(emote) {
  if (!emote || typeof emote !== 'object') {
    return false;
  }

  return Boolean(getRecentEmoteId(emote));
}

function normalizeRecentEmoteId(value) {
  return String(value ?? '').trim();
}

function normalizeRecentEmoteName(value) {
  return String(value ?? '').trim();
}

function normalizeRecentEmoteUrl(value) {
  return String(value ?? '').trim();
}

function safeGetLocalStorageItem(key) {
  try {
    return window.localStorage.getItem(key) || '';
  } catch (error) {
    console.error('[Emozzk Lite] failed to get localStorage item:', {
      key,
      error,
    });

    return '';
  }
}

function setLocalStorageItem(key, value) {
  window.localStorage.setItem(key, value);
}

function safeGetLocalStorageKeys() {
  try {
    return Object.keys(window.localStorage);
  } catch (error) {
    console.error('[Emozzk Lite] failed to read localStorage keys:', error);
    return [];
  }
}