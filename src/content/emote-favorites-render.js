import {
  getEmoteAltFromButton,
  isEmoteButtonStructure,
} from './emote-buttons.js';

import {
  findEmotePanel,
} from './emote-panel.js';

import {
  findRecentEmoteSection,
  isRecentEmoteCategoryActive,
} from './emote-recent-section.js';

import {
  ensureFavoriteRecentEmoteAppended,
  getCachedFavoriteRecentEmotes,
  getCachedFavoriteRecentSetOrders,
  hasCustomFavoriteRecentSetOrder,
  resetFavoriteRecentSetOrder,
} from './favorite-recent-emote-storage.js';

import {
  getRecentEmoteId,
  getRecentEmoteIdFromAlt,
  readRecentEmotes,
  writeRecentEmotes,
} from './recent-emote-storage.js';

import {
  dispatchFavoritesChanged,
  getFavoritesChangedEventName,
} from './emote-favorites-event-name.js';

import {
  attachFavoriteEmoteDrag,
} from './emote-favorites-drag.js';

import {
  attachShortcutSetSwitchController,
  clearShortcutSetSwitchFloatingUi,
  isShortcutSetClickSuppressed,
} from './shortcut-set-switch-controller.js';

import {
  closeShortcutSetMenus,
  createShortcutSetMenuControl,
  SHORTCUT_SET_MENU_BUTTON_CLASS,
  SHORTCUT_SET_MENU_CLASS,
} from './shortcut-set-menu-controller.js';

import {
  FAVORITE_GROUP_BOUND,
  FAVORITE_GROUP_UNBOUND,
  getFavoriteGroupsForActiveSet,
} from './emote-favorite-groups.js';

import {
  EMOTE_BIND_MODE_ASSIGN,
  EMOTE_BIND_MODE_CHANGED_EVENT,
  EMOTE_BIND_MODE_CLEAR,
  EMOTE_BIND_MODE_RENAME,
  enterShortcutSetRenameMode,
  exitShortcutSetRenameMode,
  exitEmoteBindMode,
  getEmoteBindCodeLabel,
  getEmoteBindModeState,
  consumeEmoteBindPhaseFirstHint,
  getEmoteBindPhaseDescription,
  getNextEmoteBindPhase,
  isEmoteBindExperimentalKeyupEnabled,
  isEmoteBindSaving,
  setEmoteBindPhase,
  shouldShowEmoteBindPhaseFirstHint,
  setEmoteBindSaving,
  setShortcutSetRenameSaving,
  setShortcutSetRenameValue,
  toggleEmoteBindAssignMode,
  toggleEmoteBindClearMode,
} from './emote-bind-mode-state.js';

import {
  assignShortcutBindingTarget,
  clearShortcutBindingsByEmojiIds,
  getCachedShortcutBindings,
  createShortcutBindingSetId,
  getCachedActiveShortcutBindingSetId,
  getCachedShortcutBindingSetState,
  getShortcutBindingSetIndex,
  normalizeShortcutBindingSetCount,
  renameShortcutBindingSet,
  setActiveShortcutBindingSet,
  SHORTCUT_BINDINGS_CHANGED_EVENT,
  SHORTCUT_BINDING_SET_OFF,
  SHORTCUT_PHASE_BOTH,
  SHORTCUT_PHASE_DOWN,
  SHORTCUT_PHASE_UP,
} from './shortcut-storage.js';

import {
  scheduleBadgeUpdate,
} from './badge-overlay.js';

import {
  mergeFavoriteAndRecentEmotes,
} from './favorite-recent-merge.js';

import {
  getCachedRecentStorageLimit,
} from './recent-emote-storage-limit-bridge.js';

import {
  normalizeStoredShortcutCode,
} from '../shared/shortcut-key-code.js';

import {
  isShortcutSetNavigationCode,
} from './extension-settings-storage.js';

import {
  getShortcutSetFallbackLabel,
  getShortcutSetPreviewLabel,
  getShortcutSetSegmentLabel,
} from './shortcut-set-label.js';

const FAVORITES_SECTION_CLASS = 'emzk-lite-favorites-section';
const FAVORITES_TITLE_CLASS = 'emzk-lite-favorites-title';
const FAVORITES_LIST_CLASS = 'emzk-lite-favorites-list';
const FAVORITES_EMPTY_CLASS = 'emzk-lite-favorites-empty';
const FAVORITES_SEPARATOR_CLASS = 'emzk-lite-favorites-separator';
const FAVORITES_GROUP_ATTR = 'data-emzk-lite-favorite-group';

const FAVORITES_LABEL_CLASS = 'emzk-lite-favorites-label';
const FAVORITES_ACTIONS_CLASS = 'emzk-lite-favorites-actions';

const SHORTCUT_SET_ICON_CLASS = 'emzk-lite-shortcut-set-icon';
const SHORTCUT_SET_OFF_ICON_CLASS = 'emzk-lite-shortcut-set-off-icon';

const SHORTCUT_SET_SWITCH_CLASS = 'emzk-lite-shortcut-set-switch';
const SHORTCUT_SET_BUTTON_CLASS = 'emzk-lite-shortcut-set-button';
const SHORTCUT_SET_BUTTON_ACTIVE_CLASS = 'emzk-lite-shortcut-set-button-active';
const SHORTCUT_SET_LABEL_CLASS = 'emzk-lite-shortcut-set-label';
const SHORTCUT_SET_OFF_LABEL_CLASS = 'emzk-lite-shortcut-set-off-label';
const SHORTCUT_SET_SEGMENT_LABEL_ATTR = 'data-emzk-lite-shortcut-set-segment-label';
const SHORTCUT_SET_PREVIEW_LABEL_ATTR = 'data-emzk-lite-shortcut-set-preview-label';

const HEADER_SPACER_CLASS = 'emzk-lite-header-spacer';
const BIND_BUTTON_CLASS = 'emzk-lite-bind-button';
const BIND_BUTTON_ACTIVE_CLASS = 'emzk-lite-bind-button-active';
const BIND_BUTTON_DISABLED_CLASS = 'emzk-lite-bind-button-disabled';
const BIND_ICON_CLASS = 'emzk-lite-bind-icon';

const BIND_BAR_CLASS = 'emzk-lite-bind-bar';
const BIND_CLEAR_BAR_CLASS = 'emzk-lite-bind-clear-bar';
const BIND_LEFT_CLASS = 'emzk-lite-bind-left';
const BIND_VALUE_CLASS = 'emzk-lite-bind-value';
const BIND_HINT_CLASS = 'emzk-lite-bind-hint';
const RENAME_INPUT_CLASS = 'emzk-lite-rename-input';

