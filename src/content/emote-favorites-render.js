import {
  getEmoteAltFromButton,
  isRealEmoteButton,
} from './emote-buttons.js';

import {
  findEmotePanel,
} from './emote-panel.js';

import {
  findRecentEmoteSection,
} from './emote-recent-section.js';

import {
  getCachedFavoriteRecentEmotes,
} from './favorite-recent-emote-storage.js';

import {
  getRecentEmoteId,
  getRecentEmoteIdFromAlt,
} from './recent-emote-storage.js';

import {
  getFavoritesChangedEventName,
} from './emote-favorites-event-name.js';

import {
  attachFavoriteEmoteDrag,
} from './emote-favorites-drag.js';

import {
  EMOTE_BIND_MODE_ASSIGN,
  EMOTE_BIND_MODE_CHANGED_EVENT,
  EMOTE_BIND_MODE_CLEAR,
  exitEmoteBindMode,
  getEmoteBindCodeLabel,
  getEmoteBindModeState,
  getEmoteBindPhaseDescription,
  getNextEmoteBindPhase,
  isEmoteBindExperimentalKeyupEnabled,
  isEmoteBindSaving,
  setEmoteBindPhase,
  setEmoteBindSaving,
  startEmoteBindKeyListening,
  toggleEmoteBindAssignMode,
  toggleEmoteBindClearMode,
} from './emote-bind-mode-state.js';

import {
  assignShortcutBindingTarget,
  clearShortcutBindingsByEmojiId,
  getCachedActiveShortcutBindingSetId,
  getCachedShortcutBindingSetState,
  setActiveShortcutBindingSet,
  SHORTCUT_BINDINGS_CHANGED_EVENT,
  SHORTCUT_BINDING_SET_1,
  SHORTCUT_BINDING_SET_2,
  SHORTCUT_PHASE_BOTH,
  SHORTCUT_PHASE_DOWN,
  SHORTCUT_PHASE_UP,
} from './shortcut-storage.js';

import {
  scheduleBadgeUpdate,
} from './badge-overlay.js';

import {
  normalizeStoredShortcutCode,
} from './shortcut-key-code.js';

const FAVORITES_SECTION_CLASS = 'emzk-lite-favorites-section';
const FAVORITES_TITLE_CLASS = 'emzk-lite-favorites-title';
const FAVORITES_LIST_CLASS = 'emzk-lite-favorites-list';
const FAVORITES_EMPTY_CLASS = 'emzk-lite-favorites-empty';

const FAVORITES_LABEL_CLASS = 'emzk-lite-favorites-label';
const FAVORITES_ACTIONS_CLASS = 'emzk-lite-favorites-actions';

const SHORTCUT_SET_SWITCH_CLASS = 'emzk-lite-shortcut-set-switch';
const SHORTCUT_SET_BUTTON_CLASS = 'emzk-lite-shortcut-set-button';
const SHORTCUT_SET_BUTTON_ACTIVE_CLASS = 'emzk-lite-shortcut-set-button-active';

const BIND_BUTTON_CLASS = 'emzk-lite-bind-button';
const BIND_BUTTON_ACTIVE_CLASS = 'emzk-lite-bind-button-active';
const BIND_BUTTON_DISABLED_CLASS = 'emzk-lite-bind-button-disabled';
const BIND_ICON_CLASS = 'emzk-lite-bind-icon';

const BIND_BAR_CLASS = 'emzk-lite-bind-bar';
const BIND_CLEAR_BAR_CLASS = 'emzk-lite-bind-clear-bar';
const BIND_LEFT_CLASS = 'emzk-lite-bind-left';
const BIND_VALUE_CLASS = 'emzk-lite-bind-value';
const BIND_HINT_CLASS = 'emzk-lite-bind-hint';

const BIND_EMOTE_PREVIEW_CLASS = 'emzk-lite-bind-emote-preview';
const BIND_EMOTE_IMAGE_CLASS = 'emzk-lite-bind-emote-image';
const BIND_EMOTE_EMPTY_CLASS = 'emzk-lite-bind-emote-empty';

const BIND_KEYCAP_BUTTON_CLASS = 'emzk-lite-bind-keycap-button';
const BIND_KEYCAP_BUTTON_LISTENING_CLASS = 'emzk-lite-bind-keycap-button-listening';
const BIND_KEYCAP_TEXT_CLASS = 'emzk-lite-bind-keycap-text';

const BIND_PHASE_BUTTON_CLASS = 'emzk-lite-bind-phase-button';
const BIND_PHASE_BUTTON_ACTIVE_CLASS = 'emzk-lite-bind-phase-button-active';
const BIND_PHASE_ICON_CLASS = 'emzk-lite-bind-phase-icon';

const BIND_ACTIONS_CLASS = 'emzk-lite-bind-actions';
const BIND_SAVE_BUTTON_CLASS = 'emzk-lite-bind-save-button';
const BIND_CANCEL_BUTTON_CLASS = 'emzk-lite-bind-cancel-button';

const FAVORITES_RENDER_STATE_ATTR = 'data-emzk-lite-favorites-state';
const FAVORITES_RENDER_STATE_PREPARING = 'preparing';
const FAVORITES_RENDER_STATE_READY = 'ready';

const BADGE_CLASS = 'emzk-lite-badge';
const BADGE_TARGET_ATTR = 'data-emzk-lite-badge-target';

let started = false;
let rafId = 0;
let observer = null;
let isRendering = false;

export function startFavoriteEmoteSectionRenderer() {
  if (started) return;

  started = true;

  document.addEventListener('click', handlePossibleFavoriteRender, true);
  document.addEventListener('keydown', handlePossibleFavoriteRender, true);
  document.addEventListener(
    getFavoritesChangedEventName(),
    scheduleFavoriteEmoteSectionRender
  );

  window.addEventListener(
    EMOTE_BIND_MODE_CHANGED_EVENT,
    scheduleFavoriteEmoteSectionRender
  );

  window.addEventListener(
    SHORTCUT_BINDINGS_CHANGED_EVENT,
    handleShortcutBindingsChanged
  );

  startFavoriteSectionMutationObserver();
  scheduleFavoriteEmoteSectionRender();
}

export function stopFavoriteEmoteSectionRenderer() {
  if (!started) return;

  started = false;

  document.removeEventListener('click', handlePossibleFavoriteRender, true);
  document.removeEventListener('keydown', handlePossibleFavoriteRender, true);
  document.removeEventListener(
    getFavoritesChangedEventName(),
    scheduleFavoriteEmoteSectionRender
  );

  window.removeEventListener(
    EMOTE_BIND_MODE_CHANGED_EVENT,
    scheduleFavoriteEmoteSectionRender
  );

  window.removeEventListener(
    SHORTCUT_BINDINGS_CHANGED_EVENT,
    handleShortcutBindingsChanged
  );

  stopFavoriteSectionMutationObserver();

  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }

  clearFavoriteRenderState();
  removeFavoriteSection();
}

