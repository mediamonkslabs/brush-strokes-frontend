import ImageEffectRenderer, { ImageEffectRendererBuffer } from './lib/ImageEffectRender';

import blitShader from './shaders/blit.glsl';
import dynamicsShader from './shaders/dynamics.glsl';
import inputShader from './shaders/input.glsl';

import imgNoise from './images/shadertoyNoise.png';
import imgStructure from './images/structure.jpg';

export default class WatercolorEffect {
  private imageEffectRenderer: ImageEffectRenderer;

  constructor(
    private canvasWrapper: HTMLElement,
    private drawCanvas: HTMLCanvasElement,
    private nnCanvas: HTMLCanvasElement,
    private canvasWidth: number,
    private canvasHeight: number,
  ) {
    this.imageEffectRenderer = ImageEffectRenderer.createTemporary(
      canvasWrapper as HTMLElement,
      blitShader,
      false,
    );

    this.imageEffectRenderer.getCanvas().style.pointerEvents = 'none';
    this.imageEffectRenderer.getCanvas().setAttribute('width', canvasWidth.toString());
    this.imageEffectRenderer.getCanvas().setAttribute('height', canvasHeight.toString());

    this.imageEffectRenderer.addBuffer(0, inputShader);
    this.loadImage(this.imageEffectRenderer.getBuffer(0), imgNoise, 0);
    this.loadImage(this.imageEffectRenderer.getBuffer(0), imgNoise, 1);

    this.imageEffectRenderer.addBuffer(1, dynamicsShader);
    this.imageEffectRenderer.getBuffer(1).addImage(this.imageEffectRenderer.getBuffer(1), 0);
    this.loadImage(this.imageEffectRenderer.getBuffer(1), imgNoise, 1);
    this.imageEffectRenderer.getBuffer(1).addImage(this.imageEffectRenderer.getBuffer(0), 2);

    this.imageEffectRenderer.addImage(this.imageEffectRenderer.getBuffer(1), 0);
    this.loadImage(this.imageEffectRenderer.getMainBuffer(), imgNoise, 1);
    this.imageEffectRenderer.addImage(this.imageEffectRenderer.getBuffer(0), 2);
    this.loadImage(this.imageEffectRenderer.getMainBuffer(), imgStructure, 3);

    this.update(0);
  }

  public updateSize(width: number, height: number) {
    this.imageEffectRenderer.updateSize(width, height);
  }

  private loadImage(buffer: ImageEffectRendererBuffer, url: string, slot: number) {
    const image = new Image();
    image.crossOrigin = 'Anonymous';
    image.src = url;
    image.onload = () => buffer.addImage(image, slot, false, false);
  }

  public updateCanvas(canvasNN: HTMLCanvasElement, canvasInput: HTMLCanvasElement) {
    this.imageEffectRenderer.getBuffer(0).updateImage(canvasNN, 0);
    this.imageEffectRenderer.getBuffer(0).updateImage(canvasInput, 1);
  }

  private update(time: number) {
    window.requestAnimationFrame(time => this.update(time));

    this.updateCanvas(this.nnCanvas, this.drawCanvas);

    this.imageEffectRenderer.draw(time);
  }
}
