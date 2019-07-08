import { loadModels } from './lib/nn';
import * as tf from '@tensorflow/tfjs';
import { range } from 'range';

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

export class NN {
  private poseDecoder: tf.LayersModel | undefined;
  private strokeEncoder: tf.LayersModel | undefined;
  private allPoses: Array<Array<Array<number>>> | undefined;
  private allStrokes: Array<Array<number>> | undefined;
  private poseEncoder: tf.LayersModel | undefined;

  private previousStrokeVectors: Array<number> = [];

  private predictStroke(imgData: ImageData): tf.Tensor<tf.Rank> {
    return tf.tidy(() => {
      if (this.strokeEncoder === undefined) {
        throw this.notLoadedError();
      }
      return this.strokeEncoder.predict(this.preprocess(imgData));
    }) as tf.Tensor<tf.Rank>;
  }

  private preprocess = (imgData: ImageData): tf.Tensor<tf.Rank> => {
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

  private getClosestVector(
    prediction: Array<Array<number>>,
    strokes: Array<Array<number>>,
  ): number {
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

  private postprocess(tensor: tf.Tensor<tf.Rank.R3>, canvasWidth: number, canvasHeight: number) {
    return tf.tidy(() => {
      // resize to canvas size
      const shape: tf.Tensor<tf.Rank.R3> = tensor.reshape([128, 256, 1]);
      return tf.image.resizeBilinear(shape, [canvasHeight, canvasWidth]);
    });
  }

  private predictPose(closest: Array<number>): tf.Tensor<tf.Rank.R3> {
    return tf.tidy(() => {
      if (this.poseDecoder === undefined) {
        throw this.notLoadedError();
      }
      let tensor = tf.tensor(closest);
      tensor = tensor.reshape([1, 20]);
      // get the prediction
      const posePred = this.poseDecoder.predict(tensor);

      return posePred as tf.Tensor<tf.Rank.R3>;
    });
  }

  private async getLatentVector(imageData: ImageData): Promise<number> {
    if (this.strokeEncoder === undefined || this.allStrokes === undefined) {
      throw this.notLoadedError();
    }

    const prediction = this.predictStroke(imageData).arraySync() as number[][];
    return this.getClosestVector(prediction, this.allStrokes);
  }

  private async generateImageFromVector(
    newVector: Array<number>,
    imageWidth: number,
    imageHeight: number,
  ) {
    const slerpedPredictedPose = this.predictPose(newVector);

    return this.postprocess(slerpedPredictedPose, imageWidth, imageHeight);
  }

  private notLoadedError() {
    return new Error('AppWorker not initialized: call init() first.');
  }

  private async getAdditionalFrames(latentVector: number, frameCount: number, frameStep: number) {
    return await Promise.all(
      range(0, frameCount * frameStep, frameStep).map(async n => {
        if (
          this.strokeEncoder === undefined ||
          this.allStrokes === undefined ||
          this.poseDecoder === undefined ||
          this.allPoses === undefined
        ) {
          throw this.notLoadedError();
        }

        const data = await this.generateImageFromVector(
          this.allPoses[latentVector + n][0],
          CANVAS_WIDTH,
          CANVAS_HEIGHT,
        );

        return new ImageData(await tf.browser.toPixels(data), CANVAS_WIDTH, CANVAS_HEIGHT);
      }),
    );
  }

  public async getNextFrames(
    next: ImageData,
    frames: number,
    additionalFrames: number,
    additionalFramesStep: number,
  ): Promise<Array<ImageData>> {
    if (
      this.strokeEncoder === undefined ||
      this.allStrokes === undefined ||
      this.poseDecoder === undefined ||
      this.allPoses === undefined ||
      this.allStrokes === undefined
    ) {
      throw this.notLoadedError();
    }
    const previousLatentVector = this.previousStrokeVectors[this.previousStrokeVectors.length - 1];
    const nextLatentVector = await this.getLatentVector(next);

    if (previousLatentVector === undefined) {
      return await this.getAdditionalFrames(
        nextLatentVector,
        additionalFrames,
        additionalFramesStep,
      );
    }

    const intermediateVals = tf.linspace(0, 1, 3).arraySync();
    const intermediateVector = slerp(
      this.allPoses[previousLatentVector][0],
      this.allPoses[nextLatentVector][0],
      0.5,
    );

    const previousPose = previousLatentVector ? this.allPoses[previousLatentVector][0] : [];
    const nextPose = this.allPoses[nextLatentVector][0];

    this.previousStrokeVectors.push(
      nextLatentVector +
        (range(0, additionalFrames * additionalFramesStep, additionalFramesStep).pop() as number),
    );

    // create an array of values between 0 and 1
    const vals = tf.linspace(0, 1, frames / 2).arraySync();

    return [
      // lerp between previous pose and the found intermediate vector
      ...(previousLatentVector === undefined
        ? []
        : await Promise.all(
            vals.map(
              async value =>
                new ImageData(
                  await tf.browser.toPixels(
                    await this.generateImageFromVector(
                      slerp(previousPose, intermediateVector, value),
                      CANVAS_WIDTH,
                      CANVAS_HEIGHT,
                    ),
                  ),
                  CANVAS_WIDTH,
                  CANVAS_HEIGHT,
                ),
            ),
          )),

      // lerp between the found intermediate vector and the next pose
      ...(await Promise.all(
        vals.map(
          async value =>
            new ImageData(
              await tf.browser.toPixels(
                await this.generateImageFromVector(
                  slerp(intermediateVector, nextPose, value),
                  CANVAS_WIDTH,
                  CANVAS_HEIGHT,
                ),
              ),
              CANVAS_WIDTH,
              CANVAS_HEIGHT,
            ),
        ),
      )),
      ...(await this.getAdditionalFrames(nextLatentVector, additionalFrames, additionalFramesStep)),
    ];
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
