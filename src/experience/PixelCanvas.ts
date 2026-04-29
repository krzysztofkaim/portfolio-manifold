import { IS_ANDROID, IS_IOS, IS_SAFARI } from '../utils/browserDetection';

interface PixelState {
  x: number;
  y: number;
  color: string;
  colorIndex: number;
  size: number;
  minSize: number;
  maxSize: number;
  sizeStep: number;
  delay: number;
  counter: number;
  counterStep: number;
  isIdle: boolean;
}

interface PixelWorkerResponse {
  colorIndexes: ArrayBufferLike;
  counterSteps: ArrayBufferLike;
  delays: ArrayBufferLike;
  id: number;
  maxSizes: ArrayBufferLike;
  shared: boolean;
  sizeSteps: ArrayBufferLike;
  xs: ArrayBufferLike;
  ys: ArrayBufferLike;
}

interface PendingPixelWorkerRequest {
  reject: (reason?: unknown) => void;
  resolve: (payload: PixelWorkerResponse) => void;
  timeoutId: number;
}

const BASE_STYLE = `
  :host {
    display: block;
    inline-size: 100%;
    block-size: 100%;
    overflow: hidden;
  }

  canvas {
    display: block;
    inline-size: 100%;
    block-size: 100%;
  }
`;

export class PixelCanvas extends HTMLElement {
  private static readonly workerRequestTimeoutMs = 1500;
  private static qualityScale = 1;
  private static activeAnimationsCount = 0;
  private static readonly MAX_SAFARI_CONCURRENCY = 8;
  private static transitionMode = false;
  private static worker: Worker | null | undefined;
  private static workerRequestId = 0;
  private static readonly workerRequests = new Map<number, PendingPixelWorkerRequest>();
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private hostCard: HTMLElement | null = null;
  private isHostVisible = true;
  private resizeObserver: ResizeObserver | null = null;
  private animationFrame = 0;
  private staggerTimeout = 0;
  private timePrevious = 0;
  private readonly frameInterval = 1000 / 24;
  private reducedMotion = false;
  private pixels: PixelState[] = [];
  private isInitialized = false;
  private lastWidth = 0;
  private lastHeight = 0;
  private activeMode: 'appear' | 'disappear' | null = null;
  private lastQualityScale = 1;
  private generationToken = 0;

  static register(tag = 'pixel-canvas'): void {
    if (!customElements.get(tag)) {
      customElements.define(tag, PixelCanvas);
    }
  }

  static setGlobalQuality(scale: number): void {
    PixelCanvas.qualityScale = clampNumber(scale, 0.7, 1);
  }

  static getGlobalQuality(): number {
    return PixelCanvas.qualityScale;
  }

  static setTransitionMode(active: boolean): void {
    PixelCanvas.transitionMode = active;
  }

  static isTransitionMode(): boolean {
    return PixelCanvas.transitionMode;
  }

  private static supportsSharedMemory(): boolean {
    return typeof SharedArrayBuffer !== 'undefined' && window.crossOriginIsolated === true;
  }

