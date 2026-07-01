const BIND_BUTTON_CLASS = 'emzk-lite-bind-button';
const BIND_BUTTON_DISABLED_CLASS = 'emzk-lite-bind-button-disabled';
const BIND_ICON_CLASS = 'emzk-lite-bind-icon';

export const SHORTCUT_SET_MENU_WRAP_CLASS = 'emzk-lite-shortcut-set-menu-wrap';
export const SHORTCUT_SET_MENU_BUTTON_CLASS = 'emzk-lite-shortcut-set-menu-button';
export const SHORTCUT_SET_MENU_CLASS = 'emzk-lite-shortcut-set-menu';
export const SHORTCUT_SET_MENU_OPEN_CLASS = 'emzk-lite-shortcut-set-menu-open';
export const SHORTCUT_SET_MENU_ITEM_CLASS = 'emzk-lite-shortcut-set-menu-item';

const SHORTCUT_SET_MENU_CLOSING_ATTR = 'data-closing';
const SHORTCUT_SET_MENU_CLOSE_MS = 160;

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
  button.setAttribute('aria-label', '세트 메뉴');
  button.setAttribute(
    'title',
    disabled ? disabledTitle || '세트 메뉴를 사용할 수 없습니다.' : '세트 메뉴'
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
    label: 'OFF 순서로 되돌리기',
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

  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add(BIND_ICON_CLASS);

  [7, 12, 17].forEach((cx) => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');

    circle.setAttribute('cx', String(cx));
    circle.setAttribute('cy', '12');
    circle.setAttribute('r', '1.7');
    circle.setAttribute('fill', 'currentColor');

    svg.appendChild(circle);
  });

  return svg;
}