export function scheduleFavoriteEmoteSectionRender() {
  if (rafId) return;

  rafId = requestAnimationFrame(() => {
    rafId = 0;
    renderFavoriteEmoteSection();
  });
}

export function renderFavoriteEmoteSection() {
  const panel = findEmotePanel();

  if (!panel) {
    removeFavoriteSection();
    return;
  }

  const area = getEmojiArea(panel);

  if (!area) {
    removeFavoriteSection();
    return;
  }

  const recentSection = findRecentEmoteSection(panel);

  if (!recentSection) {
    markFavoriteAreaReady(area);
    removeFavoriteSection();
    return;
  }

  const recentGroup = recentSection.heading?.parentElement;

  if (!recentGroup) {
    markFavoriteAreaReady(area);
    removeFavoriteSection();
    return;
  }

  const groupParent = recentGroup.parentElement;

  if (!groupParent) {
    markFavoriteAreaReady(area);
    removeFavoriteSection();
    return;
  }

  const recentList = findRecentListFromSection(recentSection);

  let favoriteSection = findFavoriteSection(groupParent);

  if (!favoriteSection) {
    favoriteSection = createFavoriteSectionShell({
      recentGroup,
    });
  } else {
    copyClassList({
      target: favoriteSection,
      source: recentGroup,
      hookClass: FAVORITES_SECTION_CLASS,
    });
  }

  renderFavoriteTitle({
    section: favoriteSection,
    sourceHeading: recentSection.heading,
  });

  let favoriteList = null;

  if (recentList) {
    favoriteList = ensureFavoriteList({
      section: favoriteSection,
      sourceList: recentList,
    });
  }

  /*
   * recentList가 아직 없더라도 즐겨찾기 shell/header/empty 안내는 먼저 삽입한다.
   * item 이동은 recentList가 준비된 뒤에만 수행한다.
   */
  if (!recentList || !favoriteList) {
    syncFavoriteEmptyState({
      section: favoriteSection,
      hasFavorites: false,
    });

    insertFavoriteSectionBeforeRecent({
      groupParent,
      section: favoriteSection,
      recentGroup,
    });

    favoriteSection.hidden = false;
    markFavoriteAreaReady(area);
    return;
  }

  const favoriteEmotes = getCachedFavoriteRecentEmotes();
  const favoriteIds = favoriteEmotes
    .map(getRecentEmoteId)
    .filter(Boolean);

  const favoriteIdSet = new Set(favoriteIds);

  const shouldPrepareArea =
    favoriteIds.length > 0 &&
    shouldMarkFavoriteAreaPreparing(area);

  if (shouldPrepareArea) {
    markFavoriteAreaPreparing(area);
  }

  isRendering = true;

  try {
    removeLegacyEmptyElements(favoriteSection);

    const partition = partitionRecentItems({
      recentList,
      favoriteList,
      favoriteIds,
      favoriteIdSet,
    });

    applyPartition({
      favoriteList,
      recentList,
      favoriteItems: partition.favoriteItems,
      normalItems: partition.normalItems,
    });

    syncFavoriteEmptyState({
      section: favoriteSection,
      hasFavorites: partition.favoriteItems.length > 0,
    });

    insertFavoriteSectionBeforeRecent({
      groupParent,
      section: favoriteSection,
      recentGroup,
    });

    if (partition.favoriteItems.length) {
      attachFavoriteEmoteDrag(favoriteSection);
    }

    favoriteSection.hidden = false;
  } finally {
    markFavoriteAreaReady(area);
    isRendering = false;
  }
}

function handlePossibleFavoriteRender(event) {
  const target = event.target;

  if (target instanceof Element) {
    if (target.closest(`.${BADGE_CLASS}`)) return;
    if (target.closest(`.${BIND_BUTTON_CLASS}`)) return;
    if (target.closest(`.${BIND_KEYCAP_BUTTON_CLASS}`)) return;
    if (target.closest(`.${BIND_PHASE_BUTTON_CLASS}`)) return;
    if (target.closest(`.${SHORTCUT_SET_BUTTON_CLASS}`)) return;
  }

  scheduleFavoriteEmoteSectionRender();
}

function handleShortcutBindingsChanged() {
  scheduleFavoriteEmoteSectionRender();
}

function getEmojiArea(panel) {
  if (!panel) return null;

  return panel.querySelector('#emoji_area');
}

function shouldMarkFavoriteAreaPreparing(area) {
  if (!(area instanceof Element)) return false;

  return (
    area.getAttribute(FAVORITES_RENDER_STATE_ATTR) !==
    FAVORITES_RENDER_STATE_READY
  );
}

function markFavoriteAreaPreparing(area) {
  if (!(area instanceof Element)) return;

  area.setAttribute(
    FAVORITES_RENDER_STATE_ATTR,
    FAVORITES_RENDER_STATE_PREPARING
  );
}

function markFavoriteAreaReady(area) {
  if (!(area instanceof Element)) return;

  area.setAttribute(
    FAVORITES_RENDER_STATE_ATTR,
    FAVORITES_RENDER_STATE_READY
  );
}

function clearFavoriteRenderState() {
  document
    .querySelectorAll(`[${FAVORITES_RENDER_STATE_ATTR}]`)
    .forEach((element) => {
      element.removeAttribute(FAVORITES_RENDER_STATE_ATTR);
    });
}

function findRecentListFromSection(recentSection) {
  const heading = recentSection?.heading;

  if (!heading) return null;

  let sibling = heading.nextElementSibling;

  while (sibling) {
    if (sibling.matches?.('ul')) {
      return sibling;
    }

    sibling = sibling.nextElementSibling;
  }

  return heading.parentElement?.querySelector(':scope > ul') ?? null;
}

function findFavoriteSection(groupParent) {
  if (!(groupParent instanceof Element)) return null;

  const section = groupParent.querySelector(
    `:scope > .${FAVORITES_SECTION_CLASS}`
  );

  return section instanceof HTMLElement ? section : null;
}

function createFavoriteSectionShell({
  recentGroup,
}) {
  const section = document.createElement('div');

  copyClassList({
    target: section,
    source: recentGroup,
    hookClass: FAVORITES_SECTION_CLASS,
  });

  section.hidden = true;

  return section;
}

