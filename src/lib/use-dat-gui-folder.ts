import { useDatGui } from './use-dat-gui';
import { useState } from 'react';
import { GUI } from 'dat-gui';

export const useDatGuiFolder = (folderName: string, open?: boolean): GUI => {
  const gui = useDatGui();
  const [folderMap, setFolderMap] = useState<{
    [folderName: string]: GUI;
  }>({});

  if (gui !== null && folderMap[folderName] === undefined) {
    const folder = gui.addFolder(folderName);
    if (open === true) {
      folder.open();
    }

    setFolderMap({
      ...folderMap,
      [folderName]: folder,
    });
  }

  return folderMap[folderName] || null;
};
