const BADGE_CLASS = 'emzk-lite-badge';
const BADGE_TARGET_ATTR = 'data-emzk-lite-badge-target';
const BADGE_PATCH_ATTR = 'data-emzk-lite-position-patched';

const BADGE_LABELS = [
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

export function renderEmoteBadges(buttons) {
  clearEmoteBadges();

  buttons.slice(0, BADGE_LABELS.length).forEach((button, index) => {
    attachBadgeToButton({
      button,
      label: BADGE_LABELS[index],
    });
  });
}

export function clearEmoteBadges() {
  document.querySelectorAll(`.${BADGE_CLASS}`).forEach((badge) => {
    badge.remove();
  });

  document.querySelectorAll(`[${BADGE_PATCH_ATTR}="true"]`).forEach((button) => {
    button.style.position = '';
    button.removeAttribute(BADGE_PATCH_ATTR);
  });
}

function attachBadgeToButton({
  button,
  label,
}) {
  if (!button) return;

  const rect = button.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) return;

  ensureButtonPositionContext(button);

  const badge = document.createElement('span');

  badge.className = BADGE_CLASS;
  badge.textContent = label;
  badge.setAttribute('aria-hidden', 'true');

  button.setAttribute(BADGE_TARGET_ATTR, 'true');
  button.appendChild(badge);
}

function ensureButtonPositionContext(button) {
  const style = window.getComputedStyle(button);

  if (style.position !== 'static') return;

  button.style.position = 'relative';
  button.setAttribute(BADGE_PATCH_ATTR, 'true');
}