export function get2DContext<T extends HTMLCanvasElement>(canvas: T): CanvasRenderingContext2D;
export function get2DContext<T extends OffscreenCanvas>(
  canvas: T,
): OffscreenCanvasRenderingContext2D;

export function get2DContext(
  canvas: HTMLCanvasElement | OffscreenCanvas,
): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
  const ctx = canvas.getContext('2d') as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D;

  if (ctx === null) {
    throw new Error(`Unable to get 2d context for canvas`);
  }

  return ctx;
}

export function createCanvas(
  width: number,
  height: number,
  offScreen: true,
): OffscreenCanvasRenderingContext2D;
export function createCanvas(
  width: number,
  height: number,
  offScreen: false,
): CanvasRenderingContext2D;
export function createCanvas(width: number, height: number): CanvasRenderingContext2D;

export function createCanvas(width: number, height: number, offScreen: boolean = false) {
  if (offScreen === true) {
    return get2DContext(new OffscreenCanvas(width, height));
  }

  const c = document.createElement('canvas');
  c.setAttribute('width', width.toString());
  c.setAttribute('height', height.toString());

  return get2DContext(c);
}

export const createCanvasFromImageData = (imageData: ImageData): CanvasRenderingContext2D => {
  const ctx = createCanvas(imageData.width, imageData.height);
  ctx.putImageData(imageData, 0, 0);

  return ctx;
};

export const scaleImage = (imageData: ImageData, width: number, height: number): ImageData => {
  const ctx = createCanvas(width, height);

  const imageCanvas = createCanvasFromImageData(imageData);

  ctx.drawImage(imageCanvas.canvas, 0, 0, width, height);

  return ctx.getImageData(0, 0, width, height);
};

export const debugDrawImageData = (() => {
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.style.setProperty('position', 'absolute');
  offscreenCanvas.style.setProperty('z-index', '999999');
  offscreenCanvas.style.setProperty('top', '0');
  offscreenCanvas.style.setProperty('left', '0');
  offscreenCanvas.style.setProperty('pointer-events', 'none');

  if (process.env.REACT_APP_HIDE_DAT_GUI === undefined) {
    document.body.appendChild(offscreenCanvas);
  }

  return (data: ImageData) => {
    if (process.env.NODE_ENV === 'development') {
      offscreenCanvas.setAttribute('width', data.width.toString());
      offscreenCanvas.setAttribute('height', data.height.toString());
      offscreenCanvas.style.setProperty('width', `${data.width / 10}px`);
      offscreenCanvas.style.setProperty('height', `${data.height / 10}px`);
      const ctx = get2DContext(offscreenCanvas);
      ctx.clearRect(0, 0, data.width, data.height);

      ctx.putImageData(data, 0, 0, 0, 0, data.width, data.height);
    }
  };
})();

export const applyBackground = (imageData: ImageData, background: string): ImageData => {
  const outCanvas = createCanvas(imageData.width, imageData.height);
  const imageCanvas = createCanvasFromImageData(imageData);

  outCanvas.fillStyle = background;
  outCanvas.fillRect(0, 0, imageData.width, imageData.height);
  outCanvas.drawImage(imageCanvas.canvas, 0, 0);

  return outCanvas.getImageData(0, 0, imageData.width, imageData.height);
};
