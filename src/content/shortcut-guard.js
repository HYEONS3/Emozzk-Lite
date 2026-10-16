export function isTypingTarget(target = document.activeElement) {
  const element = getElementFromTarget(target);

  if (!element) return false;

  return Boolean(
    isEditableElement(element) ||
    element.closest?.('[contenteditable]') ||
    element.closest?.('[role="textbox"]') ||
    element.closest?.('input, textarea, select')
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

export function getDonationAmountInput(
  target = document.activeElement
) {
  const element = getElementFromTarget(target);

  if (!element) {
    return null;
  }

  const input = element.closest('input#donation-money');

  if (!(input instanceof HTMLInputElement)) {
    return null;
  }

  const dialog = input.closest(
    '[role="alertdialog"][aria-modal="true"]'
  );

  if (!dialog) {
    return null;
  }

  return input;
}