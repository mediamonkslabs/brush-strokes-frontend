import ImageEffectRenderer, { ImageEffectRendererBuffer } from './lib/ImageEffectRender';

import blitShader from './shaders/blit.js';
import dynamicsShader from './shaders/dynamics.js';
import inputShader from './shaders/input.js';

import imgNoise from './images/shadertoyNoise.png';
import imgStructure from './images/structure.jpg';

export default class WatercolorEffect {
  private imageEffectRenderer: ImageEffectRenderer;
  private readonly canvasses: NodeListOf<HTMLCanvasElement>;

  constructor(canvasWrapper: HTMLElement | null, canvasElement: HTMLCanvasElement | null) {
    this.imageEffectRenderer = ImageEffectRenderer.createTemporary(
      <HTMLElement>canvasWrapper,
      blitShader,
      false,
    );
    this.imageEffectRenderer.getCanvas().style.pointerEvents = 'none';

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

    const canvasses = document.querySelectorAll('canvas');
    for (let i = 0; i < 2; i++) {
      const context = <CanvasRenderingContext2D>(<HTMLCanvasElement>canvasses[i]).getContext('2d');
      context.fillStyle = 'white';
      context.fillRect(0, 0, 512, 512);
    }
    this.canvasses = canvasses;

    this.update(0);
  }

  private loadImage(buffer: ImageEffectRendererBuffer, url: string, slot: number) {
    const image = new Image();
    image.crossOrigin = 'Anonymous';
    image.src = url;
    image.onload = () => {
      buffer.addImage(image, slot, false, false);
    };
  }

  public updateCanvas(canvasNN: HTMLCanvasElement, canvasInput: HTMLCanvasElement) {
    this.imageEffectRenderer.getBuffer(0).updateImage(canvasNN, 0);
    this.imageEffectRenderer.getBuffer(0).updateImage(canvasInput, 1);
  }

  private update(time: number) {
    window.requestAnimationFrame(time => this.update(time));

    // find canvas in html page
    this.updateCanvas(this.canvasses[0], this.canvasses[1]);

    this.imageEffectRenderer.draw(time);
  }
}
