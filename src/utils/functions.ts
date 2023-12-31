import { Availability } from '../types/entities';
import { CustomEventData, CustomEvents } from '../types/types';
import { Construct } from '../types/utils';
import { translation } from './lang';

export const capitalize = (value: string): string => value.slice(0, 1).toUpperCase() + value.slice(1);

export const createElement = <K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string | string[]
): HTMLElementTagNameMap[K] => {
  const $element = document.createElement(tagName);
  if (className) {
    $element.className = [className].flat(Infinity).join(' ');
  }
  return $element;
};

export const $ = createElement;

export const replaceWith = <T extends HTMLElement = HTMLElement>($element: T, $newElement: T): T => {
  if ($element) {
    $element.replaceWith($newElement);
    return $newElement;
  }
  return $newElement;
};

export const isKeyOf = <T extends object>(value: unknown, obj: T): value is keyof typeof obj =>
  (value as string) in obj;

// export const isElementOfClass = ($item: EventTarget | null, className: string): $item is Element =>
//   $item instanceof Element && $item.classList.contains(className);

export const isElementOfCssClass = <T extends HTMLElement = HTMLElement>(
  $item: EventTarget | null,
  className: string
): $item is T => $item instanceof Element && $item.classList.contains(className);

export const isClosestElementOfCssClass = <T extends HTMLElement = HTMLElement>(
  $item: EventTarget | null,
  className: string
): $item is T => $item instanceof Element && Boolean($item.closest(`.${className}`));

export const getTypedCustomEvent = <K extends CustomEvents>(name: K, event: Event) => {
  return event as unknown as CustomEvent<CustomEventData[K]>;
};

export const readImage = (file: File, $image: HTMLImageElement, callback?: () => void) => {
  const reader = new FileReader();

  reader.onload = function (e) {
    if (e.target) {
      $image.src = e.target.result as string;
      if (callback) {
        callback();
      }
    }
  };

  reader.readAsDataURL(file);
};

export const base64Url = (base64: string) => `data:image/jpg;base64, ${base64}`;

export function deepMergeObject(targetObject = {}, sourceObject = {}) {
  const copyTargetObject = JSON.parse(JSON.stringify(targetObject));
  const copySourceObject = JSON.parse(JSON.stringify(sourceObject));
  Object.keys(copySourceObject).forEach((key) => {
    if (typeof copySourceObject[key] === 'object' && !Array.isArray(copySourceObject[key])) {
      copyTargetObject[key] = deepMergeObject(copyTargetObject[key], copySourceObject[key]);
    } else {
      copyTargetObject[key] = copySourceObject[key];
    }
  });

  return copyTargetObject;
}

export const getAvailability = (availability: Availability): string => {
  const __ = translation();
  const data = {
    [Availability.Online]: __.availability.online,
    [Availability.Offline]: __.availability.offline,
    [Availability.Away]: __.availability.away,
    [Availability.DoNotDisturb]: __.availability.doNotDisturb,
  };
  return data[availability];
};

export const toggleLoader = (toggle: boolean): void => {
  const loader = document.getElementById('loader');
  if (loader) {
    loader.classList.toggle('on', toggle);
  }
};
