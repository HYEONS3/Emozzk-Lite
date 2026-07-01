import {
  isTypingTarget,
} from './shortcut-guard.js';

import {
  openEmotePanel,
  closeEmotePanel,
} from './emote-trigger.js';

import {
  findEmotePanel,
} from './emote-panel.js';

import {
  scheduleBadgeUpdate,
} from './badge-overlay.js';

import {
  findChatInput,
  scheduleChatInputFocus,
} from './chat-input.js';

import {
  waitForEmotePanelReady,
} from './emote-panel-ready.js';

import {
  scheduleFavoriteEmoteSectionRender,
} from './emote-favorites-render.js';

import {
  isSameShortcutTrigger,
  normalizeShortcutBinding,
} from './shortcut-bindings.js';

import {
  executeShortcutAction,
} from './shortcut-actions.js';

import {
  getCachedActiveShortcutBindingSetId,
  getCachedShortcutBindings,
  SHORTCUT_BINDINGS_CHANGED_EVENT,
  SHORTCUT_PHASE_DOWN,
  SHORTCUT_PHASE_UP,
} from './shortcut-storage.js';

import {
  EMOTE_BIND_MODE_RENAME,
  exitEmoteBindMode,
  getEmoteBindModeState,
  isEmoteBindModeActive,
} from './emote-bind-mode-state.js';

import {
  isChatInputEmoteLimitReached,
} from './chat-input-emote-limit.js';

import {
  getShortcutCodeFromKeyboardEvent,
  isImeKeyboardEvent,
  normalizeStoredShortcutCode,
} from './shortcut-key-code.js';

const EVENT_PHASE_KEYDOWN = 'keydown';
const EVENT_PHASE_KEYUP = 'keyup';

const activePresses = new Map();

let attached = false;
let shortcutBindings = [];
let activeShortcutBindingSetId = '';
let suppressNextRenameEscapeKeyUp = false;

export function attachShortcutController() {
  if (attached) return;

  attached = true;

  syncShortcutBindingsFromStorage();

  document.addEventListener(EVENT_PHASE_KEYDOWN, handleShortcutEvent, true);
  document.addEventListener(EVENT_PHASE_KEYUP, handleShortcutEvent, true);

  window.addEventListener('blur', clearActivePresses, true);

  window.addEventListener(
    SHORTCUT_BINDINGS_CHANGED_EVENT,
    handleShortcutBindingsChanged
  );
}

export function detachShortcutController() {
  if (!attached) return;

  attached = false;

  document.removeEventListener(EVENT_PHASE_KEYDOWN, handleShortcutEvent, true);
  document.removeEventListener(EVENT_PHASE_KEYUP, handleShortcutEvent, true);

  window.removeEventListener('blur', clearActivePresses, true);

  window.removeEventListener(
    SHORTCUT_BINDINGS_CHANGED_EVENT,
    handleShortcutBindingsChanged
  );

  clearActivePresses();
}

export function setShortcutBindings(bindings, {
  activeSetId = activeShortcutBindingSetId,
} = {}) {
  /*
  * 사용자 설정에서는 "단축키 없음"도 유효한 상태다.
  * bindings가 배열이 아니면 빈 단축키 목록으로 처리한다.
  */
	if (!Array.isArray(bindings)) {
		shortcutBindings = [];
	} else {
		shortcutBindings = bindings
			.map(normalizeControllerBinding)
			.filter(Boolean);
	}

  activeShortcutBindingSetId = normalizeText(activeSetId);

  /*
   * 세트 전환 중 키를 누른 상태였다면 이전 세트의 keyup action이 이어지면 안 된다.
   */
  clearActivePresses();
}

function syncShortcutBindingsFromStorage() {
  setShortcutBindings(getCachedShortcutBindings(), {
    activeSetId: getCachedActiveShortcutBindingSetId(),
  });
}

