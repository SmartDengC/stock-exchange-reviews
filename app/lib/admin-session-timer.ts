type TimerHandle = ReturnType<typeof setTimeout>;

type AdminSessionTimerOptions = {
  clearTimer?: (handle: TimerHandle) => void;
  getDeadline: () => number | null;
  now?: () => number;
  onExpire: () => Promise<void> | void;
  setTimer?: (callback: () => void, delay: number) => TimerHandle;
};

export function createAdminSessionTimer({
  clearTimer = clearTimeout,
  getDeadline,
  now = Date.now,
  onExpire,
  setTimer = setTimeout,
}: AdminSessionTimerOptions) {
  let timer: TimerHandle | null = null;
  let expiring = false;

  function clear() {
    if (timer === null) return;
    clearTimer(timer);
    timer = null;
  }

  function sync() {
    clear();
    const deadline = getDeadline();
    if (deadline === null) return;

    const remaining = deadline - now();
    if (remaining > 0) {
      timer = setTimer(sync, remaining);
      return;
    }
    if (expiring) return;

    expiring = true;
    Promise.resolve(onExpire()).finally(() => {
      expiring = false;
    });
  }

  return {
    dispose: clear,
    sync,
  };
}
