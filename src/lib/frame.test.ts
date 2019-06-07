import { startFrameCounter } from './frame';

describe('startFrameCounter', () => {
  it('should start the frame counter', async () => {
    return new Promise(resolve => {
      const cb = {
        cb: (time: number, cancel: () => void) => {
          expect(spy).toHaveBeenCalled();
          expect(time).toStrictEqual(0);
          cancel();
          resolve();
        },
      };
      const spy = jest.spyOn(cb, 'cb');
      startFrameCounter(cb.cb);
    });
  });
});