const BIND_EMOTE_PREVIEW_CLASS = 'emzk-lite-bind-emote-preview';
const BIND_EMOTE_IMAGE_CLASS = 'emzk-lite-bind-emote-image';
const BIND_EMOTE_EMPTY_CLASS = 'emzk-lite-bind-emote-empty';

const BIND_PHASE_BUTTON_CLASS = 'emzk-lite-bind-phase-button';
const BIND_PHASE_BUTTON_ACTIVE_CLASS = 'emzk-lite-bind-phase-button-active';
const BIND_PHASE_FIRST_HINT_CLASS = 'emzk-lite-bind-phase-first-hint';
const BIND_PHASE_ICON_CLASS = 'emzk-lite-bind-phase-icon';

const BIND_ACTIONS_CLASS = 'emzk-lite-bind-actions';
const BIND_SAVE_BUTTON_CLASS = 'emzk-lite-bind-save-button';
const BIND_CANCEL_BUTTON_CLASS = 'emzk-lite-bind-cancel-button';

const FAVORITES_RENDER_STATE_ATTR = 'data-emzk-lite-favorites-state';
const FAVORITES_RENDER_STATE_PREPARING = 'preparing';
const FAVORITES_RENDER_STATE_READY = 'ready';

const BADGE_CLASS = 'emzk-lite-badge';
const BADGE_TARGET_ATTR = 'data-emzk-lite-badge-target';

const PHASE_FIRST_HINT_CONSUME_FALLBACK_MS = 420 * 3 + 160;

let phaseFirstHintConsumeScheduled = false;

let started = false;
let rafId = 0;
let observer = null;
let isRendering = false;

export function startFavoriteEmoteSectionRenderer() {
  if (started) return;

  started = true;

  document.addEventListener('click', handlePossibleFavoriteRender, true);
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
  exitShortcutSetRenameModeSilently();
  removeFavoriteSection();
  clearShortcutSetFloatingUi();
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
    clearShortcutSetFloatingUi();
    exitShortcutSetRenameModeSilently();
    return;
  }

  const area = getEmojiArea(panel);

  if (!area) {
    clearShortcutSetFloatingUi();
    exitShortcutSetRenameModeSilently();
    return;
  }

  if (!isRecentEmoteCategoryActive(panel)) {
    clearShortcutSetFloatingUi();
    exitShortcutSetRenameModeSilently();

    removeFavoriteSection(area);
    markFavoriteAreaReady(area);
    return;
  }

  const recentSection = findRecentEmoteSection(panel);

  if (!recentSection) {
    markFavoriteAreaReady(area);
    return;
  }

  const recentGroup = recentSection.heading?.parentElement;

  if (!recentGroup) {
    markFavoriteAreaReady(area);
    return;
  }

  const groupParent = recentGroup.parentElement;

  if (!groupParent) {
    markFavoriteAreaReady(area);
    return;
  }

  const recentList = recentSection.list;

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

	const favoriteGroups = getFavoriteGroupsForActiveSet({
		favorites: favoriteEmotes,
		activeSetId: getCachedActiveShortcutBindingSetId(),
		bindings: getCachedShortcutBindings(),
		setOrders: getCachedFavoriteRecentSetOrders(),
	});

	const boundFavoriteIds = favoriteGroups.mode === 'set'
		? favoriteGroups.boundIds
		: [];

	const unboundFavoriteIds = favoriteGroups.mode === 'set'
		? favoriteGroups.unboundIds
		: favoriteGroups.itemIds;

	const favoriteIds = favoriteGroups.itemIds;

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

		const reconciliation = reconcileFavoriteItems({
			recentList,
			favoriteList,
			boundFavoriteIds,
			unboundFavoriteIds,
			favoriteIdSet,
		});

		if (!reconciliation) {
			return;
		}

		const shouldShowSeparator =
			reconciliation.boundFavoriteItems.length > 0 &&
			reconciliation.unboundFavoriteItems.length > 0;

		const favoriteChildren = createFavoriteChildren({
			favoriteList,
			boundFavoriteItems: reconciliation.boundFavoriteItems,
			unboundFavoriteItems: reconciliation.unboundFavoriteItems,
			shouldShowSeparator,
		});

		applyFavoriteReconciliation({
			favoriteList,
			recentList,
			favoriteChildren,
			favoriteItems: reconciliation.favoriteItems,
			favoriteIdSet,
		});

    syncFavoriteEmptyState({
      section: favoriteSection,
      hasFavorites: reconciliation.favoriteItems.length > 0,
    });

    insertFavoriteSectionBeforeRecent({
      groupParent,
      section: favoriteSection,
      recentGroup,
    });

    if (reconciliation.favoriteItems.length) {
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
    if (target.closest(`.${BIND_PHASE_BUTTON_CLASS}`)) return;
    if (target.closest(`.${SHORTCUT_SET_BUTTON_CLASS}`)) return;
    if (target.closest(`.${SHORTCUT_SET_MENU_BUTTON_CLASS}`)) return;
    if (target.closest(`.${SHORTCUT_SET_MENU_CLASS}`)) return;
    if (target.closest(`.${RENAME_INPUT_CLASS}`)) return;

    closeShortcutSetMenus();
    exitShortcutSetRenameModeOnPanelClick(target);
  }

  scheduleFavoriteEmoteSectionRender();
}

function exitShortcutSetRenameModeOnPanelClick(target) {
  const bindState = getEmoteBindModeState();

  if (bindState.mode !== EMOTE_BIND_MODE_RENAME) {
    return false;
  }

  if (!(target instanceof Element)) {
    return false;
  }

  const panel = findEmotePanel();

  if (!panel || !panel.contains(target)) {
    return false;
  }

  exitShortcutSetRenameModeSilently();
  return true;
}

