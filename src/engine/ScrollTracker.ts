import { clamp, lerp } from '../utils/math';

interface RectSnapshot {
  top: number;
  height: number;
}

export class ScrollTracker {
  pageProgress = 0;

  private readonly registry = new WeakMap<HTMLElement, RectSnapshot>();
  private readonly elements = new Set<HTMLElement>();
  private smoothScrollY = window.scrollY;
  private lastRefresh = 0;
  private readonly resizeObserver: ResizeObserver;

  private useExternalScroll = false;

  constructor() {
    this.resizeObserver = new ResizeObserver(() => {
      this.refreshRectCache(true);
    });

    this.resizeObserver.observe(document.documentElement);
    this.resizeObserver.observe(document.body);
    this.refreshRectCache(true);
  }

  setScroll(y: number): void {
    this.smoothScrollY = y;
    this.useExternalScroll = true;
  }

  register(element: HTMLElement): void {
    this.elements.add(element);
    this.resizeObserver.observe(element);
    this.captureElement(element);
  }

  unregister(element: HTMLElement): void {
    this.elements.delete(element);
    this.resizeObserver.unobserve(element);
    this.registry.delete(element);
  }

  tick(now: number): void {
    if (!this.useExternalScroll) {
      this.smoothScrollY = lerp(this.smoothScrollY, window.scrollY, 0.14);
    }

    const maxScroll = Math.max(
      document.documentElement.scrollHeight - window.innerHeight,
      1
    );
    this.pageProgress = clamp(this.smoothScrollY / maxScroll, 0, 1);

    if (now - this.lastRefresh > 500) {
      this.refreshRectCache(false);
    }
  }

  sectionProgress(element: HTMLElement): number {
    const snapshot = this.registry.get(element);

    if (!snapshot) {
      return 0;
    }

    const absoluteTop = snapshot.top;
    const absoluteBottom = snapshot.top + snapshot.height;
    let start = absoluteBottom - window.innerHeight;
    let end = absoluteTop;

    if (Math.abs(end - start) < 1) {
      start = absoluteTop;
      end = absoluteBottom;
    }

    return clamp((this.smoothScrollY - start) / Math.max(end - start, 1), 0, 1);
  }

  dispose(): void {
    this.resizeObserver.disconnect();
    this.elements.clear();
  }

  private refreshRectCache(force: boolean): void {
    const now = performance.now();

    if (!force && now - this.lastRefresh <= 500) {
      return;
    }

    this.lastRefresh = now;

    for (const element of this.elements) {
      this.captureElement(element);
    }
  }

  private captureElement(element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    this.registry.set(element, {
      top: rect.top + window.scrollY,
      height: rect.height
    });
  }
}
