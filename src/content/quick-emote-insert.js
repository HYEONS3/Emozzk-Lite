import {
  openEmotePanel,
} from './emote-trigger.js';

import {
  clickVisibleEmoteById,
  clickVisibleEmoteByIndex,
  getSelectCodeIndex,
} from './emote-buttons.js';

import {
  getReadyEmotePanelState,
  waitForEmotePanelReady,
} from './emote-panel-ready.js';

import {
  focusChatInputAtEnd,
  scheduleChatInputNormalizeAfterEmoteSettle,
} from './chat-input.js';

import {
  scheduleBadgeUpdate,
} from './badge-overlay.js';

import {
  renderFavoriteEmoteSection,
} from './emote-favorites-render.js';

import {
  SHORTCUT_TARGET_TYPE_EMOJI_ID,
  SHORTCUT_TARGET_TYPE_INDEX,
} from './shortcut-bindings.js';

import {
  isChatInputEmoteLimitReached,
} from './chat-input-emote-limit.js';

const INSERT_RETRY_COUNT = 3;
const INSERT_RETRY_DELAY_MS = 35;
const PANEL_OPEN_SETTLE_FRAMES = 1;
const BETWEEN_INSERT_FRAMES = 1;
const MAX_PENDING_ITEMS = 30;

let openingPromise = null;
let insertQueue = [];
let nextInsertItemId = 1;
let isExecutingInsertQueue = false;
let quickInsertClickDepth = 0;

export function isQuickEmoteInsertInProgress() {
  return Boolean(
    isExecutingInsertQueue ||
    insertQueue.length > 0 ||
    quickInsertClickDepth > 0
  );
}

export function quickInsertEmoteByCode(code) {
  const index = getSelectCodeIndex(code);

  if (index < 0) {
    console.debug('[Emozzk Lite] invalid quick insert code:', code);
    return false;
  }

  return quickInsertEmoteByIndex(index);
}

export function quickInsertEmoteByIndex(index) {
  return quickInsertEmoteByTarget({
    targetType: SHORTCUT_TARGET_TYPE_INDEX,
    index,
  });
}

export function quickInsertEmoteById(emojiId) {
  return quickInsertEmoteByTarget({
    targetType: SHORTCUT_TARGET_TYPE_EMOJI_ID,
    emojiId,
  });
}

export function quickInsertEmoteByTarget(actionArgs) {
  /*
   * 10개 제한 도달 상태에서는 queue에도 넣지 않는다.
   * 그래야 이미 꽉 찬 상태에서 단축키를 눌러도 패널 버튼이 깜빡이지 않는다.
   */
  if (isChatInputEmoteLimitReached()) {
    clearInsertQueue();
    scheduleBadgeUpdate();
    return false;
  }

  const target = normalizeInsertTarget(actionArgs);

  if (!target) {
    console.debug('[Emozzk Lite] invalid quick insert target:', actionArgs);
    return false;
  }

  /*
   * 중요:
   * 패널이 이미 열려 있어도 즉시 클릭하지 않는다.
   * 모든 입력은 queue에 먼저 들어가고,
   * executor 1개가 FIFO 순서로만 실제 클릭을 수행한다.
   */
  const item = enqueueInsertItem(target);

  if (!item) {
    return false;
  }

  const readyPanelPromise = ensureEmotePanelReady();

  if (!readyPanelPromise) {
    console.debug('[Emozzk Lite] emote panel could not be opened for quick insert:', target);
    removeInsertItem(item);
    return false;
  }

  scheduleInsertQueueExecution();

  return true;
}

function enqueueInsertItem(target) {
  /*
   * enqueue 직전에도 한 번 더 제한을 본다.
   * keydown / keyup / repeat이 거의 동시에 들어오는 경우를 막는다.
   */
  if (isChatInputEmoteLimitReached()) {
    clearInsertQueue();
    return null;
  }

  const item = {
    id: nextInsertItemId,
    target,
    createdAt: performance.now(),
  };

  nextInsertItemId += 1;

  insertQueue.push(item);

  /*
   * 폭주 방어.
   * 오래된 입력부터 버린다.
   * 일반 상황에서는 도달하지 않아야 한다.
   */
  if (insertQueue.length > MAX_PENDING_ITEMS) {
    insertQueue = insertQueue.slice(-MAX_PENDING_ITEMS);
  }

  return item;
}

function removeInsertItem(item) {
  if (!item) return;

  insertQueue = insertQueue.filter((queuedItem) => {
    return queuedItem.id !== item.id;
  });
}

function clearInsertQueue() {
  insertQueue = [];
}

