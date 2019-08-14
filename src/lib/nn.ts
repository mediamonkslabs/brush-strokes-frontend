import * as tf from '@tensorflow/tfjs';
import { range } from 'range';
import { ZLayer } from './ZLayer';

export const loadModels: () => Promise<{
  poseDecoder: tf.LayersModel;
  strokeEncoder: tf.LayersModel;
  allPoses: Array<Array<number>>;
  allStrokes: Array<Array<number>>;
}> = async () => {
  tf.serialization.registerClass(ZLayer);
  const [strokeEncoder, poseDecoder, allStrokes, allPoses] = await Promise.all([
    tf.loadLayersModel('models/encoder/model.json'),
    tf.loadLayersModel('models/vaeDecoder/model.json'),
    (await fetch('models/allStrokes.json')).json(),
    (await fetch('models/allPoses.json')).json(),
  ]);

  return {
    strokeEncoder,
    poseDecoder,
    allStrokes,
    allPoses,
  };
};

const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 256;

const eucDistance = (a: number[], b: number[]): number =>
  a
    .map((x, i) => Math.abs(x - b[i]) ** 2) // square the difference
    .reduce((sum, now) => sum + now) ** // sum
  (1 / 2);

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

const getClosestVector = (
  prediction: Array<Array<number>>,
  strokes: Array<Array<number>>,
): number => {
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
};

const preprocess = (imgData: ImageData): tf.Tensor<tf.Rank> => {
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
};

const predictStroke = (strokeEncoder: tf.LayersModel, imgData: ImageData): tf.Tensor<tf.Rank> => {
  return tf.tidy(() => {
    return strokeEncoder.predict(preprocess(imgData));
  }) as tf.Tensor<tf.Rank>;
};

// Stu, not sure if you want to keep this a separate function or extend getClosestVector
const getClosestPoseVector = (allPoses: Array<Array<number>>, prediction: number[]): number => {
  let distWinner = 100000;
  let winner: number = 0;

  allPoses.forEach(vector => {
    const dist = eucDistance(prediction, vector);
    if (dist < distWinner) {
      distWinner = dist;
      winner = allPoses.indexOf(vector);
    }
  });

  return winner;
};

const postprocess = (tensor: tf.Tensor<tf.Rank.R3>, canvasWidth: number, canvasHeight: number) => {
  return tf.tidy(() => {
    // resize to canvas size
    const shape: tf.Tensor<tf.Rank.R3> = tensor.reshape([128, 256, 1]);
    return tf.image.resizeBilinear(shape, [canvasHeight, canvasWidth]);
  });
};

const predictPose = (
  poseDecoder: tf.LayersModel,
  closest: Array<number>,
): tf.Tensor<tf.Rank.R3> => {
  return tf.tidy(() => {
    let tensor = tf.tensor(closest);
    tensor = tensor.reshape([1, 22]);
    // get the prediction
    const posePred = poseDecoder.predict(tensor);

    return posePred as tf.Tensor<tf.Rank.R3>;
  });
};

const generateImageFromVector = async (
  poseDecoder: tf.LayersModel,
  newVector: Array<number>,
  imageWidth: number,
  imageHeight: number,
): Promise<ImageData> => {
  const slerpedPredictedPose = predictPose(poseDecoder, newVector);

  return new ImageData(
    await tf.browser.toPixels(postprocess(slerpedPredictedPose, imageWidth, imageHeight)),
    imageWidth,
    imageHeight,
  );
};

const getLatentVector = async (
  strokeEncoder: tf.LayersModel,
  allStrokes: Array<Array<number>>,
  imageData: ImageData,
): Promise<number> => {
  const prediction = predictStroke(strokeEncoder, imageData).arraySync() as number[][];
  return getClosestVector(prediction, allStrokes);
};

const getAdditionalFrames = async (
  poseDecoder: tf.LayersModel,
  allPoses: Array<Array<number>>,
  latentVector: number,
  frameCount: number,
  frameStep: number,
): Promise<Array<ImageData>> => {
  return await Promise.all(
    range(0, frameCount * frameStep, frameStep).map(async n => {
      return await generateImageFromVector(
        poseDecoder,
        allPoses[latentVector + n],
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
      );
    }),
  );
};

export const next = async (
  data: {
    poseDecoder: tf.LayersModel;
    strokeEncoder: tf.LayersModel;
    allPoses: Array<Array<number>>;
    allStrokes: Array<Array<number>>;
    poseEncoder: tf.LayersModel;
  },
  previousStrokeVectors: Array<number>,
  next: ImageData,
  frames: number,
  additionalFrames: number,
  additionalFramesStep: number,
): Promise<Array<ImageData>> => {
  const { poseDecoder, strokeEncoder, allPoses, allStrokes } = data;
  const previousLatentVector = previousStrokeVectors[previousStrokeVectors.length - 1];
  const nextLatentVector = await getLatentVector(strokeEncoder, allStrokes, next);

  if (previousLatentVector === undefined) {
    previousStrokeVectors.push(
      nextLatentVector +
        (range(0, additionalFrames * additionalFramesStep, additionalFramesStep).pop() as number),
    );
    return await getAdditionalFrames(
      poseDecoder,
      allPoses,
      nextLatentVector,
      additionalFrames,
      additionalFramesStep,
    );
  }

  const intermediateVector = slerp(allPoses[previousLatentVector], allPoses[nextLatentVector], 0.5);

  const intermediateVectorIndex = getClosestPoseVector(allPoses, intermediateVector);
  const closestIntermediateVector = allPoses[intermediateVectorIndex];

  const previousPose = previousLatentVector ? allPoses[previousLatentVector] : [];
  const nextPose = allPoses[nextLatentVector];

  previousStrokeVectors.push(
    nextLatentVector +
      (range(0, additionalFrames * additionalFramesStep, additionalFramesStep).pop() as number),
  );

  // create an array of values between 0 and 1
  const vals = tf.linspace(0, 1, frames / 2).arraySync();

  return [
    // lerp between previous pose and the found intermediate vector
    ...(await Promise.all(
      vals.map(
        async value =>
          await generateImageFromVector(
            poseDecoder,
            slerp(previousPose, closestIntermediateVector, value),
            CANVAS_WIDTH,
            CANVAS_HEIGHT,
          ),
      ),
    )),

    // lerp between the found intermediate vector and the next pose
    ...(await Promise.all(
      vals.map(
        async value =>
          await generateImageFromVector(
            poseDecoder,
            slerp(closestIntermediateVector, nextPose, value),
            CANVAS_WIDTH,
            CANVAS_HEIGHT,
          ),
      ),
    )),
    ...(await getAdditionalFrames(
      poseDecoder,
      allPoses,
      nextLatentVector,
      additionalFrames,
      additionalFramesStep,
    )),
  ];
};
