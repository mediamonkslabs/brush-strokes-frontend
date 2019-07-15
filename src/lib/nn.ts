import * as tf from '@tensorflow/tfjs';
import { ZLayer } from './ZLayer';

export const loadModels: () => Promise<{
  poseDecoder: tf.LayersModel;
  strokeEncoder: tf.LayersModel;
  allPoses: Array<Array<number>>;
  allStrokes: Array<Array<number>>;
  poseEncoder: tf.LayersModel;
}> = async () => {
  tf.serialization.registerClass(ZLayer);
  const [strokeEncoder, poseEncoder, poseDecoder, allStrokes, allPoses] = await Promise.all([
    tf.loadLayersModel('models/encoder/model.json'),
    tf.loadLayersModel('models/vaeEncoder/model.json'),
    tf.loadLayersModel('models/vaeDecoder/model.json'),
    (await fetch('models/allStrokes.json')).json(),
    (await fetch('models/allPoses.json')).json(),
  ]);

  return {
    strokeEncoder,
    poseEncoder,
    poseDecoder,
    allStrokes,
    allPoses,
  };
};