  private static ensureWorker(): Worker | null {
    if (PixelCanvas.worker !== undefined) {
      return PixelCanvas.worker;
    }

    try {
      const worker = new Worker(new URL('./PixelCanvas.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (event: MessageEvent<PixelWorkerResponse>) => {
        const request = PixelCanvas.consumeWorkerRequest(event.data.id);
        if (!request) {
          return;
        }

        request.resolve(event.data);
      };
      worker.onerror = (event) => {
        PixelCanvas.failWorker(event.error ?? new Error('PixelCanvas worker crashed.'));
      };
      worker.onmessageerror = () => {
        PixelCanvas.failWorker(new Error('PixelCanvas worker failed to deserialize a response.'));
      };
      PixelCanvas.worker = worker;
    } catch (error) {
      console.warn('PixelCanvas worker unavailable. Falling back to main-thread generation.', error);
      PixelCanvas.worker = null;
    }

    return PixelCanvas.worker;
  }

  private static consumeWorkerRequest(requestId: number): PendingPixelWorkerRequest | null {
    const request = PixelCanvas.workerRequests.get(requestId) ?? null;
    if (!request) {
      return null;
    }

    window.clearTimeout(request.timeoutId);
    PixelCanvas.workerRequests.delete(requestId);
    return request;
  }

  private static failWorker(reason: unknown): void {
    const error = reason instanceof Error ? reason : new Error('PixelCanvas worker failed.');
    const pendingRequests = [...PixelCanvas.workerRequests.values()];

    for (const request of pendingRequests) {
      window.clearTimeout(request.timeoutId);
      request.reject(error);
    }

    PixelCanvas.workerRequests.clear();
    PixelCanvas.worker?.terminate();
    PixelCanvas.worker = null;
    console.warn('PixelCanvas worker failed. Falling back to main-thread generation.', error);
  }

  private get colors(): string[] {
    return this.dataset.colors?.split(',').map((value) => value.trim()).filter(Boolean) ?? [
      '#f8fafc',
      '#f1f5f9',
      '#cbd5e1'
    ];
  }

  private get gap(): number {
    const defaultGap = isSafari() ? 8 : 6;
    const parsed = Number.parseInt(this.dataset.gap ?? String(defaultGap), 10);
    return clampNumber(Number.isNaN(parsed) ? defaultGap : parsed, 4, 50);
  }

  private get noFocus(): boolean {
    return this.hasAttribute('data-no-focus');
  }

  connectedCallback(): void {
    if (IS_IOS || IS_ANDROID) {
      this.style.display = 'none';
      return;
    }

    if (this.shadowRoot) {
      return;
    }

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.hostCard = this.closest('.card');

    const shadowRoot = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = BASE_STYLE;
    this.canvas = document.createElement('canvas');
    shadowRoot.append(style, this.canvas);
    this.context = this.canvas.getContext('2d');
    this.timePrevious = performance.now();

    this.resizeObserver = new ResizeObserver(() => {
      if (this.isInitialized) {
        void this.init(false);
      }
    });
    this.resizeObserver.observe(this);

    this.hostCard?.addEventListener('cardhoverstart', this);
    this.hostCard?.addEventListener('cardhoverend', this);

    if (!this.noFocus) {
      this.hostCard?.addEventListener('focusin', this);
      this.hostCard?.addEventListener('focusout', this);
    }

    void this.init(true);
  }

  disconnectedCallback(): void {
    this.resizeObserver?.disconnect();
    this.hostCard?.removeEventListener('cardhoverstart', this);
    this.hostCard?.removeEventListener('cardhoverend', this);

    if (!this.noFocus) {
      this.hostCard?.removeEventListener('focusin', this);
      this.hostCard?.removeEventListener('focusout', this);
    }

    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
    this.activeMode = null;
    this.pixels.length = 0;
    this.context = null;
    this.canvas = null;
    this.hostCard = null;
  }

  handleEvent(event: Event): void {
    if (event.type === 'cardhoverstart') {
      this.startAnimation('appear');
      return;
    }

    if (event.type === 'cardhoverend') {
      this.startAnimation('disappear');
      return;
    }

    if (event.type === 'focusin') {
      const focusEvent = event as FocusEvent;
      if (focusEvent.currentTarget instanceof HTMLElement && focusEvent.currentTarget.contains(focusEvent.relatedTarget as Node)) {
        return;
      }
      this.startAnimation('appear');
      return;
    }

    if (event.type === 'focusout') {
      const focusEvent = event as FocusEvent;
      if (focusEvent.currentTarget instanceof HTMLElement && focusEvent.currentTarget.contains(focusEvent.relatedTarget as Node)) {
        return;
      }
      this.startAnimation('disappear');
    }
  }

  private async init(force: boolean): Promise<void> {
    if (!this.canvas || !this.context) {
      return;
    }

    const width = Math.max(1, Math.floor(this.clientWidth || this.offsetWidth));
    const height = Math.max(1, Math.floor(this.clientHeight || this.offsetHeight));

    if (!force && width === this.lastWidth && height === this.lastHeight) {
      return;
    }

    const dpr = PixelCanvas.qualityScale;

    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const generationToken = ++this.generationToken;
    this.pixels = await this.buildPixels(width, height);
    if (generationToken !== this.generationToken) {
      return;
    }
    this.lastWidth = width;
    this.lastHeight = height;
    this.lastQualityScale = dpr;
    this.isInitialized = true;
  }

  private async buildPixels(width: number, height: number): Promise<PixelState[]> {
    const worker = PixelCanvas.ensureWorker();
    if (!worker) {
      return this.createPixelsSync(width, height);
    }

    const requestId = ++PixelCanvas.workerRequestId;
    try {
      const response = await new Promise<PixelWorkerResponse>((resolve, reject) => {
        const timeoutId = window.setTimeout(() => {
          const pendingRequest = PixelCanvas.consumeWorkerRequest(requestId);
          if (!pendingRequest) {
            return;
          }

          pendingRequest.reject(
            new Error(`PixelCanvas worker request ${requestId} timed out after ${PixelCanvas.workerRequestTimeoutMs}ms.`)
          );
        }, PixelCanvas.workerRequestTimeoutMs);

        PixelCanvas.workerRequests.set(requestId, { resolve, reject, timeoutId });
        worker.postMessage({
          id: requestId,
          width,
          height,
          gap: this.gap,
          colors: this.colors,
          preferSharedMemory: PixelCanvas.supportsSharedMemory(),
          reducedMotion: this.reducedMotion
        });
      });

      return this.hydratePixels(response);
    } catch (error) {
      console.warn('PixelCanvas worker request failed. Falling back to main-thread generation.', error);
      return this.createPixelsSync(width, height);
    }
  }

  private createPixelsSync(width: number, height: number): PixelState[] {
    const maxIntegerSize = 2;
    const gap = this.gap;
    const palette = this.colors;
    const pixels: PixelState[] = [];

    for (let x = 0; x < width; x += gap) {
      for (let y = 0; y < height; y += gap) {
        const colorIndex = Math.floor(Math.random() * palette.length);
        const color = palette[colorIndex] ?? palette[0] ?? '#ffffff';
        const delay = this.reducedMotion ? 0 : distanceToCenter(x, y, width, height);

        pixels.push({
          x,
          y,
          color,
          colorIndex,
          size: 0,
          minSize: 0.5,
          maxSize: randomBetween(0.5, maxIntegerSize),
          sizeStep: Math.random() * 0.4,
          delay,
          counter: 0,
          counterStep: Math.random() * 4 + (width + height) * 0.01,
          isIdle: false
        });
      }
    }

    sortPixelsByColor(pixels);
    return pixels;
  }

  private hydratePixels(response: PixelWorkerResponse): PixelState[] {
    const xs = new Float32Array(response.xs);
    const ys = new Float32Array(response.ys);
    const delays = new Float32Array(response.delays);
    const maxSizes = new Float32Array(response.maxSizes);
    const sizeSteps = new Float32Array(response.sizeSteps);
    const counterSteps = new Float32Array(response.counterSteps);
    const colorIndexes = new Uint8Array(response.colorIndexes);
    const palette = this.colors;
    const pixels = new Array<PixelState>(xs.length);

    for (let index = 0; index < xs.length; index += 1) {
      pixels[index] = {
        x: xs[index] ?? 0,
        y: ys[index] ?? 0,
        color: palette[colorIndexes[index] ?? 0] ?? palette[0] ?? '#ffffff',
        colorIndex: colorIndexes[index] ?? 0,
        size: 0,
        minSize: 0.5,
        maxSize: maxSizes[index] ?? 1,
        sizeStep: sizeSteps[index] ?? 0.1,
        delay: delays[index] ?? 0,
        counter: 0,
        counterStep: counterSteps[index] ?? 1,
        isIdle: false
      };
    }

    sortPixelsByColor(pixels);
    return pixels;
  }

  private async startAnimation(mode: 'appear' | 'disappear'): Promise<void> {
    if (this.hostCard && !this.isHostVisible) {
      return;
    }

    if (this.activeMode === mode && this.animationFrame !== 0) {
      return;
    }

    if (!this.isInitialized) {
      await this.init(true);
    } else {
      await this.init(false);
    }

    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;

    if (IS_SAFARI && PixelCanvas.activeAnimationsCount >= PixelCanvas.MAX_SAFARI_CONCURRENCY && mode === 'appear') {
      return;
    }

    if (this.animationFrame === 0) {
      PixelCanvas.activeAnimationsCount++;
    }

    this.activeMode = mode;
    
    if (IS_SAFARI && mode === 'appear') {
      window.clearTimeout(this.staggerTimeout);
      this.staggerTimeout = window.setTimeout(() => {
        this.animationFrame = window.requestAnimationFrame((time) => this.stepAnimation(mode, time));
      }, Math.random() * 800);
    } else {
      this.animationFrame = window.requestAnimationFrame((time) => this.stepAnimation(mode, time));
    }
  }

  private stepAnimation(mode: 'appear' | 'disappear', time: number): void {
    if (this.hostCard && !this.isHostVisible) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = 0;
      this.activeMode = null;
      return;
    }

    this.animationFrame = window.requestAnimationFrame((nextTime) => this.stepAnimation(mode, nextTime));

    if (!this.context || !this.canvas) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = 0;
      this.activeMode = null;
      return;
    }