function ensureEmotePanelReady() {
  if (openingPromise) {
    return openingPromise;
  }

  const readyState = getReadyEmotePanelState();

  if (readyState?.ready && readyState?.panel) {
    return Promise.resolve(readyState.panel);
  }

  const opened = openEmotePanel();

  if (!opened) {
    return null;
  }

  openingPromise = waitForEmotePanelReady()
    .then((readyStateAfterOpen) => {
      return readyStateAfterOpen?.ready
        ? readyStateAfterOpen.panel
        : null;
    })
    .finally(() => {
      openingPromise = null;
    });

  return openingPromise;
}

function scheduleInsertQueueExecution() {
  if (isExecutingInsertQueue) {
    return;
  }

  /*
   * 실행 예약 시점에 이미 10개면 executor 자체를 시작하지 않는다.
   */
  if (isChatInputEmoteLimitReached()) {
    clearInsertQueue();
    scheduleBadgeUpdate();
    return;
  }

  isExecutingInsertQueue = true;

  void executeInsertQueue()
    .catch((error) => {
      console.error('[Emozzk Lite] failed to execute quick insert queue:', error);
      scheduleBadgeUpdate();
    })
    .finally(() => {
      isExecutingInsertQueue = false;

      /*
       * executor 실행 중 새 입력이 들어왔을 수 있다.
       * 단, 제한 도달 상태라면 남은 queue를 버리고 다시 실행하지 않는다.
       */
      if (isChatInputEmoteLimitReached()) {
        clearInsertQueue();
        scheduleBadgeUpdate();
        return;
      }

      if (insertQueue.length) {
        scheduleInsertQueueExecution();
      }
    });
}

async function executeInsertQueue() {
  if (isChatInputEmoteLimitReached()) {
    clearInsertQueue();
    scheduleBadgeUpdate();
    return;
  }

  const panel = await ensureEmotePanelReady();

  if (!panel) {
    clearInsertQueue();
    scheduleBadgeUpdate();
    return;
  }

  /*
   * 패널을 방금 연 경우, CHZZK DOM과 Emozzk 즐겨찾기 섹션이
   * 같은 프레임 안에서 흔들릴 수 있다.
   */
  renderFavoriteEmoteSection();

  await waitAnimationFrames(PANEL_OPEN_SETTLE_FRAMES);

  while (insertQueue.length) {
    /*
     * 실제 item을 꺼내기 전에 제한을 본다.
     * 여기서 queue를 비우면 남은 keyup/repeat 입력이 버튼 click까지 가지 않는다.
     */
    if (isChatInputEmoteLimitReached()) {
      clearInsertQueue();
      scheduleBadgeUpdate();
      break;
    }

    const item = insertQueue.shift();

    if (!item?.target) {
      continue;
    }

    await executeInsertItem({
      item,
      panel,
    });

    await waitAnimationFrames(BETWEEN_INSERT_FRAMES);
  }
}

async function executeInsertItem({
  item,
  panel,
}) {
  for (let attempt = 0; attempt <= INSERT_RETRY_COUNT; attempt += 1) {
    /*
     * retry 루프 안에서도 매번 제한을 본다.
     * 버튼을 못 찾아 retry하던 중 입력창이 10개가 될 수 있다.
     */
    if (isChatInputEmoteLimitReached()) {
      clearInsertQueue();
      scheduleBadgeUpdate();
      return false;
    }

    const currentPanel = getCurrentReadyPanel(panel);

    if (!currentPanel) {
      await waitRetryInterval();
      continue;
    }

    /*
     * 단축키 삽입에서는 채팅창 focus 복구가 필요하다.
     * 직접 마우스 클릭에는 이 파일이 관여하지 않는다.
     */
    focusChatInputAtEnd();

    /*
     * focus 복구/normalize 과정에서 DOM이 바뀔 수 있으므로,
     * 실제 CHZZK 이모티콘 버튼 click 직전에 다시 제한을 본다.
     *
     * 이 검사가 없으면 10개 제한 상태에서도 버튼 click이 발생해
     * 이모티콘 버튼이 눌린 것처럼 깜빡일 수 있다.
     */
    if (isChatInputEmoteLimitReached()) {
      clearInsertQueue();
      scheduleBadgeUpdate();
      return false;
    }

    const clickResult = clickTargetFromPanel({
      target: item.target,
      panel: currentPanel,
    });

    if (clickResult.clicked) {
      /*
       * 중요:
       * 여기서 button.click()까지 보냈다면 이 item은 완료다.
       * CHZZK가 입력창 상태나 내부 정책 때문에 삽입을 거부해도
       * 확장프로그램은 retry하지 않는다.
       *
       * 그래야 제한 토스트 이후 Backspace를 눌렀을 때
       * 이전 keyup item이 다시 살아나는 문제가 생기지 않는다.
       */
      scheduleChatInputNormalizeAfterEmoteSettle();
      scheduleBadgeUpdate();

      return true;
    }

    /*
     * 버튼을 아직 못 찾은 경우만 retry한다.
     * target_not_found는 패널 렌더/즐겨찾기 재배치 직후에 일시적으로 발생할 수 있다.
     */
    if (attempt >= INSERT_RETRY_COUNT) {
      break;
    }

    await waitRetryInterval();
  }

  console.debug('[Emozzk Lite] quick insert target not found after retry:', {
    id: item.id,
    target: item.target,
  });

  scheduleBadgeUpdate();

  return false;
}

