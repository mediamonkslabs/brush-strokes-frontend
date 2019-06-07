import React, { createRef, PointerEvent, useEffect, useState } from 'react';
import { get2DContext, scaleImage } from '../../lib/canvas';

export interface Props {
  width: number;
  height: number;
  onDraw: (imageData: ImageData) => void;
}

const DrawableCanvas: React.FunctionComponent<Props> = ({ width, height, onDraw }) => {
  const canvasRef = createRef<HTMLCanvasElement>();
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [previousMouse, setPreviousMouse] = useState<{ x: number; y: number }>({ x: -1, y: -1 });
  const [mouseDown, setMouseDown] = useState<boolean>(false);

  const drawFromPrevious = (x: number, y: number) => {
    if (context === null) {
      return;
    }

    context.beginPath();
    context.moveTo(previousMouse.x, previousMouse.y);
    context.lineTo(x, y);
    context.stroke();
    context.closePath();

    setPreviousMouse({ x, y });
  };

  const clear = (ctx = context) => {
    if (ctx === null) {
      return;
    }

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 10 * devicePixelRatio;
    ctx.lineJoin = ctx.lineCap = 'round';
    ctx.filter = 'blur(8px)';
  };

  const pointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    setPreviousMouse({
      x: event.nativeEvent.offsetX * devicePixelRatio,
      y: event.nativeEvent.offsetY * devicePixelRatio,
    });
    setMouseDown(true);
  };

  const pointerUp = () => {
    // drawFromPrevious(event.offsetX, event.offsetY);
    setMouseDown(false);
    if (context === null) {
      return;
    }
    onDraw(
      scaleImage(
        context.getImageData(0, 0, context.canvas.width, context.canvas.height),
        context.canvas.width / devicePixelRatio,
        context.canvas.height / devicePixelRatio,
      ),
    );
    clear();
  };

  const pointerMove = (event: React.PointerEvent) => {
    if (mouseDown) {
      drawFromPrevious(
        event.nativeEvent.offsetX * devicePixelRatio,
        event.nativeEvent.offsetY * devicePixelRatio,
      );
    }
  };

  useEffect(() => {
    if (canvasRef.current !== null && context === null) {
      const newContext = get2DContext(canvasRef.current);
      clear(newContext);
      setContext(newContext);
    }
  }, [canvasRef]);

  return (
    <canvas
      width={width * devicePixelRatio}
      ref={canvasRef}
      height={height * devicePixelRatio}
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerDown={pointerDown}
    />
  );
};

export default DrawableCanvas;
