export const SELECT_CODES = [
  'F1', 'F2', 'F3', 'F4', 'F5',
  'F6', 'F7', 'F8', 'F9', 'F10',
];

const FAVORITES_SECTION_SELECTOR = '.emzk-lite-favorites-section';
const FAVORITES_LIST_SELECTOR = '.emzk-lite-favorites-list';

export function isSelectCode(code) {
  return SELECT_CODES.includes(code);
}

export function getSelectCodeIndex(code) {
  return SELECT_CODES.indexOf(code);
}

export function clickVisibleEmoteByCode(code, panel) {
  const index = getSelectCodeIndex(code);

  if (index < 0) return false;

  return clickVisibleEmoteByIndex(index, panel);
}

export function clickVisibleEmoteByIndex(index, panel) {
  const normalizedIndex = normalizeAssignableIndex(index);

  if (normalizedIndex < 0) return false;

  const buttons = getAssignableEmoteButtons(panel);
  const target = buttons[normalizedIndex];

  if (!target) return false;

  target.click();

  return true;
}

export function clickVisibleEmoteById(emojiId, panel) {
  const target = findAssignableEmoteButtonById({
    emojiId,
    panel,
  });

  if (!target) return false;

  target.click();

  return true;
}

export function findAssignableEmoteButtonById({
  emojiId,
  panel,
}) {
  const id = normalizeEmoteId(emojiId);

  if (!id || !panel) return null;

  return getAssignableEmoteButtons(panel).find((button) => {
    return getEmoteIdFromButton(button) === id;
  }) ?? null;
}

/**
 * 현재 배지 시스템 호환용 버튼 목록.
 *
 * 주의:
 * - 이 함수는 기존 F1~F10 배지 표시를 유지하기 위한 목록이다.
 * - 사용자가 직접 지정한 단축키 배지는 이후 binding 기준으로 별도 처리해야 한다.
 * - 실제 단축키 실행 대상은 getAssignableEmoteButtons()를 사용한다.
 */
export function getShortcutEmoteButtons(panel) {
  return getAssignableEmoteButtons(panel)
    .slice(0, SELECT_CODES.length);
}

/**
 * 단축키 action이 참조할 수 있는 전체 이모티콘 버튼 목록.
 *
 * 순서:
 * 1. Emozzk Lite 즐겨찾기 섹션 버튼
 * 2. 나머지 CHZZK 이모티콘 버튼
 *
 * SELECT_CODES.length로 자르지 않는다.
 * 따라서 index 10, 11, 12... 대상도 클릭할 수 있다.
 */
export function getAssignableEmoteButtons(panel) {
  if (!panel) return [];

  const favoriteButtons = getFavoriteEmoteButtons(panel);
  const normalButtons = getNormalEmoteButtons(panel);

  return uniqueButtonsByEmoteId([
    ...favoriteButtons,
    ...normalButtons,
  ]);
}

/**
 * CHZZK 패널 안에서 보이는 실제 이모티콘 버튼 전체.
 *
 * 전체 탐색용이다.
 * 단축키 실행 대상에는 getAssignableEmoteButtons()를 사용한다.
 */
export function getVisibleEmoteButtons(panel) {
  const area = getEmojiArea(panel);

  if (!area) return [];

  return getVisibleRealButtonsFrom(area)
    .sort(compareByGridPosition);
}

export function getFavoriteEmoteButtons(panel) {
  const favoriteSection = getFavoriteSection(panel);

  if (!favoriteSection) return [];

  const favoriteList =
    favoriteSection.querySelector(FAVORITES_LIST_SELECTOR) ??
    favoriteSection;

  return getVisibleRealButtonsFrom(favoriteList)
    .sort(compareByGridPosition);
}

function getNormalEmoteButtons(panel) {
  const area = getEmojiArea(panel);

  if (!area) return [];

  const favoriteSection = getFavoriteSection(panel);

  return getVisibleRealButtonsFrom(area)
    .filter((button) => {
      if (!favoriteSection) return true;

      return !favoriteSection.contains(button);
    })
    .sort(compareByGridPosition);
}

export function isEmoteButtonStructure(button) {
  if (!(button instanceof HTMLButtonElement)) {
    return false;
  }

  const image = button.querySelector('img');

  if (!(image instanceof HTMLImageElement)) {
    return false;
  }

  const alt = getEmoteAltFromButton(button);

  if (!isValidEmoteAlt(alt)) {
    return false;
  }

  return Boolean(button.closest('li'));
}

export function isRealEmoteButton(button) {
  if (!isEmoteButtonStructure(button)) {
    return false;
  }

  const rect = button.getBoundingClientRect();

  return (
    rect.width >= 20 &&
    rect.width <= 80 &&
    rect.height >= 20 &&
    rect.height <= 80
  );
}

export function getEmoteAltFromButton(button) {
  const image = button?.querySelector?.('img');

  return image?.getAttribute('alt') ?? '';
}

export function getEmoteLabelFromButton(button) {
  const alt = getEmoteAltFromButton(button);

  return getEmoteLabelFromAlt(alt);
}

export function getEmoteLabelFromAlt(alt) {
  const match = String(alt ?? '').match(/^\{:([^:]+):\}$/);

  return match?.[1] ?? '';
}

export function getEmoteIdFromButton(button) {
  return getEmoteIdFromAlt(getEmoteAltFromButton(button));
}

export function getEmoteIdFromAlt(alt) {
  const match = String(alt ?? '').match(/^\{:([^:]+):\}$/);

  return normalizeEmoteId(match?.[1] ?? '');
}

export function isValidEmoteAlt(alt) {
  return /^\{:[^:]+:\}$/.test(String(alt ?? ''));
}

function normalizeAssignableIndex(index) {
  const number = Number(index);

  if (!Number.isInteger(number)) return -1;
  if (number < 0) return -1;

  return number;
}

function normalizeEmoteId(value) {
  return String(value ?? '').trim();
}

function getEmojiArea(panel) {
  if (!panel) return null;

  return panel.querySelector('#emoji_area');
}

function getFavoriteSection(panel) {
  if (!panel) return null;

  return panel.querySelector(FAVORITES_SECTION_SELECTOR);
}

function getVisibleRealButtonsFrom(root) {
  if (!root) return [];

  return Array.from(root.querySelectorAll('button[type="button"]'))
    .filter(isVisibleElement)
    .filter(isEnabledButton)
    .filter(isRealEmoteButton);
}

function uniqueButtonsByEmoteId(buttons) {
  const seen = new Set();
  const result = [];

  buttons.forEach((button) => {
    const id = getEmoteIdFromButton(button);

    if (!id) return;
    if (seen.has(id)) return;

    seen.add(id);
    result.push(button);
  });

  return result;
}

function isEnabledButton(button) {
  return (
    button instanceof HTMLButtonElement &&
    !button.disabled &&
    button.getAttribute('aria-disabled') !== 'true'
  );
}

function isVisibleElement(element) {
  if (!(element instanceof Element)) return false;

  const rect = element.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) {
    return false;
  }

  const style = window.getComputedStyle(element);

  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0'
  );
}

function compareByGridPosition(a, b) {
  const rectA = a.getBoundingClientRect();
  const rectB = b.getBoundingClientRect();

  const rowDiff = rectA.top - rectB.top;

  if (Math.abs(rowDiff) > 4) {
    return rowDiff;
  }

  return rectA.left - rectB.left;
}