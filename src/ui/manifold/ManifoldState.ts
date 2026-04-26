import { MANIFOLD_ADAPTIVE_COOLDOWN_MS } from '../../config/manifold/ManifoldSceneConfig';

export interface ManifoldPhaseState {
  mouseX: number;
  mouseY: number;
  scroll: number;
  targetSpeed: number;
  velocity: number;
}

export interface ManifoldAtlasState {
  adaptiveCooldownUntil: number;
  lastActivityAt: number;
  lastScrollActivityAt: number;
  viewportHeight: number;
  viewportWidth: number;
}

export function createManifoldPhaseState(): ManifoldPhaseState {
  return {
    scroll: 0,
    velocity: 0,
    targetSpeed: 0,
    mouseX: 0,
    mouseY: 0
  };
}

export function createManifoldAtlasState(now: number, viewport: { height: number; width: number }): ManifoldAtlasState {
  return {
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    lastActivityAt: now,
    lastScrollActivityAt: now,
    adaptiveCooldownUntil: now + MANIFOLD_ADAPTIVE_COOLDOWN_MS
  };
}
