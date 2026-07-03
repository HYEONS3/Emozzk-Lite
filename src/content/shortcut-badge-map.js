import {
  getAssignableEmoteButtons,
  getEmoteIdFromButton,
} from './emote-buttons.js';

import {
  SHORTCUT_ACTION_SELECT_EMOTE,
  SHORTCUT_TARGET_TYPE_EMOJI_ID,
  SHORTCUT_TARGET_TYPE_INDEX,
} from './shortcut-bindings.js';

import {
  getCachedShortcutBindings,
  SHORTCUT_PHASE_BOTH,
  SHORTCUT_PHASE_DOWN,
  SHORTCUT_PHASE_UP,
} from './shortcut-storage.js';

import {
  getShortcutCodeLabel,
  normalizeStoredShortcutCode,
} from '../shared/shortcut-key-code.js';

export function getShortcutBadgeAssignments(panel) {
  const bindings = getCachedShortcutBindings();

  return getShortcutBadgeAssignmentsFromBindings({
    bindings,
    panel,
  });
}

export function getShortcutBadgeAssignmentsFromBindings({
  bindings,
  panel,
}) {
  if (!panel) {
    return [];
  }

  if (!Array.isArray(bindings)) {
    return [];
  }

  const buttons = getAssignableEmoteButtons(panel);

  if (!Array.isArray(buttons) || !buttons.length) {
    return [];
  }

  const rawAssignments = [];

  bindings.forEach((binding) => {
    collectBadgeAssignmentsFromBinding({
      rawAssignments,
      binding,
      buttons,
    });
  });

  return groupShortcutBadgeAssignments(rawAssignments);
}

export function getShortcutBadgeLabel({
  code,
  phase,
}) {
  const normalizedCode = normalizeCode(code);
  const normalizedPhase = normalizePhase(phase);
  const codeLabel = getShortcutCodeLabel(normalizedCode);

  if (!codeLabel) return '';

  if (normalizedPhase === SHORTCUT_PHASE_BOTH) {
    return `${codeLabel}↓↑`;
  }

  if (normalizedPhase === SHORTCUT_PHASE_UP) {
    return `${codeLabel}↑`;
  }

  return `${codeLabel}↓`;
}

export function findShortcutBadgeAssignmentByEmojiId({
  emojiId,
  panel,
}) {
  const normalizedEmojiId = normalizeEmojiId(emojiId);

  if (!normalizedEmojiId) return null;

  return getShortcutBadgeAssignments(panel).find((assignment) => {
    return assignment.emojiId === normalizedEmojiId;
  }) ?? null;
}

export function findShortcutBadgeAssignmentsByEmojiId({
  emojiId,
  panel,
}) {
  const normalizedEmojiId = normalizeEmojiId(emojiId);

  if (!normalizedEmojiId) return [];

  const assignment = findShortcutBadgeAssignmentByEmojiId({
    emojiId: normalizedEmojiId,
    panel,
  });

  return assignment?.items ? [...assignment.items] : [];
}

export function hasShortcutBadgeAssignment({
  emojiId,
  panel,
}) {
  return Boolean(findShortcutBadgeAssignmentByEmojiId({
    emojiId,
    panel,
  }));
}

function collectBadgeAssignmentsFromBinding({
  rawAssignments,
  binding,
  buttons,
}) {
  /*
   * 새 저장 구조:
   * {
   *   code,
   *   phase,
   *   actionConfig
   * }
   */
  collectBadgeAssignment({
    rawAssignments,
    binding,
    actionConfig: binding?.actionConfig,
    code: binding?.code,
    phase: binding?.phase,
    buttons,
  });

  /*
   * 기존/호환 구조:
   * {
   *   trigger: { code, ctrl, alt, shift, meta },
   *   onDown,
   *   onUp
   * }
   */
  const legacyCode = getShortcutCodeFromLegacyTrigger(binding?.trigger);

  collectBadgeAssignment({
    rawAssignments,
    binding,
    actionConfig: binding?.onDown,
    code: legacyCode,
    phase: SHORTCUT_PHASE_DOWN,
    buttons,
  });

  collectBadgeAssignment({
    rawAssignments,
    binding,
    actionConfig: binding?.onUp,
    code: legacyCode,
    phase: SHORTCUT_PHASE_UP,
    buttons,
  });
}

