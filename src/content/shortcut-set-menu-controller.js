const BIND_BUTTON_CLASS = 'emzk-lite-bind-button';
const BIND_BUTTON_DISABLED_CLASS = 'emzk-lite-bind-button-disabled';

const SHORTCUT_SET_ICON_CLASS = 'emzk-lite-shortcut-set-icon';
const SHORTCUT_SET_MORE_ICON_CLASS = 'emzk-lite-shortcut-set-more-icon';

export const SHORTCUT_SET_MENU_WRAP_CLASS = 'emzk-lite-shortcut-set-menu-wrap';
export const SHORTCUT_SET_MENU_BUTTON_CLASS = 'emzk-lite-shortcut-set-menu-button';
export const SHORTCUT_SET_MENU_CLASS = 'emzk-lite-shortcut-set-menu';
export const SHORTCUT_SET_MENU_OPEN_CLASS = 'emzk-lite-shortcut-set-menu-open';
export const SHORTCUT_SET_MENU_ITEM_CLASS = 'emzk-lite-shortcut-set-menu-item';

const SHORTCUT_SET_MENU_CLOSING_ATTR = 'data-closing';
const SHORTCUT_SET_MENU_CLOSE_MS = 160;
const SHORTCUT_SET_MENU_EDGE_GAP = 8;

export function createShortcutSetMenuControl({
  disabled = false,
  disabledTitle = '',
  activeSetId = '',
  hasCustomOrder = false,
  onRename,
  onResetOrder,
  stopControlEvent,
} = {}) {
  const wrap = document.createElement('span');

  wrap.className = SHORTCUT_SET_MENU_WRAP_CLASS;
  wrap.appendChild(createShortcutSetMenuButton({
    disabled,
    disabledTitle,
    activeSetId,
    hasCustomOrder,
    onRename,
    onResetOrder,
    stopControlEvent,
  }));

  return wrap;
}

export function closeShortcutSetMenus() {
  document
    .querySelectorAll(`.${SHORTCUT_SET_MENU_BUTTON_CLASS}`)
    .forEach((button) => {
      button.setAttribute('aria-expanded', 'false');
      button.classList.remove(SHORTCUT_SET_MENU_OPEN_CLASS);
    });

  document
    .querySelectorAll(`.${SHORTCUT_SET_MENU_WRAP_CLASS}`)
    .forEach((wrap) => {
      wrap.removeAttribute('data-open');
    });

  document
    .querySelectorAll(`.${SHORTCUT_SET_MENU_CLASS}`)
    .forEach((menu) => {
      if (!(menu instanceof HTMLElement)) {
        menu.remove();
        return;
      }

      if (menu.getAttribute(SHORTCUT_SET_MENU_CLOSING_ATTR) === 'true') {
        return;
      }

      menu.setAttribute(SHORTCUT_SET_MENU_CLOSING_ATTR, 'true');

      window.setTimeout(() => {
        menu.remove();
      }, SHORTCUT_SET_MENU_CLOSE_MS);
    });
}

function createShortcutSetMenuButton({
  disabled,
  disabledTitle,
  activeSetId,
  hasCustomOrder,
  onRename,
  onResetOrder,
  stopControlEvent,
}) {
  const button = document.createElement('button');

  button.type = 'button';
  button.className = BIND_BUTTON_CLASS;
  button.classList.add(SHORTCUT_SET_MENU_BUTTON_CLASS);
  button.setAttribute('aria-label', '컨텍스트 메뉴');
  button.setAttribute(
    'title',
    disabled ? disabledTitle || '컨텍스트 메뉴를 사용할 수 없습니다.' : '컨텍스트 메뉴'
  );
  button.setAttribute('aria-expanded', 'false');

  if (disabled) {
    button.disabled = true;
    button.classList.add(BIND_BUTTON_DISABLED_CLASS);
  }

  button.appendChild(createMoreIcon());

  button.addEventListener('mousedown', stopControlEvent);

  button.addEventListener('click', (event) => {
    stopControlEvent?.(event);

    if (disabled) return;

    toggleShortcutSetMenu({
      button,
      activeSetId,
      hasCustomOrder,
      onRename,
      onResetOrder,
      stopControlEvent,
    });
  });

  button.addEventListener('keydown', (event) => {
    if (
      event.code !== 'Enter' &&
      event.code !== 'Space'
    ) {
      return;
    }

    stopControlEvent?.(event);

    if (disabled) return;

    toggleShortcutSetMenu({
      button,
      activeSetId,
      hasCustomOrder,
      onRename,
      onResetOrder,
      stopControlEvent,
    });
  });

  return button;
}

