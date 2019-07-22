import { createCanvas, scaleImage } from './canvas';
import EventDispatcher, { createEventClass } from 'seng-event';

interface Point {
  x: number;
  y: number;
}

export class OffscreenDrawableCanvasEvent extends createEventClass<ImageData>()(
  'DRAW',
  'DRAW_COMPLETE',
) {}

export class OffscreenDrawableCanvas extends EventDispatcher {
  private isPointerDown = false;

  private context: CanvasRenderingContext2D;
  private pointerId: number | undefined;

  public brushSize: number = 5;
  public blur: number = 5;
  public maxStrokeLength = 250;

  private currentStrokeLength: number = 0;
  private previousPointerPosition: Point = {
    x: -1,
    y: -1,
  };

  constructor(
    private readonly targetEventContainer: HTMLElement,
    private readonly canvasWidth: number,
    private readonly canvasHeight: number,
    public eventScaleX: number,
    public eventScaleY: number,
  ) {
    super();

    this.context = createCanvas(canvasWidth * devicePixelRatio, canvasHeight * devicePixelRatio);

    this.clear();

    this.attachEventListeners();
  }

  private attachEventListeners() {
    const onPointerDown = this.onPointerDown.bind(this);
    const onPointerUp = this.onPointerUp.bind(this);
    const onPointerMove = this.onPointerMove.bind(this);

    this.targetEventContainer.addEventListener('pointerdown', onPointerDown);
    this.targetEventContainer.addEventListener('pointerup', onPointerUp);
    this.targetEventContainer.addEventListener('pointermove', onPointerMove);
  }

  private onPointerDown(event: PointerEvent) {
    if (this.isPointerDown === true) {
      return;
    }
    event.preventDefault();
    this.pointerId = event.pointerId;

    this.isPointerDown = true;
    this.currentStrokeLength = 0;
    this.previousPointerPosition.x = event.offsetX * devicePixelRatio;
    this.previousPointerPosition.y = event.offsetY * devicePixelRatio;
  }

  private onPointerUp(event: PointerEvent) {
    if (this.isPointerDown === false || this.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();

    this.isPointerDown = false;

    this.dispatchEvent(
      new OffscreenDrawableCanvasEvent(
        OffscreenDrawableCanvasEvent.types.DRAW_COMPLETE,
        scaleImage(
          this.context.getImageData(0, 0, this.context.canvas.width, this.context.canvas.height),
          this.context.canvas.width / devicePixelRatio,
          this.context.canvas.height / devicePixelRatio,
        ),
      ),
    );

    this.clear();
  }

  private onPointerMove(event: PointerEvent) {
    if (this.isPointerDown === false || this.pointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();

    const x = event.offsetX * devicePixelRatio;
    const y = event.offsetY * devicePixelRatio;

    const distance =
      this.currentStrokeLength +
      Math.hypot(
        this.previousPointerPosition.x / this.eventScaleX - x / this.eventScaleX,
        this.previousPointerPosition.y / this.eventScaleY - y / this.eventScaleY,
      );

    this.currentStrokeLength = distance;

    if (distance > this.maxStrokeLength) {
      return;
    }

    this.drawLine(
      {
        x: this.previousPointerPosition.x / this.eventScaleX,
        y: this.previousPointerPosition.y / this.eventScaleY,
      },
      { x: x / this.eventScaleX, y: y / this.eventScaleY },
    );

    this.dispatchEvent(
      new OffscreenDrawableCanvasEvent(
        OffscreenDrawableCanvasEvent.types.DRAW,
        scaleImage(
          this.context.getImageData(0, 0, this.context.canvas.width, this.context.canvas.height),
          this.context.canvas.width / devicePixelRatio,
          this.context.canvas.height / devicePixelRatio,
        ),
      ),
    );

    this.previousPointerPosition = { x, y };
  }

  private drawLine({ x: x1, y: y1 }: Point, { x: x2, y: y2 }: Point) {
    this.context.lineWidth = this.brushSize * devicePixelRatio;
    this.context.filter = `blur(${this.blur}px)`;
    this.context.strokeStyle = '#000000';
    this.context.lineJoin = this.context.lineCap = 'round';
    this.context.beginPath();
    this.context.moveTo(x1, y1);
    this.context.lineTo(x2, y2);
    this.context.stroke();
    this.context.closePath();
  }

  private clear() {
    this.context.fillStyle = 'white';
    this.context.fillRect(0, 0, this.context.canvas.width, this.context.canvas.height);
    this.context.lineWidth = this.brushSize * devicePixelRatio;
    this.context.filter = `blur(${this.blur}px)`;
  }
}
