import React, { createRef, ReactNode, useCallback, useEffect, useState } from 'react';
import classNames from 'classnames';
import styles from './CustomCursor.module.css';

interface Props {
  children: Array<ReactNode> | ReactNode;
  cursorImage: string;
  cursorOffsetX: number;
  cursorOffsetY: number;
}

interface Point {
  x: number;
  y: number;
}

const CustomCursor = ({ children, cursorImage, cursorOffsetX, cursorOffsetY }: Props) => {
  const rootRef = createRef<HTMLDivElement>();
  const cursorRef = createRef<HTMLImageElement>();
  const [isPointerVisible, setPointerVisible] = useState<boolean>(false);

  const pointerMoveCallback = useCallback(
    (event: PointerEvent) => {
      if (cursorRef.current !== null) {
        cursorRef.current.style.setProperty('left', `${event.offsetX + cursorOffsetX}px`);
        cursorRef.current.style.setProperty('top', `${event.offsetY + cursorOffsetY}px`);
      }
    },
    [cursorRef, cursorOffsetX, cursorOffsetY],
  );

  const pointerLeaveCallback = useCallback(() => {
    setPointerVisible(false);
  }, []);

  const pointerEnterCallback = useCallback(() => {
    setPointerVisible(true);
  }, []);

  useEffect(() => {
    if (rootRef.current !== null) {
      rootRef.current.addEventListener('pointermove', pointerMoveCallback);
      rootRef.current.addEventListener('pointerleave', pointerLeaveCallback);
      rootRef.current.addEventListener('pointerenter', pointerEnterCallback);
    }
  }, [rootRef, pointerMoveCallback, pointerLeaveCallback, pointerEnterCallback]);

  return (
    <div ref={rootRef} className={styles.root}>
      <img
        src={cursorImage}
        ref={cursorRef}
        alt={''}
        className={classNames(styles.cursor, {
          [styles.cursorVisible]: isPointerVisible,
        })}
      />
      {children}
    </div>
  );
};

export default CustomCursor;
