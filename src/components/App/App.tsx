import React, { RefObject, useCallback, useState } from 'react';
import Canvas from '../Canvas';
import { ScaleMode, useElementFit } from 'use-element-fit';
import { CANVAS_GUTTER, CANVAS_HEIGHT, CANVAS_WIDTH } from '../../settings';
import styles from './App.module.css';
import mute from '../../images/icons/mute.svg';
import unmute from '../../images/icons/unmute.svg';

const App = () => {
  const [muted, setMuted] = useState<boolean>(false);
  const toggleMute = useCallback(() => setMuted(!muted), [muted]);

  const { ref: containerRef, width, height, x, y } = useElementFit(
    CANVAS_WIDTH + CANVAS_GUTTER * 2,
    CANVAS_HEIGHT + CANVAS_GUTTER * 2,
    ScaleMode.CONTAIN,
  );

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
            {muted && <img src={unmute} />}
            {!muted && <img src={mute} />}
          </button>

          <div className={styles.headerMenu}>
            <button className={styles.headerButton}>Share</button>
            <button className={styles.headerButton}>About</button>
            <a className={styles.headerButton}>Source</a>
          </div>
        </div>
        <Canvas width={width - CANVAS_GUTTER * 2} height={height - CANVAS_GUTTER * 2} />
      </div>
    </div>
  );
};

export default App;
