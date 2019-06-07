import { startFrameCounter } from './lib/frame';

export class CanvasAnimator {
  private currentFrame = 0;
  private frames: Array<ImageData> = [];

  constructor(private canvas: HTMLCanvasElement) {}

  public addFrames(frames: Array<ImageData>) {
    this.frames.push(...frames);
  }

  public animate() {
    const ctx = this.canvas.getContext('2d');

    if (ctx === null) {
      throw new Error('Could not get 2d context from canvas');
    }

    const frameOffset = this.currentFrame;

    startFrameCounter((frame, cancel) => {
      const floored = Math.floor(frame + frameOffset);

      if (this.frames[floored] === undefined) {
        this.currentFrame = floored;
        cancel();
        return;
      }

      // prevent rendering of the same frame
      if (floored === this.currentFrame) {
        return;
      }

      this.currentFrame = floored;

      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.putImageData(this.frames[floored], 0, 0, 0, 0, this.canvas.width, this.canvas.height);
    }, 60);
  }
}
