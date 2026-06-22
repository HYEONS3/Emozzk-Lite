import {
  attachShortcutController,
  setShortcutBindings,
} from './shortcut-controller.js';

import {
  startBadgeOverlay,
} from './badge-overlay.js';

import {
  attachEmoteClickFocusRestore,
} from './emote-click-focus.js';

import {
  attachEmoteFavoriteEvents,
} from './emote-favorites-events.js';

import {
  attachEmoteBindEvents,
} from './emote-bind-events.js';

import {
  startFavoriteEmoteSectionRenderer,
} from './emote-favorites-render.js';

import {
  startRecentEmoteStorageLimitBridge,
} from './recent-emote-storage-limit-bridge.js';

import {
  getRecentEmoteStorageKey,
  readRecentEmotes,
} from './recent-emote-storage.js';

import {
  initFavoriteRecentEmoteStorage,
  getCachedFavoriteRecentEmotes,
} from './favorite-recent-emote-storage.js';

import {
  initShortcutBindingsStorage,
  getCachedShortcutBindings,
} from './shortcut-storage.js';

import {
  initExtensionSettingsStorage,
  startExtensionSettingsStorageSync,
} from './extension-settings-storage.js';

const DEBUG = false;

startContentScript();

function startContentScript() {
  console.log('[Emozzk Lite] content script loaded');

  /*
   * page context inject는 최대한 빨리 넣는다.
   * CHZZK가 livechat-emoticon#... 을 저장하기 전에
   * localStorage.setItem patch가 설치되어야 한다.
   */
  startRecentEmoteStorageLimitBridge();

  startBadgeOverlay();

  attachEmoteFavoriteEvents();
  attachEmoteClickFocusRestore();
  attachEmoteBindEvents();

  initializeStorages()
    .finally(() => {
      setShortcutBindings(getCachedShortcutBindings());
      attachShortcutController();

      startFavoriteEmoteSectionRenderer();

      if (DEBUG) {
        logStorageSnapshot();
      }
    });
}

async function initializeStorages() {
  const result = await Promise.allSettled([
    initExtensionSettingsStorage(),
    initFavoriteRecentEmoteStorage(),
    initShortcutBindingsStorage(),
  ]);

  startExtensionSettingsStorageSync();

  const [
    extensionSettingsStorageResult,
    favoriteRecentStorageResult,
    shortcutBindingsStorageResult,
  ] = result;

  if (extensionSettingsStorageResult.status === 'rejected') {
    console.error(
      '[Emozzk Lite] failed to initialize extension settings storage:',
      extensionSettingsStorageResult.reason
    );
  }

  if (favoriteRecentStorageResult.status === 'rejected') {
    console.error(
      '[Emozzk Lite] failed to initialize favorite recent emote storage:',
      favoriteRecentStorageResult.reason
    );
  }

  if (shortcutBindingsStorageResult.status === 'rejected') {
    console.error(
      '[Emozzk Lite] failed to initialize shortcut bindings storage:',
      shortcutBindingsStorageResult.reason
    );
  }
}

function logStorageSnapshot() {
  logRecentEmoteStorageSnapshot();
  logFavoriteRecentEmoteStorageSnapshot();
  logShortcutBindingsStorageSnapshot();
}

function logRecentEmoteStorageSnapshot() {
  try {
    const key = getRecentEmoteStorageKey();
    const recentEmotes = readRecentEmotes();

    console.log('[Emozzk Lite] recent emote key:', key);
    console.log('[Emozzk Lite] recent emotes:', recentEmotes);
    console.log('[Emozzk Lite] recent emote count:', recentEmotes.length);
  } catch (error) {
    console.error('[Emozzk Lite] failed to inspect recent emotes:', error);
  }
}

function logFavoriteRecentEmoteStorageSnapshot() {
  try {
    const favoriteRecentEmotes = getCachedFavoriteRecentEmotes();

    console.log(
      '[Emozzk Lite] favorite recent emotes:',
      favoriteRecentEmotes
    );

    console.log(
      '[Emozzk Lite] favorite recent emote count:',
      favoriteRecentEmotes.length
    );
  } catch (error) {
    console.error(
      '[Emozzk Lite] failed to inspect favorite recent emotes:',
      error
    );
  }
}

function logShortcutBindingsStorageSnapshot() {
  try {
    const shortcutBindings = getCachedShortcutBindings();

    console.log(
      '[Emozzk Lite] shortcut bindings:',
      shortcutBindings
    );

    console.log(
      '[Emozzk Lite] shortcut binding count:',
      shortcutBindings.length
    );
  } catch (error) {
    console.error(
      '[Emozzk Lite] failed to inspect shortcut bindings:',
      error
    );
  }
}