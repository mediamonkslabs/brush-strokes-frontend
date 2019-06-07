export const startAnimationFrame = (
  callback: (time: number, cancel: () => void) => any,
): (() => void) => {
  let startTime: number | undefined;
  let cancelled = false;
  const cancel = () => {
    cancelAnimationFrame(rafId);
    cancelled = true;
  };
  let rafId: number = -1;

  const frame = (time: number) => {
    if (startTime === undefined) {
      startTime = time;
    }
    if (cancelled) {
      return;
    }

    rafId = requestAnimationFrame(frame);
    callback(time - startTime, cancel);
  };

  rafId = requestAnimationFrame(frame);

  return cancel;
};
