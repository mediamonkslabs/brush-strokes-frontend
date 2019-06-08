import {
  createCanvas,
  createCanvasFromImageData,
  debugDrawImageData,
  get2DContext,
  scaleImage,
} from './canvas';

describe('createCanvas', () => {
  it('creates a canvas of the given dimensions', () => {
    const ctx = createCanvas(10, 10);

    expect(ctx.canvas.width).toBe(10);
    expect(ctx.canvas.height).toBe(10);
  });
});
describe('get2DContext', () => {
  it('should throw an error when context can not be created', () => {
    const ctx = createCanvas(10, 10);
    ctx.canvas.getContext = () => null;
    expect(() => get2DContext(ctx.canvas)).toThrow();
  });
  it('should return the canvas 2D context', () => {
    const ctx = createCanvas(10, 10);
    expect(get2DContext(ctx.canvas)).toEqual(ctx);
  });
});
describe('scaleImage', () => {
  it('scales an image correctly', () => {
    const ctx = createCanvas(10, 10);
    const imageData = ctx.getImageData(0, 0, 10, 10);
    const scaled = scaleImage(imageData, 20, 20);

    expect(scaled.width).toBe(20);
    expect(scaled.height).toBe(20);
  });
});
describe('createCanvasFromImageData', () => {
  const source = createCanvas(10, 10);
  const imageData = source.getImageData(0, 0, 10, 10);

  it('creates a new canvas of the same dimensions', () => {
    const target = createCanvasFromImageData(imageData);
    expect(target.canvas.width).toStrictEqual(10);
    expect(target.canvas.height).toStrictEqual(10);
  });
});

describe('debugDrawImageData', () => {
  const source = createCanvas(10, 10);
  const imageData = source.getImageData(0, 0, 10, 10);

  it('appends a canvas to the document', () => {
    debugDrawImageData(imageData);
    expect(document.body.querySelector('canvas')).toBeDefined();
  });
});
