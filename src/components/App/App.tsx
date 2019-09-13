import React, { RefObject, useCallback, useState } from 'react';
import Canvas from '../Canvas';
import { ScaleMode, useElementFit } from 'use-element-fit';
import { CANVAS_GUTTER, CANVAS_HEIGHT, CANVAS_WIDTH } from '../../settings';
import styles from './App.module.css';
import mute from '../../images/icons/mute.svg';
import unmute from '../../images/icons/unmute.svg';
import CustomCursor from '../CustomCursor';

const App = () => {
  const [muted, setMuted] = useState<boolean>(false);
  const toggleMute = useCallback(() => setMuted(!muted), [muted]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [processingProgress, setProcessingProgress] = useState<number>(0);

  const { ref: containerRef, width, height, x, y } = useElementFit(
    CANVAS_WIDTH + CANVAS_GUTTER * 2,

    CANVAS_HEIGHT + CANVAS_GUTTER * 2,
    ScaleMode.CONTAIN,
  );

  const onProcessingStateChange = useCallback((isProcessing: boolean) => {
    setIsLoading(isProcessing);
    setProcessingProgress(0);
  }, []);

  const onProcessingProgressChange = useCallback(progress => {
    setProcessingProgress(progress);
  }, []);

  const onLoadingStateChange = useCallback((isLoading: boolean) => {
    setIsLoading(isLoading);
  }, []);

  return (
    <div ref={containerRef as RefObject<HTMLDivElement>} className={styles.root}>
      <div
        className={styles.app}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          top: `${y}px`,
          left: `${x}px`,
        }}
      >
        <div className={styles.header}>
          <button onClick={toggleMute} className={styles.headerButton}>
            {muted && <img src={unmute} alt={'unmute'} />}
            {!muted && <img src={mute} alt={'mute'} />}
          </button>

          <div className={styles.headerMenu}>
            <button className={styles.headerButton}>Share</button>
            <button className={styles.headerButton}>About</button>
            <a
              href={'https://github.com/mediamonkslabs/brush-strokes-frontend'}
              target={'_blank'}
              className={styles.headerButton}
            >
              Source
            </a>
          </div>
        </div>
        <CustomCursor
          cursorOffsetX={-30}
          cursorOffsetY={-70}
          isLoading={isLoading}
          loadingProgress={processingProgress}
        >
          <Canvas
            width={width - CANVAS_GUTTER * 2}
            height={height - CANVAS_GUTTER * 2}
            onInitLoadingStateChange={onLoadingStateChange}
            onProcessingStateChange={onProcessingStateChange}
            onProcessingProgressChange={onProcessingProgressChange}
          />
        </CustomCursor>
      </div>
    </div>
  );
};

export default App;