function insertFavoriteSectionBeforeRecent({
  groupParent,
  section,
  recentGroup,
}) {
  if (!(groupParent instanceof Element)) return;
  if (!(section instanceof Element)) return;
  if (!(recentGroup instanceof Element)) return;

  if (section.parentElement !== groupParent) {
    groupParent.insertBefore(section, recentGroup);
    return;
  }

  if (section.nextElementSibling !== recentGroup) {
    groupParent.insertBefore(section, recentGroup);
  }
}

function renderFavoriteTitle({
  section,
  sourceHeading,
}) {
  let title = section.querySelector(`:scope > .${FAVORITES_TITLE_CLASS}`);

  if (!title) {
    title = document.createElement('strong');
    section.insertBefore(title, section.firstChild);
  }

  copyClassList({
    target: title,
    source: sourceHeading,
    hookClass: FAVORITES_TITLE_CLASS,
  });

  const bindState = getEmoteBindModeState();
  const previousMode = title.getAttribute('data-emzk-lite-bind-mode') || '';

  title.setAttribute('data-emzk-lite-bind-mode', bindState.mode);

  /*
   * assign / clear 모드는 구조 자체가 다르므로 기존처럼 전체 교체한다.
   */
  if (bindState.mode === EMOTE_BIND_MODE_ASSIGN) {
    title.replaceChildren(createAssignTitleContent(bindState));
    return;
  }

  if (bindState.mode === EMOTE_BIND_MODE_CLEAR) {
    title.replaceChildren(createClearTitleContent(bindState));
    return;
  }

  /*
   * assign / clear에서 기본 모드로 돌아온 경우는 기본 헤더 구조를 다시 만든다.
   */
  if (
    previousMode === EMOTE_BIND_MODE_ASSIGN ||
    previousMode === EMOTE_BIND_MODE_CLEAR
  ) {
    title.replaceChildren(createDefaultTitleContent(bindState));
    return;
  }

  /*
   * 기본 모드에서는 DOM을 갈아엎지 않고 세트 토글 상태만 갱신한다.
   * 이래야 .emzk-lite-shortcut-set-switch::before transition이 살아난다.
   */
  updateDefaultTitleContent({
    title,
    bindState,
  });
}

function createDefaultTitleContent(bindState) {
  const fragment = document.createDocumentFragment();

  const label = document.createElement('span');
  label.className = FAVORITES_LABEL_CLASS;
  label.textContent = '즐겨찾기';

  const actions = document.createElement('span');
  actions.className = FAVORITES_ACTIONS_CLASS;

  const shortcutSetSwitch = createShortcutSetSwitch();

  const assignButton = createHeaderIconButton({
    icon: 'link',
    label: '키 지정',
    active: bindState.mode === EMOTE_BIND_MODE_ASSIGN,
    onClick: () => {
      toggleEmoteBindAssignMode();
    },
  });

  const clearButton = createHeaderIconButton({
    icon: 'unlink',
    label: bindState.mode === EMOTE_BIND_MODE_CLEAR ? '해제 중' : '해제',
    active: bindState.mode === EMOTE_BIND_MODE_CLEAR,
    onClick: () => {
      toggleEmoteBindClearMode();
    },
  });

  actions.append(
    shortcutSetSwitch,
    assignButton,
    clearButton
  );

  fragment.append(
    label,
    actions
  );

  return fragment;
}

function updateDefaultTitleContent({
  title,
  bindState,
}) {
  let label = title.querySelector(`:scope > .${FAVORITES_LABEL_CLASS}`);
  let actions = title.querySelector(`:scope > .${FAVORITES_ACTIONS_CLASS}`);

  if (!label || !actions) {
    title.replaceChildren(createDefaultTitleContent(bindState));
    return;
  }

  label.textContent = '즐겨찾기';

  let shortcutSetSwitch = actions.querySelector(
    `:scope > .${SHORTCUT_SET_SWITCH_CLASS}`
  );

  if (!shortcutSetSwitch) {
    shortcutSetSwitch = createShortcutSetSwitch();
    actions.insertBefore(shortcutSetSwitch, actions.firstChild);
  } else {
    updateShortcutSetSwitch(shortcutSetSwitch);
  }

  syncDefaultHeaderActionButtons({
    actions,
    bindState,
  });
}

function createShortcutSetSwitch() {
  const wrapper = document.createElement('span');

  wrapper.className = SHORTCUT_SET_SWITCH_CLASS;
  wrapper.setAttribute('role', 'group');
  wrapper.setAttribute('aria-label', '단축키 세트 전환');

  const setState = getCachedShortcutBindingSetState();
  const activeSetId = getCachedActiveShortcutBindingSetId();

  wrapper.setAttribute(
    'data-emzk-lite-active-shortcut-set',
    activeSetId === SHORTCUT_BINDING_SET_2 ? '2' : '1'
  );

  const sets = Array.isArray(setState?.sets) && setState.sets.length
    ? setState.sets
    : [
      {
        id: SHORTCUT_BINDING_SET_1,
        label: '1',
      },
      {
        id: SHORTCUT_BINDING_SET_2,
        label: '2',
      },
    ];

  sets.forEach((set) => {
    const setId = normalizeShortcutSetId(set?.id);

    if (!setId) return;

    const label = normalizeText(set?.label) ||
      getShortcutSetFallbackLabel(setId);

    wrapper.appendChild(createShortcutSetButton({
      setId,
      label,
      active: setId === activeSetId,
    }));
  });

  return wrapper;
}

function updateShortcutSetSwitch(wrapper) {
  if (!(wrapper instanceof HTMLElement)) {
    return;
  }

  const setState = getCachedShortcutBindingSetState();
  const activeSetId = getCachedActiveShortcutBindingSetId();

  wrapper.setAttribute(
    'data-emzk-lite-active-shortcut-set',
    activeSetId === SHORTCUT_BINDING_SET_2 ? '2' : '1'
  );

  const sets = Array.isArray(setState?.sets) && setState.sets.length
    ? setState.sets
    : [
      {
        id: SHORTCUT_BINDING_SET_1,
        label: '1',
      },
      {
        id: SHORTCUT_BINDING_SET_2,
        label: '2',
      },
    ];

  sets.forEach((set) => {
    const setId = normalizeShortcutSetId(set?.id);

    if (!setId) return;

    const button = wrapper.querySelector(
      `:scope > .${SHORTCUT_SET_BUTTON_CLASS}[data-emzk-lite-shortcut-set-id="${setId}"]`
    );

    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const label = normalizeText(set?.label) ||
      getShortcutSetFallbackLabel(setId);

    const active = setId === activeSetId;

    button.textContent = label;
    button.setAttribute('aria-label', `단축키 세트 ${label}`);
    button.setAttribute('title', `단축키 세트 ${label}`);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
    button.classList.toggle(SHORTCUT_SET_BUTTON_ACTIVE_CLASS, active);
  });
}

