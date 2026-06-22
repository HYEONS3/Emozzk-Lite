const BADGE_CLASS = 'emzk-lite-badge';
const BADGE_SHORTCUT_CLASS = 'emzk-lite-badge-shortcut';
const BADGE_UNLINK_CLASS = 'emzk-lite-badge-unlink';

const BADGE_TARGET_ATTR = 'data-emzk-lite-badge-target';
const BADGE_LABEL_ATTR = 'data-emzk-lite-badge-label';
const BADGE_TYPE_ATTR = 'data-emzk-lite-badge-type';
const BADGE_RENDER_KEY_ATTR = 'data-emzk-lite-badge-render-key';

const BADGE_TYPE_SHORTCUT = 'shortcut';
const BADGE_TYPE_UNLINK = 'unlink';

const DEFAULT_BADGE_LABELS = [
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

export function renderEmoteBadges(input = {}) {
  if (isLegacyButtonsInput(input)) {
    renderShortcutBadges({
      buttons: input,
      labels: DEFAULT_BADGE_LABELS,
    });

    return;
  }

  const panel = input?.panel ?? null;
  const assignments = normalizeAssignments(input?.assignments);

  renderAssignmentBadges({
    panel,
    assignments,
  });
}

export function renderShortcutBadges({
  buttons,
  labels = DEFAULT_BADGE_LABELS,
} = {}) {
  const normalizedLabels = normalizeLabels(labels);

  const targetButtons = normalizeButtons(buttons)
    .slice(0, normalizedLabels.length);

  const targetButtonSet = new Set(targetButtons);

  removeStaleBadges(targetButtonSet);

  targetButtons.forEach((button, index) => {
    const label = normalizedLabels[index];

    if (!label) {
      removeBadge(button);
      return;
    }

    ensureBadge({
      button,
      label,
      title: label,
      badgeType: BADGE_TYPE_SHORTCUT,
    });
  });
}

export function clearEmoteBadges() {
  getBadgeTargetButtons().forEach((button) => {
    removeBadge(button);
  });
}

function renderAssignmentBadges({
  panel,
  assignments,
}) {
  if (!panel) {
    clearEmoteBadges();
    return;
  }

  const badgeTargets = getBadgeTargetsFromAssignments({
    panel,
    assignments,
  });

  const targetButtonSet = new Set(
    badgeTargets.map((target) => target.button)
  );

  removeStaleBadges(targetButtonSet);

  badgeTargets.forEach((target) => {
    ensureBadge({
      button: target.button,
      label: target.label,
      title: target.title,
      badgeType: target.badgeType,
    });
  });
}

function getBadgeTargetsFromAssignments({
  panel,
  assignments,
}) {
  const assignmentMap = createAssignmentMap(assignments);
  const buttons = getAssignableBadgeButtons(panel);
  const result = [];
  const usedEmojiIds = new Set();

  buttons.forEach((button) => {
    const emojiId = getEmojiIdFromButton(button);

    if (!emojiId) return;
    if (usedEmojiIds.has(emojiId)) return;

    const assignment = assignmentMap.get(emojiId);

    if (!assignment) return;

    if (
      assignment.badgeType === BADGE_TYPE_SHORTCUT &&
      !assignment.label
    ) {
      return;
    }

    usedEmojiIds.add(emojiId);

    result.push({
      button,
      emojiId,
      label: assignment.label,
      title: assignment.title,
      badgeType: assignment.badgeType,
    });
  });

  return result;
}

function createAssignmentMap(assignments) {
  const map = new Map();

  assignments.forEach((assignment) => {
    const emojiId = normalizeEmojiId(assignment?.emojiId);
    const label = normalizeLabel(assignment?.label);
    const title = normalizeLabel(assignment?.title);
    const badgeType = normalizeBadgeType(assignment?.badgeType);

    if (!emojiId) return;

    /*
     * shortcut badge는 label이 필요하다.
     * unlink badge는 icon-only이므로 label 없이도 렌더한다.
     */
    if (
      badgeType === BADGE_TYPE_SHORTCUT &&
      !label
    ) {
      return;
    }

    if (map.has(emojiId)) return;

    map.set(emojiId, {
      ...assignment,
      emojiId,
      label,
      title,
      badgeType,
    });
  });

  return map;
}

function getAssignableBadgeButtons(panel) {
  if (!panel) return [];

  return Array.from(
    panel.querySelectorAll('button[type="button"]')
  ).filter((button) => {
    return (
      button instanceof HTMLElement &&
      button.isConnected &&
      Boolean(getEmojiIdFromButton(button))
    );
  });
}

function getEmojiIdFromButton(button) {
  const alt = getEmoteAltFromButton(button);

  return getEmojiIdFromAlt(alt);
}

function getEmoteAltFromButton(button) {
  const image = button?.querySelector?.('img');

  return image?.getAttribute('alt') ?? '';
}

function getEmojiIdFromAlt(alt) {
  const match = String(alt ?? '').match(/^\{:([^:]+):\}$/);

  return match?.[1] ?? '';
}

function removeStaleBadges(targetButtonSet) {
  getBadgeTargetButtons().forEach((button) => {
    if (!targetButtonSet.has(button)) {
      removeBadge(button);
    }
  });
}

function ensureBadge({
  button,
  label = '',
  title = '',
  badgeType = BADGE_TYPE_SHORTCUT,
}) {
  if (!(button instanceof HTMLElement)) return;

  const normalizedLabel = normalizeLabel(label);
  const normalizedTitle = normalizeLabel(title) || normalizedLabel;
  const normalizedBadgeType = normalizeBadgeType(badgeType);

  if (
    normalizedBadgeType === BADGE_TYPE_SHORTCUT &&
    !normalizedLabel
  ) {
    removeBadge(button);
    return;
  }

  button.setAttribute(BADGE_TARGET_ATTR, 'true');
  button.setAttribute(BADGE_LABEL_ATTR, normalizedTitle);
  button.setAttribute(BADGE_TYPE_ATTR, normalizedBadgeType);

  let badge = getDirectBadge(button);

  if (!badge) {
    badge = document.createElement('span');
    badge.className = BADGE_CLASS;
    badge.setAttribute('aria-hidden', 'true');

    button.appendChild(badge);
  }

  badge.classList.toggle(
    BADGE_SHORTCUT_CLASS,
    normalizedBadgeType === BADGE_TYPE_SHORTCUT
  );

  badge.classList.toggle(
    BADGE_UNLINK_CLASS,
    normalizedBadgeType === BADGE_TYPE_UNLINK
  );

  if (normalizedTitle) {
    badge.setAttribute('title', normalizedTitle);
  } else {
    badge.removeAttribute('title');
  }

  const renderKey = createBadgeRenderKey({
    badgeType: normalizedBadgeType,
    label: normalizedLabel,
  });

  if (badge.getAttribute(BADGE_RENDER_KEY_ATTR) === renderKey) {
    return;
  }

  badge.setAttribute(BADGE_RENDER_KEY_ATTR, renderKey);

  renderBadgeContent({
    badge,
    label: normalizedLabel,
    badgeType: normalizedBadgeType,
  });
}

function renderBadgeContent({
  badge,
  label,
  badgeType = BADGE_TYPE_SHORTCUT,
}) {
  badge.replaceChildren();

  if (badgeType === BADGE_TYPE_UNLINK) {
    badge.appendChild(createUnlinkIcon());
    return;
  }

  const parts = parseBadgeLabel(label);

  const codeNode = document.createElement('span');

  codeNode.className = 'emzk-lite-badge-code';
  codeNode.textContent = parts.code;

  badge.appendChild(codeNode);

  if (parts.phase) {
    badge.appendChild(createPhaseIcon(parts.phase));
  }

  if (parts.extraCount > 0) {
    const extraNode = document.createElement('span');

    extraNode.className = 'emzk-lite-badge-extra';
    extraNode.textContent = `+${parts.extraCount}`;

    badge.appendChild(extraNode);
  }
}

function createPhaseIcon(phase) {
  const normalizedPhase = normalizeBadgePhase(phase);

  if (normalizedPhase === 'up') {
    return createUpPhaseIcon();
  }

  if (normalizedPhase === 'both') {
    return createBothPhaseIcon();
  }

  return createDownPhaseIcon();
}

function createDownPhaseIcon() {
  const svg = createSvgElement({
    className: 'emzk-lite-badge-phase-icon',
    width: 8,
    height: 8,
    viewBox: '0 0 8 8',
  });

  appendFillPath(svg, 'M3 1H5V4H7L4 7L1 4H3Z');

  return svg;
}

function createUpPhaseIcon() {
  const svg = createSvgElement({
    className: 'emzk-lite-badge-phase-icon',
    width: 8,
    height: 8,
    viewBox: '0 0 8 8',
  });

  appendFillPath(svg, 'M4 1L7 4H5V7H3V4H1Z');

  return svg;
}

function createBothPhaseIcon() {
  const svg = createSvgElement({
    className: 'emzk-lite-badge-phase-icon emzk-lite-badge-phase-icon-both',
    width: 12,
    height: 8,
    viewBox: '0 0 12 8',
  });

  appendFillPath(svg, 'M1 3L3.5 0.5L6 3H4.5V7H2.5V3Z');
  appendFillPath(svg, 'M6 5L8.5 7.5L11 5H9.5V1H7.5V5Z');

  return svg;
}

function createUnlinkIcon() {
  const svg = createSvgElement({
    className: 'emzk-lite-badge-unlink-icon',
    width: 14,
    height: 14,
    viewBox: '0 0 14 14',
  });

  appendStrokePath(
    svg,
    'M5.1 7.3L3.8 8.6A2.4 2.4 0 0 0 7.2 12L8.5 10.7'
  );

  appendStrokePath(
    svg,
    'M8.9 6.7L10.2 5.4A2.4 2.4 0 0 0 6.8 2L5.5 3.3'
  );

  appendStrokePath(
    svg,
    'M2.2 2.2L11.8 11.8'
  );

  return svg;
}

function createSvgElement({
  className,
  width,
  height,
  viewBox,
}) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

  svg.setAttribute('class', className);
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  return svg;
}

