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
  getFavoriteRecentEmotes,
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
  getBindingEmojiId,
  getCachedShortcutBindingSetState,
} from './shortcut-storage.js';

const FAVORITES_SECTION_SELECTOR = '.emzk-lite-favorites-section';
const SHORTCUT_SET_BUTTON_CLASS = 'emzk-lite-shortcut-set-button';
const SHORTCUT_SET_BUTTON_FLASH_CLASS = 'emzk-lite-shortcut-set-button-flash';
const SHORTCUT_SET_FLASH_VISIBLE_TIME = 1400;

let shortcutSetFlashTimer = 0;

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

  const emojiId = getRecentEmoteId(recentEmote);

  if (!emojiId) {
    return;
  }

  try {
    const favoriteEmotes = await getFavoriteRecentEmotes();

    const willRemoveFavorite = favoriteEmotes.some((favoriteEmote) => {
      return getRecentEmoteId(favoriteEmote) === emojiId;
    });

    const boundSetIds = getShortcutBindingSetIdsForEmojiId(emojiId);

    if (
      willRemoveFavorite &&
      boundSetIds.length > 0
    ) {
      flashShortcutSetButtons({
        panel,
        setIds: boundSetIds,
      });

      return;
    }

    const result = await toggleFavoriteRecentEmote(recentEmote);

    if (!result.changed) {
      return;
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
function hasShortcutBindingForEmojiIdInAnySet(emojiId) {
  const normalizedEmojiId = String(emojiId ?? '').trim();

  if (!normalizedEmojiId) {
    return false;
  }

  const state = getCachedShortcutBindingSetState();

  return state.sets.some((set) => {
    if (!Array.isArray(set.bindings)) {
      return false;
    }

    return set.bindings.some((binding) => {
      return getBindingEmojiId(binding) === normalizedEmojiId;
    });
  });
}

function showFavoriteToast({
  panel,
  message,
}) {
  if (!(panel instanceof HTMLElement)) return;

  const emojiArea = panel.querySelector('#emoji_area');

  if (!(emojiArea instanceof HTMLElement)) return;

  panel.classList.add('emzk-lite-toast-anchor');

  let toast = panel.querySelector(`.${FAVORITE_TOAST_CLASS}`);

  if (!toast) {
    toast = document.createElement('div');
    toast.className = FAVORITE_TOAST_CLASS;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    panel.appendChild(toast);
  }

  const panelRect = panel.getBoundingClientRect();
  const emojiAreaRect = emojiArea.getBoundingClientRect();

  const top = emojiAreaRect.top - panelRect.top + 36;
  const left = emojiAreaRect.left - panelRect.left + emojiAreaRect.width / 2;

  toast.style.top = `${top}px`;
  toast.style.left = `${left}px`;
  toast.textContent = message;

  if (favoriteToastTimer) {
    window.clearTimeout(favoriteToastTimer);
  }

  requestAnimationFrame(() => {
    toast.dataset.visible = 'true';
  });

  favoriteToastTimer = window.setTimeout(() => {
    toast.dataset.visible = 'false';

    window.setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, FAVORITE_TOAST_REMOVE_DELAY);
  }, FAVORITE_TOAST_VISIBLE_TIME);
}

function blockEvent(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

function getShortcutBindingSetIdsForEmojiId(emojiId) {
  const normalizedEmojiId = String(emojiId ?? '').trim();

  if (!normalizedEmojiId) {
    return [];
  }

  const state = getCachedShortcutBindingSetState();

  return state.sets
    .filter((set) => {
      if (!Array.isArray(set.bindings)) {
        return false;
      }

      return set.bindings.some((binding) => {
        return getBindingEmojiId(binding) === normalizedEmojiId;
      });
    })
    .map((set) => String(set?.id ?? '').trim())
    .filter(Boolean);
}

function flashShortcutSetButtons({
  panel,
  setIds,
}) {
  if (!(panel instanceof HTMLElement)) return;

  const targetSetIds = new Set(
    setIds
      .map((setId) => String(setId ?? '').trim())
      .filter(Boolean)
  );

  if (!targetSetIds.size) return;

  const buttons = Array.from(
    panel.querySelectorAll(`.${SHORTCUT_SET_BUTTON_CLASS}`)
  ).filter((button) => {
    return targetSetIds.has(
      button.getAttribute('data-emzk-lite-shortcut-set-id')
    );
  });

  if (!buttons.length) return;

  clearFlashingShortcutSetButtons(panel);

  buttons.forEach((button) => {
    button.classList.remove(SHORTCUT_SET_BUTTON_FLASH_CLASS);

    // 같은 버튼을 연속으로 눌렀을 때 애니메이션 재시작
    void button.offsetWidth;

    button.classList.add(SHORTCUT_SET_BUTTON_FLASH_CLASS);
  });

  if (shortcutSetFlashTimer) {
    window.clearTimeout(shortcutSetFlashTimer);
  }

  shortcutSetFlashTimer = window.setTimeout(() => {
    clearFlashingShortcutSetButtons(panel);
  }, SHORTCUT_SET_FLASH_VISIBLE_TIME);
}

function clearFlashingShortcutSetButtons(panel) {
  if (!(panel instanceof HTMLElement)) return;

  panel
    .querySelectorAll(`.${SHORTCUT_SET_BUTTON_FLASH_CLASS}`)
    .forEach((button) => {
      button.classList.remove(SHORTCUT_SET_BUTTON_FLASH_CLASS);
    });
}