function syncDefaultHeaderActionButtons({
  actions,
  bindState,
}) {
  const buttons = Array.from(
    actions.querySelectorAll(`:scope > .${BIND_BUTTON_CLASS}`)
  );

  const hasAssignButton = buttons.some((button) => {
    return button.getAttribute('aria-label') === '키 지정';
  });

  const hasClearButton = buttons.some((button) => {
    const label = button.getAttribute('aria-label');

    return label === '해제' || label === '해제 중';
  });

  if (hasAssignButton && hasClearButton) {
    buttons.forEach((button) => {
      const label = button.getAttribute('aria-label');

      if (label === '키 지정') {
        button.classList.toggle(
          BIND_BUTTON_ACTIVE_CLASS,
          bindState.mode === EMOTE_BIND_MODE_ASSIGN
        );
        button.setAttribute(
          'aria-pressed',
          bindState.mode === EMOTE_BIND_MODE_ASSIGN ? 'true' : 'false'
        );
      }

      if (label === '해제' || label === '해제 중') {
        button.classList.toggle(
          BIND_BUTTON_ACTIVE_CLASS,
          bindState.mode === EMOTE_BIND_MODE_CLEAR
        );
        button.setAttribute(
          'aria-pressed',
          bindState.mode === EMOTE_BIND_MODE_CLEAR ? 'true' : 'false'
        );
        button.setAttribute(
          'aria-label',
          bindState.mode === EMOTE_BIND_MODE_CLEAR ? '해제 중' : '해제'
        );
        button.setAttribute(
          'title',
          bindState.mode === EMOTE_BIND_MODE_CLEAR ? '해제 중' : '해제'
        );
      }
    });

    return;
  }

  actions.replaceChildren(
    createShortcutSetSwitch(),
    createHeaderIconButton({
      icon: 'link',
      label: '키 지정',
      active: bindState.mode === EMOTE_BIND_MODE_ASSIGN,
      onClick: () => {
        toggleEmoteBindAssignMode();
      },
    }),
    createHeaderIconButton({
      icon: 'unlink',
      label: bindState.mode === EMOTE_BIND_MODE_CLEAR ? '해제 중' : '해제',
      active: bindState.mode === EMOTE_BIND_MODE_CLEAR,
      onClick: () => {
        toggleEmoteBindClearMode();
      },
    })
  );
}

function createShortcutSetButton({
  setId,
  label,
  active,
}) {
  const button = document.createElement('button');

  button.type = 'button';
  button.className = SHORTCUT_SET_BUTTON_CLASS;
  button.textContent = label;
  button.setAttribute('data-emzk-lite-shortcut-set-id', setId);
  button.setAttribute('aria-label', `단축키 세트 ${label}`);
  button.setAttribute('title', `단축키 세트 ${label}`);
  button.setAttribute('aria-pressed', active ? 'true' : 'false');

  if (active) {
    button.classList.add(SHORTCUT_SET_BUTTON_ACTIVE_CLASS);
  }

  button.addEventListener('mousedown', stopControlEvent);

  button.addEventListener('click', (event) => {
    stopControlEvent(event);

    if (isShortcutSetButtonCurrentlyActive(setId)) {
      return;
    }

    void switchShortcutSet(setId)
      .catch((error) => {
        console.error('[Emozzk Lite] failed to switch shortcut set:', error);
      });
  });

  button.addEventListener('keydown', (event) => {
    if (
      event.code !== 'Enter' &&
      event.code !== 'Space'
    ) {
      return;
    }

    stopControlEvent(event);

    if (isShortcutSetButtonCurrentlyActive(setId)) {
      return;
    }

    void switchShortcutSet(setId)
      .catch((error) => {
        console.error('[Emozzk Lite] failed to switch shortcut set:', error);
      });
  });

  return button;
}

function isShortcutSetButtonCurrentlyActive(setId) {
  return getCachedActiveShortcutBindingSetId() === setId;
}

async function switchShortcutSet(setId) {
  await setActiveShortcutBindingSet(setId);

  /*
   * setActiveShortcutBindingSet() 내부에서 SHORTCUT_BINDINGS_CHANGED_EVENT가 발생하지만,
   * 즉시 UI와 badge를 맞추기 위해 한 번 더 예약한다.
   */
  scheduleFavoriteEmoteSectionRender();
  scheduleBadgeUpdate();
}

function normalizeShortcutSetId(setId) {
  const normalizedSetId = normalizeText(setId);

  if (
    normalizedSetId === SHORTCUT_BINDING_SET_1 ||
    normalizedSetId === SHORTCUT_BINDING_SET_2
  ) {
    return normalizedSetId;
  }

  return '';
}

function getShortcutSetFallbackLabel(setId) {
  if (setId === SHORTCUT_BINDING_SET_2) {
    return '2';
  }

  return '1';
}

function createAssignTitleContent(bindState) {
  const bar = document.createElement('span');
  bar.className = BIND_BAR_CLASS;

  const left = document.createElement('span');
  left.className = BIND_LEFT_CLASS;

  left.appendChild(createSelectedEmotePreview(bindState));
  left.appendChild(createKeycapButton(bindState));

  if (isEmoteBindExperimentalKeyupEnabled()) {
    left.appendChild(createPhaseToggleButton(bindState));
  }

  left.appendChild(createAssignHint(bindState));

  bar.append(
    left,
    createAssignActionButtons(bindState)
  );

  return bar;
}

function createAssignHint(bindState) {
  const hint = document.createElement('span');

  hint.className = BIND_HINT_CLASS;
  hint.textContent = getAssignHintText(bindState);
  hint.setAttribute('title', getAssignHintDescription(bindState));

  return hint;
}

function getAssignHintDescription(bindState) {
  const hasSelectedEmote = Boolean(
    normalizeText(bindState?.selectedEmojiId)
  );

	const hasSelectedCode = Boolean(
		normalizeShortcutCode(bindState?.selectedCode)
	);

  if (!hasSelectedEmote) {
    return '단축키를 지정할 이모티콘을 선택하세요.';
  }

  if (bindState?.keyListening) {
    return '등록할 키를 입력하세요.';
  }

  if (!hasSelectedCode) {
    return 'KEY 버튼을 누른 뒤 등록할 키를 입력하세요.';
  }

  return '저장 버튼을 누르면 단축키가 적용됩니다.';
}

