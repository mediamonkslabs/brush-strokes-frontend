import * as tf from '@tensorflow/tfjs';
import { range } from 'range';
import { ZLayer } from './ZLayer';
import Bezier from 'bezier-js';

const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 256;

export async function* loadModels() {
  let done = 0;
  tf.serialization.registerClass(ZLayer);
  const promises = [
    tf.loadLayersModel('models/encoder/model.json'),
    tf.loadLayersModel('models/vaeDecoder/model.json'),
    (await fetch('models/allStrokes.json')).json(),
    (await fetch('models/allPoses.json')).json(),
    (await fetch('models/allCentroids.json')).json(),
  ];
  const results = [];

  for await (const item of promises) {
    done++;
    results.push(item);
    const progress = done / promises.length;

    if (progress === 1) {
      const [strokeEncoder, poseDecoder, allStrokes, allPoses, allCentroids] = results;
      return {
        strokeEncoder,
        poseDecoder,
        allStrokes,
        allPoses,
        allCentroids,
      };
    }
    yield progress;
  }
}

function eucDistance(a: number[], b: number[]): number {
  return (
    a
      .map((x, i) => Math.abs(x - b[i]) ** 2) // square the difference
      .reduce((sum, now) => sum + now) ** // sum
    (1 / 2)
  );
}

function slerp(a: Array<number>, b: Array<number>, t: number): Array<number> {
  const out: Array<number> = [];

  let newB = b;

  let omega: number | undefined;
  let cosom: number = 0;
  let sinom: number | undefined;
  let scale0: number | undefined;
  let scale1: number | undefined;

  // calc cosine
  for (const valA in a) {
    cosom += a[valA] * b[valA];
  }

  if (cosom < 0.0) {
    cosom = -cosom;

    newB = newB.map(value => -value);
  }

  // calculate coefficients
  if (1.0 - cosom > 0.000001) {
    // standard case (slerp)
    omega = Math.acos(cosom);
    sinom = Math.sin(omega);
    scale0 = Math.sin((1.0 - t) * omega) / sinom;
    scale1 = Math.sin(t * omega) / sinom;
  } else {
    // "from" and "to" quaternions are very close
    //  ... so we can do a linear interpolation
    scale0 = 1.0 - t;
    scale1 = t;
  }
  // calculate final values

  for (const valA in a) {
    out.push(scale0 * a[valA] + scale1 * newB[valA]);
  }

  return out;
}

