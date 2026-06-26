export function isTypingTarget(target = document.activeElement) {
  const element = getElementFromTarget(target);

  if (!element) return false;

  return Boolean(
    isEditableElement(element) ||
    element.closest?.('[contenteditable="true"]') ||
    element.closest?.('[contenteditable="plaintext-only"]') ||
    element.closest?.('[role="textbox"]') ||
    element.closest?.('input, textarea, select')
  );
}

export function shouldIgnoreShortcut(event) {
  if (!event) return true;
  if (event.defaultPrevented) return true;
  if (hasBlockingModifier(event)) return true;

  return (
    isTypingTarget(event.target) ||
    isTypingTarget(document.activeElement)
  );
}

function hasBlockingModifier(event) {
  return (
    event.ctrlKey ||
    event.altKey ||
    event.metaKey
  );
}

function isEditableElement(element) {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  return element.isContentEditable;
}

function getElementFromTarget(target) {
  if (!target) return null;

  if (target instanceof Element) {
    return target;
  }

  if (target instanceof Node) {
    const parent = target.parentElement;

    if (parent instanceof Element) {
      return parent;
    }
  }

  return null;
}