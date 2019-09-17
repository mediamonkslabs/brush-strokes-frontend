import React, { createRef, ReactNode, useCallback, useEffect, useState } from 'react';
import classNames from 'classnames';
import styles from './CustomCursor.module.css';
import { startLerp } from '../../lib/lerp';
import { expoOut } from 'eases';

interface Props {
  children: Array<ReactNode> | ReactNode;
  cursorOffsetX: number;
  cursorOffsetY: number;
  isLoading: boolean;
  loadingProgress: number;
}

const radius = 46;
const circumference = 2 * Math.PI * radius;

const CustomCursor = ({
  children,
  cursorOffsetX,
  cursorOffsetY,
  isLoading,
  loadingProgress,
}: Props) => {
  const rootRef = createRef<HTMLDivElement>();
  const cursorRef = createRef<SVGSVGElement>();
  const spinnerRef = createRef<SVGSVGElement>();

  const outlineRef = createRef<SVGCircleElement>();
  const progressRef = createRef<SVGCircleElement>();

  const [outlineLerp, setOutlineLerp] = useState<ReturnType<typeof startLerp> | null>(null);
  const [progressLerp, setProgressLerp] = useState<ReturnType<typeof startLerp> | null>(null);

  const [isPointerVisible, setPointerVisible] = useState<boolean>(false);

  const pointerMoveCallback = useCallback(
    (event: PointerEvent) => {
      if (cursorRef.current !== null) {
        cursorRef.current.style.setProperty('left', `${event.offsetX + cursorOffsetX}px`);
        cursorRef.current.style.setProperty('top', `${event.offsetY + cursorOffsetY}px`);
      }
      if (spinnerRef.current !== null) {
        if (event.pointerType !== 'touch') {
          spinnerRef.current.style.setProperty('left', `${event.offsetX + cursorOffsetX}px`);
          spinnerRef.current.style.setProperty('top', `${event.offsetY + cursorOffsetY}px`);
        } else {
          spinnerRef.current.style.removeProperty('left');
          spinnerRef.current.style.removeProperty('top');
        }
      }
    },
    [cursorRef, cursorOffsetX, cursorOffsetY, spinnerRef],
  );

  const pointerLeaveCallback = useCallback(
    (event: PointerEvent) => {
      if (spinnerRef.current !== null) {
        spinnerRef.current.style.removeProperty('left');
        spinnerRef.current.style.removeProperty('top');
      }
      setPointerVisible(false);
    },
    [spinnerRef],
  );

  const pointerEnterCallback = useCallback(
    (event: PointerEvent) => {
      if (event.pointerType === 'touch' && spinnerRef.current !== null) {
        spinnerRef.current.style.removeProperty('left');
        spinnerRef.current.style.removeProperty('top');
      }
      setPointerVisible(true);
    },
    [spinnerRef],
  );

  const setOutlineRadius = useCallback(
    p => {
      if (outlineRef.current !== null && progressRef.current !== null) {
        outlineRef.current.style.setProperty('strokeDasharray', `0, ${p * 10}`.toString());
        outlineRef.current.style.setProperty('r', (p * radius).toString());
        outlineRef.current.style.setProperty('strokeWidth', p.toString());
        progressRef.current.style.setProperty('strokeWidth', (p * 3).toString());
        progressRef.current.style.setProperty('r', (p * radius).toString());
      }
    },
    [outlineRef, progressRef],
  );

  const setProgress = useCallback(
    p => {
      if (progressRef.current !== null) {
        progressRef.current.style.strokeDashoffset = (circumference * (1 - p)).toString();
      }
    },
    [progressRef],
  );

  useEffect(() => {
    if (outlineLerp !== null) {
      outlineLerp.updateTarget(isLoading ? 1 : 0);
    }
  }, [isLoading, outlineLerp]);

  useEffect(() => {
    if (progressLerp !== null) {
      progressLerp.updateTarget(loadingProgress);
    }
  }, [loadingProgress, progressLerp]);

  useEffect(() => {
    if (progressLerp === null) {
      setProgressLerp(startLerp(0, setProgress, 100));
    } else {
      progressLerp.updateCallback(setProgress);
    }
  }, [setProgress, progressLerp]);

  useEffect(() => {
    if (outlineLerp === null) {
      setOutlineLerp(startLerp(0, setOutlineRadius, 200, expoOut));
    } else {
      outlineLerp.updateCallback(setOutlineRadius);
    }
  }, [setOutlineRadius, outlineLerp]);

  useEffect(() => {
    const root = rootRef.current;
    if (root !== null) {
      root.addEventListener('pointermove', pointerMoveCallback);
      root.addEventListener('pointerleave', pointerLeaveCallback);
      root.addEventListener('pointerenter', pointerEnterCallback);
    }

    return () => {
      if (root !== null) {
        root.removeEventListener('pointermove', pointerMoveCallback);
        root.removeEventListener('pointerleave', pointerLeaveCallback);
        root.removeEventListener('pointerenter', pointerEnterCallback);
      }
    };
  }, [rootRef, pointerMoveCallback, pointerLeaveCallback, pointerEnterCallback]);

  return (
    <div ref={rootRef} className={styles.root}>
      <svg
        width="100"
        height="100"
        viewBox="0 0 100 100"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        ref={cursorRef}
        className={classNames(styles.cursor, {
          [styles.cursorVisible]: isPointerVisible,
        })}
      >
        <path
          d="M43.2 53c-.5-.5-.4-1.3.1-1.8l21.8-20c1.1-1 2.8-1 3.8 0s1 2.6 0 3.7L48.3 56.2c-.5.5-1.3.6-1.8.1L43.2 53zm-.5 4.5c2.5 2.5 2.5 6.5 0 9-1.5 1.4-3.9 2-6.2 2.3-2.1.2-6 .6-6 .6s.4-3.8.6-5.9c.3-2.2.9-4.6 2.3-6 2.7-2.4 6.8-2.4 9.3 0"
          fill="none"
          stroke="#000"
          strokeWidth=".956"
        />
      </svg>

      <svg
        width="100"
        height="100"
        viewBox="0 0 100 100"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        ref={spinnerRef}
        className={classNames(styles.spinner, {
          [styles.spinnerVisible]: true,
        })}
      >
        <circle
          cx="50"
          cy="50"
          r="46"
          stroke="rgba(0, 0, 0, 1)"
          strokeWidth="1"
          strokeDasharray="0 10"
          strokeLinecap="round"
          fill="transparent"
          ref={outlineRef}
          className={styles.cursorOutline}
        />

        <circle
          ref={progressRef}
          cx="50"
          cy="50"
          r="46"
          stroke="#6b7dcd"
          strokeWidth="3"
          fill="transparent"
          strokeDasharray={circumference.toString()}
        />
      </svg>
      {children}
    </div>
  );
};

export default CustomCursor;
