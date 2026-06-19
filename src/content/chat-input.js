export function findChatInput() {
  const candidates = Array.from(
    document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]')
  );

  return candidates.find(isLikelyChatInput) ?? null;
}

function isLikelyChatInput(element) {
  if (!element || !isVisible(element)) return false;

  const name = [
    element.getAttribute('placeholder'),
    element.getAttribute('aria-label'),
    element.getAttribute('title'),
  ]
    .filter(Boolean)
    .join(' ');

  return /채팅|chat/i.test(name);
}

function isVisible(element) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== 'none' &&
    style.visibility !== 'hidden'
  );
}