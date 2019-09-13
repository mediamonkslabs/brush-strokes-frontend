import React, { createRef, useEffect, useState } from 'react';
import { CanvasAnimator, CanvasAnimatorEvent } from '../../lib/canvas-animator';
import {
  OffscreenDrawableCanvas,
  OffscreenDrawableCanvasEvent,
} from '../../lib/OffscreenDrawableCanvas';
import { useDatGuiFolder, useDatGuiValue } from '../../lib/dat-gui';
import WatercolorEffect from '../../lib/watercolor-effect';
import { debugDrawImageData, get2DContext } from '../../lib/canvas';
import Worker from '../../workers/nn.worker';
import styles from './Canvas.module.css';
import Loader from '../Loader';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../settings';

type WorkerReturnType = ReturnType<typeof Worker>;
type Next = WorkerReturnType['next'];

interface Props {
  width: number;
  height: number;
  onInitLoadingStateChange: (loading: boolean) => unknown;
  onProcessingStateChange: (processing: boolean) => unknown;
  onProcessingProgressChange: (progress: number) => unknown;
}

interface NextEventEnd {
  type: 'END';
}

interface NextEventInit {
  type: 'INIT';
  data: number;
}

interface NextEventData {
  type: 'DATA';
  data: ImageData;
}

type NextEvent = NextEventData | NextEventEnd | NextEventInit;

const Canvas = ({
  width: canvasWidth,
  height: canvasHeight,
  onInitLoadingStateChange,
  onProcessingStateChange,
  onProcessingProgressChange,
}: Props) => {
  const [canvasAnimator, setCanvasAnimator] = useState<CanvasAnimator | null>(null);
  const [drawableCanvas, setDrawableCanvas] = useState<OffscreenDrawableCanvas | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);

  const canvasFitContainerRef = createRef<HTMLDivElement>();
  const [appWorker, setAppWorker] = useState<{
    next: Next;
    worker: Worker;
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

  // update the size of the webgl canvas
  useEffect(() => {
    if (waterColorEffect !== null) {
      waterColorEffect.updateSize(canvasWidth, canvasHeight);
    }
  }, [canvasWidth, canvasHeight, waterColorEffect]);

  // update the size of the drawable canvas
  useEffect(() => {
    if (drawableCanvas !== null) {
      drawableCanvas.eventScaleX = canvasWidth / CANVAS_WIDTH;
      drawableCanvas.eventScaleY = canvasHeight / CANVAS_HEIGHT;
    }
  }, [canvasWidth, canvasHeight, drawableCanvas]);

  // send frames from the animator to the webgl component
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

  // create a new CanvasAnimator instance
  useEffect(() => {
    if (canvasAnimator === null) {
      setCanvasAnimator(new CanvasAnimator(CANVAS_WIDTH, CANVAS_HEIGHT));
    }
  }, [canvasAnimator]);

  // create new WebGL component instance
  useEffect(() => {
    if (waterColorEffect === null && canvasFitContainerRef.current !== null) {
      setWaterColorEffect(new WatercolorEffect(canvasFitContainerRef.current));
    }
  }, [canvasFitContainerRef, waterColorEffect]);

  // update the WebGL component with the new drawing
  useEffect(() => {
    if (drawableCanvas !== null && appWorker !== null && canvasAnimator !== null) {
      const draw = ({ data }: OffscreenDrawableCanvasEvent) => {
        // debugDrawImageData(data);
        if (waterColorEffect !== null) {
          waterColorEffect.updateInputCanvas(data.canvas);
        }
      };
      drawableCanvas.addEventListener(OffscreenDrawableCanvasEvent.types.DRAW, draw);
      return () => {
        drawableCanvas.removeEventListener(OffscreenDrawableCanvasEvent.types.DRAW, draw);
      };
    }
  }, [drawableCanvas, appWorker, waterColorEffect, canvasAnimator]);

  // process the drawing in the NN when stroke is finished
  useEffect(() => {
    if (
      drawableCanvas !== null &&
      appWorker !== null &&
      canvasAnimator !== null &&
      waterColorEffect !== null
    ) {
      const finish = async ({ data }: OffscreenDrawableCanvasEvent) => {
        onProcessingStateChange(true);
        const nextFrames: Array<ImageData> = [];
        let total = 0;

        const listener = (event: MessageEvent) => {
          const data: NextEvent = event.data;

          if (data.type === 'INIT') {
            total = data.data;
          } else if (data.type === 'END') {
            appWorker.worker.removeEventListener('message', listener);

            // clear drawing image in WebGL
            waterColorEffect.updateInputCanvas(drawableCanvas.getCurrentImage().canvas);
            canvasAnimator.addFrames(nextFrames);
            canvasAnimator.animate();
            onProcessingStateChange(false);
            drawableCanvas.disabled = false;
          } else if (data.type === 'DATA') {
            nextFrames.push(data.data);
            onProcessingProgressChange(nextFrames.length / total);
          }
        };

        appWorker.worker.addEventListener('message', listener);

        drawableCanvas.disabled = true;
        appWorker.next(
          data.getImageData(0, 0, data.canvas.width, data.canvas.height),
          frames,
          additionalFrames,
          additionalFramesStep,
        );
      };
      drawableCanvas.addEventListener(OffscreenDrawableCanvasEvent.types.DRAW_COMPLETE, finish);
      return () => {
        drawableCanvas.removeEventListener(
          OffscreenDrawableCanvasEvent.types.DRAW_COMPLETE,
          finish,
        );
      };
    }
  }, [
    onProcessingProgressChange,
    onProcessingStateChange,
    drawableCanvas,
    appWorker,
    waterColorEffect,
    additionalFrames,
    additionalFramesStep,
    canvasAnimator,
    frames,
  ]);

  // create a new OffscreenDrawableCanvas
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

  // initialize the NN worker and load the NN data
  useEffect(() => {
    (async () => {
      if (appWorker === null && waterColorEffect !== null && !waterColorEffect.loadState) {
        onInitLoadingStateChange(true);
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
        setAppWorker({ worker, next: worker.next });
        waterColorEffect.loadState = false;
        onInitLoadingStateChange(false);
      }
    })();
  }, [appWorker, waterColorEffect, onInitLoadingStateChange]);

  return (
    <div>
      <div
        ref={canvasFitContainerRef}
        className={styles.canvasScaleContainer}
        style={{
          width: `${canvasWidth}px`,
          height: `${canvasHeight}px`,
        }}
      >
        <Loader progress={loadingProgress} />
      </div>
    </div>
  );
};

export default Canvas;
