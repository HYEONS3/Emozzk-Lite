import {
  DEFAULT_RECENT_STORAGE_LIMIT,
  normalizeRecentStorageLimit,
} from './recent-storage-limit.js';

export const EXTENSION_SETTINGS_STORAGE_KEY =
  'emzk_lite_extension_settings_v1';

export const DEFAULT_EXTENSION_SETTINGS = {
  experimentalKeyupEnabled: false,
  experimentalBothPhaseEnabled: false,
  experimentalPhaseHintPending: false,
  recentStorageLimit: DEFAULT_RECENT_STORAGE_LIMIT,
};

export function normalizeExtensionSettings(settings) {
  const experimentalKeyupEnabled = Boolean(
    settings?.experimentalKeyupEnabled
  );

  return {
    experimentalKeyupEnabled,
    experimentalBothPhaseEnabled: Boolean(
      experimentalKeyupEnabled &&
      settings?.experimentalBothPhaseEnabled
    ),
    experimentalPhaseHintPending: Boolean(
      settings?.experimentalPhaseHintPending
    ),
    recentStorageLimit: normalizeRecentStorageLimit(
      settings?.recentStorageLimit
    ),
  };
}