function getCurrentReadyPanel(fallbackPanel) {
  const readyState = getReadyEmotePanelState();

  if (readyState?.ready && readyState?.panel) {
    return readyState.panel;
  }

  if (
    fallbackPanel instanceof Element &&
    fallbackPanel.isConnected
  ) {
    return fallbackPanel;
  }

  return null;
}

function clickTargetFromPanel({
  target,
  panel,
}) {
  /*
   * 여기까지 오기 전에 제한 체크를 끝낸다.
   * 이 함수 안에서는 "실제 click을 시도하는 구간"만 quickInsert로 표시한다.
   */
  quickInsertClickDepth += 1;

  try {
    if (target.targetType === SHORTCUT_TARGET_TYPE_INDEX) {
      const clicked = clickVisibleEmoteByIndex(target.index, panel);

      return {
        clicked,
        reason: clicked ? 'clicked' : 'target_not_found',
      };
    }

    if (target.targetType === SHORTCUT_TARGET_TYPE_EMOJI_ID) {
      const clicked = clickVisibleEmoteById(target.emojiId, panel);

      return {
        clicked,
        reason: clicked ? 'clicked' : 'target_not_found',
      };
    }

    return {
      clicked: false,
      reason: 'invalid_target',
    };
  } finally {
    window.setTimeout(() => {
      quickInsertClickDepth = Math.max(0, quickInsertClickDepth - 1);
    }, 0);
  }
}

function normalizeInsertTarget(actionArgs) {
  const normalizedArgs = normalizeActionArgs(actionArgs);

  if (!normalizedArgs) {
    return null;
  }

  const targetType = normalizeTargetType(
    normalizedArgs.targetType ||
    normalizedArgs.type
  );

  /*
   * legacy 호환:
   * { index: 0 } 형태도 index target으로 처리한다.
   */
  if (
    targetType === SHORTCUT_TARGET_TYPE_INDEX ||
    (!targetType && 'index' in normalizedArgs)
  ) {
    const index = normalizeIndex(normalizedArgs.index);

    if (index < 0) {
      return null;
    }

    return {
      targetType: SHORTCUT_TARGET_TYPE_INDEX,
      index,
    };
  }

  /*
   * 직접 지정:
   * { targetType: 'emojiId', emojiId: '...' }
   * { type: 'emojiId', emojiId: '...' }
   * { emojiId: '...' }
   */
  if (
    targetType === SHORTCUT_TARGET_TYPE_EMOJI_ID ||
    (!targetType && 'emojiId' in normalizedArgs)
  ) {
    const emojiId = normalizeEmojiId(normalizedArgs.emojiId);

    if (!emojiId) {
      return null;
    }

    return {
      targetType: SHORTCUT_TARGET_TYPE_EMOJI_ID,
      emojiId,
    };
  }

  return null;
}

function normalizeActionArgs(actionArgs) {
  if (!actionArgs || typeof actionArgs !== 'object') {
    return null;
  }

  /*
   * shortcut-actions.js에서 보통 actionArgs만 넘기지만,
   * 방어적으로 전체 actionConfig가 들어와도 처리한다.
   */
  if (
    actionArgs.actionArgs &&
    typeof actionArgs.actionArgs === 'object'
  ) {
    return actionArgs.actionArgs;
  }

  if (
    actionArgs.args &&
    typeof actionArgs.args === 'object'
  ) {
    return actionArgs.args;
  }

  if (
    actionArgs.target &&
    typeof actionArgs.target === 'object'
  ) {
    return actionArgs.target;
  }

  return actionArgs;
}

function normalizeTargetType(targetType) {
  const value = String(targetType || '').trim();

  if (value === SHORTCUT_TARGET_TYPE_INDEX) {
    return SHORTCUT_TARGET_TYPE_INDEX;
  }

  if (value === SHORTCUT_TARGET_TYPE_EMOJI_ID) {
    return SHORTCUT_TARGET_TYPE_EMOJI_ID;
  }

  return '';
}

function normalizeIndex(index) {
  const number = Number(index);

  if (!Number.isInteger(number)) return -1;
  if (number < 0) return -1;

  return number;
}

function normalizeEmojiId(value) {
  return String(value ?? '').trim();
}

function waitAnimationFrames(count = 1) {
  return new Promise((resolve) => {
    let remaining = Math.max(1, count);

    const step = () => {
      remaining -= 1;

      if (remaining <= 0) {
        resolve();
        return;
      }

      requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  });
}

function waitRetryInterval() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, INSERT_RETRY_DELAY_MS);
  });
}