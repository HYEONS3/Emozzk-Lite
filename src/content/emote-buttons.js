export const SELECT_CODES = [
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'F6',
  'F7',
  'F8',
  'F9',
  'F10',
];

export function isSelectCode(code) {
  return SELECT_CODES.includes(code);
}

export function clickVisibleEmoteByCode(code, panel) {
  const index = SELECT_CODES.indexOf(code);
  if (index < 0) return false;

  const buttons = getVisibleEmoteButtons(panel);
  const target = buttons[index];

  console.debug('[Emozzk Lite] select:', {
    code,
    index,
    count: buttons.length,
    target,
    alt: target?.querySelector('img')?.getAttribute('alt') ?? null,
  });

  if (!target) return false;

  target.click();
  return true;
}

export function getVisibleEmoteButtons(panel) {
  if (!panel) return [];

  const area = panel.querySelector('#emoji_area');

  if (!area) {
    console.debug('[Emozzk Lite] emoji area not found');
    return [];
  }

  return Array.from(area.querySelectorAll('button[type="button"]'))
    .filter(isVisibleElement)
    .filter(isEnabledButton)
    .filter(isRealEmoteButton)
    .sort(compareByGridPosition);
}

function isRealEmoteButton(button) {
  const image = button.querySelector('img');
  if (!image) return false;

  const alt = image.getAttribute('alt') ?? '';

  if (!/^\{:[^:]+:\}$/.test(alt)) {
    return false;
  }

  const item = button.closest('li[id^="emoji_"]');
  if (!item) return false;

  const rect = button.getBoundingClientRect();

  return (
    rect.width >= 20 &&
    rect.width <= 80 &&
    rect.height >= 20 &&
    rect.height <= 80
  );
}

function isEnabledButton(button) {
  return (
    !button.disabled &&
    button.getAttribute('aria-disabled') !== 'true'
  );
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

function compareByGridPosition(a, b) {
  const ar = a.getBoundingClientRect();
  const br = b.getBoundingClientRect();

  const rowDiff = ar.top - br.top;

  if (Math.abs(rowDiff) > 8) {
    return rowDiff;
  }

  return ar.left - br.left;
}