function handleShortcutEvent(event) {
  const phase = event.type;

  if (
    phase !== EVENT_PHASE_KEYDOWN &&
    phase !== EVENT_PHASE_KEYUP
  ) {
    return;
  }
  /*
   * rename 모드의 Escape는 CHZZK 패널 닫기보다 먼저 차단한다.
   */
		if (handleSuppressedRenameEscapeKeyUp(event)) {
		return;
	}

	if (handleRenameModeShortcutEvent(event)) {
		return;
	}
	if (isEmoteBindModeActive()) {
		return;
	}

  /*
   * 한글 IME 조합 입력은 Emozzk 단축키로 처리하지 않는다.
   * event.code가 KeyQ처럼 들어와도 key=Process/keyCode=229면 무시한다.
   */
  if (isImeKeyboardEvent(event)) {
    clearActivePressForEvent(event);
    return;
  }

  if (phase === EVENT_PHASE_KEYUP) {
    handleShortcutKeyUp({
      event,
    });

    return;
  }

  if (event.defaultPrevented) {
    return;
  }

	const state = getShortcutContext(event);

	if (state.isNonChatTyping) {
		return;
	}

	if (handleEscapeCloseShortcut({
		event,
		state,
	})) {
		return;
	}

  if (handleShortcutKeyDown({
    event,
    state,
  })) {
    return;
  }

  handleOpenPanelShortcut({
    event,
    state,
  });
}

function handleRenameModeShortcutEvent(event) {
  const bindState = getEmoteBindModeState();

  if (bindState.mode !== EMOTE_BIND_MODE_RENAME) {
    return false;
  }

  if (
    event.type !== EVENT_PHASE_KEYDOWN ||
    event.code !== 'Escape' ||
    hasAnyModifier(event)
  ) {
    return false;
  }

  suppressNextRenameEscapeKeyUp = true;

  blockKeyboardEvent({
    event,
    binding: null,
  });

  exitEmoteBindMode();
  scheduleBadgeUpdate();

  return true;
}

function handleSuppressedRenameEscapeKeyUp(event) {
  if (!suppressNextRenameEscapeKeyUp) {
    return false;
  }

  if (
    event.type !== EVENT_PHASE_KEYUP ||
    event.code !== 'Escape'
  ) {
    return false;
  }

  suppressNextRenameEscapeKeyUp = false;

  blockKeyboardEvent({
    event,
    binding: null,
  });

  return true;
}

function handleShortcutKeyDown({
  event,
  state,
}) {
  const downBinding = findMatchedShortcutBindingForPhase({
    event,
    storagePhase: SHORTCUT_PHASE_DOWN,
  });

  const upBinding = findMatchedShortcutBindingForPhase({
    event,
    storagePhase: SHORTCUT_PHASE_UP,
  });

  if (
    !downBinding &&
    !upBinding
  ) {
    return false;
  }

  const primaryBinding = downBinding || upBinding;

  if (!isShortcutBindingAllowedInState({
    binding: primaryBinding,
    state,
  })) {
    return false;
  }

  /*
   * 채팅 입력창에 이미 이모티콘이 10개 있으면 추가 단축키 입력은 조용히 차단한다.
   * 브라우저 기본 동작이나 실제 키 입력이 새지 않도록 이벤트는 막는다.
   */
  if (isChatInputEmoteLimitReached()) {
    blockKeyboardEvent({
      event,
      binding: primaryBinding,
    });

    return true;
  }

  /*
   * keyup-only binding도 keydown 시점에서 막아야 한다.
   * 그래야 실제 키 입력이 채팅창/페이지에 새지 않는다.
   */
  if (
    shouldBlockBindingPhase({
      binding: primaryBinding,
      phase: EVENT_PHASE_KEYDOWN,
    })
  ) {
    blockKeyboardEvent({
      event,
      binding: primaryBinding,
    });
  }

  const pressKey = getActivePressKeyFromEvent(event);

  if (!pressKey) {
    return true;
  }

  /*
   * keydown 반복 입력 방지.
   * 이미 activePress가 있으면 action을 다시 실행하지 않는다.
   */
  if (activePresses.has(pressKey)) {
    return true;
  }

  if (event.repeat && primaryBinding?.options?.allowRepeat !== true) {
    return true;
  }

  let downHandled = false;

  if (downBinding) {
    downHandled = executeShortcutAction({
      actionConfig: getActionConfigForStoragePhase({
        binding: downBinding,
        storagePhase: SHORTCUT_PHASE_DOWN,
      }),
      binding: downBinding,
      phase: EVENT_PHASE_KEYDOWN,
      nativeEvent: event,
    });
  }

  /*
   * upBinding이 있으면 keyup에서 이어받을 수 있도록 기록한다.
   * ↓↑는 storage에서 downBinding + upBinding으로 나뉘므로 여기서 자연스럽게 처리된다.
   */
  if (downHandled || upBinding) {
    activePresses.set(pressKey, {
      downBinding,
      upBinding,
    });
  }

  return true;
}

