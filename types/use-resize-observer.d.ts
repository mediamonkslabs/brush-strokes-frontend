import React from 'react';

declare module 'use-resize-observer' {
  type useResizeObserver = () => [React.MutableRefObject<HTMLDivElement | null>, number, number];

  const useResizeObserver: useResizeObserver;

  export = useResizeObserver;
}