function collectBadgeAssignment({
  rawAssignments,
  binding,
  actionConfig,
  code,
  phase,
  buttons,
}) {
  if (!isSelectEmoteAction(actionConfig)) {
    return;
  }

  const normalizedCode = normalizeCode(code);
  const normalizedPhase = normalizeStoragePhase(phase);

  if (
    !normalizedCode ||
    !normalizedPhase
  ) {
    return;
  }

  const assignment = createRawBadgeAssignment({
    code: normalizedCode,
    phase: normalizedPhase,
    actionArgs: getActionArgs(actionConfig),
    buttons,
    binding,
  });

  if (!assignment) {
    return;
  }

  rawAssignments.push(assignment);
}

function createRawBadgeAssignment({
  code,
  phase,
  actionArgs,
  buttons,
  binding,
}) {
  if (!actionArgs || typeof actionArgs !== 'object') {
    return null;
  }

  const directEmojiId = getDirectEmojiIdFromActionArgs(actionArgs);

  if (directEmojiId) {
    return {
      emojiId: directEmojiId,
      code,
      phase,
      source: SHORTCUT_TARGET_TYPE_EMOJI_ID,
      binding,
    };
  }

  const indexEmojiId = getIndexEmojiIdFromActionArgs({
    actionArgs,
    buttons,
  });

  if (indexEmojiId) {
    return {
      emojiId: indexEmojiId,
      code,
      phase,
      source: SHORTCUT_TARGET_TYPE_INDEX,
      binding,
    };
  }

  return null;
}

function groupShortcutBadgeAssignments(rawAssignments) {
  const grouped = new Map();

  rawAssignments.forEach((assignment) => {
    const emojiId = normalizeEmojiId(assignment.emojiId);
    const code = normalizeCode(assignment.code);
    const phase = normalizeStoragePhase(assignment.phase);

    if (
      !emojiId ||
      !code ||
      !phase
    ) {
      return;
    }

    if (!grouped.has(emojiId)) {
      grouped.set(emojiId, {
        emojiId,
        directItems: [],
        indexItems: [],
      });
    }

    const group = grouped.get(emojiId);
    const item = {
      ...assignment,
      emojiId,
      code,
      phase,
      label: getShortcutBadgeLabel({
        code,
        phase,
      }),
    };

    if (assignment.source === SHORTCUT_TARGET_TYPE_EMOJI_ID) {
      group.directItems.push(item);
    } else {
      group.indexItems.push(item);
    }
  });

  return Array.from(grouped.values())
    .map(createGroupedBadgeAssignment)
    .filter(Boolean);
}

function createGroupedBadgeAssignment(group) {
  const sourceItems = group.directItems.length
    ? group.directItems
    : group.indexItems;

  const items = mergePhaseItems(sourceItems);

  if (!items.length) {
    return null;
  }

  const primaryItem = items[0];
  const extraCount = items.length - 1;
  const label = extraCount > 0
    ? `${primaryItem.label} +${extraCount}`
    : primaryItem.label;

	return {
		emojiId: group.emojiId,
		label,
		title: getShortcutBadgeTitle(items),
		code: primaryItem.code,
		phase: primaryItem.phase,
		source: primaryItem.source,
		items,
		detailLabels: getShortcutBadgeDetailLabels(items),
	};
}

function getShortcutBadgeTitle(items) {
  return items
    .map((item) => item.label)
    .filter(Boolean)
    .join('\n');
}

function getShortcutBadgeDetailLabels(items) {
  return items
    .map((item) => item.label)
    .filter(Boolean);
}

function mergePhaseItems(items) {
  const byCode = new Map();

  items.forEach((item) => {
    const code = normalizeCode(item.code);
    const phase = normalizeStoragePhase(item.phase);

    if (
      !code ||
      !phase
    ) {
      return;
    }

    if (!byCode.has(code)) {
      byCode.set(code, {
        code,
        phases: new Set(),
        source: item.source,
        binding: item.binding,
      });
    }

    byCode.get(code).phases.add(phase);
  });

  return Array.from(byCode.values())
    .map((entry) => {
      const phase = getMergedPhase(entry.phases);
      const label = getShortcutBadgeLabel({
        code: entry.code,
        phase,
      });

      if (!label) {
        return null;
      }

      return {
        code: entry.code,
        phase,
        label,
        source: entry.source,
        binding: entry.binding,
      };
    })
    .filter(Boolean);
}

