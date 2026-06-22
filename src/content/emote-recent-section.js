import {
  isRealEmoteButton,
} from './emote-buttons.js';

export function findRecentEmoteSection(panel) {
  const area = getEmojiArea(panel);

  if (!area) return null;

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

  return panel.querySelector?.('#emoji_area') ?? null;
}

function getSectionHeadings(area) {
  return Array.from(
    area.querySelectorAll('strong, h2, h3, [role="heading"]')
  )
    .filter((heading) => {
      return !heading.closest('.emzk-lite-favorites-section');
    })
    .filter(isVisibleElement);
}

function isRecentEmoteHeading(heading) {
  const text = normalizeText(heading.textContent);

  return (
    /최근\s*사용/.test(text) ||
    /recent/i.test(text)
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

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isVisibleElement(element) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0'
  );
}