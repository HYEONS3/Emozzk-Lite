const BADGE_ROOT_ID = 'emozzk-lite-badge-root';

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
  const root = getBadgeRoot();

  root.replaceChildren();

  buttons.slice(0, BADGE_LABELS.length).forEach((button, index) => {
    const badge = createBadge({
      label: BADGE_LABELS[index],
      target: button,
    });

    if (badge) {
      root.appendChild(badge);
    }
  });

  if (!root.childElementCount) {
    clearEmoteBadges();
  }
}

export function clearEmoteBadges() {
  const root = document.getElementById(BADGE_ROOT_ID);

  if (root) {
    root.remove();
  }
}

function getBadgeRoot() {
  let root = document.getElementById(BADGE_ROOT_ID);

  if (!root) {
    root = document.createElement('div');
    root.id = BADGE_ROOT_ID;
    root.className = 'emzk-lite-badge-root';
    root.setAttribute('aria-hidden', 'true');

    document.documentElement.appendChild(root);
  }

  return root;
}

function createBadge({ label, target }) {
  if (!target) return null;

  const rect = target.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) return null;

  const badge = document.createElement('span');

  badge.className = 'emzk-lite-badge';
  badge.textContent = label;

  badge.style.left = `${Math.round(rect.left + 2)}px`;
  badge.style.top = `${Math.round(rect.top + 2)}px`;

  return badge;
}