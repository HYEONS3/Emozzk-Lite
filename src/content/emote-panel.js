export function findEmotePanel() {
  const candidates = Array.from(
    document.querySelectorAll('[role="alertdialog"][aria-modal="true"], [role="dialog"][aria-modal="true"]')
  ).filter(isVisibleElement);

  return candidates.find(isRealEmotePanel) ?? null;
}

export function isEmotePanelOpen() {
  return Boolean(findEmotePanel());
}

function isRealEmotePanel(panel) {
  const text = normalizeText(panel.textContent);

  return (
    text.includes('이모티콘') &&
    Boolean(panel.querySelector('#emoji_area'))
  );
}

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function isVisibleElement(element) {
  if (!(element instanceof Element)) {
    return false;
  }

  if (!element.isConnected) {
    return false;
  }

  const rect = element.getBoundingClientRect();

  if (
    rect.width <= 0 ||
    rect.height <= 0
  ) {
    return false;
  }

  const style = window.getComputedStyle(element);

  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0'
  );
}