function appendFillPath(svg, d) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

  path.setAttribute('d', d);
  path.setAttribute('fill', 'currentColor');

  svg.appendChild(path);
}

function appendStrokePath(svg, d) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

  path.setAttribute('d', d);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.6');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');

  svg.appendChild(path);
}

function normalizeBadgePhase(phase) {
  const value = String(phase || '').trim();

  if (value === '↑' || value === 'up') {
    return 'up';
  }

  if (value === '↓↑' || value === 'both') {
    return 'both';
  }

  return 'down';
}

function parseBadgeLabel(label) {
  const text = normalizeLabel(label);
  const extraMatch = text.match(/\s\+(\d+)$/);
  const extraCount = extraMatch
    ? Number(extraMatch[1]) || 0
    : 0;

  const mainLabel = extraMatch
    ? text.slice(0, extraMatch.index).trim()
    : text;

  if (mainLabel.endsWith('↓↑')) {
    return {
      code: mainLabel.slice(0, -2).trim(),
      phase: 'both',
      extraCount,
    };
  }

  if (mainLabel.endsWith('↑')) {
    return {
      code: mainLabel.slice(0, -1).trim(),
      phase: 'up',
      extraCount,
    };
  }

  if (mainLabel.endsWith('↓')) {
    return {
      code: mainLabel.slice(0, -1).trim(),
      phase: 'down',
      extraCount,
    };
  }

  return {
    code: mainLabel,
    phase: '',
    extraCount,
  };
}

