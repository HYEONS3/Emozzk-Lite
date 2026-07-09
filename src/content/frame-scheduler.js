export function createFrameScheduler(callback) {
  let frameId = 0;
  let active = true;

  function schedule() {
    if (!active || frameId) {
      return;
    }

    frameId = requestAnimationFrame(() => {
      frameId = 0;

      if (!active) {
        return;
      }

      callback();
    });
  }

  function cancel() {
    if (!frameId) {
      return;
    }

    cancelAnimationFrame(frameId);
    frameId = 0;
  }

  function start() {
    active = true;
  }

  function stop() {
    active = false;
    cancel();
  }

  function isScheduled() {
    return Boolean(frameId);
  }

  return {
    schedule,
    cancel,
    start,
    stop,
    isScheduled,
  };
}
