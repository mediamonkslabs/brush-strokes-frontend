import React, { createRef, RefObject, useEffect, useState } from 'react';
import styles from './App.module.css';
import { CanvasAnimator, CanvasAnimatorEvent } from './canvas-animator';
import { ScaleMode, useElementFit } from 'use-element-fit';
import WatercolorEffect from './watercolor-effect';
import Worker from './workers/nn.worker';
import { useDatGuiFolder, useDatGuiValue } from './lib/dat-gui';
import { createCanvasFromImageData, debugDrawImageData, get2DContext } from './lib/canvas';
import {
  OffscreenDrawableCanvas,
  OffscreenDrawableCanvasEvent,
} from './lib/OffscreenDrawableCanvas';
import Loader from './components/Loader';
import spinner from './images/spinner.png';
import classNames from 'classnames';

type WorkerReturnType = ReturnType<typeof Worker>;
type Next = WorkerReturnType['next'];

const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 256;

const App = () => {
  const [canvasAnimator, setCanvasAnimator] = useState<CanvasAnimator | null>(null);
  const [drawableCanvas, setDrawableCanvas] = useState<OffscreenDrawableCanvas | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const canvasFitContainerRef = createRef<HTMLDivElement>();
  const [appWorker, setAppWorker] = useState<{
    next: Next;
  } | null>(null);
  const folder = useDatGuiFolder('Neural net', false);

  const frames = useDatGuiValue(folder, 20, 'Frames', 1, 100);
  const additionalFrames = useDatGuiValue(folder, 40, 'Extra frames', 1, 100);
  const additionalFramesStep = useDatGuiValue(folder, 1, 'Extra frames step', 1, 100);

  const drawableFolder = useDatGuiFolder('Drawable canvas', false);
  const brushSize = useDatGuiValue(drawableFolder, 5, 'brush size', 1, 100);
  const maxStrokeLength = useDatGuiValue(drawableFolder, 200, 'max stroke length', 1, 1000);
  const blur = useDatGuiValue(drawableFolder, 5, 'blur', 1, 100);

  const [waterColorEffect, setWaterColorEffect] = useState<WatercolorEffect | null>(null);

  useEffect(() => {
    if (drawableCanvas !== null) {
      drawableCanvas.brushSize = brushSize;
      drawableCanvas.maxStrokeLength = maxStrokeLength;
      drawableCanvas.blur = blur;
    }
  }, [brushSize, maxStrokeLength, blur, drawableCanvas]);

  const {
    ref: canvasContainerRef,
    width: canvasWidth,
    height: canvasHeight,
    x: canvasX,
    y: canvasY,
  } = useElementFit(CANVAS_WIDTH, CANVAS_HEIGHT, ScaleMode.CONTAIN);

  useEffect(() => {
    if (waterColorEffect != null && canvasAnimator !== null) {
      const listener = ({ data }: CanvasAnimatorEvent) => {
        waterColorEffect.updateNNCanvas(data);
        debugDrawImageData(get2DContext(data).getImageData(0, 0, data.width, data.height));
      };

      canvasAnimator.addEventListener(CanvasAnimatorEvent.types.UPDATE, listener);

      return () => {
        canvasAnimator.removeEventListener(CanvasAnimatorEvent.types.UPDATE, listener);
      };
    }
  });

  useEffect(() => {
    if (drawableCanvas !== null) {
      drawableCanvas.eventScaleX = canvasWidth / CANVAS_WIDTH;
      drawableCanvas.eventScaleY = canvasHeight / CANVAS_HEIGHT;
    }
  }, [canvasWidth, canvasHeight, drawableCanvas]);

  useEffect(() => {
    if (canvasAnimator === null) {
      setCanvasAnimator(new CanvasAnimator(CANVAS_WIDTH, CANVAS_HEIGHT));
    }
  }, [canvasAnimator]);

  useEffect(() => {
    if (waterColorEffect === null && canvasFitContainerRef.current !== null) {
      setWaterColorEffect(new WatercolorEffect(canvasFitContainerRef.current));
    }
  }, [canvasFitContainerRef, waterColorEffect]);

  useEffect(() => {
    if (drawableCanvas !== null && appWorker !== null && canvasAnimator !== null) {
      const draw = ({ data }: OffscreenDrawableCanvasEvent) => {
        debugDrawImageData(data);
        if (waterColorEffect !== null) {
          waterColorEffect.updateInputCanvas(createCanvasFromImageData(data).canvas);
        }
      };
      drawableCanvas.addEventListener(OffscreenDrawableCanvasEvent.types.DRAW, draw);
      return () => {
        drawableCanvas.removeEventListener(OffscreenDrawableCanvasEvent.types.DRAW, draw);
      };
    }
  }, [drawableCanvas, appWorker, waterColorEffect, canvasAnimator]);

  useEffect(() => {
    if (
      drawableCanvas !== null &&
      appWorker !== null &&
      canvasAnimator !== null &&
      waterColorEffect !== null
    ) {
      const finish = async ({ data }: OffscreenDrawableCanvasEvent) => {
        setIsProcessing(true);
        const nextFrames = await appWorker.next(
          data,
          frames,
          additionalFrames,
          additionalFramesStep,
        );

        // clear drawing image in WebGL
        waterColorEffect.updateInputCanvas(
          createCanvasFromImageData(drawableCanvas.getCurrentImage()).canvas,
        );
        canvasAnimator.addFrames(nextFrames);
        canvasAnimator.animate();
        setIsProcessing(false);
      };
      drawableCanvas.addEventListener(OffscreenDrawableCanvasEvent.types.DRAW_COMPLETE, finish);
      return () => {
        drawableCanvas.removeEventListener(
          OffscreenDrawableCanvasEvent.types.DRAW_COMPLETE,
          finish,
        );
      };
    }
  }, [drawableCanvas, appWorker, additionalFrames, additionalFramesStep, canvasAnimator, frames]);

  useEffect(() => {
    if (canvasFitContainerRef.current !== null && drawableCanvas === null) {
      setDrawableCanvas(
        new OffscreenDrawableCanvas(
          canvasFitContainerRef.current,
          CANVAS_WIDTH,
          CANVAS_HEIGHT,
          canvasWidth / CANVAS_WIDTH,
          canvasHeight / CANVAS_HEIGHT,
        ),
      );
    }
  }, [waterColorEffect, canvasFitContainerRef, drawableCanvas, canvasWidth, canvasHeight]);

  useEffect(() => {
    (async () => {
      if (appWorker === null && waterColorEffect !== null && !waterColorEffect.loadState) {
        waterColorEffect.loadState = true;
        const worker: any = Worker();

        const listener = (event: MessageEvent) => {
          if (event.data.type === 'progress') {
            setLoadingProgress(event.data.value);
            waterColorEffect.loadProgress = event.data.value;
          }
        };
        worker.addEventListener('message', listener);

        await worker.ready;
        await worker.load();
        worker.removeEventListener('message', listener);
        setAppWorker({ next: worker.next });
        waterColorEffect.loadState = false;
      }
    })();
  }, [appWorker, waterColorEffect]);

  useEffect(() => {
    if (waterColorEffect !== null) {
      waterColorEffect.updateSize(canvasWidth, canvasHeight);
    }
  }, [canvasWidth, canvasHeight, waterColorEffect]);

  return (
    <div>
      <div className={styles.canvasContainer} ref={canvasContainerRef as RefObject<HTMLDivElement>}>
        <div
          ref={canvasFitContainerRef}
          className={styles.canvasScaleContainer}
          style={{
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
            left: `${canvasX}px`,
            top: `${canvasY}px`,
          }}
        >
          <Loader progress={loadingProgress} />
          <img
            src={spinner}
            className={classNames(styles.spinner, {
              [styles.spinnerVisible]: isProcessing,
            })}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
