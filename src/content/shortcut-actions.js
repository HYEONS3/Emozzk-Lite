import {
  quickInsertEmoteByTarget,
} from './quick-emote-insert.js';

import {
  SHORTCUT_ACTION_SELECT_EMOTE,
  isShortcutActionEnabled,
} from './shortcut-bindings.js';

export function executeShortcutAction({
  actionConfig,
} = {}) {
  if (!isShortcutActionEnabled(actionConfig)) {
    return false;
  }

  if (getShortcutActionType(actionConfig) !== SHORTCUT_ACTION_SELECT_EMOTE) {
    return false;
  }

  return executeSelectEmoteAction({
    actionConfig,
  });
}

function executeSelectEmoteAction({
  actionConfig,
}) {
  const actionArgs = getShortcutActionArgs(actionConfig);

  if (!actionArgs) {
    return false;
  }

  return Boolean(
    quickInsertEmoteByTarget(actionArgs)
  );
}

function getShortcutActionType(actionConfig) {
  return String(
    actionConfig?.action ||
    actionConfig?.type ||
    ''
  ).trim();
}

function getShortcutActionArgs(actionConfig) {
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