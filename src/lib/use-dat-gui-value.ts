import { useState } from 'react';
import { GUI, GUIController } from 'dat-gui';

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