    if (!PixelCanvas.isTransitionMode() && Math.abs(PixelCanvas.getGlobalQuality() - this.lastQualityScale) > 0.02) {
      this.init(true);
    }

    const timePassed = time - this.timePrevious;
    const frameInterval = PixelCanvas.isTransitionMode() ? this.frameInterval * 1.75 : this.frameInterval;
    if (timePassed < frameInterval) {
      return;
    }

    this.timePrevious = time - (timePassed % frameInterval);
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    let idleCount = 0;
    let lastColorIndex = -1;

    for (let index = 0; index < this.pixels.length; index += 1) {
      const pixel = this.pixels[index];
      if (!pixel) {
        continue;
      }

      if (mode === 'appear') {
        animateAppear(pixel);
      } else {
        animateDisappear(pixel);
      }

      if (pixel.size > 0) {
        if (pixel.colorIndex !== lastColorIndex) {
          this.context.fillStyle = pixel.color;
          lastColorIndex = pixel.colorIndex;
        }
        drawPixel(this.context, pixel);
      }

      if (pixel.isIdle) {
        idleCount += 1;
      }
    }

    if (idleCount === this.pixels.length) {
      cancelAnimationFrame(this.animationFrame);
      window.clearTimeout(this.staggerTimeout);
      this.animationFrame = 0;
      this.staggerTimeout = 0;
      this.activeMode = null;
      PixelCanvas.activeAnimationsCount = Math.max(0, PixelCanvas.activeAnimationsCount - 1);
    }
  }

  /**
   * Sets the visibility state of the host card to avoid getComputedStyle lookups.
   */
  public setHostVisibility(visible: boolean): void {
    this.isHostVisible = visible;
    if (!visible && this.animationFrame !== 0) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = 0;
      this.activeMode = null;
      PixelCanvas.activeAnimationsCount = Math.max(0, PixelCanvas.activeAnimationsCount - 1);
    }
  }
}

function animateAppear(pixel: PixelState): void {
  pixel.isIdle = false;

  if (pixel.counter <= pixel.delay) {
    pixel.counter += pixel.counterStep;
    return;
  }

  if (pixel.size >= pixel.maxSize) {
    pixel.size = pixel.maxSize;
    pixel.isIdle = true;
    return;
  }

  pixel.size += pixel.sizeStep;
}

function animateDisappear(pixel: PixelState): void {
  pixel.counter = 0;

  if (pixel.size <= 0) {
    pixel.size = 0;
    pixel.isIdle = true;
    return;
  }

  pixel.size -= 0.1;
}

function drawPixel(context: CanvasRenderingContext2D, pixel: PixelState): void {
  const centerOffset = 1 - pixel.size * 0.5;
  context.fillRect(pixel.x + centerOffset, pixel.y + centerOffset, pixel.size, pixel.size);
}

function sortPixelsByColor(pixels: PixelState[]): void {
  pixels.sort((left, right) => left.colorIndex - right.colorIndex);
}

function distanceToCenter(x: number, y: number, width: number, height: number): number {
  const dx = x - width / 2;
  const dy = y - height / 2;
  return Math.sqrt(dx * dx + dy * dy);
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
