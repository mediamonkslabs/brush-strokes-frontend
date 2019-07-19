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

type WorkerReturnType = ReturnType<typeof Worker>;
type Next = WorkerReturnType['next'];

enum AppState {
  INITIAL_DRAW = 'initial',
  CONTINUE_DRAW = 'continue',
}

const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 256;

const App = () => {
  const [appState, setAppState] = useState(AppState.INITIAL_DRAW);
  const [canvasAnimator, setCanvasAnimator] = useState<CanvasAnimator | null>(null);
  const [drawableCanvas, setDrawableCanvas] = useState<OffscreenDrawableCanvas | null>(null);

  const canvasFitContainerRef = createRef<HTMLDivElement>();
  const [appWorker, setAppWorker] = useState<{
    next: Next;
  } | null>(null);
  const [nnDataLoading, setNNDataLoading] = useState(false);

  const folder = useDatGuiFolder('Neural net', false);

  const frames = useDatGuiValue(folder, 20, 'Frames', 1, 100);
  const additionalFrames = useDatGuiValue(folder, 20, 'Extra frames', 1, 100);
  const additionalFramesStep = useDatGuiValue(folder, 1, 'Extra frames step', 1, 100);

  const drawableFolder = useDatGuiFolder('Drawable canvas', false);
  const brushSize = useDatGuiValue(drawableFolder, 5, 'brush size', 1, 100);
  const maxStrokeLength = useDatGuiValue(drawableFolder, 250, 'max stroke length', 1, 1000);
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
  } = useElementFit(CANVAS_WIDTH, CANVAS_HEIGHT, ScaleMode.COVER);

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
  }, [drawableCanvas, appWorker, appState, waterColorEffect, canvasAnimator]);

  useEffect(() => {
    if (drawableCanvas !== null && appWorker !== null && canvasAnimator !== null) {
      const finish = async ({ data }: OffscreenDrawableCanvasEvent) => {
        if (appState === AppState.INITIAL_DRAW) {
          setAppState(AppState.CONTINUE_DRAW);
        }

        const nextFrames = await appWorker.next(
          data,
          frames,
          additionalFrames,
          additionalFramesStep,
        );

        canvasAnimator.addFrames(nextFrames);
        canvasAnimator.animate();
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
    drawableCanvas,
    appWorker,
    appState,
    additionalFrames,
    additionalFramesStep,
    canvasAnimator,
    frames,
  ]);

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
      if (appWorker === null && !nnDataLoading) {
        setNNDataLoading(true);
        const worker = Worker();
        await worker.ready;
        await worker.load();
        setAppWorker({ next: worker.next });
        setNNDataLoading(false);
      }
    })();
  }, [appWorker, nnDataLoading]);

  useEffect(() => {
    if (waterColorEffect !== null) {
      waterColorEffect.updateSize(canvasWidth, canvasHeight);
    }
  }, [canvasWidth, canvasHeight, waterColorEffect]);

  return (
    <div>
      <div className={styles.title}>
        {appState === AppState.INITIAL_DRAW && <p>Draw initial pose</p>}
        {appState === AppState.CONTINUE_DRAW && <p>Continue drawing poses</p>}
      </div>
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
        ></div>
      </div>
      {nnDataLoading && (
        <div className={styles.loading}>
          <p>Loading models</p>
        </div>
      )}
    </div>
  );
};

export default App;