function getAssignHintText(bindState) {
  const hasSelectedEmote = Boolean(
    normalizeText(bindState?.selectedEmojiId)
  );

	const hasSelectedCode = Boolean(
		normalizeShortcutCode(bindState?.selectedCode)
	);

  if (!hasSelectedEmote) {
    return '선택';
  }

  if (bindState?.keyListening) {
    return '키 입력';
  }

  if (!hasSelectedCode) {
    return 'KEY 클릭';
  }

  return '저장 가능';
}

function createClearTitleContent(bindState) {
  const bar = document.createElement('span');

  bar.className = BIND_BAR_CLASS;
  bar.classList.add(BIND_CLEAR_BAR_CLASS);

  const left = document.createElement('span');
  left.className = BIND_LEFT_CLASS;

  left.appendChild(createClearHint(bindState));

  bar.append(
    left,
    createClearActionButtons(bindState)
  );

  return bar;
}

function createClearHint(bindState) {
  const hint = document.createElement('span');

  hint.className = BIND_HINT_CLASS;
  hint.textContent = getClearHintText(bindState);
  hint.setAttribute('title', getClearHintDescription(bindState));
  hint.setAttribute('aria-label', getClearHintDescription(bindState));

  return hint;
}

function getClearHintText(bindState) {
  const selectedCount = getSelectedClearEmojiIds(bindState).length;

  if (selectedCount <= 0) {
    return '해제 선택';
  }

  return `${selectedCount}개 선택`;
}

function getClearHintDescription(bindState) {
  const selectedCount = getSelectedClearEmojiIds(bindState).length;

  if (selectedCount <= 0) {
    return '단축키를 해제할 이모티콘을 선택하세요.';
  }

  return `${selectedCount}개의 이모티콘이 해제 대상으로 선택되었습니다.`;
}

function createSelectedEmotePreview(bindState) {
  const wrapper = document.createElement('span');

  wrapper.className = BIND_VALUE_CLASS;
  wrapper.classList.add(BIND_EMOTE_PREVIEW_CLASS);

  const label = normalizeText(
    bindState.selectedEmojiLabel ||
    bindState.selectedEmojiId
  );

  if (label) {
    wrapper.setAttribute('title', label);
    wrapper.setAttribute('aria-label', label);
  } else {
    wrapper.setAttribute('title', '이모티콘 선택');
    wrapper.setAttribute('aria-label', '선택된 이모티콘 없음');
  }

  if (bindState.selectedEmojiImageUrl) {
    const image = document.createElement('img');

    image.className = BIND_EMOTE_IMAGE_CLASS;
    image.src = bindState.selectedEmojiImageUrl;
    image.alt = label || '';

    wrapper.appendChild(image);

    return wrapper;
  }

  wrapper.classList.add(BIND_EMOTE_EMPTY_CLASS);

  return wrapper;
}

function createKeycapButton(bindState) {
  const button = document.createElement('button');

  const hasSelectedEmote = Boolean(
    normalizeText(bindState?.selectedEmojiId)
  );

  button.type = 'button';
  button.className = BIND_KEYCAP_BUTTON_CLASS;
  button.setAttribute(
    'aria-label',
    hasSelectedEmote ? '키 입력 대기' : '이모티콘을 먼저 선택하세요'
  );
  button.setAttribute(
    'title',
    !hasSelectedEmote
      ? '이모티콘을 먼저 선택하세요'
      : bindState.keyListening
        ? '키 입력 대기 중'
        : '키 지정'
  );

  if (!hasSelectedEmote) {
    button.disabled = true;
    button.classList.add(BIND_BUTTON_DISABLED_CLASS);
  }

  if (bindState.keyListening) {
    button.classList.add(BIND_KEYCAP_BUTTON_LISTENING_CLASS);
  }

  const label = document.createElement('span');

  label.className = BIND_KEYCAP_TEXT_CLASS;
  label.textContent = bindState.keyListening
    ? 'KEY'
    : getEmoteBindCodeLabel(bindState.selectedCode);

  button.appendChild(label);

  button.addEventListener('mousedown', stopControlEvent);

  button.addEventListener('click', (event) => {
    stopControlEvent(event);

    if (!hasSelectedEmote) return;

    startEmoteBindKeyListening();
  });

  button.addEventListener('keydown', (event) => {
    if (
      event.code !== 'Enter' &&
      event.code !== 'Space'
    ) {
      return;
    }

    stopControlEvent(event);

    if (!hasSelectedEmote) return;

    startEmoteBindKeyListening();
  });

  return button;
}

function createPhaseToggleButton(bindState) {
  const currentPhase = normalizeRenderPhase(bindState.selectedPhase);
  const nextPhase = getNextEmoteBindPhase(currentPhase);
  const phaseDescription = getEmoteBindPhaseDescription(currentPhase);

  const button = document.createElement('button');

  button.type = 'button';
  button.className = BIND_PHASE_BUTTON_CLASS;
  button.classList.add(BIND_PHASE_BUTTON_ACTIVE_CLASS);
  button.setAttribute('aria-label', phaseDescription);
  button.setAttribute('title', phaseDescription);
  button.setAttribute('aria-pressed', 'true');

  button.appendChild(createPhaseSvgIcon(currentPhase));

  button.addEventListener('mousedown', stopControlEvent);

  button.addEventListener('click', (event) => {
    stopControlEvent(event);
    setEmoteBindPhase(nextPhase);
  });

  button.addEventListener('keydown', (event) => {
    if (
      event.code !== 'Enter' &&
      event.code !== 'Space'
    ) {
      return;
    }

    stopControlEvent(event);
    setEmoteBindPhase(nextPhase);
  });

  return button;
}

function createPhaseSvgIcon(phase) {
  const normalizedPhase = normalizeRenderPhase(phase);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add(BIND_PHASE_ICON_CLASS);

  if (normalizedPhase === SHORTCUT_PHASE_BOTH) {
    appendSvgPath(svg, 'M8 5v14M4.5 15.5 8 19l3.5-3.5');
    appendSvgPath(svg, 'M16 19V5M12.5 8.5 16 5l3.5 3.5');
    return svg;
  }

  if (normalizedPhase === SHORTCUT_PHASE_UP) {
    appendSvgPath(svg, 'M12 19V5M6.5 10.5 12 5l5.5 5.5');
    return svg;
  }

  appendSvgPath(svg, 'M12 5v14M6.5 13.5 12 19l5.5-5.5');

  return svg;
}

function appendSvgPath(svg, d) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

  path.setAttribute('d', d);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '2.2');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');

  svg.appendChild(path);
}

