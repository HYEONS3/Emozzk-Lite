import {
  getEmoteAltFromButton,
  isRealEmoteButton,
} from './emote-buttons.js';

import {
  findEmotePanel,
} from './emote-panel.js';

import {
  isElementInRecentEmoteSection,
} from './emote-recent-section.js';

import {
  scheduleFavoriteEmoteSectionRender,
} from './emote-favorites-render.js';

import {
  scheduleBadgeUpdate,
} from './badge-overlay.js';

import {
  findRecentEmoteByAlt,
  getRecentEmoteId,
  getRecentEmoteIdFromAlt,
  readRecentEmotes,
  writeRecentEmotes,
} from './recent-emote-storage.js';

import {
  toggleFavoriteRecentEmote,
} from './favorite-recent-emote-storage.js';

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
  isEmoteBindAssignMode,
  isEmoteBindClearMode,
} from './emote-bind-mode-state.js';

import {
  clearShortcutBindingsByEmojiIdFromAllSets,
} from './shortcut-storage.js';

const FAVORITES_SECTION_SELECTOR = '.emzk-lite-favorites-section';

export function attachEmoteFavoriteEvents() {
  document.addEventListener('mousedown', handleFavoriteMouseDown, true);
  document.addEventListener('click', handleFavoriteClick, true);
}

function handleFavoriteMouseDown(event) {
  if (isEmoteBindInteractionModeActive()) return;
  if (!isFavoriteToggleEvent(event)) return;

  const button = getOriginalEmoteButtonFromEvent(event);

  if (!button) return;

  blockEvent(event);
}

async function handleFavoriteClick(event) {
	if (isEmoteBindInteractionModeActive()) return;
  if (!isFavoriteToggleEvent(event)) return;

  const button = getOriginalEmoteButtonFromEvent(event);

  if (!button) return;

  blockEvent(event);

  const panel = findEmotePanel();

  if (!panel) return;

  const isRecentItem = isElementInRecentEmoteSection(button, panel);
  const isFavoriteItem = isElementInFavoriteSection(button, panel);

  if (!isRecentItem && !isFavoriteItem) {
    return;
  }

  const alt = getEmoteAltFromButton(button);
  const recentEmote = getRecentEmoteFromButton(button);

  if (!recentEmote) {
    return;
  }

  try {
    const result = await toggleFavoriteRecentEmote(recentEmote);

    if (!result.changed) {
      return;
    }

    const emojiId = getRecentEmoteId(recentEmote);

    if (result.removed) {
      await clearShortcutBindingsByEmojiIdFromAllSets({
        emojiId,
      });
    }

    const mergedRecentEmotes = syncRecentLocalStorageWithFavorites({
      favorites: result.favorites,
    });

    const source = isFavoriteItem ? 'favorite' : 'recent';

    dispatchFavoritesChanged({
      emojiId,
      alt,
      added: result.added,
      removed: result.removed,
      source,
      favorites: result.favorites,
      mergedRecentEmotes,
    });

    scheduleFavoriteEmoteSectionRender();
    scheduleBadgeUpdate();
  } catch (error) {
    console.error('[Emozzk Lite] failed to toggle favorite recent emote:', error);
  }
}

function isFavoriteToggleEvent(event) {
  return (
    event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey
  );
}

function getOriginalEmoteButtonFromEvent(event) {
  const target = event.target;

  if (!(target instanceof Element)) return null;

  const button = target.closest('button[type="button"]');

  if (!button) return null;
  if (!isRealEmoteButton(button)) return null;

  return button;
}

function isElementInFavoriteSection(element, panel) {
  if (!element || !panel) return false;

  const section = element.closest(FAVORITES_SECTION_SELECTOR);

  return Boolean(section && panel.contains(section));
}

function isEmoteBindInteractionModeActive() {
  return (
    isEmoteBindAssignMode() ||
    isEmoteBindClearMode()
  );
}

function getRecentEmoteFromButton(button) {
  const alt = getEmoteAltFromButton(button);
  const recentEmotes = readRecentEmotes();
  const recentEmote = findRecentEmoteByAlt(recentEmotes, alt);

  if (recentEmote) {
    return recentEmote;
  }

  return createFallbackRecentEmoteFromButton(button);
}

function createFallbackRecentEmoteFromButton(button) {
  const alt = getEmoteAltFromButton(button);
  const emojiId = getRecentEmoteIdFromAlt(alt);

  if (!emojiId) {
    return null;
  }

  const image = button.querySelector('img');
  const imageUrl = image?.currentSrc || image?.src || '';

  return {
    emojiId,
    imageUrl,
  };
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

function blockEvent(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}