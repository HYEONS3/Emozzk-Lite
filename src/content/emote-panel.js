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
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0'
  );
}