function normalizeRenderPhase(phase) {
  if (phase === SHORTCUT_PHASE_UP) {
    return SHORTCUT_PHASE_UP;
  }

  if (phase === SHORTCUT_PHASE_BOTH) {
    return SHORTCUT_PHASE_BOTH;
  }

  return SHORTCUT_PHASE_DOWN;
}

function createAssignActionButtons(bindState) {
  const actions = document.createElement('span');

  actions.className = BIND_ACTIONS_CLASS;

  actions.append(
    createAssignSaveButton(bindState),
    createAssignCancelButton(bindState)
  );

  return actions;
}

function createClearActionButtons(bindState) {
  const actions = document.createElement('span');

  actions.className = BIND_ACTIONS_CLASS;

  actions.append(
    createClearSaveButton(bindState),
    createClearCancelButton(bindState)
  );

  return actions;
}

function createAssignSaveButton(bindState) {
  const button = document.createElement('button');

  const isSaving = Boolean(bindState?.isSaving);
  const canSave = canSaveAssignState(bindState);
  const saveLabel = isSaving ? '저장 중' : '저장';

  button.type = 'button';
  button.className = BIND_BUTTON_CLASS;
  button.classList.add(BIND_SAVE_BUTTON_CLASS);
  button.setAttribute('aria-label', saveLabel);
  button.setAttribute('title', saveLabel);

  if (!canSave || isSaving) {
    button.disabled = true;
    button.classList.add(BIND_BUTTON_DISABLED_CLASS);
  }

  button.appendChild(createSaveFloppyIcon());

  button.addEventListener('mousedown', stopControlEvent);

  button.addEventListener('click', (event) => {
    stopControlEvent(event);

    if (!canSave || isSaving) return;

    void saveAssignState(bindState)
      .catch((error) => {
        console.error('[Emozzk Lite] failed to save shortcut binding:', error);
      });
  });

  button.addEventListener('keydown', (event) => {
    if (
      event.code !== 'Enter' &&
      event.code !== 'Space'
    ) {
      return;
    }

    stopControlEvent(event);

    if (!canSave || isSaving) return;

    void saveAssignState(bindState)
      .catch((error) => {
        console.error('[Emozzk Lite] failed to save shortcut binding:', error);
      });
  });

  return button;
}

function createClearSaveButton(bindState) {
  const button = document.createElement('button');

  const selectedCount = getSelectedClearEmojiIds(bindState).length;
  const isSaving = Boolean(bindState?.isSaving);
  const canSave = canSaveClearState(bindState);

  const saveLabel = isSaving
    ? '해제 저장 중'
    : canSave
      ? `${selectedCount}개 해제 저장`
      : '해제할 이모티콘을 선택하세요';

  button.type = 'button';
  button.className = BIND_BUTTON_CLASS;
  button.classList.add(BIND_SAVE_BUTTON_CLASS);
  button.setAttribute('aria-label', saveLabel);
  button.setAttribute('title', saveLabel);

  if (!canSave || isSaving) {
    button.disabled = true;
    button.classList.add(BIND_BUTTON_DISABLED_CLASS);
  }

  button.appendChild(createSaveFloppyIcon());

  button.addEventListener('mousedown', stopControlEvent);

  button.addEventListener('click', (event) => {
    stopControlEvent(event);

    if (!canSave || isSaving) return;

    void saveClearState(bindState)
      .catch((error) => {
        console.error('[Emozzk Lite] failed to clear shortcut bindings:', error);
      });
  });

  button.addEventListener('keydown', (event) => {
    if (
      event.code !== 'Enter' &&
      event.code !== 'Space'
    ) {
      return;
    }

    stopControlEvent(event);

    if (!canSave || isSaving) return;

    void saveClearState(bindState)
      .catch((error) => {
        console.error('[Emozzk Lite] failed to clear shortcut bindings:', error);
      });
  });

  return button;
}

function createAssignCancelButton(bindState) {
  const button = document.createElement('button');
  const isSaving = Boolean(bindState?.isSaving);

  button.type = 'button';
  button.className = BIND_BUTTON_CLASS;
  button.classList.add(BIND_CANCEL_BUTTON_CLASS);
  button.setAttribute('aria-label', isSaving ? '저장 중' : '취소');
  button.setAttribute('title', isSaving ? '저장 중' : '취소');

  if (isSaving) {
    button.disabled = true;
    button.classList.add(BIND_BUTTON_DISABLED_CLASS);
  }

  button.appendChild(createCancelXIcon());

  button.addEventListener('mousedown', stopControlEvent);

  button.addEventListener('click', (event) => {
    stopControlEvent(event);
    if (isSaving) return;
    cancelAssignState();
  });

  button.addEventListener('keydown', (event) => {
    if (
      event.code !== 'Enter' &&
      event.code !== 'Space'
    ) {
      return;
    }

    stopControlEvent(event);
    if (isSaving) return;
    cancelAssignState();
  });

  return button;
}

function createClearCancelButton(bindState) {
  const button = document.createElement('button');
  const isSaving = Boolean(bindState?.isSaving);

  button.type = 'button';
  button.className = BIND_BUTTON_CLASS;
  button.classList.add(BIND_CANCEL_BUTTON_CLASS);
  button.setAttribute('aria-label', isSaving ? '해제 저장 중' : '해제 취소');
  button.setAttribute('title', isSaving ? '해제 저장 중' : '해제 취소');

  if (isSaving) {
    button.disabled = true;
    button.classList.add(BIND_BUTTON_DISABLED_CLASS);
  }

  button.appendChild(createCancelXIcon());

  button.addEventListener('mousedown', stopControlEvent);

  button.addEventListener('click', (event) => {
    stopControlEvent(event);
    if (isSaving) return;
    cancelClearState();
  });

  button.addEventListener('keydown', (event) => {
    if (
      event.code !== 'Enter' &&
      event.code !== 'Space'
    ) {
      return;
    }

    stopControlEvent(event);
    if (isSaving) return;
    cancelClearState();
  });

  return button;
}

async function saveAssignState(bindState) {
  if (
    !canSaveAssignState(bindState) ||
    isEmoteBindSaving()
  ) {
    return;
  }

  setEmoteBindSaving(true);
  scheduleFavoriteEmoteSectionRender();
  scheduleBadgeUpdate();

  try {
		await assignShortcutBindingTarget({
			code: normalizeShortcutCode(bindState.selectedCode),
			phase: normalizeRenderPhase(bindState.selectedPhase),
			emojiId: bindState.selectedEmojiId,
		});

    exitEmoteBindMode();

    scheduleFavoriteEmoteSectionRender();
    scheduleBadgeUpdate();
  } catch (error) {
    setEmoteBindSaving(false);

    scheduleFavoriteEmoteSectionRender();
    scheduleBadgeUpdate();

    throw error;
  }
}

