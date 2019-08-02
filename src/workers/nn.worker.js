import '../lib/tensorflowjs-worker-workaround';
import { loadModels, next as _next } from '../lib/nn';

let data = undefined;

export async function load() {
  const it = loadModels();

  while (true) {
    const val = await it.next();
    if (val.done === true) {
      postMessage({ type: 'progress', value: 1 });
      data = val.value;
      break;
    } else {
      postMessage({ type: 'progress', value: val.value });
    }
  }
}

export const next = (previousStrokeVectors => (
  nextImages,
  frames,
  additionalFrames,
  additionalFramesStep,
) =>
  _next(data, previousStrokeVectors, nextImages, frames, additionalFrames, additionalFramesStep))(
  [],
);

export default Worker = () => ({ load, next, ready: Promise.resolve() });
