import {
  isRealEmoteButton,
} from './emote-buttons.js';

const FAVORITES_SECTION_SELECTOR = '.emzk-lite-favorites-section';
const EMOJI_AREA_SELECTOR = '#emoji_area';

const CATEGORY_CONTROL_SELECTOR = [
  '[role="tab"]',
  'button[aria-selected]',
  'button[aria-pressed]',
  'button[aria-current]',
  'a[aria-current]',
].join(', ');

const RECENT_TEXT_PATTERN = /최근(?:\s*사용)?|recent/i;

export function findRecentEmoteSection(panel) {
  const area = getEmojiArea(panel);

  if (!area) return null;

  if (!isRecentEmoteCategoryActive(panel)) {
    return null;
  }

  const headings = getSectionHeadings(area);
  const headingIndex = headings.findIndex(isRecentEmoteHeading);

  if (headingIndex < 0) {
    return null;
  }

  return {
    area,
    heading: headings[headingIndex],
    nextHeading: headings[headingIndex + 1] ?? null,
  };
}

export function isElementInRecentEmoteSection(element, panel) {
  if (!element) return false;

  const section = findRecentEmoteSection(panel);

  if (!section) return false;
  if (!section.area.contains(element)) return false;

  return isElementBetweenHeadings({
    element,
    heading: section.heading,
    nextHeading: section.nextHeading,
  });
}

export function getRecentEmoteButtons(panel) {
  const section = findRecentEmoteSection(panel);

  if (!section) return [];

  return Array.from(section.area.querySelectorAll('button[type="button"]'))
    .filter(isRealEmoteButton)
    .filter((button) => {
      return isElementBetweenHeadings({
        element: button,
        heading: section.heading,
        nextHeading: section.nextHeading,
      });
    });
}

function getEmojiArea(panel) {
  if (!panel) return null;

  if (panel.id === 'emoji_area') {
    return panel;
  }

  return panel.querySelector?.(EMOJI_AREA_SELECTOR) ?? null;
}

function getSectionHeadings(area) {
  return Array.from(
    area.querySelectorAll('strong, h2, h3, [role="heading"]')
  )
    .filter((heading) => {
      return !heading.closest(FAVORITES_SECTION_SELECTOR);
    })
    .filter(isRenderedElement);
}

function isRenderedElement(element) {
  if (!(element instanceof Element)) {
    return false;
  }

  if (!element.isConnected) {
    return false;
  }

  const rect = element.getBoundingClientRect();

  if (
    rect.width <= 0 ||
    rect.height <= 0
  ) {
    return false;
  }

  const style = window.getComputedStyle(element);

  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.visibility !== 'collapse' &&
    Number.parseFloat(style.opacity || '1') > 0
  );
}

function isRecentEmoteHeading(heading) {
  return RECENT_TEXT_PATTERN.test(
    normalizeText(heading.textContent)
  );
}

function isElementBetweenHeadings({
  element,
  heading,
  nextHeading,
}) {
  if (!element || !heading) return false;

  const afterHeading = Boolean(
    heading.compareDocumentPosition(element) &
      Node.DOCUMENT_POSITION_FOLLOWING
  );

  if (!afterHeading) {
    return false;
  }

  if (!nextHeading) {
    return true;
  }

  const beforeNextHeading = Boolean(
    element.compareDocumentPosition(nextHeading) &
      Node.DOCUMENT_POSITION_FOLLOWING
  );

  return beforeNextHeading;
}

export function isRecentEmoteCategoryActive(panel) {
  const controls = getEmoteCategoryControls(panel);

  /*
   * 카테고리 컨트롤을 전혀 못 찾는 DOM이면 기존 heading 기반 동작을 유지한다.
   * 단, 컨트롤이 하나라도 잡히는 구조에서는 active 상태를 반드시 확인한다.
   */
  if (!controls.length) {
    return true;
  }

  const activeControls = controls.filter(isActiveCategoryControl);

  if (!activeControls.length) {
    return false;
  }

  return activeControls.some(isRecentEmoteCategoryControl);
}

function getEmoteCategoryControls(panel) {
  if (!(panel instanceof Element)) {
    return [];
  }

  const candidates = Array.from(
    panel.querySelectorAll(CATEGORY_CONTROL_SELECTOR)
  );

  const seen = new Set();

  return candidates
    .filter((element) => {
      if (!(element instanceof Element)) return false;
      if (seen.has(element)) return false;

      seen.add(element);
      return true;
    })
    .filter(isPossibleCategoryControl);
}

function isPossibleCategoryControl(element) {
  if (!(element instanceof Element)) {
    return false;
  }

  if (element.closest(FAVORITES_SECTION_SELECTOR)) {
    return false;
  }

  /*
   * 실제 이모티콘 목록 내부 버튼은 카테고리 컨트롤이 아니다.
   */
  if (element.closest(EMOJI_AREA_SELECTOR)) {
    return false;
  }

  if (
    element instanceof HTMLButtonElement &&
    isRealEmoteButton(element)
  ) {
    return false;
  }

  return Boolean(normalizeText(getElementLabel(element)));
}

function isActiveCategoryControl(element) {
  if (
    element.getAttribute('aria-selected') === 'true' ||
    element.getAttribute('aria-pressed') === 'true'
  ) {
    return true;
  }

  const ariaCurrent = element.getAttribute('aria-current');

  return Boolean(
    ariaCurrent &&
    ariaCurrent !== 'false'
  );
}

function isRecentEmoteCategoryControl(element) {
  return RECENT_TEXT_PATTERN.test(
    normalizeText(getElementLabel(element))
  );
}

function getElementLabel(element) {
  return [
    element.getAttribute('aria-label'),
    element.getAttribute('title'),
    element.textContent,
  ]
    .filter(Boolean)
    .join(' ');
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
} 