function getMergedPhase(phases) {
  if (
    phases.has(SHORTCUT_PHASE_DOWN) &&
    phases.has(SHORTCUT_PHASE_UP)
  ) {
    return SHORTCUT_PHASE_BOTH;
  }

  if (phases.has(SHORTCUT_PHASE_UP)) {
    return SHORTCUT_PHASE_UP;
  }

  return SHORTCUT_PHASE_DOWN;
}

function getActionArgs(actionConfig) {
  if (!actionConfig || typeof actionConfig !== 'object') {
    return null;
  }

  if (
    actionConfig.actionArgs &&
    typeof actionConfig.actionArgs === 'object'
  ) {
    return actionConfig.actionArgs;
  }

  if (
    actionConfig.args &&
    typeof actionConfig.args === 'object'
  ) {
    return actionConfig.args;
  }

  if (
    actionConfig.target &&
    typeof actionConfig.target === 'object'
  ) {
    return actionConfig.target;
  }

  return actionConfig;
}

function getDirectEmojiIdFromActionArgs(actionArgs) {
  const targetType = getActionTargetType(actionArgs);

  if (
    targetType === SHORTCUT_TARGET_TYPE_EMOJI_ID ||
    (!targetType && 'emojiId' in actionArgs)
  ) {
    return normalizeEmojiId(actionArgs.emojiId);
  }

  return '';
}

function getIndexEmojiIdFromActionArgs({
  actionArgs,
  buttons,
}) {
  const targetType = getActionTargetType(actionArgs);

  if (
    targetType !== SHORTCUT_TARGET_TYPE_INDEX &&
    !(!targetType && 'index' in actionArgs)
  ) {
    return '';
  }

  const index = normalizeIndex(actionArgs.index);

  if (index < 0) {
    return '';
  }

  const button = buttons[index];

  if (!button) {
    return '';
  }

  return normalizeEmojiId(getEmoteIdFromButton(button));
}

function getShortcutCodeFromLegacyTrigger(trigger) {
  if (!trigger || typeof trigger !== 'object') {
    return '';
  }

  const code = normalizeCode(trigger.code);

  if (!code) {
    return '';
  }

  return normalizeStoredShortcutCode([
    trigger.ctrl ? 'Ctrl' : '',
    trigger.alt ? 'Alt' : '',
    trigger.shift ? 'Shift' : '',
    trigger.meta ? 'Meta' : '',
    code,
  ]
    .filter(Boolean)
    .join('+'));
}

function isSelectEmoteAction(actionConfig) {
  return (
    actionConfig &&
    typeof actionConfig === 'object' &&
    (
      actionConfig.action === SHORTCUT_ACTION_SELECT_EMOTE ||
      actionConfig.type === SHORTCUT_ACTION_SELECT_EMOTE
    )
  );
}

function normalizePhase(phase) {
  if (phase === SHORTCUT_PHASE_BOTH) {
    return SHORTCUT_PHASE_BOTH;
  }

  if (phase === SHORTCUT_PHASE_UP) {
    return SHORTCUT_PHASE_UP;
  }

  return SHORTCUT_PHASE_DOWN;
}

function normalizeStoragePhase(phase) {
  if (phase === SHORTCUT_PHASE_UP) {
    return SHORTCUT_PHASE_UP;
  }

  return SHORTCUT_PHASE_DOWN;
}

function normalizeCode(value) {
  return normalizeStoredShortcutCode(value);
}

function normalizeEmojiId(value) {
  return String(value ?? '').trim();
}

function normalizeIndex(value) {
  const number = Number(value);

  if (!Number.isInteger(number)) return -1;
  if (number < 0) return -1;

  return number;
}

function getActionTargetType(actionArgs) {
  const targetType = String(actionArgs?.targetType ?? '').trim();

  if (
    targetType === SHORTCUT_TARGET_TYPE_EMOJI_ID ||
    targetType === SHORTCUT_TARGET_TYPE_INDEX
  ) {
    return targetType;
  }

  const type = String(actionArgs?.type ?? '').trim();

  if (
    type === SHORTCUT_TARGET_TYPE_EMOJI_ID ||
    type === SHORTCUT_TARGET_TYPE_INDEX
  ) {
    return type;
  }

  return '';
}