import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  mergeFavoriteAndRecentEmotes,
  refreshFavoriteEmoteImages,
} from '../src/content/favorite-recent-merge.js';

const oldEmote = { emojiId: 'jwk908', imageUrl: 'https://example.com/jwk908.png' };
const newEmote = { emojiId: 'jwk908', imageUrl: 'https://example.com/908.png' };

test('same ID uses the current image without changing favorite order or metadata', () => {
  const other = { emojiId: 'other', imageUrl: 'https://example.com/other.png' };
  const favorite = { ...oldEmote, emojiName: 'saved name' };
  const merged = mergeFavoriteAndRecentEmotes({
    favorites: [other, favorite],
    recent: [newEmote, { emojiId: 'normal' }],
    maxRecentEmoteCount: 1,
  });
  assert.deepEqual(merged, [other, { ...favorite, imageUrl: newEmote.imageUrl }, { emojiId: 'normal' }]);
  assert.equal(favorite.imageUrl, oldEmote.imageUrl);
});

test('missing, empty and unchanged current images preserve saved favorites', () => {
  for (const recent of [[], [{ emojiId: 'jwk908' }], [{ emojiId: 'jwk908', imageUrl: '' }], [oldEmote]]) {
    assert.equal(refreshFavoriteEmoteImages([oldEmote], recent)[0], oldEmote);
  }
  assert.equal(refreshFavoriteEmoteImages([oldEmote], [{ emojiId: '908', imageUrl: newEmote.imageUrl }])[0], oldEmote);
});

test('refresh persists the URL and preserves set orders; repeated refresh does not write', async () => {
  const key = 'emozzk_lite_favorite_recent_emotes_v1';
  const setOrders = { main: { customized: true, bound: ['jwk908'], unbound: [] } };
  let saved = { version: 2, favorites: [oldEmote], setOrders };
  let writes = 0;
  globalThis.chrome = {
    storage: {
      local: {
        get(keys, callback) { callback({ [key]: saved }); },
        set(value, callback) { saved = value[key]; writes += 1; callback(); },
      },
      onChanged: { addListener() {}, removeListener() {} },
    },
  };
  const storage = await import('../src/content/favorite-recent-emote-storage.js');
  try {
    await storage.initFavoriteRecentEmoteStorage();
    assert.equal(await storage.syncFavoriteRecentEmoteImages([newEmote]), true);
    assert.deepEqual(saved.favorites, [newEmote]);
    assert.deepEqual(saved.setOrders, setOrders);
    assert.equal(await storage.syncFavoriteRecentEmoteImages([newEmote]), false);
    assert.equal(writes, 1);
    const newest = { ...newEmote, imageUrl: 'https://example.com/908-v2.png' };
    const result = await storage.ensureFavoriteRecentEmoteAppended(newest);
    assert.equal(result.changed, true);
    assert.equal(result.added, false);
    assert.deepEqual(saved.favorites, [newest]);
  } finally {
    storage.stopFavoriteRecentEmoteStorageSync();
    delete globalThis.chrome;
  }
});
