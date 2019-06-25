import { useEffect, useState } from 'react';
import { GUI } from 'dat-gui';

let gui: GUI = new GUI({ name: 'My GUI' });

export const useDatGui = (): GUI | null => {
  const [datGui, setDatGui] = useState<GUI | null>(gui);
  useEffect(() => {
    if (datGui === null) {
      gui = new GUI({ name: 'My GUI' });
      setDatGui(gui);
    }
  }, [datGui]);

  return datGui;
};
