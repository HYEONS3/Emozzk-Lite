import {
  quickInsertEmoteByTarget,
} from './quick-emote-insert.js';

import {
  SHORTCUT_ACTION_SELECT_EMOTE,
  isShortcutActionEnabled,
} from './shortcut-bindings.js';

export function executeShortcutAction({
  actionConfig,
  binding = null,
  phase = '',
  nativeEvent = null,
} = {}) {
  if (!isExecutableShortcutAction(actionConfig)) {
    return false;
  }

  switch (actionConfig.action || actionConfig.type) {
    case SHORTCUT_ACTION_SELECT_EMOTE:
      return executeSelectEmoteAction({
        actionConfig,
        binding,
        phase,
        nativeEvent,
      });

    default:
      console.debug('[Emozzk Lite] unknown shortcut action:', {
        action: actionConfig.action || actionConfig.type,
        bindingId: binding?.id ?? '',
        phase,
      });

      return false;
  }
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

function isExecutableShortcutAction(actionConfig) {
  if (isShortcutActionEnabled(actionConfig)) {
    return true;
  }

  /*
   * 방어용:
   * shortcut-bindings.js에서 정규화되기 전 구조가 들어와도
   * selectEmote 계열이면 실행 가능하게 둔다.
   */
  if (!actionConfig || typeof actionConfig !== 'object') {
    return false;
  }

  return (
    actionConfig.action === SHORTCUT_ACTION_SELECT_EMOTE ||
    actionConfig.type === SHORTCUT_ACTION_SELECT_EMOTE
  );
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

  return null;
}