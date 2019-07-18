/* eslint-disable */
(() => {
  if (self instanceof DedicatedWorkerGlobalScope && typeof OffscreenCanvas !== 'undefined') {
    self.document = {
      createElement: () => {
        return new OffscreenCanvas(640, 480);
      },
    };
    self.window = {
      screen: {
        width: 640,
        height: 480,
      },
    };
    self.HTMLVideoElement = function() {};
    self.HTMLImageElement = function() {};
    self.HTMLCanvasElement = function() {};
  }
})();