async function saveClearState(bindState) {
  const emojiIds = getSelectedClearEmojiIds(bindState);

  if (
    !emojiIds.length ||
    isEmoteBindSaving()
  ) {
    return;
  }

  setEmoteBindSaving(true);
  scheduleFavoriteEmoteSectionRender();
  scheduleBadgeUpdate();

  try {
    for (const emojiId of emojiIds) {
      await clearShortcutBindingsByEmojiId({
        emojiId,
      });
    }

    exitEmoteBindMode();

    scheduleFavoriteEmoteSectionRender();
    scheduleBadgeUpdate();
  } catch (error) {
    setEmoteBindSaving(false);

    scheduleFavoriteEmoteSectionRender();
    scheduleBadgeUpdate();

    throw error;
  }
}

function cancelAssignState() {
  exitEmoteBindMode();

  scheduleFavoriteEmoteSectionRender();
  scheduleBadgeUpdate();
}

function cancelClearState() {
  exitEmoteBindMode();

  scheduleFavoriteEmoteSectionRender();
  scheduleBadgeUpdate();
}

function canSaveAssignState(bindState) {
  if (bindState?.isSaving) {
    return false;
  }

  return Boolean(
    normalizeText(bindState?.selectedEmojiId) &&
    normalizeShortcutCode(bindState?.selectedCode) &&
    normalizeRenderPhase(bindState?.selectedPhase)
  );
}

function canSaveClearState(bindState) {
  if (bindState?.isSaving) {
    return false;
  }

  return getSelectedClearEmojiIds(bindState).length > 0;
}

function getSelectedClearEmojiIds(bindState) {
  if (!Array.isArray(bindState?.selectedClearEmojiIds)) {
    return [];
  }

  return bindState.selectedClearEmojiIds
    .map(normalizeText)
    .filter(Boolean);
}

function createSaveFloppyIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add(BIND_ICON_CLASS);

  const body = document.createElementNS('http://www.w3.org/2000/svg', 'path');

  body.setAttribute(
    'd',
    'M6 3h9l4 4v14H5V4a1 1 0 0 1 1-1Z'
  );
  body.setAttribute('fill', 'none');
  body.setAttribute('stroke', 'currentColor');
  body.setAttribute('stroke-width', '1.9');
  body.setAttribute('stroke-linejoin', 'round');

  const notch = document.createElementNS('http://www.w3.org/2000/svg', 'path');

  notch.setAttribute('d', 'M9 3v5h6V3');
  notch.setAttribute('fill', 'none');
  notch.setAttribute('stroke', 'currentColor');
  notch.setAttribute('stroke-width', '1.9');
  notch.setAttribute('stroke-linejoin', 'round');

  const label = document.createElementNS('http://www.w3.org/2000/svg', 'rect');

  label.setAttribute('x', '8');
  label.setAttribute('y', '13');
  label.setAttribute('width', '8');
  label.setAttribute('height', '5');
  label.setAttribute('rx', '1');
  label.setAttribute('fill', 'none');
  label.setAttribute('stroke', 'currentColor');
  label.setAttribute('stroke-width', '1.9');

  const slot = document.createElementNS('http://www.w3.org/2000/svg', 'path');

  slot.setAttribute('d', 'M15 3v5h1.5');
  slot.setAttribute('fill', 'none');
  slot.setAttribute('stroke', 'currentColor');
  slot.setAttribute('stroke-width', '1.9');
  slot.setAttribute('stroke-linecap', 'round');

  svg.append(
    body,
    notch,
    label,
    slot
  );

  return svg;
}

function createCancelXIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add(BIND_ICON_CLASS);

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

  path.setAttribute('d', 'M6 6l12 12M18 6 6 18');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '2.2');
  path.setAttribute('stroke-linecap', 'round');

  svg.appendChild(path);

  return svg;
}

function createHeaderIconButton({
  icon,
  label,
  active,
  onClick,
}) {
  const button = document.createElement('button');

  button.type = 'button';
  button.className = BIND_BUTTON_CLASS;
  button.setAttribute('aria-label', label);
  button.setAttribute('title', label);
  button.setAttribute('aria-pressed', active ? 'true' : 'false');

  if (active) {
    button.classList.add(BIND_BUTTON_ACTIVE_CLASS);
  }

  button.appendChild(createBindIcon(icon));

  button.addEventListener('mousedown', stopControlEvent);

  button.addEventListener('click', (event) => {
    stopControlEvent(event);
    onClick?.();
  });

  button.addEventListener('keydown', (event) => {
    if (
      event.code !== 'Enter' &&
      event.code !== 'Space'
    ) {
      return;
    }

    stopControlEvent(event);
    onClick?.();
  });

  return button;
}

function createBindIcon(icon) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add(BIND_ICON_CLASS);

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '2');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');

  if (icon === 'unlink') {
    path.setAttribute(
      'd',
      'M8.5 12.5 6 15a4 4 0 0 0 5.66 5.66l2.5-2.5M15.5 11.5 18 9a4 4 0 0 0-5.66-5.66l-2.5 2.5M3 3l18 18'
    );
  } else {
    path.setAttribute(
      'd',
      'M10 13a5 5 0 0 0 7.07 0l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15M14 11a5 5 0 0 0-7.07 0l-2 2A5 5 0 0 0 12 20.07l1.15-1.15'
    );
  }

  svg.appendChild(path);

  return svg;
}

function ensureFavoriteList({
  section,
  sourceList,
}) {
  let list = section.querySelector(`:scope > .${FAVORITES_LIST_CLASS}`);

  if (!list) {
    list = document.createElement('ul');

    const title = section.querySelector(`:scope > .${FAVORITES_TITLE_CLASS}`);

    if (title) {
      title.insertAdjacentElement('afterend', list);
    } else {
      section.appendChild(list);
    }
  }

  copyClassList({
    target: list,
    source: sourceList,
    hookClass: FAVORITES_LIST_CLASS,
  });

  return list;
}

function copyClassList({
  target,
  source,
  hookClass,
}) {
  if (!(target instanceof Element)) return;

  target.className = source?.className || '';
  target.classList.add(hookClass);
}

function removeLegacyEmptyElements(section) {
  section
    .querySelectorAll(`:scope > .${FAVORITES_EMPTY_CLASS}`)
    .forEach((element) => {
      element.remove();
    });
}

