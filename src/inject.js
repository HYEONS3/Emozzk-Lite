const RECENT_EMOTE_KEY_PREFIX = 'livechat-emoticon#';

const RECENT_STORAGE_LIMIT_MESSAGE =
  'EMZK_LITE_RECENT_STORAGE_LIMIT_CHANGED';

const DEFAULT_RECENT_STORAGE_LIMIT = 60;
const MIN_RECENT_STORAGE_LIMIT = 50;
const MAX_RECENT_STORAGE_LIMIT = 200;

let recentStorageLimit = DEFAULT_RECENT_STORAGE_LIMIT;
let patched = false;

installRecentEmoteStorageLimitPatch();

function installRecentEmoteStorageLimitPatch() {
  if (patched) {
    return;
  }

  if (!window.localStorage?.setItem) {
    return;
  }

  patched = true;

  const originalSetItem = window.localStorage.setItem;

  window.addEventListener('message', (event) => {
    if (event.source !== window) {
      return;
    }

    if (event.data?.type !== RECENT_STORAGE_LIMIT_MESSAGE) {
      return;
    }

    recentStorageLimit = normalizeRecentStorageLimit(event.data.limit);
  });

  window.localStorage.setItem = function patchedSetItem(key, value) {
    if (!isRecentEmoteStorageKey(key)) {
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

      const limited = merged.slice(0, recentStorageLimit);

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

function normalizeRecentStorageLimit(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return DEFAULT_RECENT_STORAGE_LIMIT;
  }

  return Math.min(
    MAX_RECENT_STORAGE_LIMIT,
    Math.max(MIN_RECENT_STORAGE_LIMIT, Math.round(number))
  );
}

function normalizeText(value) {
  return String(value ?? '').trim();
}