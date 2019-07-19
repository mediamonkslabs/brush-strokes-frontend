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

export const useDatGuiFolder = (folderName: string, open?: boolean): GUI | null => {
  const gui = useDatGui();
  if (gui !== null) {
    if (Object.keys(gui.__folders).includes(folderName)) {
      return gui.__folders[folderName as any];
    } else {
      const folder = gui.addFolder(folderName);
      if (open === true) {
        folder.open();

        return folder;
      }
    }
  }

  return null;
};

export function useDatGuiValue<TValue>(folder: GUI | null, value: TValue, label: string): TValue;
export function useDatGuiValue<TValue>(
  folder: GUI | null,
  value: TValue,
  label: string,
  min: number,
  max: number,
): TValue;
export function useDatGuiValue<TValue>(
  folder: GUI | null,
  value: TValue,
  label: string,
  status: boolean,
): TValue;
export function useDatGuiValue<TValue>(
  folder: GUI | null,
  value: TValue,
  label: string,
  items: string[],
): TValue;
export function useDatGuiValue<TValue>(
  folder: GUI | null,
  value: TValue,
  label: string,
  items: number[],
): TValue;
export function useDatGuiValue<TValue>(
  folder: GUI | null,
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
  const [stateValue, setStateValue] = useState<typeof value>(value);

  if (folder === null) {
    return null;
  }

  const existing: { [key: string]: GUIController } = folder.__controllers.reduce(
    (acc, controller) => ({ ...acc, [Object.keys((controller as any).object)[0]]: controller }),
    {},
  );

  let controller: GUIController | null = null;

  if (existing[label] === undefined) {
    controller = folder.add({ [label]: value }, label, min as any, max as any);
  } else {
    controller = existing[label];
  }

  if (controller === null) {
    return null;
  }

  controller.onChange((newValue: typeof value) => setStateValue(newValue));

  return stateValue;
}
