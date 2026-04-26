/** @vitest-environment happy-dom */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { RenderPipeline } from '../../../src/engine/RenderPipeline';

// Shared mock renderer state
const mockRenderer = {
  autoClear: false,
  domElement: document.createElement('canvas'),
  info: { reset: vi.fn(), render: { calls: 10, triangles: 100 } },
  outputColorSpace: '',
  toneMapping: 0,
  setPixelRatio: vi.fn(),
  setSize: vi.fn(),
  setScissorTest: vi.fn(),
  setClearColor: vi.fn(),
  clear: vi.fn(),
  setViewport: vi.fn(),
  setScissor: vi.fn(),
  render: vi.fn(),
  dispose: vi.fn(),
  init: vi.fn().mockResolvedValue(undefined)
};

// Toggle for default vs named export
let useDefaultExport = false;

vi.mock('three', () => ({
  WebGLRenderer: class {
    constructor() { return mockRenderer as any; }
  },
  ACESFilmicToneMapping: 1,
  SRGBColorSpace: 'srgb'
}));

vi.mock('three/webgpu', () => {
  return {
    get WebGPURenderer() {
      return useDefaultExport ? undefined : class {
        constructor() { return mockRenderer as any; }
      };
    },
    get default() {
      return useDefaultExport ? class {
        constructor() { return mockRenderer as any; }
      } : undefined;
    }
  };
});

describe('RenderPipeline', () => {
  let canvas: HTMLCanvasElement;
  let pipeline: RenderPipeline;

  beforeEach(() => {
    vi.clearAllMocks();
    useDefaultExport = false;
    canvas = document.createElement('canvas');
    pipeline = new RenderPipeline(canvas);
    
    // Default navigator without GPU
    Object.defineProperty(globalThis, 'navigator', {
      value: { gpu: null },
      configurable: true
    });
  });

  it('initializes with WebGL2 by default', async () => {
    await pipeline.init();
    expect(pipeline.mode).toBe('WebGL2');
    expect(mockRenderer.autoClear).toBe(false);
  });

  it('initializes with WebGPU if supported', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { gpu: {} },
      configurable: true
    });

    await pipeline.init();
    expect(pipeline.mode).toBe('WebGPU');
    expect(mockRenderer.init).toHaveBeenCalled();
  });

  it('handles default export for WebGPURenderer', async () => {
    useDefaultExport = true;
    Object.defineProperty(globalThis, 'navigator', {
      value: { gpu: {} },
      configurable: true
    });
    
    await pipeline.init();
    expect(pipeline.mode).toBe('WebGPU');
  });

  it('falls back to WebGL2 if WebGPU initialization fails', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { gpu: {} },
      configurable: true
    });
    
    mockRenderer.init.mockRejectedValueOnce(new Error('GPU failed'));

    await pipeline.init();
    expect(pipeline.mode).toBe('WebGL2');
  });

  it('executes pipeline methods', async () => {
    await pipeline.init();
    
    pipeline.beginFrame();
    expect(mockRenderer.info.reset).toHaveBeenCalled();
    
    pipeline.setPixelRatio(2);
    expect(mockRenderer.setPixelRatio).toHaveBeenCalledWith(2);
    
    pipeline.setSize(800, 600);
    expect(mockRenderer.setSize).toHaveBeenCalledWith(800, 600, false);
    
    pipeline.setViewport(0, 0, 100, 100);
    expect(mockRenderer.setViewport).toHaveBeenCalledWith(0, 0, 100, 100);
    
    pipeline.setScissor(0, 0, 100, 100);
    expect(mockRenderer.setScissor).toHaveBeenCalledWith(0, 0, 100, 100);
    
    pipeline.render({} as any, {} as any);
    expect(mockRenderer.render).toHaveBeenCalled();
    
    pipeline.dispose();
    expect(mockRenderer.dispose).toHaveBeenCalled();
  });

  it('handles renderer without info or init method branch', async () => {
    // Temporarily mess with mockRenderer
    const oldInfo = mockRenderer.info;
    (mockRenderer as any).info = undefined;
    
    await pipeline.init();
    // Should not throw
    expect(pipeline.mode).toBe('WebGL2');
    
    // Restore
    mockRenderer.info = oldInfo;
  });

  it('handles WebGPU renderer without init method branch', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { gpu: {} },
      configurable: true
    });
    
    // Mess with mockRenderer briefly
    const oldInit = mockRenderer.init;
    (mockRenderer as any).init = undefined;
    
    await pipeline.init();
    expect(pipeline.mode).toBe('WebGPU');
    
    // Restore
    mockRenderer.init = oldInit;
  });

  it('provides info and raw renderer', async () => {
    await pipeline.init();
    expect(pipeline.info).toBe(mockRenderer.info);
    expect(pipeline.rawRenderer).toBe(mockRenderer);
  });
});
