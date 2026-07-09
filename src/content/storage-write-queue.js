export function createStorageWriteQueue() {
  let queue = Promise.resolve();
  let pendingCount = 0;

  async function run(task) {
    if (typeof task !== 'function') {
      throw new TypeError('[Emozzk Lite] storage write task must be a function.');
    }

    pendingCount += 1;

    const writeTask = queue.then(task);

    queue = writeTask.catch(() => {});

    try {
      return await writeTask;
    } finally {
      pendingCount -= 1;
    }
  }

  function hasPending() {
    return pendingCount > 0;
  }

  return {
    run,
    hasPending,
  };
}
