import { LiquidGradientKernel } from './liquid-gradient/LiquidGradientKernel';

type WorkerMessage =
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

let kernel: LiquidGradientKernel | null = null;

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  switch (message.type) {
    case 'init': {
      const context = message.canvas.getContext('2d', { alpha: false, desynchronized: true });
      if (!context) {
        return;
      }

      kernel = new LiquidGradientKernel(message.canvas, context, message.maxBlobs);
      kernel.setQuality(message.quality);
      kernel.resize(message.viewportWidth, message.viewportHeight);
      return;
    }
    case 'quality': {
      if (!kernel) {
        return;
      }

      const resized = kernel.setQuality(message.quality);
      if (resized) {
        kernel.resize(message.viewportWidth, message.viewportHeight);
      }
      return;
    }
    case 'resize': {
      kernel?.resize(message.viewportWidth, message.viewportHeight);
      return;
    }
    case 'update': {
      kernel?.render(message.time, message.scrollVelocity);
      return;
    }
    case 'destroy': {
      kernel = null;
      self.close();
      return;
    }
  }
};
