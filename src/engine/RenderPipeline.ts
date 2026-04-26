import type { Camera, ColorRepresentation, Scene } from 'three';
import { IS_SAFARI } from '../utils/browserDetection';

type RendererInfo = {
  autoReset?: boolean;
  reset?: () => void;
  render?: {
    calls?: number;
    triangles?: number;
  };
};

type RendererLike = {
  autoClear: boolean;
  capabilities?: unknown;
  domElement: HTMLCanvasElement;
  info: RendererInfo;
  outputColorSpace: string;
  toneMapping: number;
  setPixelRatio: (value: number) => void;
  setSize: (width: number, height: number, updateStyle?: boolean) => void;
  setScissorTest: (enabled: boolean) => void;
  setClearColor: (color: ColorRepresentation, alpha?: number) => void;
  clear: (color?: boolean, depth?: boolean, stencil?: boolean) => void;
  setViewport: (x: number, y: number, width: number, height: number) => void;
  setScissor: (x: number, y: number, width: number, height: number) => void;
  render: (scene: Scene, camera: Camera) => void;
  dispose: () => void;
};

export class RenderPipeline {
  private renderer!: RendererLike;
  private backend: 'WebGPU' | 'WebGL2' = 'WebGL2';

  constructor(private readonly canvas: HTMLCanvasElement) {}

  async init(): Promise<void> {
    const threeModule: typeof import('three') = await import('three');

    if (RenderPipeline.supportsWebGPU()) {
      try {
        const webgpuModule: typeof import('three/webgpu') = await import('three/webgpu');
        const WebGPURendererCtor = webgpuModule.WebGPURenderer ?? webgpuModule.default;
        const webgpuRenderer = new WebGPURendererCtor({
          canvas: this.canvas,
          alpha: true,
          antialias: false,
          depth: true,
          powerPreference: 'high-performance',
          stencil: false
        });

        if ('init' in webgpuRenderer && typeof webgpuRenderer.init === 'function') {
          await webgpuRenderer.init();
        }

        this.renderer = webgpuRenderer as unknown as RendererLike;
        this.backend = 'WebGPU';
      } catch (error) {
        console.warn('WebGPU initialization failed, falling back to WebGL2.', error);
      }
    }

    if (!this.renderer) {
      this.renderer = new threeModule.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: false,
        depth: true,
        powerPreference: 'high-performance',
        stencil: false
      }) as unknown as RendererLike;
      this.backend = 'WebGL2';
    }

    this.renderer.autoClear = false;
    this.renderer.toneMapping = threeModule.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = threeModule.SRGBColorSpace;

    if ('info' in this.renderer && this.renderer.info) {
      this.renderer.info.autoReset = false;
    }
  }

  beginFrame(): void {
    this.renderer.info.reset?.();
    this.renderer.setScissorTest(true);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.clear(true, true, true);
  }

  setPixelRatio(value: number): void {
    this.renderer.setPixelRatio(value);
  }

  setSize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
  }

  setViewport(x: number, y: number, width: number, height: number): void {
    this.renderer.setViewport(x, y, width, height);
  }

  setScissor(x: number, y: number, width: number, height: number): void {
    this.renderer.setScissor(x, y, width, height);
  }

  render(scene: Scene, camera: Camera): void {
    this.renderer.render(scene, camera);
  }

  dispose(): void {
    this.renderer.dispose();
  }

  get mode(): 'WebGPU' | 'WebGL2' {
    return this.backend;
  }

  get info(): RendererInfo {
    return this.renderer.info;
  }

  get rawRenderer(): RendererLike {
    return this.renderer;
  }

  private static supportsWebGPU(): boolean {
    if (typeof navigator === 'undefined' || !('gpu' in navigator) || navigator.gpu == null) {
      return false;
    }

    // Force WebGL2 for Safari/WebKit even if navigator.gpu exists.
    // Safari's WebGPU implementation is currently experimental and often less stable/performant
    // than its highly optimized WebGL2 engine on M-series chips.
    if (IS_SAFARI) {
      return false;
    }

    return true;
  }
}
