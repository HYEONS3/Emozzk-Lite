import {
  getEmoteAltFromButton,
  getEmoteLabelFromAlt,
  isRealEmoteButton,
} from './emote-buttons.js';

import {
  toggleFavoriteEmoteAlt,
} from './emote-favorites-storage.js';

const FAVORITES_CHANGED_EVENT = 'emozzk-lite:favorites-changed';

export function attachEmoteFavoriteEvents() {
  document.addEventListener('mousedown', handleFavoriteMouseDown, true);
  document.addEventListener('click', handleFavoriteClick, true);
}

function handleFavoriteMouseDown(event) {
  if (!isFavoriteToggleEvent(event)) return;

  const button = getOriginalEmoteButtonFromEvent(event);

  if (!button) return;

  // Alt+클릭은 즐겨찾기 토글 전용.
  // 버튼 focus 이동과 일반 click 흐름을 막는다.
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

async function handleFavoriteClick(event) {
  if (!isFavoriteToggleEvent(event)) return;

  const button = getOriginalEmoteButtonFromEvent(event);

  if (!button) return;

  // CHZZK 기본 이모티콘 입력 click이 실행되지 않게 차단.
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  const alt = getEmoteAltFromButton(button);
  const label = getEmoteLabelFromAlt(alt);

  const result = await toggleFavoriteEmoteAlt(alt);

  console.debug('[Emozzk Lite] favorite toggled:', {
    alt,
    label,
    added: result.added,
    changed: result.changed,
    favorites: result.favorites,
  });

  dispatchFavoritesChanged({
    alt,
    label,
    added: result.added,
    favorites: result.favorites,
  });
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

function dispatchFavoritesChanged(detail) {
  document.dispatchEvent(
    new CustomEvent(FAVORITES_CHANGED_EVENT, {
      detail,
    })
  );
}

export function getFavoritesChangedEventName() {
  return FAVORITES_CHANGED_EVENT;
}