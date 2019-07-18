import React, { createRef, RefObject, useCallback, useEffect, useState } from 'react';
import styles from './App.module.css';
import { CanvasAnimator } from './canvas-animator';
import DrawableCanvas from './components/DrawableCanvas';
import { ScaleMode, useElementFit } from 'use-element-fit';
import { useDatGuiValue } from './lib/use-dat-gui-value';
import { useDatGuiFolder } from './lib/use-dat-gui-folder';
import WatercolorEffect from './watercolor-effect';
import { get2DContext } from './lib/canvas';
import Worker from './workers/nn.worker';

const worker = Worker();

enum AppState {
  INITIAL_DRAW = 'initial',
  CONTINUE_DRAW = 'continue',
}

const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 256;

const App = () => {
  const [appState, setAppState] = useState(AppState.INITIAL_DRAW);
  const outCanvasRef = createRef<HTMLCanvasElement>();
  const drawCanvasRef = createRef<HTMLCanvasElement>();
  const canvasFitContainerRef = createRef<HTMLDivElement>();
  const [appWorker, setAppWorker] = useState<{ next: typeof worker.next } | null>(null);
  const [canvasAnimator, setDrawableCanvasAnimator] = useState<CanvasAnimator | null>(null);
  const [nnDataLoading, setNNDataLoading] = useState(false);

  const folder = useDatGuiFolder('Neural net', false);

  const frames = useDatGuiValue(folder, 20, 'Frames', 1, 100);
  const additionalFrames = useDatGuiValue(folder, 20, 'Extra frames', 1, 100);
  const additionalFramesStep = useDatGuiValue(folder, 1, 'Extra frames step', 1, 100);

  const [waterColorEffect, setWaterColorEffect] = useState<WatercolorEffect | null>(null);

  const {
    ref: canvasContainerRef,
    width: canvasWidth,
    height: canvasHeight,
    x: canvasX,
    y: canvasY,
  } = useElementFit(CANVAS_WIDTH, CANVAS_HEIGHT, ScaleMode.COVER);

  useEffect(() => {
    if (outCanvasRef.current !== null && canvasAnimator === null) {
      setDrawableCanvasAnimator(new CanvasAnimator(outCanvasRef.current));
    }
  }, [canvasAnimator, outCanvasRef, canvasContainerRef, waterColorEffect]);

  useEffect(() => {
    if (
      waterColorEffect === null &&
      canvasFitContainerRef.current !== null &&
      outCanvasRef.current !== null &&
      drawCanvasRef.current !== null
    ) {
      get2DContext(drawCanvasRef.current).fillStyle = 'white';
      get2DContext(drawCanvasRef.current).fillRect(0, 0, 512, 512);

      get2DContext(outCanvasRef.current).fillStyle = 'white';
      get2DContext(outCanvasRef.current).fillRect(0, 0, 512, 512);

      setWaterColorEffect(
        new WatercolorEffect(
          canvasFitContainerRef.current,
          drawCanvasRef.current,
          outCanvasRef.current,
        ),
      );
    }
  }, [canvasFitContainerRef, waterColorEffect, outCanvasRef, drawCanvasRef]);

  useEffect(() => {
    (async () => {
      if (appWorker === null && !nnDataLoading) {
        setNNDataLoading(true);
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

  const listener = useCallback(
    async (next: ImageData) => {
      if (appWorker !== null && outCanvasRef.current !== null && canvasAnimator !== null) {
        const ctx = outCanvasRef.current.getContext('2d');

        if (ctx === null) {
          return;
        }

        if (appState === AppState.INITIAL_DRAW) {
          setAppState(AppState.CONTINUE_DRAW);
        }

        const nextFrames = await appWorker.next(
          next,
          frames,
          additionalFrames,
          additionalFramesStep,
        );

        canvasAnimator.addFrames(nextFrames);
        canvasAnimator.animate();
      }
    },
    [
      appWorker,
      outCanvasRef,
      appState,
      canvasAnimator,
      additionalFrames,
      additionalFramesStep,
      frames,
    ],
  );

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
        >
          <canvas ref={outCanvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
          <DrawableCanvas
            ref={drawCanvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onDraw={listener}
            scaleX={canvasWidth / CANVAS_WIDTH}
            scaleY={canvasHeight / CANVAS_HEIGHT}
          />
        </div>
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
