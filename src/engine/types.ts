import type { PerspectiveCamera, Scene } from 'three';

export interface SceneContext {
  scene: Scene;
  camera: PerspectiveCamera;
  width: number;
  height: number;
  mouse: { x: number; y: number };
  pointer: { x: number; y: number; inside: boolean };
  scroll: number;
  sectionScroll: number;
  elapsed: number;
  delta: number;
}

export interface SceneModule {
  budget: 'high' | 'medium' | 'low';
  renderMode: 'continuous' | 'on-demand';
  setup(ctx: SceneContext): Promise<void>;
  update(ctx: SceneContext): void;
  dispose(ctx: SceneContext): void;
  onPointerMove?(ctx: SceneContext, event: PointerEvent): void;
  onPointerDown?(ctx: SceneContext, event: PointerEvent): void;
}
