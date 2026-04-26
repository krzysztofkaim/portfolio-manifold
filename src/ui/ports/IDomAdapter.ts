export interface IDomAdapter {
  addBodyClass(...tokens: string[]): void;
  bodyHasClass(token: string): boolean;
  createResizeObserver(callback: ResizeObserverCallback): ResizeObserver;
  disconnectResizeObserver(observer: ResizeObserver): void;
  observeResize(observer: ResizeObserver, element: Element): void;
  querySelector<T extends Element>(selector: string): T | null;
  querySelectorAll<T extends Element>(selector: string): NodeListOf<T>;
  removeBodyClass(...tokens: string[]): void;
  removeRootClass(...tokens: string[]): void;
  toggleBodyClass(token: string, force?: boolean): void;
  toggleRootClass(token: string, force?: boolean): void;
}
