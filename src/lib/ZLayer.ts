import * as tf from '@tensorflow/tfjs';

export class ZLayer extends tf.layers.Layer {
  computeOutputShape(inputShape: Array<tf.Shape>): tf.Shape | Array<tf.Shape> {
    tf.util.assert(
      inputShape.length === 2 && Array.isArray(inputShape[0]),
      () => `Expected exactly 2 input shapes. But got: ${inputShape}`,
    );
    return inputShape[0];
  }

  call(
    inputs: Array<tf.Tensor>,
    kwargs: {
      [key: string]: any;
    },
  ): tf.Tensor | tf.Tensor[] {
    // zMean, zLogVar = args
    //  batch = K.shape(zMean)[0]
    //  dim = K.int_shape(zMean)[1]
    //  # by default, random_normal has mean=0 and std=1.0
    //  epsilon = K.random_normal(shape=(batch, dim))
    //  return zMean + K.exp(0.5 * zLogVar) * epsilon

    const [zMean, zLogVar] = inputs;
    const batch: any = zMean.shape[0];
    const dim = zMean.shape[1];

    const mean = 0;
    const std = 1.0;
    // sample epsilon = N(0, I)
    const epsilon = tf.randomNormal([batch, dim], mean, std);

    // z = z_mean + sqrt(var) * epsilon
    return zMean.add(
      zLogVar
        .mul(0.5)
        .exp()
        .mul(epsilon),
    );
  }

  static get className() {
    return 'ZLayer';
  }
}
