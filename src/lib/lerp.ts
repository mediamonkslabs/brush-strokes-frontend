function lerp(v0: number, v1: number, t: number) {
  return v0 * (1 - t) + v1 * t;
}

/**
 * Creates a timed lerp. Calculates a new lerped value based on the current and the target, and
 * calls the provided function every frame with the current value.
 * @param initial
 * @param callback
 * @param speed
 * @param ease
 */
export const startLerp = (
  initial: number,
  callback: (n: number) => unknown,
  speed: number = 500,
  ease = (n: number) => n,
) =>
  ((
    current: number,
    target: number,
    prevTime: number | undefined,
    cancelled: boolean,
  ): {
    cancel: () => void;
    updateTarget: (newTarget: number) => number;
    updateCallback: (newCallback: (n: number) => unknown) => void;
  } => {
    const frame = (time: number) => {
      if (cancelled === true) {
        return;
      }
      if (prevTime === undefined) {
        prevTime = time;
      }

      const delta = time - prevTime;
      const ratio = ease(Math.min(delta / speed, 1));

      requestAnimationFrame(frame);
      current = lerp(current, target, ratio);
      callback(current);
      prevTime = time;
    };

    requestAnimationFrame(frame);

    return {
      updateTarget: (newTarget: number) => (target = newTarget),
      updateCallback: (newCallback: (n: number) => unknown) => {
        callback = newCallback;
      },
      cancel: () => {
        cancelled = true;
      },
    };
  })(initial, initial, undefined, false);
