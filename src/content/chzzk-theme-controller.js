import {
  findChatInput,
} from './chat-input.js';

const THEME_ATTRIBUTE = 'data-emzk-lite-theme';

const THEME_DARK = 'dark';
const THEME_LIGHT = 'light';

const THEME_SYNC_INTERVAL_MS = 1000;
const THEME_LUMINANCE_THRESHOLD = 128;

let attached = false;
let syncTimer = 0;
let cachedTheme = '';

export function attachChzzkThemeController() {
  if (attached) return;

  attached = true;

  syncChzzkTheme();

  syncTimer = window.setInterval(() => {
    if (document.visibilityState !== 'visible') {
      return;
    }

    syncChzzkTheme();
  }, THEME_SYNC_INTERVAL_MS);

  window.addEventListener('focus', syncChzzkTheme);

  document.addEventListener(
    'visibilitychange',
    handleVisibilityChange
  );
}

function handleVisibilityChange() {
  if (document.visibilityState !== 'visible') {
    return;
  }

  syncChzzkTheme();
}

function syncChzzkTheme() {
  const reference = findChatInput();

  if (!(reference instanceof HTMLElement)) {
    return;
  }

  const theme = detectThemeFromElement(reference);

  if (
    !theme ||
    theme === cachedTheme
  ) {
    return;
  }

  cachedTheme = theme;

  document.documentElement.setAttribute(
    THEME_ATTRIBUTE,
    theme
  );
}

function detectThemeFromElement(element) {
  const color = window
    .getComputedStyle(element)
    .color;

  const rgb = parseRgbColor(color);

  if (!rgb) {
    return '';
  }

  const luminance =
    rgb.red * 0.2126 +
    rgb.green * 0.7152 +
    rgb.blue * 0.0722;

  /*
   * 밝은 전경색 → 어두운 테마
   * 어두운 전경색 → 밝은 테마
   */
  return luminance >= THEME_LUMINANCE_THRESHOLD
    ? THEME_DARK
    : THEME_LIGHT;
}

function parseRgbColor(value) {
  const channels = String(value ?? '')
    .match(/\d+(?:\.\d+)?/g);

  if (!channels || channels.length < 3) {
    return null;
  }

  const [
    red,
    green,
    blue,
  ] = channels.slice(0, 3).map(Number);

  if (
    !Number.isFinite(red) ||
    !Number.isFinite(green) ||
    !Number.isFinite(blue)
  ) {
    return null;
  }

  return {
    red,
    green,
    blue,
  };
}