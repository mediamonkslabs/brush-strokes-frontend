import React, { createRef, PointerEvent, useCallback, useEffect, useState } from 'react';
import { applyBackground, get2DContext, scaleImage } from '../../lib/canvas';

export interface Props {
  width: number;
  height: number;
  onDraw: (imageData: ImageData) => void;
  scaleX: number;
  scaleY: number;
}

const clear = (ctx: CanvasRenderingContext2D) => {
  if (ctx === null) {
    return;
  }

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 5 * devicePixelRatio;
  ctx.lineJoin = ctx.lineCap = 'round';
  ctx.filter = 'blur(5px)';
};

const drawBetweenPoints = (
  context: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) => {
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
  context.closePath();
};

const DrawableCanvas: React.FunctionComponent<Props> = ({
  width,
  height,
  onDraw,
  scaleX,
  scaleY,
}) => {
  const canvasRef = createRef<HTMLCanvasElement>();
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [previousMouse, setPreviousMouse] = useState<{ x: number; y: number }>({ x: -1, y: -1 });
  const [mouseDown, setMouseDown] = useState<boolean>(false);

  const pointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    setPreviousMouse({
      x: event.nativeEvent.offsetX * devicePixelRatio,
      y: event.nativeEvent.offsetY * devicePixelRatio,
    });
    setMouseDown(true);
  };

  const pointerUp = useCallback(() => {
    // drawFromPrevious(event.offsetX, event.offsetY);
    if (!mouseDown) {
      return;
    }

    setMouseDown(false);

    if (context === null) {
      return;
    }

    onDraw(
      applyBackground(
        scaleImage(
          context.getImageData(0, 0, context.canvas.width, context.canvas.height),
          context.canvas.width / devicePixelRatio,
          context.canvas.height / devicePixelRatio,
        ),
        '#ffffff',
      ),
    );
    clear(context);
  }, [context, mouseDown, onDraw]);

  const pointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (context === null) {
        return;
      }
      if (mouseDown) {
        const x = event.nativeEvent.offsetX * devicePixelRatio;
        const y = event.nativeEvent.offsetY * devicePixelRatio;

        drawBetweenPoints(
          context,
          previousMouse.x / scaleX,
          previousMouse.y / scaleY,
          x / scaleX,
          y / scaleY,
        );

        setPreviousMouse({ x, y });
      }
    },
    [context, mouseDown, previousMouse, scaleX, scaleY],
  );

  useEffect(() => {
    if (context !== null) {
      clear(context);
    }
  }, [context]);

  useEffect(() => {
    if (canvasRef.current !== null && context === null) {
      const newContext = get2DContext(canvasRef.current);
      setContext(newContext);
    }
  }, [canvasRef, context]);

  return (
    <canvas
      width={width * devicePixelRatio}
      ref={canvasRef}
      height={height * devicePixelRatio}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerDown={pointerDown}
    />
  );
};

export default DrawableCanvas;
