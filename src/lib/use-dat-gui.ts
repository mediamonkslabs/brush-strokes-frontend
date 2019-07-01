import { useEffect, useState } from 'react';
import { GUI } from 'dat-gui';

let gui: GUI = new GUI({ name: 'My GUI' });

export const useDatGui = (): GUI | null => {
  const [datGui, setDatGui] = useState<GUI | null>(gui);
  useEffect(() => {
    if (datGui === null) {
      gui = new GUI({ name: 'My GUI', width: 0 });
      setDatGui(gui);
    }
  }, [datGui]);

  if (
    process.env.REACT_APP_HIDE_DAT_GUI !== undefined &&
    datGui !== null &&
    datGui.domElement.parentElement !== null
  ) {
    datGui.domElement.parentElement.removeChild(datGui.domElement);
  }

  return datGui;
};
