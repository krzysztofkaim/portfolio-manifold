import { LiquidGradientKernel } from './liquid-gradient/LiquidGradientKernel';
import { IS_SAFARI } from '../utils/browserDetection';

type GradientWorkerMessage =
  | {
      type: 'init';
      canvas: OffscreenCanvas;
      maxBlobs: number;
      quality: number;
      viewportHeight: number;
      viewportWidth: number;
    }
  | {
      type: 'quality';
      quality: number;
      viewportHeight: number;
      viewportWidth: number;
    }
  | {
      type: 'resize';
      viewportHeight: number;
      viewportWidth: number;
    }
  | {
      type: 'update';
      scrollVelocity: number;
      time: number;
    }
  | {
      type: 'destroy';
    };

type TransferableCanvasElement = HTMLCanvasElement & {
  transferControlToOffscreen(): OffscreenCanvas;
};

export class LiquidGradientBackground {
  private readonly worker: Worker | null;
  private readonly kernel: LiquidGradientKernel | null;
  private quality = 0.44;
  private lastRenderTime = 0;
  private lastScrollVelocity = 0;
  private isFallbackMode = false;
  private lastMainThreadRenderAt = 0;
  private readonly maxBlobs: number;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.maxBlobs = IS_SAFARI ? 4 : 6;
    this.worker = this.createWorker();
    this.isFallbackMode = !this.worker;
    this.kernel = this.worker ? null : this.createMainThreadKernel();
    this.resize();
    this.requestImmediateRender();
  }

  setQuality(scale: number): void {
    if (this.worker) {
      this.quality = scale;
      this.postToWorker({
        type: 'quality',
        quality: this.quality,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
      });
      this.requestImmediateRender();
      return;
    }

    if (!this.kernel) {
      return;
    }

    const didChange = this.kernel.setQuality(scale);
    this.quality = scale;
    if (didChange) {
      this.resize();
      this.requestImmediateRender();
    }
  }

  resize(): void {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (this.worker) {
      this.postToWorker({
        type: 'resize',
        viewportWidth,
        viewportHeight
      });
      this.requestImmediateRender();
      return;
    }

    this.kernel?.resize(viewportWidth, viewportHeight);
    this.requestImmediateRender();
  }

  update(time: number, scrollVelocity: number): void {
    this.lastRenderTime = time;
    this.lastScrollVelocity = scrollVelocity;

    if (this.worker) {
      this.postToWorker({
        type: 'update',
        time,
        scrollVelocity
      });
      return;
    }

    // Graceful Degradation: Limit main-thread rendering to ~30 FPS to save CPU for core UI interactions
    if (this.isFallbackMode && time - this.lastMainThreadRenderAt < 32) {
      return;
    }

    this.lastMainThreadRenderAt = time;
    this.kernel?.render(time, scrollVelocity);
  }

  destroy(): void {
    if (this.worker) {
      this.postToWorker({ type: 'destroy' });
      this.worker.terminate();
    }
  }

  private createMainThreadKernel(): LiquidGradientKernel {
    const context = this.canvas.getContext('2d', { alpha: false, desynchronized: true });

    if (!context) {
      throw new Error('2D canvas is not supported in this environment.');
    }

    const kernel = new LiquidGradientKernel(this.canvas, context, this.maxBlobs);
    // Enforce safety quality for main-thread fallback to prevent hangs
    kernel.setQuality(Math.min(this.quality, 0.15));
    return kernel;
  }

  private createWorker(): Worker | null {
    if (typeof Worker !== 'function' || !isTransferableCanvas(this.canvas)) {
      return null;
    }

    try {
      const worker = new Worker(new URL('./LiquidGradientBackground.worker.ts', import.meta.url), {
        type: 'module'
      });
      const offscreenCanvas = this.canvas.transferControlToOffscreen();
      const initMessage: GradientWorkerMessage = {
        type: 'init',
        canvas: offscreenCanvas,
        maxBlobs: this.maxBlobs,
        quality: this.quality,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
      };
      worker.postMessage(initMessage, [offscreenCanvas]);
      return worker;
    } catch (error) {
      console.warn('Offscreen liquid gradient worker unavailable. Falling back to main thread.', error);
      return null;
    }
  }

  private postToWorker(message: GradientWorkerMessage): void {
    this.worker?.postMessage(message);
  }

  private requestImmediateRender(): void {
    if (this.worker) {
      this.postToWorker({
        type: 'update',
        time: this.lastRenderTime,
        scrollVelocity: this.lastScrollVelocity
      });
      return;
    }

    this.kernel?.render(this.lastRenderTime, this.lastScrollVelocity);
  }
}

function isTransferableCanvas(canvas: HTMLCanvasElement): canvas is TransferableCanvasElement {
  return typeof (canvas as TransferableCanvasElement).transferControlToOffscreen === 'function';
}
