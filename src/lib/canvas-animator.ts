import EventDispatcher, { createEventClass } from 'seng-event';
import { createCanvas } from './canvas';
import { startFrameCounter } from './frame';

export class CanvasAnimatorEvent extends createEventClass<HTMLCanvasElement>()('UPDATE') {}

export class CanvasAnimator extends EventDispatcher {
  private currentFrame = 0;
  private frames: Array<ImageData> = [];
  private context: CanvasRenderingContext2D;

  constructor(private canvasWidth: number, private canvasHeight: number) {
    super();
    this.context = createCanvas(canvasWidth, canvasHeight);
  }

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
      this.dispatchEvent(
        new CanvasAnimatorEvent(CanvasAnimatorEvent.types.UPDATE, this.context.canvas),
      );
    }, 12);
  }

  public drawImage(image: ImageData) {
    this.context.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);
    this.context.putImageData(
      image,
      0,
      0,
      0,
      0,
      this.context.canvas.width,
      this.context.canvas.height,
    );
  }
}
