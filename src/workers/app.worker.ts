import { loadModels } from '../lib/nn';
import * as tf from '@tensorflow/tfjs';

const preprocess = (imgData: ImageData): tf.Tensor<tf.Rank> =>
  tf.tidy(() => {
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

const predictStroke = (imgData: ImageData, strokeEncoder: tf.LayersModel): tf.Tensor<tf.Rank> =>
  tf.tidy(() => strokeEncoder.predict(preprocess(imgData))) as tf.Tensor<tf.Rank>;

const eucDistance = (a: number[], b: number[]): number =>
  a
    .map((x, i) => Math.abs(x - b[i]) ** 2) // square the difference
    .reduce((sum, now) => sum + now) ** // sum
  (1 / 2);

const getClosestVector = (prediction: number[][], allStrokes: Array<Array<number>>): number => {
  let distWinner = 100000;
  let winner: number = 0;

  allStrokes.forEach(vector => {
    const dist = eucDistance(prediction[0], vector);
    if (dist < distWinner) {
      distWinner = dist;
      winner = allStrokes.indexOf(vector);
    }
  });

  return winner;
};

const predictPose = (closest: Array<number>, poseDecoder: tf.LayersModel): tf.Tensor<tf.Rank.R3> =>
  tf.tidy(() => {
    let tensor = tf.tensor(closest);
    tensor = tensor.reshape([1, 1, 128]);
    // get the prediction
    const posePred = poseDecoder.predict(tensor);

    return posePred as tf.Tensor<tf.Rank.R3>;
  });

const postprocess = (tensor: tf.Tensor<tf.Rank.R3>, canvasWidth: number, canvasHeight: number) => {
  return tf.tidy(() => {
    // resize to canvas size
    const shape: tf.Tensor<tf.Rank.R3> = tensor.reshape([128, 256, 1]);
    const resized = tf.image.resizeBilinear(shape, [canvasHeight, canvasWidth]);
    return resized;
  });
};

export class AppWorker {
  private poseDecoder: tf.LayersModel | undefined;
  private strokeEncoder: tf.LayersModel | undefined;
  private allPoses: Array<Array<number>> | undefined;
  private allStrokes: Array<Array<number>> | undefined;
  private poseEncoder: tf.LayersModel | undefined;

  public async getNextFrame(imgData: ImageData): Promise<ImageData> {
    if (
      this.strokeEncoder === undefined ||
      this.allStrokes === undefined ||
      this.poseDecoder === undefined ||
      this.allPoses === undefined
    ) {
      throw new Error('AppWorker not initialized: call init() first.');
    }

    const currentPrediction: number[][] = (await predictStroke(
      imgData,
      this.strokeEncoder,
    ).array()) as number[][];

    const closestVector = getClosestVector(currentPrediction, this.allStrokes);
    const predictedPose = predictPose(this.allPoses[closestVector], this.poseDecoder);
    const outImg = postprocess(
      predictedPose,
      imgData.width / devicePixelRatio,
      imgData.height / devicePixelRatio,
    );

    return new ImageData(
      await tf.browser.toPixels(outImg),
      imgData.width / devicePixelRatio,
      imgData.height / devicePixelRatio,
    );
  }

  public async init() {
    const { poseDecoder, strokeEncoder, allPoses, allStrokes, poseEncoder } = await loadModels();
    this.poseDecoder = poseDecoder;
    this.strokeEncoder = strokeEncoder;
    this.allPoses = allPoses;
    this.allStrokes = allStrokes;
    this.poseEncoder = poseEncoder;
  }
}
