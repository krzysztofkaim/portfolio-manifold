export interface IRuntimeAdapter {
  addWindowEventListener<K extends keyof WindowEventMap>(
    type: K,
    listener: (this: Window, event: WindowEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  getViewportSize(): { height: number; width: number };
  now(): number;
  removeWindowEventListener<K extends keyof WindowEventMap>(
    type: K,
    listener: (this: Window, event: WindowEventMap[K]) => void,
    options?: boolean | EventListenerOptions
  ): void;
}
