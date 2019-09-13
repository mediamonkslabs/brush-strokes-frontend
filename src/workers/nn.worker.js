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

export const next = (previousStrokeVectors =>
  async function(nextImages, frames, additionalFrames, additionalFramesStep) {
    const iterable = _next(
      data,
      previousStrokeVectors,
      nextImages,
      frames,
      additionalFrames,
      additionalFramesStep,
    );

    postMessage({
      type: 'INIT',
      data: (await iterable.next()).value,
    });

    while (true) {
      const res = await iterable.next();
      if (res.done === true) {
        break;
      }
      postMessage({
        type: 'DATA',
        data: res.value,
      });
    }

    postMessage({
      type: 'END',
    });
  })([]);

// needed for TypeScript to correctly interpret what workerize-loader exports
// eslint-disable-next-line no-native-reassign
export default Worker = () => ({ load, next, ready: Promise.resolve() });
