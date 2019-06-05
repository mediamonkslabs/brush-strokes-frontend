import React, { createRef, useEffect, useState } from 'react';
import styles from './App.module.css';
import { fabric } from 'fabric';
import { loadModels } from './lib/nn';
import * as tf from '@tensorflow/tfjs';

function getImageData(canvas: fabric.Canvas): ImageData {
  // get image data according to dpi
  const dpi = window.devicePixelRatio;
  const x = 0;
  const y = 0;
  const w = canvas.getWidth() * dpi;
  const h = canvas.getHeight() * dpi;
  const imgData = canvas.getContext().getImageData(x, y, w, h);
  return imgData;
}

function predictStroke(imgData: ImageData, strokeEncoder: tf.LayersModel): tf.Tensor<tf.Rank> {
  return tf.tidy(() => strokeEncoder.predict(preprocess(imgData))) as tf.Tensor<tf.Rank>;
}

function getClosestVector(prediction: number[][], allStrokes: Array<Array<number>>): number {
  let distWinner = 100000;
  let winner: number = 0;

  allStrokes.forEach(vector => {
    const dist = eucDistance(prediction[0], vector);
    if (dist < distWinner) {
      distWinner = dist;
      winner = allStrokes.indexOf(vector);
    }
  });

  console.log(winner)

  return winner;
}
function eucDistance(a: number[], b: number[]): number {
  return (
    a
      .map((x, i) => Math.abs(x - b[i]) ** 2) // square the difference
      .reduce((sum, now) => sum + now) ** // sum
    (1 / 2)
  );
}

function preprocess(imgData: ImageData): tf.Tensor<tf.Rank> {
  return tf.tidy(() => {
    // convert to a tensor
    const tensor = tf.browser.fromPixels(imgData, 1).toFloat();
    // resize
    const resized = tf.image.resizeBilinear(tensor, [128, 256]);

    // normalize
    const offset = tf.scalar(127.5);
    const normalized = resized.div(offset).sub(tf.scalar(1.0));

    // We add a dimension to get a batch shape
    const batched = normalized.expandDims(0);

    return batched;
  });
}

function predictPose(closest: Array<number>, poseDecoder: tf.LayersModel): tf.Tensor<tf.Rank.R3> {
  return tf.tidy(() => {
    let tensor = tf.tensor(closest);
    tensor = tensor.reshape([1, 1, 128]);
    // get the prediction
    const posePred = poseDecoder.predict(tensor);

    return posePred as tf.Tensor<tf.Rank.R3>;
  });
}

function postprocess(tensor: tf.Tensor<tf.Rank.R3>, canvas: fabric.Canvas) {
  const w = canvas.getWidth();
  const h = canvas.getHeight();

  return tf.tidy(() => {
    // resize to canvas size
    const shape: tf.Tensor<tf.Rank.R3> = tensor.reshape([128, 256, 1]);
    const resized = tf.image.resizeBilinear(shape, [h, w]);
    return resized;
  });
}

const App = () => {
  const canvasRef = createRef<HTMLCanvasElement>();
  const outCanvasRef = createRef<HTMLCanvasElement>();
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);

  const [nnData, setNNData] = useState<{
    poseDecoder: tf.LayersModel;
    strokeEncoder: tf.LayersModel;
    allPoses: Array<Array<number>>;
    allStrokes: Array<Array<number>>;
    poseEncoder: tf.LayersModel;
  } | null>(null);
  const [nnDataLoading, setNNDataLoading] = useState(false);

  const onMouseUp = async () => {
    if (nnData === null || canvas === null || outCanvasRef.current === null) {
      return;
    }
    const imgData = getImageData(canvas);
    const currentPrediction: number[][] = (await predictStroke(
      imgData,
      nnData.strokeEncoder,
    ).array()) as number[][];

    const closestVector = getClosestVector(currentPrediction, nnData.allStrokes);
    const predictedPose = predictPose(nnData.allPoses[closestVector], nnData.poseDecoder);
    const outImg = postprocess(predictedPose, canvas);

    await tf.browser.toPixels(outImg, outCanvasRef.current);
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
      if (nnData === null && nnDataLoading === false) {
        setNNDataLoading(true);
        setNNData(await loadModels());
        setNNDataLoading(false);
        console.log('loaded');
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