function toggleShortcutSetMenu({
  button,
  activeSetId,
  hasCustomOrder,
  onRename,
  onResetOrder,
  stopControlEvent,
}) {
  const wrap = button.closest(`.${SHORTCUT_SET_MENU_WRAP_CLASS}`);

  if (!(wrap instanceof HTMLElement)) {
    return;
  }

  const opened = wrap.getAttribute('data-open') === 'true';

  closeShortcutSetMenus();

  if (opened) {
    return;
  }

  const menu = createShortcutSetMenu({
    activeSetId,
    hasCustomOrder,
    onRename,
    onResetOrder,
    stopControlEvent,
  });

  wrap.appendChild(menu);

	positionShortcutSetMenu({
		wrap,
		menu,
	});

  button.setAttribute('aria-expanded', 'true');
  button.classList.add(SHORTCUT_SET_MENU_OPEN_CLASS);

  requestAnimationFrame(() => {
    if (!menu.isConnected) {
      return;
    }

    wrap.setAttribute('data-open', 'true');
    menu.removeAttribute(SHORTCUT_SET_MENU_CLOSING_ATTR);
  });
}

function positionShortcutSetMenu({
  wrap,
  menu,
}) {
  menu.style.removeProperty(
    '--emzk-lite-shortcut-set-menu-offset-x'
  );

  const boundary = wrap.closest('#emoji_area');

  const menuRect = menu.getBoundingClientRect();

  const boundaryRect = boundary instanceof HTMLElement
    ? boundary.getBoundingClientRect()
    : {
        left: 0,
        right: window.innerWidth,
      };

  const leftLimit =
    Math.max(0, boundaryRect.left) +
    SHORTCUT_SET_MENU_EDGE_GAP;

  const rightLimit =
    Math.min(window.innerWidth, boundaryRect.right) -
    SHORTCUT_SET_MENU_EDGE_GAP;

  const overflowRight = Math.max(
    0,
    menuRect.right - rightLimit
  );

  if (!overflowRight) {
    return;
  }

  const maxShiftLeft = Math.max(
    0,
    menuRect.left - leftLimit
  );

  const shiftLeft = Math.min(
    overflowRight,
    maxShiftLeft
  );

  menu.style.setProperty(
    '--emzk-lite-shortcut-set-menu-offset-x',
    `${-shiftLeft}px`
  );
}

function createShortcutSetMenu({
  activeSetId,
  hasCustomOrder,
  onRename,
  onResetOrder,
  stopControlEvent,
}) {
  const menu = document.createElement('span');

  menu.className = SHORTCUT_SET_MENU_CLASS;
  menu.setAttribute('role', 'menu');

  menu.appendChild(createShortcutSetMenuItem({
    label: '세트 이름 변경',
    disabled: false,
    stopControlEvent,
    onClick: () => {
      closeShortcutSetMenus();
      onRename?.();
    },
  }));

  menu.appendChild(createShortcutSetMenuItem({
    label: '기본 정렬 적용',
    disabled: !hasCustomOrder,
    stopControlEvent,
    onClick: () => {
      closeShortcutSetMenus();
      onResetOrder?.(activeSetId);
    },
  }));

  return menu;
}

function createShortcutSetMenuItem({
  label,
  disabled,
  stopControlEvent,
  onClick,
}) {
  const button = document.createElement('button');

  button.type = 'button';
  button.className = SHORTCUT_SET_MENU_ITEM_CLASS;
  button.setAttribute('role', 'menuitem');
  button.textContent = label;

  if (disabled) {
    button.disabled = true;
    button.classList.add(BIND_BUTTON_DISABLED_CLASS);
  }

  button.addEventListener('mousedown', stopControlEvent);

  button.addEventListener('click', (event) => {
    stopControlEvent?.(event);

    if (button.disabled) return;

    onClick?.();
  });

  return button;
}

function createMoreIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

  svg.setAttribute('viewBox', '0 0 12 12');
  svg.setAttribute('width', '12');
  svg.setAttribute('height', '12');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add(
    SHORTCUT_SET_ICON_CLASS,
    SHORTCUT_SET_MORE_ICON_CLASS,
  );

  [1.5, 6, 10.5].forEach((cx) => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');

    circle.setAttribute('cx', String(cx));
    circle.setAttribute('cy', '6');
    circle.setAttribute('r', '1.2');
    circle.setAttribute('fill', 'currentColor');

    svg.appendChild(circle);
  });

  return svg;
}