function getClosestVector(prediction: Array<Array<number>>, strokes: Array<Array<number>>): number {
  let distWinner = 100000;
  let winner: number = 0;

  strokes.forEach(vector => {
    const dist = eucDistance(prediction[0], vector);
    if (dist < distWinner) {
      distWinner = dist;
      winner = strokes.indexOf(vector);
    }
  });

  return winner;
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

function predictStroke(strokeEncoder: tf.LayersModel, imgData: ImageData): tf.Tensor<tf.Rank> {
  return tf.tidy(() => {
    return strokeEncoder.predict(preprocess(imgData));
  }) as tf.Tensor<tf.Rank>;
}

// Stu, not sure if you want to keep this a separate function or extend getClosestVector
function getClosestPoseVector(allCentroids: Array<Array<number>>, prediction: number[]): number {
  let distWinner = 100000;
  let winner: number = 0;

  allCentroids.forEach(vector => {
    const dist = eucDistance(prediction, vector);
    if (dist < distWinner) {
      distWinner = dist;
      winner = allCentroids.indexOf(vector);
    }
  });

  return winner;
}

function postprocess(tensor: tf.Tensor<tf.Rank.R3>, canvasWidth: number, canvasHeight: number) {
  return tf.tidy(() => {
    // resize to canvas size
    const shape: tf.Tensor<tf.Rank.R3> = tensor.reshape([128, 256, 1]);
    return tf.image.resizeBilinear(shape, [canvasHeight, canvasWidth]);
  });
}

function predictPose(poseDecoder: tf.LayersModel, closest: Array<number>): tf.Tensor<tf.Rank.R3> {
  return tf.tidy(() => {
    let tensor = tf.tensor(closest);
    tensor = tensor.reshape([1, 22]);
    // get the prediction
    const posePred = poseDecoder.predict(tensor);

    return posePred as tf.Tensor<tf.Rank.R3>;
  });
}

async function generateImageFromVector(
  poseDecoder: tf.LayersModel,
  newVector: Array<number>,
  imageWidth: number,
  imageHeight: number,
): Promise<ImageData> {
  const slerpedPredictedPose = predictPose(poseDecoder, newVector);

  return new ImageData(
    await tf.browser.toPixels(postprocess(slerpedPredictedPose, imageWidth, imageHeight)),
    imageWidth,
    imageHeight,
  );
}

async function getLatentVector(
  strokeEncoder: tf.LayersModel,
  allStrokes: Array<Array<number>>,
  imageData: ImageData,
): Promise<number> {
  const prediction = predictStroke(strokeEncoder, imageData).arraySync() as number[][];
  return getClosestVector(prediction, allStrokes);
}

function getAdditionalFrameVectors(
  allPoses: Array<Array<number>>,
  latentVector: number,
  frameCount: number,
  frameStep: number,
): Array<Array<number>> {
  return range(0, frameCount * frameStep, frameStep).map(n => allPoses[latentVector + n]);
}

export async function* next(
  data: {
    poseDecoder: tf.LayersModel;
    strokeEncoder: tf.LayersModel;
    allPoses: Array<Array<number>>;
    allStrokes: Array<Array<number>>;
    allCentroids: Array<Array<number>>;
    poseEncoder: tf.LayersModel;
  },
  previousStrokeVectors: Array<number>,
  next: ImageData,
  frames: number,
  additionalFrames: number,
  additionalFramesStep: number,
): AsyncIterable<ImageData | number> {
  const vectors = await getNextVectors(
    data,
    previousStrokeVectors,
    next,
    frames,
    additionalFrames,
    additionalFramesStep,
  );

  yield vectors.length;

  while (vectors.length) {
    const vec = vectors.shift();

    if (vec === undefined) {
      break;
    }
    const image = await generateImageFromVector(data.poseDecoder, vec, CANVAS_WIDTH, CANVAS_HEIGHT);

    yield image;
  }
}

export async function getNextVectors(
  data: {
    poseDecoder: tf.LayersModel;
    strokeEncoder: tf.LayersModel;
    allPoses: Array<Array<number>>;
    allStrokes: Array<Array<number>>;
    allCentroids: Array<Array<number>>;
    poseEncoder: tf.LayersModel;
  },
  previousStrokeVectors: Array<number>,
  next: ImageData,
  frames: number,
  additionalFrames: number,
  additionalFramesStep: number,
): Promise<Array<Array<number>>> {
  const { poseDecoder, strokeEncoder, allPoses, allStrokes, allCentroids } = data;
  const previousLatentVector = previousStrokeVectors[previousStrokeVectors.length - 1];
  const nextLatentVector = await getLatentVector(strokeEncoder, allStrokes, next);

  if (previousLatentVector === undefined) {
    previousStrokeVectors.push(
      nextLatentVector +
        (range(0, additionalFrames * additionalFramesStep, additionalFramesStep).pop() as number),
    );

    return getAdditionalFrameVectors(
      allPoses,
      nextLatentVector,
      additionalFrames,
      additionalFramesStep,
    );
  }

  const distBetweenPoses = eucDistance(
    allCentroids[previousLatentVector],
    allCentroids[nextLatentVector],
  );

  const numInterVals = Math.min(Math.max(Math.floor(distBetweenPoses / 10), 3), 12);

  const interimVals = tf.linspace(0, 1, numInterVals).arraySync();

  const bezierTest = tf.linspace(0, 1, 3).arraySync();

  const bezierPoints = bezierTest.map(value =>
    slerp(allCentroids[previousLatentVector], allCentroids[nextLatentVector], value),
  );

  const randomX1 = Math.floor(Math.random() * distBetweenPoses) - distBetweenPoses / 2;
  const randomY1 = Math.floor(Math.random() * distBetweenPoses) - distBetweenPoses / 2;

  const randomX2 = Math.floor(Math.random() * distBetweenPoses) - distBetweenPoses / 2;
  const randomY2 = Math.floor(Math.random() * distBetweenPoses) - distBetweenPoses / 2;

  const bezierCurve = new Bezier(
    bezierPoints[0][0],
    bezierPoints[0][1],
    bezierPoints[0][0] + randomX1,
    bezierPoints[0][1] + randomY1,
    bezierPoints[2][0] + randomX2,
    bezierPoints[2][1] + randomY2,
    bezierPoints[2][0],
    bezierPoints[2][1],
  );

  const allIntermLerpedCentroids = bezierCurve.getLUT(numInterVals);

  var allPosesToGenerate = allIntermLerpedCentroids.map(value =>
    getClosestPoseVector(allCentroids, [value.x, value.y]),
  );

  allPosesToGenerate[0] = previousLatentVector;
  allPosesToGenerate[allPosesToGenerate.length - 1] = nextLatentVector;

  const previousPose = previousLatentVector ? allPoses[previousLatentVector] : [];
  const nextPose = allPoses[nextLatentVector];

  previousStrokeVectors.push(
    nextLatentVector +
      (range(0, additionalFrames * additionalFramesStep, additionalFramesStep).pop() as number),
  );

  const framesPerPose = Math.min(Math.max(Math.floor(50 / numInterVals), 4), 8);

  const vals = tf.linspace(0, 1, framesPerPose).arraySync();

  return [
    ...allPosesToGenerate
      .slice(0, -1)
      .reduce<Array<Array<number>>>(
        (acc, value, index) => [
          ...acc,
          ...vals.map(lerpedVal =>
            slerp(
              allPoses[allPosesToGenerate[index]],
              allPoses[allPosesToGenerate[index + 1]],
              lerpedVal,
            ),
          ),
        ],
        [],
      ),

    ...getAdditionalFrameVectors(
      allPoses,
      nextLatentVector,
      additionalFrames,
      additionalFramesStep,
    ),
  ];
}