function syncFavoriteEmptyState({
  section,
  hasFavorites,
}) {
  let empty = section.querySelector(`:scope > .${FAVORITES_EMPTY_CLASS}`);

  if (hasFavorites) {
    empty?.remove();
    return;
  }

  if (!empty) {
    empty = document.createElement('p');
    empty.className = FAVORITES_EMPTY_CLASS;
  }

  empty.textContent = '최근 이모티콘을 Alt+클릭하면 즐겨찾기에 고정됩니다.';

  const list = section.querySelector(`:scope > .${FAVORITES_LIST_CLASS}`);

  if (list) {
    list.insertAdjacentElement('afterend', empty);
  } else {
    section.appendChild(empty);
  }
}

function partitionRecentItems({
  recentList,
  favoriteList,
  favoriteIds,
  favoriteIdSet,
}) {
  const allItems = collectEmoteItems({
    recentList,
    favoriteList,
  });

  const itemById = new Map();

  allItems.forEach((item) => {
    const id = getEmoteItemId(item);

    if (!id) return;
    if (itemById.has(id)) return;

    itemById.set(id, item);
  });

  const favoriteItems = favoriteIds
    .map((id) => itemById.get(id))
    .filter(Boolean);

  const favoriteItemSet = new Set(favoriteItems);

  const normalItems = allItems.filter((item) => {
    if (favoriteItemSet.has(item)) return false;

    const id = getEmoteItemId(item);

    if (!id) return false;

    return !favoriteIdSet.has(id);
  });

  return {
    favoriteItems,
    normalItems,
  };
}

function collectEmoteItems({
  recentList,
  favoriteList,
}) {
  const items = [
    ...Array.from(favoriteList.querySelectorAll(':scope > li')),
    ...Array.from(recentList.querySelectorAll(':scope > li')),
  ];

  return items.filter(isRealEmoteItem);
}

function isRealEmoteItem(item) {
  if (!(item instanceof HTMLElement)) return false;

  const button = item.querySelector('button[type="button"]');

  if (!button) return false;

  return isRealEmoteButton(button);
}

function getEmoteItemId(item) {
  const button = item.querySelector('button[type="button"]');

  if (!button) return '';

  const alt = getEmoteAltFromButton(button);

  return getRecentEmoteIdFromAlt(alt);
}

function applyPartition({
  favoriteList,
  recentList,
  favoriteItems,
  normalItems,
}) {
  placeChildren(favoriteList, favoriteItems);
  placeChildren(recentList, normalItems);

  pruneChildren(favoriteList, favoriteItems);
  pruneChildren(recentList, normalItems);
}

function placeChildren(parent, nextChildren) {
  nextChildren.forEach((child, index) => {
    const currentChild = parent.children[index];

    if (currentChild !== child) {
      parent.insertBefore(child, currentChild ?? null);
    }
  });
}

function pruneChildren(parent, nextChildren) {
  const nextSet = new Set(nextChildren);

  Array.from(parent.children).forEach((child) => {
    if (!nextSet.has(child)) {
      child.remove();
    }
  });
}

function removeFavoriteSection() {
  document
    .querySelectorAll(`.${FAVORITES_SECTION_CLASS}`)
    .forEach((section) => {
      section.remove();
    });
}

function startFavoriteSectionMutationObserver() {
  if (observer) return;

  observer = new MutationObserver((mutations) => {
    if (isRendering) return;

    const hasRelevantMutation = mutations.some((mutation) => {
      return isRelevantMutation(mutation);
    });

    if (!hasRelevantMutation) return;

    renderFavoriteEmoteSection();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      'class',
      'style',
      'aria-hidden',
      BADGE_TARGET_ATTR,
    ],
  });
}

function stopFavoriteSectionMutationObserver() {
  if (!observer) return;

  observer.disconnect();
  observer = null;
}

function isRelevantMutation(mutation) {
  if (isOwnFavoriteMutation(mutation)) return false;
  if (isBadgeMutation(mutation)) return false;

  if (mutation.type === 'attributes') {
    return isInsideEmotePanel(mutation.target);
  }

  if (mutation.type === 'childList') {
    return (
      hasRelevantNodes(mutation.addedNodes) ||
      hasRelevantNodes(mutation.removedNodes)
    );
  }

  return false;
}

function isOwnFavoriteMutation(mutation) {
  if (mutation.target instanceof Element) {
    if (mutation.target.closest(`.${FAVORITES_SECTION_CLASS}`)) {
      return true;
    }
  }

  return (
    areOnlyFavoriteNodes(mutation.addedNodes) &&
    areOnlyFavoriteNodes(mutation.removedNodes)
  );
}

function areOnlyFavoriteNodes(nodes) {
  if (!nodes || !nodes.length) return true;

  return Array.from(nodes).every((node) => {
    if (!(node instanceof Element)) return false;

    return (
      node.classList.contains(FAVORITES_SECTION_CLASS) ||
      Boolean(node.querySelector?.(`.${FAVORITES_SECTION_CLASS}`))
    );
  });
}

function isBadgeMutation(mutation) {
  if (mutation.type === 'attributes') {
    if (mutation.attributeName === BADGE_TARGET_ATTR) {
      return true;
    }

    if (mutation.target instanceof Element) {
      return Boolean(mutation.target.closest(`.${BADGE_CLASS}`));
    }
  }

  if (mutation.type === 'childList') {
    return (
      areOnlyBadgeNodes(mutation.addedNodes) &&
      areOnlyBadgeNodes(mutation.removedNodes)
    );
  }

  return false;
}

function areOnlyBadgeNodes(nodes) {
  if (!nodes || !nodes.length) return true;

  return Array.from(nodes).every((node) => {
    if (!(node instanceof Element)) return false;

    return (
      node.classList.contains(BADGE_CLASS) ||
      Boolean(node.querySelector?.(`.${BADGE_CLASS}`))
    );
  });
}

function hasRelevantNodes(nodes) {
  if (!nodes || !nodes.length) return false;

  return Array.from(nodes).some((node) => {
    if (!(node instanceof Element)) return false;

    if (node.closest?.(`.${FAVORITES_SECTION_CLASS}`)) return false;
    if (node.closest?.(`.${BADGE_CLASS}`)) return false;

    return (
      isInsideEmotePanel(node) ||
      Boolean(node.querySelector?.('#emoji_area')) ||
      Boolean(node.querySelector?.('li[id^="emoji_"]')) ||
      Boolean(node.querySelector?.('button[type="button"] img[alt^="{:"]'))
    );
  });
}

function isInsideEmotePanel(node) {
  if (!(node instanceof Element)) return false;

  const panel = findEmotePanel();

  return Boolean(panel && panel.contains(node));
}

function stopControlEvent(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeShortcutCode(value) {
  return normalizeStoredShortcutCode(value);
}