function handleShortcutKeyUp({
  event,
}) {
  const pressKey = getActivePressKeyFromEvent(event);

  if (!pressKey) return;

  const activePress = activePresses.get(pressKey);

  if (activePress) {
    activePresses.delete(pressKey);

    handleActiveShortcutKeyUp({
      event,
      activePress,
    });

    return;
  }

  /*
   * 예외적 상황:
   * keydown을 놓쳤지만 keyup binding만 존재하는 경우를 방어한다.
   */
  handleLooseShortcutKeyUp({
    event,
  });
}

function handleActiveShortcutKeyUp({
  event,
  activePress,
}) {
  const {
    upBinding,
  } = activePress;

  if (!upBinding) {
    return;
  }

  if (isChatInputEmoteLimitReached()) {
    blockKeyboardEvent({
      event,
      binding: upBinding,
    });

    return;
  }

  if (
    shouldBlockBindingPhase({
      binding: upBinding,
      phase: EVENT_PHASE_KEYUP,
    })
  ) {
    blockKeyboardEvent({
      event,
      binding: upBinding,
    });
  }

  /*
   * keyup은 "현재 focus 상태"가 아니라
   * "이전에 keydown을 Emozzk가 처리했는지"를 기준으로 실행한다.
   *
   * 이유:
   * keydown에서 이모티콘을 클릭하면 focus나 panel 상태가 바뀔 수 있다.
   * 그 상태를 keyup에서 다시 검사하면 정상적인 keyup action이 막힐 수 있다.
   */
  executeShortcutAction({
    actionConfig: getActionConfigForStoragePhase({
      binding: upBinding,
      storagePhase: SHORTCUT_PHASE_UP,
    }),
    binding: upBinding,
    phase: EVENT_PHASE_KEYUP,
    nativeEvent: event,
  });
}

function handleLooseShortcutKeyUp({
  event,
}) {
  const upBinding = findMatchedShortcutBindingForPhase({
    event,
    storagePhase: SHORTCUT_PHASE_UP,
  });

  if (!upBinding) {
    return false;
  }

  const state = getShortcutContext(event);

  if (!isShortcutBindingAllowedInState({
    binding: upBinding,
    state,
  })) {
    return false;
  }

  if (isChatInputEmoteLimitReached()) {
    blockKeyboardEvent({
      event,
      binding: upBinding,
    });

    return true;
  }

  if (
    shouldBlockBindingPhase({
      binding: upBinding,
      phase: EVENT_PHASE_KEYUP,
    })
  ) {
    blockKeyboardEvent({
      event,
      binding: upBinding,
    });
  }

  executeShortcutAction({
    actionConfig: getActionConfigForStoragePhase({
      binding: upBinding,
      storagePhase: SHORTCUT_PHASE_UP,
    }),
    binding: upBinding,
    phase: EVENT_PHASE_KEYUP,
    nativeEvent: event,
  });

  return true;
}

