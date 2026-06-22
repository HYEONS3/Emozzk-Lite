const FAVORITES_CHANGED_EVENT = 'emozzk-lite:favorites-changed';

export function getFavoritesChangedEventName() {
  return FAVORITES_CHANGED_EVENT;
}

export function dispatchFavoritesChanged(detail) {
  document.dispatchEvent(
    new CustomEvent(FAVORITES_CHANGED_EVENT, {
      detail,
    })
  );
}