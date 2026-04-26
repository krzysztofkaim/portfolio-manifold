import type { IDomAdapter } from '../ports';

export class BrowserDomAdapter implements IDomAdapter {
  addBodyClass(...tokens: string[]): void {
    document.body.classList.add(...tokens);
  }

  bodyHasClass(token: string): boolean {
    return document.body.classList.contains(token);
  }

  createResizeObserver(callback: ResizeObserverCallback): ResizeObserver {
    return new ResizeObserver(callback);
  }

  disconnectResizeObserver(observer: ResizeObserver): void {
    observer.disconnect();
  }

  observeResize(observer: ResizeObserver, element: Element): void {
    observer.observe(element);
  }

  querySelector<T extends Element>(selector: string): T | null {
    return document.querySelector<T>(selector);
  }

  querySelectorAll<T extends Element>(selector: string): NodeListOf<T> {
    return document.querySelectorAll<T>(selector);
  }

  removeBodyClass(...tokens: string[]): void {
    document.body.classList.remove(...tokens);
  }

  removeRootClass(...tokens: string[]): void {
    document.documentElement.classList.remove(...tokens);
  }

  toggleBodyClass(token: string, force?: boolean): void {
    document.body.classList.toggle(token, force);
  }

  toggleRootClass(token: string, force?: boolean): void {
    document.documentElement.classList.toggle(token, force);
  }
}
