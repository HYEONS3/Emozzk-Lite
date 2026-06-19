import {
  isValidEmoteAlt,
} from './emote-buttons.js';

const FAVORITES_STORAGE_KEY = 'emozzk_lite_favorite_emotes_v1';
const MAX_FAVORITES = 10;

export async function getFavoriteEmoteAlts() {
  const storage = await readStorage();

  return normalizeFavoriteAlts(storage[FAVORITES_STORAGE_KEY]);
}

export async function setFavoriteEmoteAlts(alts) {
  const normalized = normalizeFavoriteAlts(alts);

  await writeStorage({
    [FAVORITES_STORAGE_KEY]: normalized,
  });

  return normalized;
}

export async function addFavoriteEmoteAlt(alt) {
  if (!isValidEmoteAlt(alt)) {
    return {
      changed: false,
      favorites: await getFavoriteEmoteAlts(),
    };
  }

  const current = await getFavoriteEmoteAlts();

  if (current.includes(alt)) {
    return {
      changed: false,
      favorites: current,
    };
  }

  const next = normalizeFavoriteAlts([
    alt,
    ...current,
  ]);

  await setFavoriteEmoteAlts(next);

  return {
    changed: true,
    favorites: next,
  };
}

export async function removeFavoriteEmoteAlt(alt) {
  const current = await getFavoriteEmoteAlts();
  const next = current.filter((item) => item !== alt);

  if (next.length === current.length) {
    return {
      changed: false,
      favorites: current,
    };
  }

  await setFavoriteEmoteAlts(next);

  return {
    changed: true,
    favorites: next,
  };
}

export async function toggleFavoriteEmoteAlt(alt) {
  if (!isValidEmoteAlt(alt)) {
    return {
      changed: false,
      added: false,
      favorites: await getFavoriteEmoteAlts(),
    };
  }

  const current = await getFavoriteEmoteAlts();

  if (current.includes(alt)) {
    const result = await removeFavoriteEmoteAlt(alt);

    return {
      changed: result.changed,
      added: false,
      favorites: result.favorites,
    };
  }

  const result = await addFavoriteEmoteAlt(alt);

  return {
    changed: result.changed,
    added: true,
    favorites: result.favorites,
  };
}

export async function isFavoriteEmoteAlt(alt) {
  if (!isValidEmoteAlt(alt)) return false;

  const current = await getFavoriteEmoteAlts();

  return current.includes(alt);
}

function normalizeFavoriteAlts(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set();
  const normalized = [];

  value.forEach((alt) => {
    if (!isValidEmoteAlt(alt)) return;
    if (seen.has(alt)) return;

    seen.add(alt);
    normalized.push(alt);
  });

  return normalized.slice(0, MAX_FAVORITES);
}

function readStorage() {
  return new Promise((resolve) => {
    if (!chrome?.storage?.local) {
      resolve({});
      return;
    }

    chrome.storage.local.get([FAVORITES_STORAGE_KEY], (result) => {
      resolve(result ?? {});
    });
  });
}

function writeStorage(value) {
  return new Promise((resolve) => {
    if (!chrome?.storage?.local) {
      resolve();
      return;
    }

    chrome.storage.local.set(value, () => {
      resolve();
    });
  });
}