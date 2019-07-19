import { useEffect, useState } from 'react';
import { GUI, GUIController } from 'dat-gui';

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

export function useDatGuiValue<TValue>(folder: GUI, value: TValue, label: string): TValue;
export function useDatGuiValue<TValue>(
  folder: GUI,
  value: TValue,
  label: string,
  min: number,
  max: number,
): TValue;
export function useDatGuiValue<TValue>(
  folder: GUI,
  value: TValue,
  label: string,
  status: boolean,
): TValue;
export function useDatGuiValue<TValue>(
  folder: GUI,
  value: TValue,
  label: string,
  items: string[],
): TValue;
export function useDatGuiValue<TValue>(
  folder: GUI,
  value: TValue,
  label: string,
  items: number[],
): TValue;
export function useDatGuiValue<TValue>(
  folder: GUI,
  value: TValue,
  label: string,
  items: Object,
): TValue;

export function useDatGuiValue(
  folder: GUI | null,
  value: number,
  label: string,
  min?: number | boolean | string[] | Object,
  max?: number,
) {
  const [controllerMap, setControllerMap] = useState<{
    [label: string]: GUIController;
  }>({});

  if (folder !== null && controllerMap[label] === undefined) {
    setControllerMap({
      ...controllerMap,
      [label]: folder.add({ [label]: value }, label, min as any, max as any),
    });
  }

  if (controllerMap[label] !== undefined) {
    return controllerMap[label].getValue();
  }
  return null;
}
