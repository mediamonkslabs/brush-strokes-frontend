import { startFrameCounter } from './lib/frame';
import { get2DContext } from './lib/canvas';

export class CanvasAnimator {
  private currentFrame = 0;
  private frames: Array<ImageData> = [];

  constructor(private canvas: HTMLCanvasElement, private onUpdate: () => unknown) {}

  public addFrames(frames: Array<ImageData>) {
    this.frames.push(...frames);
  }

  public animate() {
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
      this.drawImage(this.frames[floored]);
    }, 10);
  }

  public drawImage(image: ImageData) {
    const ctx = get2DContext(this.canvas);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.putImageData(image, 0, 0, 0, 0, this.canvas.width, this.canvas.height);
  }
}
