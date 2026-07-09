const listeners = new Set();

let observer = null;

export function subscribePanelDomMutations(listener) {
  if (typeof listener !== 'function') {
    return;
  }

  listeners.add(listener);
  ensureObserver();
}

export function unsubscribePanelDomMutations(listener) {
  listeners.delete(listener);

  if (listeners.size || !observer) {
    return;
  }

  observer.disconnect();
  observer = null;
}

function ensureObserver() {
  if (observer || !document.body) {
    return;
  }

  observer = new MutationObserver((mutations) => {
    listeners.forEach((listener) => {
      try {
        listener(mutations);
      } catch (error) {
        console.error(
          '[Emozzk Lite] failed to handle panel DOM mutations:',
          error
        );
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      'class',
      'style',
      'aria-hidden',
      'data-emzk-lite-badge-target',
    ],
  });
}