function handleShortcutBindingsChanged() {
  const bindState = getEmoteBindModeState();

  if (
    bindState.mode === EMOTE_BIND_MODE_ASSIGN ||
    bindState.mode === EMOTE_BIND_MODE_CLEAR ||
    bindState.mode === EMOTE_BIND_MODE_RENAME
  ) {
    exitEmoteBindMode();

    scheduleFavoriteEmoteSectionRender();
    scheduleBadgeUpdate();

    return;
  }

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

  if (bindState.mode === EMOTE_BIND_MODE_RENAME) {
    title.setAttribute('data-emzk-lite-bind-mode', EMOTE_BIND_MODE_RENAME);

    if (previousMode === EMOTE_BIND_MODE_RENAME) {
      syncRenameTitleContent({
        title,
        bindState,
      });
      return;
    }

    title.replaceChildren(createRenameTitleContent(bindState));
    return;
  }

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
   * assign / clear / rename에서 기본 모드로 돌아온 경우는 기본 헤더 구조를 다시 만든다.
   */
  if (
    previousMode === EMOTE_BIND_MODE_ASSIGN ||
    previousMode === EMOTE_BIND_MODE_CLEAR ||
    previousMode === EMOTE_BIND_MODE_RENAME
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
  const shortcutsOff = isShortcutBindingOff();

  const label = document.createElement('span');
  label.className = FAVORITES_LABEL_CLASS;
  label.textContent = '즐겨찾기';

  const actions = document.createElement('span');
  actions.className = FAVORITES_ACTIONS_CLASS;

  actions.append(
    createShortcutSetSwitch(),
    createShortcutSetMenuControl(getShortcutSetMenuControlOptions()),
    createHeaderSpacer(),
    createHeaderIconButton({
      icon: 'link',
      label: '단축키 지정',
      title: shortcutsOff
        ? 'OFF 상태에서는 단축키를 지정할 수 없습니다.'
        : '단축키 지정',
      active: !shortcutsOff && bindState.mode === EMOTE_BIND_MODE_ASSIGN,
      disabled: shortcutsOff,
      onClick: toggleAssignModeIfShortcutEnabled,
    }),
    createHeaderIconButton({
      icon: 'unlink',
      label: bindState.mode === EMOTE_BIND_MODE_CLEAR ? '해제 중' : '해제',
      title: shortcutsOff
        ? 'OFF 상태에서는 단축키를 해제할 수 없습니다.'
        : bindState.mode === EMOTE_BIND_MODE_CLEAR
          ? '해제 중'
          : '해제',
      active: !shortcutsOff && bindState.mode === EMOTE_BIND_MODE_CLEAR,
      disabled: shortcutsOff,
      onClick: toggleClearModeIfShortcutEnabled,
    })
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

  const activeSetId = getCachedActiveShortcutBindingSetId();
  const sets = getShortcutSetSwitchOptions();

  syncShortcutSetSwitchMetrics({
    wrapper,
    sets,
    activeSetId,
  });

  createShortcutSetButtons({
    sets,
    activeSetId,
  }).forEach((button) => {
    wrapper.appendChild(button);
  });

  attachShortcutSetSwitchController({
    wrapper,
    getSets: getShortcutSetSwitchOptions,
    getActiveSetId: getCachedActiveShortcutBindingSetId,
    switchSet: switchShortcutSet,
    closeMenu: closeShortcutSetMenus,
  });

  return wrapper;
}

function updateShortcutSetSwitch(wrapper) {
  const activeSetId = getCachedActiveShortcutBindingSetId();
  const sets = getShortcutSetSwitchOptions();

  syncShortcutSetSwitchMetrics({
    wrapper,
    sets,
    activeSetId,
  });

  if (shouldRebuildShortcutSetSwitch({
    wrapper,
    sets,
  })) {
    wrapper.replaceChildren(
      ...createShortcutSetButtons({
        sets,
        activeSetId,
      })
    );

    return;
  }

  sets.forEach((set) => {
    const setId = normalizeShortcutSetId(set?.id);

    if (!setId) return;

    const button = wrapper.querySelector(
      `:scope > .${SHORTCUT_SET_BUTTON_CLASS}[data-emzk-lite-shortcut-set-id="${setId}"]`
    );

    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const segmentLabel = normalizeText(set?.segmentLabel) ||
      getShortcutSetSegmentLabel(setId);

    const previewLabel = normalizeText(set?.previewLabel) ||
      getShortcutSetPreviewLabel({
        setId,
        label: set?.label,
      });

    const active = setId === activeSetId;

    button.setAttribute(SHORTCUT_SET_SEGMENT_LABEL_ATTR, segmentLabel);
    button.setAttribute(SHORTCUT_SET_PREVIEW_LABEL_ATTR, previewLabel);

    syncShortcutSetButtonContent({
      button,
      setId,
      segmentLabel,
    });

    button.setAttribute('aria-label', getShortcutSetButtonAriaLabel({
      setId,
      segmentLabel,
      previewLabel,
    }));

    button.setAttribute('title', getShortcutSetButtonTitle({
      setId,
      segmentLabel,
      previewLabel,
    }));

    button.setAttribute('aria-pressed', active ? 'true' : 'false');
    button.classList.toggle(SHORTCUT_SET_BUTTON_ACTIVE_CLASS, active);
  });
}

function syncShortcutSetSwitchMetrics({
  wrapper,
  sets,
  activeSetId,
}) {
  const activeIndex = getShortcutSetActiveIndex({
    sets,
    activeSetId,
  });

  wrapper.style.setProperty(
    '--emzk-lite-shortcut-set-count',
    String(sets.length)
  );

  wrapper.style.setProperty(
    '--emzk-lite-shortcut-set-active-index',
    String(activeIndex)
  );

  wrapper.setAttribute(
    'data-emzk-lite-shortcut-set-count',
    String(sets.length)
  );

  wrapper.setAttribute(
    'data-emzk-lite-active-shortcut-set',
    String(activeIndex)
  );

  wrapper.parentElement?.style.setProperty(
    '--emzk-lite-shortcut-set-count',
    String(sets.length)
  );
}

function getShortcutSetActiveIndex({
  sets,
  activeSetId,
}) {
  const normalizedActiveSetId = normalizeShortcutSetId(activeSetId);
  const activeIndex = sets.findIndex((set) => {
    return normalizeShortcutSetId(set?.id) === normalizedActiveSetId;
  });

  return Math.max(0, activeIndex);
}

function getShortcutSetSwitchOptions() {
  const setState = getCachedShortcutBindingSetState();
  const setCount = normalizeShortcutBindingSetCount(setState?.setCount);
  const storedSets = Array.isArray(setState?.sets)
    ? setState.sets
    : [];

  const storedSetById = new Map();

  storedSets.forEach((set) => {
    const setId = normalizeShortcutSetId(set?.id);

    if (!setId || setId === SHORTCUT_BINDING_SET_OFF) {
      return;
    }

    storedSetById.set(setId, set);
  });

  const visibleSets = Array.from({
    length: setCount,
  }, (_, index) => {
    const setIndex = index + 1;
    const setId = createShortcutBindingSetId(setIndex);
    const storedSet = storedSetById.get(setId);

    const label = storedSet?.label;

    return {
      id: setId,
      label,
      segmentLabel: getShortcutSetSegmentLabel({
        setId,
        label,
      }),
      previewLabel: getShortcutSetPreviewLabel({
        setId,
        label,
      }),
    };
  });

  return [
    {
      id: SHORTCUT_BINDING_SET_OFF,
      segmentLabel: 'OFF',
      previewLabel: '🌐',
    },
    ...visibleSets,
  ];
}

function createShortcutSetButtons({
  sets,
  activeSetId,
}) {
  return sets
    .map((set) => {
      const setId = normalizeShortcutSetId(set?.id);

      if (!setId) return null;

      const segmentLabel = normalizeText(set?.segmentLabel) ||
        getShortcutSetSegmentLabel(setId);

      const previewLabel = normalizeText(set?.previewLabel) ||
        getShortcutSetPreviewLabel({
          setId,
          label: set?.label,
        });

      return createShortcutSetButton({
        setId,
        segmentLabel,
        previewLabel,
        active: setId === activeSetId,
      });
    })
    .filter(Boolean);
}

function shouldRebuildShortcutSetSwitch({
  wrapper,
  sets,
}) {
  const buttons = Array.from(
    wrapper.querySelectorAll(`:scope > .${SHORTCUT_SET_BUTTON_CLASS}`)
  );

  const expectedSetIds = sets
    .map((set) => normalizeShortcutSetId(set?.id))
    .filter(Boolean);

  const currentSetIds = buttons
    .map((button) => normalizeShortcutSetId(
      button.getAttribute('data-emzk-lite-shortcut-set-id')
    ))
    .filter(Boolean);

  if (currentSetIds.length !== expectedSetIds.length) {
    return true;
  }

  return expectedSetIds.some((setId) => {
    return !currentSetIds.includes(setId);
  });
}

function syncDefaultHeaderActionButtons({
  actions,
  bindState,
}) {
  const shortcutsOff = isShortcutBindingOff();

  actions.replaceChildren(
    createShortcutSetSwitch(),
    createShortcutSetMenuControl(getShortcutSetMenuControlOptions()),
    createHeaderSpacer(),
    createHeaderIconButton({
      icon: 'link',
      label: '단축키 지정',
      title: shortcutsOff
        ? 'OFF 상태에서는 단축키를 지정할 수 없습니다.'
        : '단축키 지정',
      active: !shortcutsOff && bindState.mode === EMOTE_BIND_MODE_ASSIGN,
      disabled: shortcutsOff,
      onClick: toggleAssignModeIfShortcutEnabled,
    }),
    createHeaderIconButton({
      icon: 'unlink',
      label: bindState.mode === EMOTE_BIND_MODE_CLEAR ? '해제 중' : '해제',
      title: shortcutsOff
        ? 'OFF 상태에서는 단축키를 해제할 수 없습니다.'
        : bindState.mode === EMOTE_BIND_MODE_CLEAR
          ? '해제 중'
          : '해제',
      active: !shortcutsOff && bindState.mode === EMOTE_BIND_MODE_CLEAR,
      disabled: shortcutsOff,
      onClick: toggleClearModeIfShortcutEnabled,
    })
  );
}


function createShortcutSetButton({
  setId,
  segmentLabel,
  previewLabel,
  active,
}) {
  const button = document.createElement('button');

  button.type = 'button';
  button.className = SHORTCUT_SET_BUTTON_CLASS;
  button.setAttribute('data-emzk-lite-shortcut-set-id', setId);
  button.setAttribute(SHORTCUT_SET_SEGMENT_LABEL_ATTR, segmentLabel);
  button.setAttribute(SHORTCUT_SET_PREVIEW_LABEL_ATTR, previewLabel);

  button.setAttribute('aria-label', getShortcutSetButtonAriaLabel({
    setId,
    segmentLabel,
    previewLabel,
  }));

  button.setAttribute('title', getShortcutSetButtonTitle({
    setId,
    segmentLabel,
    previewLabel,
  }));

  button.setAttribute('aria-pressed', active ? 'true' : 'false');
  button.setAttribute('draggable', 'false');

  syncShortcutSetButtonContent({
    button,
    setId,
    segmentLabel,
  });

  if (active) {
    button.classList.add(SHORTCUT_SET_BUTTON_ACTIVE_CLASS);
  }

  button.addEventListener('mousedown', stopControlEvent);

  button.addEventListener('click', (event) => {
    stopControlEvent(event);

    if (isShortcutSetClickSuppressed(button)) {
      return;
    }

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

function syncShortcutSetButtonContent({
  button,
  setId,
  segmentLabel,
}) {
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  if (setId === SHORTCUT_BINDING_SET_OFF) {
    const offLabel = button.querySelector(
      `:scope > .${SHORTCUT_SET_OFF_LABEL_CLASS}`
    );

    if (offLabel) {
      button.replaceChildren(offLabel);
      return;
    }

    button.replaceChildren(createShortcutSetOffIcon());
    return;
  }

  const labelElement = document.createElement('span');

  labelElement.className = SHORTCUT_SET_LABEL_CLASS;
  labelElement.textContent = segmentLabel;

  button.replaceChildren(labelElement);
}

function createShortcutSetOffIcon() {
  const wrapper = document.createElement('span');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

  wrapper.classList.add(
    SHORTCUT_SET_LABEL_CLASS,
    SHORTCUT_SET_OFF_LABEL_CLASS
  );

  svg.setAttribute('viewBox', '0 0 12 12');
  svg.setAttribute('width', '12');
  svg.setAttribute('height', '12');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add(
    SHORTCUT_SET_ICON_CLASS,
    SHORTCUT_SET_OFF_ICON_CLASS
  );

  appendAsteriskLine(svg, 6, 2.2, 6, 9.8);
  appendAsteriskLine(svg, 2.6, 4.1, 9.4, 7.9);
  appendAsteriskLine(svg, 9.4, 4.1, 2.6, 7.9);

  wrapper.appendChild(svg);

  return wrapper;
}

function appendAsteriskLine(svg, x1, y1, x2, y2) {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');

  line.setAttribute('x1', String(x1));
  line.setAttribute('y1', String(y1));
  line.setAttribute('x2', String(x2));
  line.setAttribute('y2', String(y2));
  line.setAttribute('stroke', 'currentColor');
  line.setAttribute('stroke-width', '2');
  line.setAttribute('stroke-linecap', 'round');

  svg.appendChild(line);
}
function isShortcutSetButtonCurrentlyActive(setId) {
  return getCachedActiveShortcutBindingSetId() === normalizeShortcutSetId(setId);
}

async function switchShortcutSet(setId) {
  const normalizedSetId = normalizeShortcutSetId(setId);

  if (!normalizedSetId) {
    return;
  }

  closeShortcutSetMenus();
  exitEmoteBindMode();

  await setActiveShortcutBindingSet(normalizedSetId);

  scheduleFavoriteEmoteSectionRender();
  scheduleBadgeUpdate();
}

function normalizeShortcutSetId(setId) {
  const normalizedSetId = normalizeText(setId);

  if (normalizedSetId === SHORTCUT_BINDING_SET_OFF) {
    return SHORTCUT_BINDING_SET_OFF;
  }

  const setIndex = getShortcutBindingSetIndex(normalizedSetId);

  return createShortcutBindingSetId(setIndex);
}

function getShortcutSetButtonAriaLabel({
  setId,
  previewLabel,
}) {
  if (setId === SHORTCUT_BINDING_SET_OFF) {
    return '';
  }

  const fallbackLabel = getShortcutSetFallbackLabel(setId);

  if (
    previewLabel &&
    previewLabel !== fallbackLabel
  ) {
    return `단축키 세트 ${fallbackLabel}: ${previewLabel}`;
  }

  return `단축키 세트 ${fallbackLabel}`;
}

function getShortcutSetButtonTitle({
  setId,
  previewLabel,
}) {
  if (setId === SHORTCUT_BINDING_SET_OFF) {
    return '전체 목록';
  }

  const fallbackLabel = getShortcutSetFallbackLabel(setId);

  if (
    previewLabel &&
    previewLabel !== fallbackLabel
  ) {
    return `세트 ${fallbackLabel}: ${previewLabel}`;
  }

  return `단축키 세트 ${fallbackLabel}`;
}

function isShortcutBindingOff() {
  return getCachedActiveShortcutBindingSetId() === SHORTCUT_BINDING_SET_OFF;
}

function toggleAssignModeIfShortcutEnabled() {
  if (isShortcutBindingOff()) return;

  closeShortcutSetMenus();
  exitShortcutSetRenameModeSilently();
  toggleEmoteBindAssignMode();
}

function toggleClearModeIfShortcutEnabled() {
  if (isShortcutBindingOff()) return;

  closeShortcutSetMenus();
  exitShortcutSetRenameModeSilently();
  toggleEmoteBindClearMode();
}

function createAssignTitleContent(bindState) {
  const bar = document.createElement('span');
  bar.className = BIND_BAR_CLASS;

  const left = document.createElement('span');
  left.className = BIND_LEFT_CLASS;

  left.appendChild(createSelectedEmotePreview(bindState));

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
  if (bindState?.isSaving) {
    return '단축키를 저장하는 중입니다.';
  }

  const hasSelectedEmote = Boolean(
    normalizeText(bindState?.selectedEmojiId)
  );

  const selectedCode = normalizeShortcutCode(bindState?.selectedCode);

  if (!hasSelectedEmote) {
    return '단축키를 지정할 이모티콘을 선택하세요.';
  }

  if (!selectedCode) {
    return '등록할 키를 입력하세요. Space와 Enter는 등록되지 않습니다. Escape를 누르면 취소됩니다.';
  }
	if (isShortcutSetNavigationCode(selectedCode)) {
		return '세트 전환 단축키와 중복됩니다. 다른 키를 입력하세요.';
	}

  return `${getEmoteBindCodeLabel(selectedCode)} 단축키가 선택되었습니다. 다른 키를 누르면 저장 전 단축키를 바꿀 수 있습니다.`;
}

function getAssignHintText(bindState) {
  if (bindState?.isSaving) {
    return '저장 중';
  }

  const hasSelectedEmote = Boolean(
    normalizeText(bindState?.selectedEmojiId)
  );

  const selectedCode = normalizeShortcutCode(bindState?.selectedCode);

  if (!hasSelectedEmote) {
    return '이모티콘 선택';
  }

  if (!selectedCode) {
    return '키 입력';
  }

	if (isShortcutSetNavigationCode(selectedCode)) {
		return '세트 전환 키와 중복';
	}

  return `${getEmoteBindCodeLabel(selectedCode)}`;
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
    return '해제할 이모티콘 선택';
  }

  return `${selectedCount}개 선택됨`;
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

function createPhaseToggleButton(bindState) {
  const currentPhase = normalizeRenderPhase(bindState.selectedPhase);
  const nextPhase = getNextEmoteBindPhase(currentPhase);
  const phaseDescription = getEmoteBindPhaseDescription(currentPhase);

  const button = document.createElement('button');

  button.type = 'button';
  button.className = BIND_PHASE_BUTTON_CLASS;
  button.classList.add(BIND_PHASE_BUTTON_ACTIVE_CLASS);

  if (shouldShowEmoteBindPhaseFirstHint()) {
    button.classList.add(BIND_PHASE_FIRST_HINT_CLASS);
    scheduleConsumePhaseFirstHintAfterAnimation(button);
  }

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

    /*
     * keyListening 중 Enter/Space가 단축키 입력과 섞이는 걸 피한다.
     * phase는 마우스 클릭으로 바꾸는 쪽이 안전하다.
     */
    if (bindState?.keyListening) {
      return;
    }

    setEmoteBindPhase(nextPhase);
  });

  return button;
}

function scheduleConsumePhaseFirstHintAfterAnimation(button) {
  if (phaseFirstHintConsumeScheduled) {
    return;
  }

  phaseFirstHintConsumeScheduled = true;

  let finished = false;

  const fallbackTimer = window.setTimeout(() => {
    finish();
  }, PHASE_FIRST_HINT_CONSUME_FALLBACK_MS);

  function handleAnimationEnd(event) {
    if (event.target !== button) {
      return;
    }

    finish();
  }

  function finish() {
    if (finished) {
      return;
    }

    finished = true;

    window.clearTimeout(fallbackTimer);
    button.removeEventListener('animationend', handleAnimationEnd);

    void consumeEmoteBindPhaseFirstHint()
      .catch((error) => {
        console.debug(
          '[Emozzk Lite] failed to consume phase hint pending:',
          error
        );
      })
      .finally(() => {
        phaseFirstHintConsumeScheduled = false;
      });
  }

  button.addEventListener('animationend', handleAnimationEnd);
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

  return path;
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

    const currentState = getEmoteBindModeState();

    if (
      !canSaveAssignState(currentState) ||
      isEmoteBindSaving()
    ) {
      return;
    }

    void saveAssignState(currentState)
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

    const currentState = getEmoteBindModeState();

    if (
      !canSaveClearState(currentState) ||
      isEmoteBindSaving()
    ) {
      return;
    }

    void saveClearState(currentState)
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

    const favoriteResult = await ensureFavoriteRecentEmoteAppended({
      emojiId: bindState.selectedEmojiId,
      imageUrl: bindState.selectedEmojiImageUrl,
    });

    if (favoriteResult.changed) {
      const mergedRecentEmotes = syncRecentLocalStorageWithFavorites({
        favorites: favoriteResult.favorites,
      });

      dispatchFavoritesChanged({
        emojiId: bindState.selectedEmojiId,
        added: favoriteResult.added,
        removed: favoriteResult.removed,
        source: 'bind',
        favorites: favoriteResult.favorites,
        mergedRecentEmotes,
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
    await clearShortcutBindingsByEmojiIds({
			emojiIds,
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

function syncRecentLocalStorageWithFavorites({
  favorites,
}) {
  const recent = readRecentEmotes();

  const merged = mergeFavoriteAndRecentEmotes({
    favorites,
    recent,
    maxRecentEmoteCount: getCachedRecentStorageLimit(),
  });

  writeRecentEmotes(merged);

  return merged;
}

function canSaveAssignState(bindState) {
  if (
    bindState?.isSaving ||
    isShortcutBindingOff()
  ) {
    return false;
  }

  const selectedCode = normalizeShortcutCode(
    bindState?.selectedCode
  );

  if (
    !selectedCode ||
    isShortcutSetNavigationCode(selectedCode)
  ) {
    return false;
  }

  return Boolean(
    normalizeText(bindState?.selectedEmojiId) &&
    normalizeRenderPhase(bindState?.selectedPhase)
  );
}

function canSaveClearState(bindState) {
  if (
    bindState?.isSaving ||
    isShortcutBindingOff()
  ) {
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

function createHeaderSpacer() {
  const spacer = document.createElement('span');

  spacer.className = HEADER_SPACER_CLASS;
  spacer.setAttribute('aria-hidden', 'true');

  return spacer;
}

function getShortcutSetMenuControlOptions() {
  const shortcutsOff = isShortcutBindingOff();
  const activeSetId = getCachedActiveShortcutBindingSetId();

  return {
    disabled: shortcutsOff,
    disabledTitle: 'OFF 상태에서는 컨텍스트 메뉴를 사용할 수 없습니다.',
    activeSetId,
    hasCustomOrder: hasCustomFavoriteRecentSetOrder(activeSetId),
    onRename: startShortcutSetRenameMode,
    onResetOrder: resetShortcutSetFavoriteOrder,
    stopControlEvent,
  };
}

function createHeaderIconButton({
  icon,
  label,
  title = label,
  active,
  disabled = false,
  onClick,
}) {
  const button = document.createElement('button');

  button.type = 'button';
  button.className = BIND_BUTTON_CLASS;
  button.setAttribute('aria-label', label);
  button.setAttribute('title', title || label);
  button.setAttribute('aria-pressed', active ? 'true' : 'false');

  if (active) {
    button.classList.add(BIND_BUTTON_ACTIVE_CLASS);
  }

  if (disabled) {
    button.disabled = true;
    button.classList.add(BIND_BUTTON_DISABLED_CLASS);
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

  if (icon === 'edit') {
    path.setAttribute(
      'd',
      'M4 20h4.5L19 9.5a2.1 2.1 0 0 0-3-3L5.5 17 4 20ZM13.5 8 16 10.5'
    );
  } else if (icon === 'unlink') {
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

function reconcileFavoriteItems({
  recentList,
  favoriteList,
  boundFavoriteIds,
  unboundFavoriteIds,
  favoriteIdSet,
}) {
	const currentFavoriteItems =
		collectEmoteItemsFrom(favoriteList);

	const recentItems =
		collectEmoteItemsFrom(recentList);

	const allItems = [
		...currentFavoriteItems,
		...recentItems,
	];

	const recentEmotes = readRecentEmotes();

  /*
   * 저장된 최근 목록은 있는데 DOM 항목이 하나도 없다면
   * CHZZK가 아직 목록을 만드는 중인 상태로 본다.
   *
   * 이 상태에서는 DOM을 수정하지 않는다.
   */
	const expectedRecentIds = recentEmotes
		.map(getRecentEmoteId)
		.filter((id) => {
			return (
				id &&
				!favoriteIdSet.has(id)
			);
		});

	if (
		recentItems.length === 0 &&
		expectedRecentIds.length > 0
	) {
		return null;
	}

  const recentOrderIds = recentEmotes
    .map(getRecentEmoteId)
    .filter(Boolean);

  /*
   * 즐겨찾기에서 해제된 실제 노드는 삭제하지 않고
   * recentList로 되돌린다.
   */
  moveRemovedFavoritesBackToRecent({
    favoriteList,
    recentList,
    favoriteIdSet,
    recentOrderIds,
  });

  const itemById = new Map();

  allItems.forEach((item) => {
    const id = getEmoteItemId(item);

    if (!id) return;
    if (itemById.has(id)) return;

    itemById.set(id, item);
  });

  const boundFavoriteItems = boundFavoriteIds
    .map((id) => itemById.get(id))
    .filter(Boolean);

  const unboundFavoriteItems = unboundFavoriteIds
    .map((id) => itemById.get(id))
    .filter(Boolean);

  const favoriteItems = [
    ...boundFavoriteItems,
    ...unboundFavoriteItems,
  ];

  const boundFavoriteIdSet = new Set(boundFavoriteIds);

  favoriteItems.forEach((item) => {
    const id = getEmoteItemId(item);

    const group = boundFavoriteIdSet.has(id)
      ? FAVORITE_GROUP_BOUND
      : FAVORITE_GROUP_UNBOUND;

    item.setAttribute(
      FAVORITES_GROUP_ATTR,
      group
    );
  });

  return {
    boundFavoriteItems,
    unboundFavoriteItems,
    favoriteItems,
  };
}

function createFavoriteChildren({
  favoriteList,
  boundFavoriteItems,
  unboundFavoriteItems,
  shouldShowSeparator,
}) {
  const children = [
    ...boundFavoriteItems,
  ];

  if (shouldShowSeparator) {
    children.push(getFavoriteSeparator(favoriteList));
  }

  children.push(...unboundFavoriteItems);

  return children;
}

function getFavoriteSeparator(favoriteList) {
  const existingSeparator = favoriteList.querySelector(
    `:scope > .${FAVORITES_SEPARATOR_CLASS}`
  );

  if (existingSeparator instanceof HTMLElement) {
    return existingSeparator;
  }

  const separator = document.createElement('li');

  separator.className = FAVORITES_SEPARATOR_CLASS;
  separator.setAttribute('role', 'separator');
  separator.setAttribute('aria-label', '일반 즐겨찾기');
  separator.setAttribute('draggable', 'false');

  return separator;
}

function collectEmoteItemsFrom(list) {
  if (!(list instanceof Element)) {
    return [];
  }

  return Array.from(
    list.querySelectorAll(':scope > li')
  )
    .filter(isEmoteItemStructure);
}

function isEmoteItemStructure(item) {
  if (!(item instanceof HTMLElement)) {
    return false;
  }

  const button = item.querySelector(
    'button[type="button"]'
  );

  return isEmoteButtonStructure(button);
}

function getEmoteItemId(item) {
  const button = item.querySelector('button[type="button"]');

  if (!button) return '';

  const alt = getEmoteAltFromButton(button);

  return getRecentEmoteIdFromAlt(alt);
}

function applyFavoriteReconciliation({
  favoriteList,
  recentList,
  favoriteChildren,
  favoriteItems,
  favoriteIdSet,
}) {
  removeFavoriteDuplicatesFromRecent({
    recentList,
    favoriteItems,
    favoriteIdSet,
  });

  placeChildren(
    favoriteList,
    favoriteChildren
  );

  pruneFavoriteListChildren({
    favoriteList,
    favoriteChildren,
    favoriteItems,
  });
}

function removeFavoriteDuplicatesFromRecent({
  recentList,
  favoriteItems,
  favoriteIdSet,
}) {
  const selectedItemById = new Map();

  favoriteItems.forEach((item) => {
    const id = getEmoteItemId(item);

    if (!id) return;

    selectedItemById.set(id, item);
  });

  Array.from(recentList.children).forEach((item) => {
    const id = getEmoteItemId(item);

    if (!id) return;
    if (!favoriteIdSet.has(id)) return;

    const selectedItem = selectedItemById.get(id);

    /*
     * 아직 사용할 실제 favorite 노드를 찾지 못한 상태라면
     * recent 원본을 삭제하지 않는다.
     */
    if (!selectedItem) return;

    /*
     * 이 노드 자체가 앞으로 favoriteList로 이동할 대상이면 유지한다.
     */
    if (selectedItem === item) return;

    /*
     * 같은 ID의 실제 favorite 노드가 이미 따로 있으므로
     * CHZZK가 recent에 다시 생성한 중복 노드만 제거한다.
     */
    item.remove();
  });
}

function placeChildren(parent, nextChildren) {
  nextChildren.forEach((child, index) => {
    const currentChild = parent.children[index];

    if (currentChild !== child) {
      parent.insertBefore(child, currentChild ?? null);
    }
  });
}

function pruneFavoriteListChildren({
  favoriteList,
  favoriteChildren,
  favoriteItems,
}) {
  const nextChildSet = new Set(favoriteChildren);
  const selectedItemById = new Map();

  favoriteItems.forEach((item) => {
    const id = getEmoteItemId(item);

    if (!id) return;

    selectedItemById.set(id, item);
  });

  Array.from(favoriteList.children).forEach((child) => {
    if (nextChildSet.has(child)) {
      return;
    }

    if (
      child.classList.contains(
        FAVORITES_SEPARATOR_CLASS
      )
    ) {
      child.remove();
      return;
    }

    const id = getEmoteItemId(child);

    /*
     * 구조가 아직 완성되지 않은 노드는
     * 불확실하므로 건드리지 않는다.
     */
    if (!id) {
      return;
    }

    const selectedItem = selectedItemById.get(id);

    /*
     * 동일 ID의 선택된 실제 노드가 따로 있을 때만
     * 중복 노드를 제거한다.
     */
    if (
      selectedItem &&
      selectedItem !== child
    ) {
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

    scheduleFavoriteEmoteSectionRender();
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
      node.matches?.('#emoji_area') ||
      Boolean(node.querySelector?.('#emoji_area'))
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

function createRenameTitleContent(bindState) {
  const bar = document.createElement('span');

  bar.className = BIND_BAR_CLASS;

  const left = document.createElement('span');
  left.className = BIND_LEFT_CLASS;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = RENAME_INPUT_CLASS;
  input.value = bindState.renameValue;
  input.placeholder = getShortcutSetFallbackLabel(
    getCachedActiveShortcutBindingSetId()
  );
  input.setAttribute('aria-label', '세트 이름');
  input.setAttribute('title', '현재 세트의 이름을 입력하세요.');

  input.addEventListener('mousedown', (event) => {
    event.stopPropagation();
  });

  input.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  input.addEventListener('input', () => {
    setShortcutSetRenameValue(input.value);
  });

  input.addEventListener('keydown', (event) => {
    if (event.code === 'Escape') {
      stopControlEvent(event);
      cancelShortcutSetRenameMode();
      return;
    }

    if (event.code === 'Enter') {
      stopControlEvent(event);

      void saveShortcutSetRenameMode()
        .catch((error) => {
          console.error('[Emozzk Lite] failed to rename shortcut set:', error);
        });
    }
  });

  left.appendChild(input);

  bar.append(
    left,
    createRenameActionButtons(bindState)
  );

  requestAnimationFrame(() => {
    input.focus();
    input.select();
  });

  return bar;
}

function syncRenameTitleContent({
  title,
  bindState,
}) {
  const input = title.querySelector(`:scope .${RENAME_INPUT_CLASS}`);

  if (!(input instanceof HTMLInputElement)) {
    title.replaceChildren(createRenameTitleContent(bindState));
    return;
  }

  if (
    document.activeElement !== input &&
    input.value !== bindState.renameValue
  ) {
    input.value = bindState.renameValue;
  }

  const saveButton = title.querySelector(`:scope .${BIND_SAVE_BUTTON_CLASS}`);
  const cancelButton = title.querySelector(`:scope .${BIND_CANCEL_BUTTON_CLASS}`);

  syncRenameButtonState({
    button: saveButton,
    label: bindState.renameSaving ? '저장 중' : '세트 이름 저장',
    disabled: bindState.renameSaving,
  });

  syncRenameButtonState({
    button: cancelButton,
    label: bindState.renameSaving ? '저장 중' : '세트 이름 변경 취소',
    disabled: bindState.renameSaving,
  });
}

function syncRenameButtonState({
  button,
  label,
  disabled,
}) {
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  button.disabled = Boolean(disabled);
  button.setAttribute('aria-label', label);
  button.setAttribute('title', label);
  button.classList.toggle(BIND_BUTTON_DISABLED_CLASS, Boolean(disabled));
}

function createRenameActionButtons(bindState) {
  const actions = document.createElement('span');

  actions.className = BIND_ACTIONS_CLASS;

  actions.append(
    createRenameSaveButton(bindState),
    createRenameCancelButton(bindState)
  );

  return actions;
}

function createRenameSaveButton(bindState) {
  const button = document.createElement('button');

  const saveLabel = bindState.renameSaving
    ? '저장 중'
    : '세트 이름 저장';

  button.type = 'button';
  button.className = BIND_BUTTON_CLASS;
  button.classList.add(BIND_SAVE_BUTTON_CLASS);
  button.setAttribute('aria-label', saveLabel);
  button.setAttribute('title', saveLabel);

  if (bindState.renameSaving) {
    button.disabled = true;
    button.classList.add(BIND_BUTTON_DISABLED_CLASS);
  }

  button.appendChild(createSaveFloppyIcon());

  button.addEventListener('mousedown', stopControlEvent);

  button.addEventListener('click', (event) => {
    stopControlEvent(event);

    if (getEmoteBindModeState().renameSaving) return;

    void saveShortcutSetRenameMode()
      .catch((error) => {
        console.error('[Emozzk Lite] failed to rename shortcut set:', error);
      });
  });

  return button;
}

function createRenameCancelButton(bindState) {
  const button = document.createElement('button');

  const cancelLabel = bindState.renameSaving
    ? '저장 중'
    : '세트 이름 변경 취소';

  button.type = 'button';
  button.className = BIND_BUTTON_CLASS;
  button.classList.add(BIND_CANCEL_BUTTON_CLASS);
  button.setAttribute('aria-label', cancelLabel);
  button.setAttribute('title', cancelLabel);

  if (bindState.renameSaving) {
    button.disabled = true;
    button.classList.add(BIND_BUTTON_DISABLED_CLASS);
  }

  button.appendChild(createCancelXIcon());

  button.addEventListener('mousedown', stopControlEvent);

  button.addEventListener('click', (event) => {
    stopControlEvent(event);

    if (getEmoteBindModeState().renameSaving) return;

    cancelShortcutSetRenameMode();
  });

  return button;
}

function startShortcutSetRenameMode() {
  if (isShortcutBindingOff()) return;

  const activeSetId = getCachedActiveShortcutBindingSetId();
	const setState = getCachedShortcutBindingSetState();
	const sets = Array.isArray(setState?.sets) ? setState.sets : [];

	const set = sets.find((candidate) => {
		return candidate.id === activeSetId;
	});

  enterShortcutSetRenameMode({
    renameValue: normalizeText(set?.label),
  });

  scheduleFavoriteEmoteSectionRender();
}

function cancelShortcutSetRenameMode() {
  exitShortcutSetRenameMode();

  scheduleFavoriteEmoteSectionRender();
}

async function saveShortcutSetRenameMode() {
  const bindState = getEmoteBindModeState();

  if (
    bindState.mode !== EMOTE_BIND_MODE_RENAME ||
    bindState.renameSaving ||
    isShortcutBindingOff()
  ) {
    return;
  }

  setShortcutSetRenameSaving(true);
  scheduleFavoriteEmoteSectionRender();

  try {
    await renameShortcutBindingSet({
      setId: getCachedActiveShortcutBindingSetId(),
      label: bindState.renameValue,
    });

    exitShortcutSetRenameMode();

    scheduleFavoriteEmoteSectionRender();
    scheduleBadgeUpdate();
  } catch (error) {
    setShortcutSetRenameSaving(false);
    scheduleFavoriteEmoteSectionRender();

    throw error;
  }
}

function exitShortcutSetRenameModeSilently() {
  const bindState = getEmoteBindModeState();

  if (bindState.mode !== EMOTE_BIND_MODE_RENAME) {
    return false;
  }

  exitShortcutSetRenameMode();
  return true;
}

async function resetShortcutSetFavoriteOrder(setId) {
  if (
    !setId ||
    setId === SHORTCUT_BINDING_SET_OFF
  ) {
    return;
  }

  const result = await resetFavoriteRecentSetOrder(setId);

  if (!result.changed) {
    return;
  }

  dispatchFavoritesChanged({
    reordered: true,
    changed: true,
    favorites: getCachedFavoriteRecentEmotes(),
  });

  scheduleFavoriteEmoteSectionRender();
  scheduleBadgeUpdate();
}

function clearShortcutSetFloatingUi() {
  closeShortcutSetMenus();
  clearShortcutSetSwitchFloatingUi();
}

function moveRemovedFavoritesBackToRecent({
  favoriteList,
  recentList,
  favoriteIdSet,
  recentOrderIds,
}) {
  Array.from(favoriteList.children).forEach((item) => {
    const id = getEmoteItemId(item);

    if (!id) return;
    if (favoriteIdSet.has(id)) return;

    item.removeAttribute(FAVORITES_GROUP_ATTR);

    const existingRecentItem = findDirectEmoteItemById({
      list: recentList,
      emojiId: id,
    });

    /*
     * CHZZK가 같은 이모티콘을 recentList에 이미 다시 만든 경우,
     * 현재 recent 노드를 유지하고 이전 favorite 노드는 제거한다.
     */
    if (
      existingRecentItem &&
      existingRecentItem !== item
    ) {
      item.remove();
      return;
    }

    insertRecentItemByStoredOrder({
      item,
      recentList,
      recentOrderIds,
    });
  });
}

function insertRecentItemByStoredOrder({
  item,
  recentList,
  recentOrderIds,
}) {
  const itemId = getEmoteItemId(item);
  const itemIndex = recentOrderIds.indexOf(itemId);

  if (itemIndex < 0) {
    recentList.appendChild(item);
    return;
  }

  for (
    let index = itemIndex + 1;
    index < recentOrderIds.length;
    index += 1
  ) {
    const nextItem = findDirectEmoteItemById({
      list: recentList,
      emojiId: recentOrderIds[index],
    });

    if (!nextItem) {
      continue;
    }

    recentList.insertBefore(
      item,
      nextItem
    );

    return;
  }

  recentList.appendChild(item);
}

function findDirectEmoteItemById({
  list,
  emojiId,
}) {
  return Array.from(list.children).find((item) => {
    return getEmoteItemId(item) === emojiId;
  }) ?? null;
}