import { AdaptiveQuality } from './AdaptiveQuality';
import { MouseTracker } from './MouseTracker';
import { RenderPipeline } from './RenderPipeline';
import { ScrollTracker } from './ScrollTracker';
import type { AssetLoader } from './AssetLoader';
import type { SceneContext, SceneModule } from './types';
import type { Clock, PerspectiveCamera, Scene } from 'three';
import { observePageVisibility } from '../utils/visibility';

type SceneName = 'hero' | 'skills' | 'projects' | 'contact';

interface SlotState {
  bounds: CachedSceneRect;
  viewportRect: ViewportSceneRect;
  name: SceneName;
  element: HTMLElement;
  module: SceneModule | null;
  scene: Scene;
  camera: PerspectiveCamera;
  ctx: SceneContext;
  observer: IntersectionObserver;
  isVisible: boolean;
  isSetup: boolean;
  isDirty: boolean;
}

interface CachedSceneRect {
  height: number;
  left: number;
  top: number;
  width: number;
}

interface ViewportSceneRect {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
}

export interface DebugSnapshot {
  activeScenes: number;
  backend: 'WebGPU' | 'WebGL2';
  dpr: number;
  drawCalls: number;
  fps: number;
  ms: number;
  triangles: number;
  visibleScenes: number;
}

const sceneLoaders: Record<SceneName, () => Promise<{ default: SceneModule | (() => SceneModule) }>> = {
  hero: () => import('../scenes/hero'),
  skills: () => import('../scenes/skills'),
  projects: () => import('../scenes/projects'),
  contact: () => import('../scenes/contact')
};

/**
 * Orchestrates the lifecycle and rendering of multiple Three.js scenes mapped to DOM elements.
 * Manages viewport tracking, adaptive quality, and shared resources like AssetLoader.
 */
export class SceneManager {
  private readonly pipeline: RenderPipeline;
  private readonly scrollTracker = new ScrollTracker();
  private readonly mouseTracker = new MouseTracker();
  private readonly adaptiveQuality = new AdaptiveQuality();
  private readonly slots = new Map<HTMLElement, SlotState>();
  private clock!: Clock;
  private readonly resizeObserver: ResizeObserver;
  private assetLoader: AssetLoader | null = null;
  private sceneCtor: typeof import('three').Scene | null = null;
  private perspectiveCameraCtor: typeof import('three').PerspectiveCamera | null = null;

