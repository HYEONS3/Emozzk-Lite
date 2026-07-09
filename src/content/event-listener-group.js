export function createEventListenerGroup() {
  const entries = [];

  function add(target, type, listener, options) {
    if (!target?.addEventListener || !target?.removeEventListener) {
      return;
    }

    target.addEventListener(type, listener, options);

    entries.push({
      target,
      type,
      listener,
      options,
    });
  }

  function removeAll() {
    while (entries.length) {
      const {
        target,
        type,
        listener,
        options,
      } = entries.pop();

      target.removeEventListener(type, listener, options);
    }
  }

  return {
    add,
    removeAll,
  };
}
