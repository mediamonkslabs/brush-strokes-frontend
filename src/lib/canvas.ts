export const get2DContext = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
  const ctx = canvas.getContext('2d');

  if (ctx === null) {
    throw new Error(`Unable to get 2d context for canvas`);
  }

  return ctx;
};

export const createCanvas = (width: number, height: number): CanvasRenderingContext2D => {
  const c = document.createElement('canvas');
  c.setAttribute('width', width.toString());
  c.setAttribute('height', height.toString());

  return get2DContext(c);
};

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

export const debugDrawImageData = (data: ImageData) => {
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.setAttribute('width', data.width.toString());
  offscreenCanvas.setAttribute('height', data.height.toString());
  const ctx = get2DContext(offscreenCanvas);
  document.body.appendChild(offscreenCanvas);

  ctx.putImageData(data, 0, 0, 0, 0, data.width, data.height);
};
