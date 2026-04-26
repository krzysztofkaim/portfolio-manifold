import type { IRuntimeAdapter } from '../ports';

export class BrowserRuntimeAdapter implements IRuntimeAdapter {
  addWindowEventListener<K extends keyof WindowEventMap>(
    type: K,
    listener: (this: Window, event: WindowEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void {
    window.addEventListener(type, listener, options);
  }

  getViewportSize(): { height: number; width: number } {
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }

  now(): number {
    return performance.now();
  }

  removeWindowEventListener<K extends keyof WindowEventMap>(
    type: K,
    listener: (this: Window, event: WindowEventMap[K]) => void,
    options?: boolean | EventListenerOptions
  ): void {
    window.removeEventListener(type, listener, options);
  }
}
