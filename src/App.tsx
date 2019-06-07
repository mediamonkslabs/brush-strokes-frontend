import React, { createRef, useEffect, useState } from 'react';
import styles from './App.module.css';
// eslint-disable-next-line import/no-webpack-loader-syntax
import { AppWorker } from './workers/app.worker';
import { CanvasAnimator } from './canvas-animator';
import { scaleImage } from './lib/canvas';
import DrawableCanvas from './components/DrawableCanvas';

enum AppState {
  INITIAL_DRAW,
  CONTINUE_DRAW,
}

const App = () => {
  const [appState, setAppState] = useState(AppState.INITIAL_DRAW);
  const [drawnFrames, setDrawnFrames] = useState<Array<ImageData>>([]);
  const outCanvasRef = createRef<HTMLCanvasElement>();
  const [appWorker, setAppWorker] = useState<AppWorker | null>(null);
  const [canvasAnimator, setDrawableCanvasAnimator] = useState<CanvasAnimator | null>(null);
  const [nnDataLoading, setNNDataLoading] = useState(false);

  useEffect(() => {
    if (outCanvasRef.current !== null && canvasAnimator === null) {
      setDrawableCanvasAnimator(new CanvasAnimator(outCanvasRef.current));
    }
  }, [canvasAnimator, outCanvasRef.current]);

  useEffect(() => {
    (async () => {
      if (appWorker === null && nnDataLoading === false) {
        setNNDataLoading(true);
        const worker: AppWorker = await new AppWorker();
        await worker.init();
        setAppWorker(worker);
        setNNDataLoading(false);
      }
    })();
  }, [appWorker]);

  const listener = async (next: ImageData) => {
    if (appWorker !== null && outCanvasRef.current !== null) {
      const ctx = outCanvasRef.current.getContext('2d');

      const scaled = scaleImage(next, next.width, next.height);

      if (ctx === null) {
        return;
      }

      if (appState === AppState.INITIAL_DRAW) {
        setDrawnFrames([scaled]);
        setAppState(AppState.CONTINUE_DRAW);
        return;
      }

      if (appState === AppState.CONTINUE_DRAW) {
        // generate animation
        const previous = drawnFrames[drawnFrames.length - 1];
        const nextFrames = await appWorker.getNextFrame(previous, scaled);

        setDrawnFrames([...drawnFrames, scaled]);

        if (canvasAnimator !== null) {
          canvasAnimator.addFrames(nextFrames);
          canvasAnimator.animate();
        }
      }
    }
  };

  return (
    <div className="App">
      <div>
        {appState === AppState.INITIAL_DRAW && <p>Draw initial pose</p>}

        {appState === AppState.CONTINUE_DRAW && <p>Continue drawing poses</p>}
      </div>
      <div>
        <DrawableCanvas width={512} height={256} onDraw={listener} />
        <canvas ref={outCanvasRef} width="512" height="256" className={styles.canvas} />
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