  private rafId = 0;
  private destroyed = false;
  private running = false;
  private visibilityCleanup: (() => void) | null = null;
  private pointerCleanup: (() => void) | null = null;
  private lastMs = 16.7;
  private readonly pointerLocal = { x: 0, y: 0, inside: false };
  private canvasBounds: CachedSceneRect = {
    left: 0,
    top: 0,
    width: window.innerWidth,
    height: window.innerHeight
  };

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.pipeline = new RenderPipeline(canvas);
    this.resizeObserver = new ResizeObserver(() => {
      this.refreshCanvasBounds();
      this.refreshAllSlotBounds();
      this.resize();
      this.markAllDirty();
    });
  }

  /**
   * Initializes the manager, loads core Three.js components, and starts the render loop.
   *
   * @returns A promise that resolves when initialization is complete
   */
  async start(): Promise<void> {
    const [{ Clock: ClockCtor, PerspectiveCamera: PerspectiveCameraCtor, Scene: SceneCtor }, { AssetLoader }] =
      await Promise.all([import('three'), import('./AssetLoader')]);
    this.clock = new ClockCtor();
    this.sceneCtor = SceneCtor;
    this.perspectiveCameraCtor = PerspectiveCameraCtor;
    this.assetLoader = AssetLoader.getInstance();
    await this.pipeline.init();
    this.assetLoader.configure(this.pipeline.rawRenderer);
    this.refreshCanvasBounds();
    this.resize();
    this.scanSlots();
    this.resizeObserver.observe(this.canvas);
    this.resizeObserver.observe(document.documentElement);

    this.pointerCleanup = this.bindPointerEvents();
    this.visibilityCleanup = observePageVisibility((visible) => {
      if (visible) {
        this.startLoop();
      } else {
        this.stopLoop();
      }
    });

    if (!document.hidden) {
      this.startLoop();
    }
  }

  /**
   * Disposes of all scenes, modules, and resources managed by this instance.
   * Cleans up event listeners and observers.
   */
  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.stopLoop();
    this.visibilityCleanup?.();
    this.pointerCleanup?.();
    this.resizeObserver.disconnect();
    this.mouseTracker.dispose();
    this.scrollTracker.dispose();

    for (const slot of this.slots.values()) {
      slot.observer.disconnect();
      this.resizeObserver.unobserve(slot.element);

      if (slot.isSetup && slot.module) {
        slot.module.dispose(slot.ctx);
        void import('./dispose').then(({ disposeObject }) => disposeObject(slot.scene));
      }
    }

    this.slots.clear();
    this.assetLoader?.clear();
    this.assetLoader = null;
    this.pipeline.dispose();
  }

  /**
   * Captures a snapshot of current rendering metrics for debugging and monitoring.
   *
   * @returns A snapshot of performance data
   */
  getDebugSnapshot(): DebugSnapshot {
    const info = this.pipeline.info.render ?? {};

    return {
      activeScenes: Array.from(this.slots.values()).filter((slot) => slot.isSetup).length,
      backend: this.pipeline.mode,
      dpr: this.adaptiveQuality.currentDpr,
      drawCalls: info.calls ?? 0,
      fps: this.lastMs > 0 ? 1000 / this.lastMs : 60,
      ms: this.lastMs,
      triangles: info.triangles ?? 0,
      visibleScenes: Array.from(this.slots.values()).filter(
        (slot) => slot.isSetup && slot.isVisible
      ).length
    };
  }

  private scanSlots(): void {
    if (!this.sceneCtor || !this.perspectiveCameraCtor) {
      return;
    }

    const elements = Array.from(
      document.querySelectorAll<HTMLElement>('[data-scene]')
    );

    for (const element of elements) {
      const name = element.dataset.scene as SceneName | undefined;

      if (!name || !(name in sceneLoaders)) {
        continue;
      }

      const scene = new this.sceneCtor();
      const camera = new this.perspectiveCameraCtor(50, 1, 0.1, 100);
      const ctx: SceneContext = {
        scene,
        camera,
        width: Math.max(element.clientWidth, 1),
        height: Math.max(element.clientHeight, 1),
        mouse: this.mouseTracker.normalized,
        pointer: { x: 0, y: 0, inside: false },
        scroll: 0,
        sectionScroll: 0,
        elapsed: 0,
        delta: 0
      };

      const slot: SlotState = {
        bounds: createCachedSceneRect(),
        viewportRect: createViewportSceneRect(),
        name,
        element,
        module: null,
        scene,
        camera,
        ctx,
        observer: new IntersectionObserver((entries) => {
          const entry = entries[0];

          if (!entry) {
            return;
          }

          slot.isVisible = entry.isIntersecting;
          slot.isDirty = true;

          if (entry.isIntersecting && !slot.isSetup) {
            void this.setupSlot(slot);
          }
        }),
        isVisible: false,
        isSetup: false,
        isDirty: true
      };

      this.captureElementBounds(element, slot.bounds);
      this.scrollTracker.register(element);
      this.resizeObserver.observe(element);
      slot.observer.observe(element);
      this.slots.set(element, slot);
    }
  }

  private async setupSlot(slot: SlotState): Promise<void> {
    if (slot.isSetup || slot.module) {
      return;
    }

    const imported = await sceneLoaders[slot.name]();
    const moduleOrFactory = imported.default;
    slot.module = typeof moduleOrFactory === 'function' ? (moduleOrFactory as any)() : moduleOrFactory;

    this.refreshSlotBounds(slot);
    slot.ctx.width = Math.max(slot.bounds.width, 1);
    slot.ctx.height = Math.max(slot.bounds.height, 1);
    slot.camera.aspect = slot.ctx.width / slot.ctx.height;
    slot.camera.updateProjectionMatrix();

    if (slot.module) {
      await slot.module.setup(slot.ctx);
    }
    slot.isSetup = true;
    slot.isDirty = true;
  }

  /**
   * Synchronizes the internal scroll state with the page scroll position.
   *
   * @param y - The vertical scroll position in pixels
   */
  syncScroll(y: number): void {
    this.scrollTracker.setScroll(y);
  }

  private startLoop(): void {
    if (this.running || this.destroyed) {
      return;
    }

    this.running = true;
    this.clock.start();
    this.rafId = window.requestAnimationFrame(this.render);
  }

  private stopLoop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;
    window.cancelAnimationFrame(this.rafId);
    this.clock.stop();
  }

  private readonly render = () => {
    if (!this.running || this.destroyed) {
      return;
    }

    this.rafId = window.requestAnimationFrame(this.render);

    if (document.hidden) {
      return;
    }

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();
    this.lastMs = delta * 1000;

    if (this.adaptiveQuality.tick(this.lastMs)) {
      this.resize();
    }

    this.mouseTracker.tick();
    this.scrollTracker.tick(performance.now());
    this.pipeline.beginFrame();

    for (const slot of this.slots.values()) {
      if (!slot.isVisible || !slot.isSetup || !slot.module) {
        continue;
      }

      if (slot.module.renderMode === 'on-demand' && !slot.isDirty) {
        continue;
      }

      const rect = this.updateViewportRect(slot);

      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        continue;
      }

      if (rect.width === 0 || rect.height === 0) {
        continue;
      }

      const x = rect.left - this.canvasBounds.left;
      const y = this.canvasBounds.height - (rect.bottom - this.canvasBounds.top);
      const width = rect.width;
      const height = rect.height;

      this.pipeline.setViewport(x, y, width, height);
      this.pipeline.setScissor(x, y, width, height);

      slot.camera.aspect = width / height;
      slot.camera.updateProjectionMatrix();

      this.updatePointerContext(slot, rect);
      slot.ctx.width = width;
      slot.ctx.height = height;
      slot.ctx.scroll = this.scrollTracker.pageProgress;
      slot.ctx.sectionScroll = this.scrollTracker.sectionProgress(slot.element);
      slot.ctx.elapsed = elapsed;
      slot.ctx.delta = delta;

      slot.module.update(slot.ctx);
      this.pipeline.render(slot.scene, slot.camera);
      slot.isDirty = false;
    }
  };

  private resize(): void {
    const width = Math.max(Math.round(this.canvasBounds.width), window.innerWidth);
    const height = Math.max(Math.round(this.canvasBounds.height), window.innerHeight);
    this.pipeline.setPixelRatio(this.adaptiveQuality.currentDpr);
    this.pipeline.setSize(width, height);
  }

  private markAllDirty(): void {
    for (const slot of this.slots.values()) {
      slot.isDirty = true;
    }
  }

  private bindPointerEvents(): () => void {
    const handlePointerMove = (event: PointerEvent) => {
      for (const slot of this.slots.values()) {
        if (!slot.isSetup || !slot.module) {
          continue;
        }

        this.updatePointerContext(slot);
        slot.module.onPointerMove?.(slot.ctx, event);
        slot.isDirty = true;
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      for (const slot of this.slots.values()) {
        if (!slot.isSetup || !slot.module) {
          continue;
        }

        this.updatePointerContext(slot);

        if (!slot.ctx.pointer.inside) {
          continue;
        }

        slot.module.onPointerDown?.(slot.ctx, event);
        slot.isDirty = true;
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }

  private updatePointerContext(
    slot: SlotState,
    rect: ViewportSceneRect = this.updateViewportRect(slot)
  ): void {
    const nextRect = rect;
    const clientX = this.mouseTracker.client.x;
    const clientY = this.mouseTracker.client.y;
    const inside =
      clientX >= nextRect.left &&
      clientX <= nextRect.right &&
      clientY >= nextRect.top &&
      clientY <= nextRect.bottom;

    this.pointerLocal.inside = inside;
    this.pointerLocal.x = inside ? ((clientX - nextRect.left) / nextRect.width) * 2 - 1 : 0;
    this.pointerLocal.y = inside ? -(((clientY - nextRect.top) / nextRect.height) * 2 - 1) : 0;

    slot.ctx.pointer.x = this.pointerLocal.x;
    slot.ctx.pointer.y = this.pointerLocal.y;
    slot.ctx.pointer.inside = inside;
  }

  private refreshCanvasBounds(): void {
    this.captureElementBounds(this.canvas, this.canvasBounds);
  }

  private refreshAllSlotBounds(): void {
    for (const slot of this.slots.values()) {
      this.refreshSlotBounds(slot);
    }
  }

  private refreshSlotBounds(slot: SlotState): void {
    this.captureElementBounds(slot.element, slot.bounds);
  }

  private captureElementBounds(
    element: HTMLElement,
    target: CachedSceneRect
  ): CachedSceneRect {
    const rect = element.getBoundingClientRect();
    target.left = rect.left + window.scrollX;
    target.top = rect.top + window.scrollY;
    target.width = rect.width;
    target.height = rect.height;
    return target;
  }

  private updateViewportRect(slot: SlotState): ViewportSceneRect {
    const bounds = slot.bounds;
    const rect = slot.viewportRect;
    rect.left = bounds.left - window.scrollX;
    rect.top = bounds.top - window.scrollY;
    rect.width = bounds.width;
    rect.height = bounds.height;
    rect.right = rect.left + rect.width;
    rect.bottom = rect.top + rect.height;
    return rect;
  }
}

function createCachedSceneRect(): CachedSceneRect {
  return {
    left: 0,
    top: 0,
    width: 0,
    height: 0
  };
}

function createViewportSceneRect(): ViewportSceneRect {
  return {
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0
  };
}