function removeBadge(button) {
  if (!(button instanceof HTMLElement)) return;

  const badge = getDirectBadge(button);

  if (badge) {
    badge.remove();
  }

  button.removeAttribute(BADGE_TARGET_ATTR);
  button.removeAttribute(BADGE_LABEL_ATTR);
  button.removeAttribute(BADGE_TYPE_ATTR);
}

function getDirectBadge(button) {
  if (!(button instanceof HTMLElement)) return null;

  return button.querySelector(`:scope > .${BADGE_CLASS}`);
}

function getBadgeTargetButtons() {
  return Array.from(
    document.querySelectorAll(`[${BADGE_TARGET_ATTR}="true"]`)
  ).filter((button) => {
    return button instanceof HTMLElement;
  });
}

function normalizeButtons(buttons) {
  if (!buttons) return [];

  const seen = new Set();
  const result = [];

  Array.from(buttons).forEach((button) => {
    if (!(button instanceof HTMLElement)) return;
    if (!button.isConnected) return;
    if (seen.has(button)) return;

    seen.add(button);
    result.push(button);
  });

  return result;
}

function normalizeAssignments(assignments) {
  if (!Array.isArray(assignments)) {
    return [];
  }

  return assignments
    .map((assignment) => {
      const badgeType = normalizeBadgeType(assignment?.badgeType);

      return {
        ...assignment,
        emojiId: normalizeEmojiId(assignment?.emojiId),
        label: normalizeLabel(assignment?.label),
        title: normalizeLabel(assignment?.title),
        badgeType,
      };
    })
    .filter((assignment) => {
      if (!assignment.emojiId) {
        return false;
      }

      if (assignment.badgeType === BADGE_TYPE_UNLINK) {
        return true;
      }

      return Boolean(assignment.label);
    });
}

function normalizeLabels(labels) {
  if (!Array.isArray(labels)) {
    return DEFAULT_BADGE_LABELS;
  }

  return labels
    .map(normalizeLabel)
    .filter(Boolean);
}

function normalizeEmojiId(value) {
  return String(value ?? '').trim();
}

function normalizeLabel(value) {
  return String(value ?? '').trim();
}

function normalizeBadgeType(value) {
  if (value === BADGE_TYPE_UNLINK) {
    return BADGE_TYPE_UNLINK;
  }

  return BADGE_TYPE_SHORTCUT;
}

function createBadgeRenderKey({
  badgeType,
  label,
}) {
  if (badgeType === BADGE_TYPE_UNLINK) {
    return BADGE_TYPE_UNLINK;
  }

  return `${BADGE_TYPE_SHORTCUT}:${label}`;
}

function isLegacyButtonsInput(input) {
  if (!input) return false;

  if (Array.isArray(input)) {
    return true;
  }

  if (typeof NodeList !== 'undefined' && input instanceof NodeList) {
    return true;
  }

  if (typeof HTMLCollection !== 'undefined' && input instanceof HTMLCollection) {
    return true;
  }

  return false;
}