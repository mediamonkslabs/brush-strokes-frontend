import React, { createRef, RefObject, useCallback, useEffect, useState } from 'react';
import styles from './App.module.css';
import { NNWorker } from './workers/app.worker';
import { CanvasAnimator } from './canvas-animator';
import DrawableCanvas from './components/DrawableCanvas';
import { ScaleMode, useElementFit } from 'use-element-fit';
import { useDatGuiValue } from './lib/use-dat-gui-value';
import { useDatGuiFolder } from './lib/use-dat-gui-folder';

enum AppState {
  INITIAL_DRAW = 'initial',
  CONTINUE_DRAW = 'continue',
}

const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 256;

const App = () => {
  const [appState, setAppState] = useState(AppState.INITIAL_DRAW);
  const outCanvasRef = createRef<HTMLCanvasElement>();
  const [appWorker, setAppWorker] = useState<NNWorker | null>(null);
  const [canvasAnimator, setDrawableCanvasAnimator] = useState<CanvasAnimator | null>(null);
  const [nnDataLoading, setNNDataLoading] = useState(false);

  const folder = useDatGuiFolder('Neural net', true);

  const frames = useDatGuiValue(folder, 20, 'Frames', 1, 100);
  const additionalFrames = useDatGuiValue(folder, 10, 'Extra frames', 1, 100);
  const additionalFramesStep = useDatGuiValue(folder, 10, 'Extra frames step', 1, 100);

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
  }, [canvasAnimator, outCanvasRef]);

  useEffect(() => {
    (async () => {
      if (appWorker === null && !nnDataLoading) {
        setNNDataLoading(true);
        const worker: NNWorker = await new NNWorker();
        await worker.init();
        setAppWorker(worker);
        setNNDataLoading(false);
      }
    })();
  }, [appWorker, nnDataLoading]);

  const listener = useCallback(
    async (next: ImageData) => {
      if (appWorker !== null && outCanvasRef.current !== null && canvasAnimator !== null) {
        const ctx = outCanvasRef.current.getContext('2d');

        if (ctx === null) {
          return;
        }

        if (appState === AppState.INITIAL_DRAW) {
          setAppState(AppState.CONTINUE_DRAW);

          const nextFrames = await appWorker.getNextFrames(
            next,
            frames,
            additionalFrames,
            additionalFramesStep,
          );

          canvasAnimator.addFrames(nextFrames);
          canvasAnimator.animate();

          return;
        }

        if (appState === AppState.CONTINUE_DRAW) {
          // generate animation
          const nextFrames = await appWorker.getNextFrames(
            next,
            frames,
            additionalFrames,
            additionalFramesStep,
          );

          canvasAnimator.addFrames(nextFrames);
          canvasAnimator.animate();
        }
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
          className={styles.canvasScaleContainer}
          style={{
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
            left: `${canvasX}px`,
            top: `${canvasY}px`,
          }}
        >
          <canvas
            ref={outCanvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className={styles.canvas}
          />
          <DrawableCanvas
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