function handleEscapeCloseShortcut({
  event,
  state,
}) {
  if (
    event.code !== 'Escape' ||
    hasAnyModifier(event) ||
    !state.panel
  ) {
    return false;
  }

  blockKeyboardEvent({
    event,
    binding: null,
  });

  const closed = closeEmotePanel();

  if (!closed) {
    console.debug('[Emozzk Lite] failed to close emote panel with Escape');
  }

  scheduleChatInputFocus();
  scheduleBadgeUpdate();

  return true;
}

function handleOpenPanelShortcut({
  event,
  state,
}) {
  if (event.code !== 'KeyE') return false;
  if (hasAnyModifier(event)) return false;
  if (state.isTyping) return false;

  blockKeyboardEvent({
    event,
    binding: null,
  });

  openPanelFromShortcut();

  return true;
}

function findMatchedShortcutBindingForPhase({
  event,
  storagePhase,
}) {
  const eventTrigger = getShortcutTriggerFromEvent(event);

  return shortcutBindings.find((binding) => {
    if (!binding) return false;

    if (isModernShortcutBinding(binding)) {
      return isModernShortcutBindingMatched({
        binding,
        event,
        storagePhase,
      });
    }

    if (!isSameShortcutTrigger(binding?.trigger, eventTrigger)) {
      return false;
    }

    return Boolean(
      getActionConfigForStoragePhase({
        binding,
        storagePhase,
      })
    );
  }) ?? null;
}

function isModernShortcutBinding(binding) {
  return Boolean(
    normalizeStoredShortcutCode(binding?.code) &&
    normalizeStoragePhase(binding?.phase) &&
    binding?.actionConfig
  );
}

function isModernShortcutBindingMatched({
  binding,
  event,
  storagePhase,
}) {
  const eventCode = getShortcutCodeFromKeyboardEvent(event);
  const bindingCode = normalizeStoredShortcutCode(binding?.code);

  if (
    !eventCode ||
    !bindingCode
  ) {
    return false;
  }

  if (bindingCode !== eventCode) {
    return false;
  }

  if (normalizeStoragePhase(binding.phase) !== storagePhase) {
    return false;
  }

  return true;
}

function getActionConfigForStoragePhase({
  binding,
  storagePhase,
}) {
  if (!binding) {
    return null;
  }

  if (isModernShortcutBinding(binding)) {
    return binding.actionConfig;
  }

  if (storagePhase === SHORTCUT_PHASE_UP) {
    return binding.onUp ?? null;
  }

  return binding.onDown ?? null;
}

function getShortcutTriggerFromEvent(event) {
  return {
    code: event.code,
    ctrl: event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
    meta: event.metaKey,
  };
}

function isShortcutBindingAllowedInState({
  binding,
  state,
}) {
  if (!binding) return false;

  /*
   * 패널이 열려 있으면 이모티콘 선택 단축키를 허용한다.
   * 이때 채팅 입력창 focus가 있어도 패널 조작 상태로 본다.
   */
  if (state.panel) {
    return true;
  }

  if (state.isNonChatTyping) {
    return false;
  }

  if (state.isChatTyping) {
    return binding.options?.enabledInChatInput === true;
  }

  return false;
}

function shouldBlockBindingPhase({
  binding,
  phase,
}) {
  if (!binding) {
    return true;
  }

  if (phase === EVENT_PHASE_KEYDOWN) {
    if (binding.interception?.keydown !== undefined) {
      return binding.interception.keydown === true;
    }

    return true;
  }

  if (phase === EVENT_PHASE_KEYUP) {
    if (binding.interception?.keyup !== undefined) {
      return binding.interception.keyup === true;
    }

    return true;
  }

  return false;
}

