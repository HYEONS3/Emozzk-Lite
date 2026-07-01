export const RECENT_STORAGE_LIMIT_OPTIONS = Object.freeze([
  20,
  40,
  60,
  100,
  150,
  200,
]);

export const MIN_RECENT_STORAGE_LIMIT = RECENT_STORAGE_LIMIT_OPTIONS[0];

export const MAX_RECENT_STORAGE_LIMIT =
  RECENT_STORAGE_LIMIT_OPTIONS[RECENT_STORAGE_LIMIT_OPTIONS.length - 1];

export const DEFAULT_RECENT_STORAGE_LIMIT = 60;

export function normalizeRecentStorageLimit(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return DEFAULT_RECENT_STORAGE_LIMIT;
  }

  const clamped = clampNumber(
    Math.round(number),
    MIN_RECENT_STORAGE_LIMIT,
    MAX_RECENT_STORAGE_LIMIT
  );

  return getNearestRecentStorageLimitOption(clamped);
}

export function getRecentStorageLimitFromRangeValue(value) {
  const index = clampNumber(
    Math.round(Number(value)),
    0,
    RECENT_STORAGE_LIMIT_OPTIONS.length - 1
  );

  return RECENT_STORAGE_LIMIT_OPTIONS[index] ?? DEFAULT_RECENT_STORAGE_LIMIT;
}

export function getRecentStorageLimitRangeValue(value) {
  const normalizedLimit = normalizeRecentStorageLimit(value);
  const exactIndex = RECENT_STORAGE_LIMIT_OPTIONS.indexOf(normalizedLimit);

  if (exactIndex >= 0) {
    return exactIndex;
  }

  return RECENT_STORAGE_LIMIT_OPTIONS.indexOf(DEFAULT_RECENT_STORAGE_LIMIT);
}

export function getNearestRecentStorageLimitOption(value) {
  return RECENT_STORAGE_LIMIT_OPTIONS.reduce((nearest, option) => {
    const nearestDistance = Math.abs(nearest - value);
    const optionDistance = Math.abs(option - value);

    return optionDistance <= nearestDistance
      ? option
      : nearest;
  }, RECENT_STORAGE_LIMIT_OPTIONS[0]);
}

function clampNumber(value, min, max) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.min(
    max,
    Math.max(min, number)
  );
}