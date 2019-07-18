import '../lib/tensorflowjs-worker-workaround';
import { loadModels, next as _next } from '../lib/nn';

let data = undefined;
const previousStrokeVectors = [];

export const next = (nextImages, frames, additionalFrames, additionalFramesStep) =>
  _next(data, previousStrokeVectors, nextImages, frames, additionalFrames, additionalFramesStep);

export const load = async () => {
  data = await loadModels();
};

export default Worker = () => ({ load, next, ready: Promise.resolve() });
