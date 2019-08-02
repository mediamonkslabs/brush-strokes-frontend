import ImageEffectRenderer, { ImageEffectRendererBuffer } from './lib/ImageEffectRender';

import blitShader from './shaders/blit.glsl';
import dynamicsShader from './shaders/dynamics.glsl';
import inputShader from './shaders/input.glsl';

import imgNoise from './images/shadertoyNoise.png';
import imgStructure from './images/structure.jpg';
import imgEmpty from './images/empty.jpg';

export default class WatercolorEffect {
  private static SIMULATION_STEPS: number = 1;
  private imageEffectRenderer: ImageEffectRenderer;
  private frameReset: boolean = false;
  private structureOffset: number[] = [0, 0];

  private _loadState = false;
  private _loadProgress = 0;

  public get loadState() {
    return this._loadState;
  }

  public set loadState(value: boolean) {
    this._loadState = value;
  }

  public set loadProgress(progress: number) {
    this._loadProgress = progress;
  }

  public get loadProgress(): number {
    return this._loadProgress;
  }

  constructor(private canvasWrapper: HTMLElement) {
    this.imageEffectRenderer = ImageEffectRenderer.createTemporary(
      canvasWrapper as HTMLElement,
      blitShader,
      false,
    );

    this.imageEffectRenderer.getCanvas().style.pointerEvents = 'none';

    this.imageEffectRenderer.addBuffer(0, inputShader);
    this.loadImage(this.imageEffectRenderer.getBuffer(0), imgEmpty, 0);
    this.loadImage(this.imageEffectRenderer.getBuffer(0), imgEmpty, 1);

    for (let i = 0; i < WatercolorEffect.SIMULATION_STEPS; i++) {
      this.imageEffectRenderer.addBuffer(i + 1, dynamicsShader);
      this.imageEffectRenderer
        .getBuffer(i + 1)
        .addImage(this.imageEffectRenderer.getBuffer(Math.max(1, i)), 0);
      this.loadImage(this.imageEffectRenderer.getBuffer(i + 1), imgNoise, 1);
      this.imageEffectRenderer.getBuffer(i + 1).addImage(this.imageEffectRenderer.getBuffer(0), 2);
      this.imageEffectRenderer.getBuffer(i + 1).setUniformFloat('_FrameReset', 0);
    }

    this.imageEffectRenderer.addImage(
      this.imageEffectRenderer.getBuffer(WatercolorEffect.SIMULATION_STEPS),
      0,
    );

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

  public updateInputCanvas(canvasInput: HTMLCanvasElement) {
    this.imageEffectRenderer.getBuffer(0).updateImage(canvasInput, 1);
  }

  public updateNNCanvas(canvasNN: HTMLCanvasElement) {
    this.imageEffectRenderer.getBuffer(0).updateImage(canvasNN, 0);
    this.frameReset = true;
  }

  private update(time: number) {
    window.requestAnimationFrame(time => this.update(time));

    if (this.frameReset) {
      this.structureOffset[0] = Math.random();
      this.structureOffset[1] = Math.random();
      this.frameReset = false;
      this.imageEffectRenderer.getBuffer(1).setUniformFloat('_FrameReset', 1);
    } else {
      this.imageEffectRenderer.getBuffer(1).setUniformFloat('_FrameReset', 0);
    }

    this.imageEffectRenderer.setUniformVec2(
      '_StructureOffset',
      this.structureOffset[0],
      this.structureOffset[1],
    );

    this.imageEffectRenderer.draw(time);
  }
}
