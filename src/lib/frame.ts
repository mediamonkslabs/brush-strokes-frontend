import { startAnimationFrame } from './start-animation-frame';

export const startFrameCounter = (
  callback: (time: number, cancel: () => void) => void,
  fps: number = 60,
): (() => void) => {
  return startAnimationFrame((time, cancel) => {
    callback((fps / 1000) * time, cancel);
  });
};
