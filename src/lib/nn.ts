import * as tf from '@tensorflow/tfjs';

export const loadModels: () => Promise<{
  poseDecoder: tf.LayersModel;
  strokeEncoder: tf.LayersModel;
  allPoses: Array<Array<number>>;
  allStrokes: Array<Array<number>>;
  poseEncoder: tf.LayersModel;
}> = async () => {
  const [strokeEncoder, poseEncoder, poseDecoder, allStrokes, allPoses] = await Promise.all([
    tf.loadLayersModel('data/tfModels/encoder/model.json'),
    tf.loadLayersModel('data/tfModels/poseEncoder/model.json'),
    tf.loadLayersModel('data/tfModels/poseDecoder/model.json'),
    (await fetch('data/tfModels/allStrokes.json')).json(),
    (await fetch('data/tfModels/allPoses.json')).json(),
  ]);
  return {
    strokeEncoder,
    poseEncoder,
    poseDecoder,
    allStrokes,
    allPoses,
  };
};