function blockKeyboardEvent({
  event,
  binding,
}) {
  const options = binding?.options ?? {
    preventDefault: true,
    stopPropagation: true,
  };

  if (options.preventDefault !== false) {
    event.preventDefault();
  }

  if (options.stopPropagation !== false) {
    event.stopPropagation();
    event.stopImmediatePropagation?.();
  }
}

function getShortcutContext(event) {
  const isTyping = isTypingContext(event);
  const isChatTyping = isChatInputContext(event);

  return {
    panel: findEmotePanel(),
    isTyping,
    isChatTyping,
    isNonChatTyping: isTyping && !isChatTyping,
  };
}

function isTypingContext(event) {
  return (
    isTypingTarget(event.target) ||
    isTypingTarget(document.activeElement)
  );
}

function isChatInputContext(event) {
  const chatInput = findChatInput();

  if (!chatInput) return false;

  return (
    containsTarget(chatInput, event.target) ||
    containsTarget(chatInput, document.activeElement)
  );
}

function containsTarget(root, target) {
  if (!(root instanceof Element)) return false;

  const element = getElementFromTarget(target);

  if (!element) return false;

  return root === element || root.contains(element);
}

function getElementFromTarget(target) {
  if (!target) return null;

  if (target instanceof Element) {
    return target;
  }

  if (target instanceof Node) {
    return target.parentElement;
  }

  return null;
}

function hasAnyModifier(event) {
  return (
    event.ctrlKey ||
    event.altKey ||
    event.metaKey ||
    event.shiftKey
  );
}

function clearActivePressForEvent(event) {
  const pressKey = getActivePressKeyFromEvent(event);

  if (!pressKey) return;

  activePresses.delete(pressKey);
}

function openPanelFromShortcut() {
  const opened = openEmotePanel();

  if (!opened) return;

  scheduleChatInputFocus();

  waitForEmotePanelReady()
    .then((readyState) => {
      if (!readyState?.panel) return;

      scheduleFavoriteEmoteSectionRender();
      scheduleChatInputFocus();
      scheduleBadgeUpdate();
    })
    .catch((error) => {
      console.error('[Emozzk Lite] failed to open emote panel:', error);
    });
}

function handleShortcutBindingsChanged(event) {
  const bindings = event?.detail?.bindings;

  if (!Array.isArray(bindings)) {
    return;
  }

  setShortcutBindings(bindings, {
    activeSetId: event?.detail?.activeSetId,
  });

  scheduleBadgeUpdate();
}

function getActivePressKeyFromEvent(event) {
  /*
   * activePress는 physical code 기준으로 관리한다.
   *
   * 이유:
   * keydown 시점과 keyup 시점에 modifier 상태나 focus target이 달라질 수 있다.
   * keyup은 "같은 물리 키를 뗐는지"가 중요하다.
   */
  return String(event?.code || '');
}

function clearActivePresses() {
  activePresses.clear();
  suppressNextRenameEscapeKeyUp = false;
}

function normalizeControllerBinding(binding) {
  const normalizedBinding = normalizeShortcutBinding?.(binding);

  if (normalizedBinding) {
    if (isModernShortcutBinding(normalizedBinding)) {
      return {
        ...normalizedBinding,
        code: normalizeStoredShortcutCode(normalizedBinding.code),
        phase: normalizeStoragePhase(normalizedBinding.phase),
      };
    }

    return normalizedBinding;
  }

  if (isModernShortcutBinding(binding)) {
    return {
      ...binding,
      code: normalizeStoredShortcutCode(binding.code),
      phase: normalizeStoragePhase(binding.phase),
    };
  }

  return null;
}

function normalizeStoragePhase(phase) {
  if (phase === SHORTCUT_PHASE_UP) {
    return SHORTCUT_PHASE_UP;
  }

  return SHORTCUT_PHASE_DOWN;
}

function normalizeText(value) {
  return String(value ?? '').trim();
}