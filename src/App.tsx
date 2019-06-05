import React, { createRef, useEffect, useState } from 'react';
import styles from './App.module.css';
import { fabric } from 'fabric';
// eslint-disable-next-line import/no-webpack-loader-syntax
import { AppWorker } from './workers/app.worker';

const getImageData = (canvas: fabric.Canvas): ImageData => {
  // get image data according to dpi
  const dpi = window.devicePixelRatio;
  const x = 0;
  const y = 0;
  const w = canvas.getWidth() * dpi;
  const h = canvas.getHeight() * dpi;
  const imgData = canvas.getContext().getImageData(x, y, w, h);
  return imgData;
};

const App = () => {
  const canvasRef = createRef<HTMLCanvasElement>();
  const outCanvasRef = createRef<HTMLCanvasElement>();
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [appWorker, setAppWorker] = useState<AppWorker | null>(null);

  const [nnDataLoading, setNNDataLoading] = useState(false);

  const onMouseUp = async () => {
    if (appWorker !== null && canvas !== null && outCanvasRef.current !== null) {
      const ctx = outCanvasRef.current.getContext('2d');

      if (ctx === null) {
        return;
      }

      const imgData = getImageData(canvas);
      const nextFrame = await appWorker.getNextFrame(imgData);
      ctx.putImageData(nextFrame, 0, 0);
    }
  };

  if (canvas !== null) {
    canvas.off('mouse:up', onMouseUp);
    canvas.on('mouse:up', onMouseUp);
  }

  useEffect(() => {
    if (canvasRef.current !== null && canvas === null) {
      const canvas = new fabric.Canvas(canvasRef.current);
      canvas.backgroundColor = '#ffffff';
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.color = 'rgba(0, 0, 0, 1.0)';
      canvas.freeDrawingBrush.width = 10;
      canvas.getContext().filter = 'blur(8px)';
      canvas.renderAll();

      setCanvas(canvas);
    }

    (async () => {
      if (appWorker === null && nnDataLoading === false) {
        setNNDataLoading(true);
        const worker: AppWorker = await new AppWorker();
        await worker.init();
        setAppWorker(worker);
        setNNDataLoading(false);
      }
    })();
  });

  return (
    <div className="App">
      <canvas ref={canvasRef} width="512" height="256" className={styles.canvas} />
      <canvas ref={outCanvasRef} width="512" height="256" className={styles.canvas} />

      {nnDataLoading && (
        <div className={styles.loading}>
          <p>Loading models</p>
        </div>
      )}
    </div>
  );
};

export default App;
