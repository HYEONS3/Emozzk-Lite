export function isTypingTarget(target = document.activeElement) {
  if (!target) return false;

  return Boolean(
    target.isContentEditable ||
    target.closest?.('[contenteditable="true"]') ||
    target.closest?.('[role="textbox"]') ||
    target.closest?.('input, textarea, select')
  );
}

export function shouldIgnoreShortcut(event) {
  if (event.defaultPrevented) return true;
  if (event.isComposing) return true;
  if (event.ctrlKey || event.altKey || event.metaKey) return true;

  return (
    isTypingTarget(event.target) ||
    isTypingTarget(document.activeElement)
  );
}