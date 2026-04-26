import { clamp, lerp } from '../../utils/math';
import { MANIFOLD_CONSTANTS } from './ManifoldConstants';
import type { ItemState, ViewMode } from './ManifoldTypes';

export interface AmbientParticleActivityInput {
  introCompleted: boolean;
  targetViewMode: ViewMode;
  velocityMagnitude: number;
}

export interface AmbientParticleRenderInput {
  activeViewModeProgress: number;
  alpha: number;
  item: ItemState;
  particleActivity: number;
  shouldUpdateParticleField: boolean;
  velocityMagnitude: number;
  vizZ: number;
}

export function updateAmbientParticleActivity(
  currentActivity: number,
  input: AmbientParticleActivityInput
): number {
  const ambientFloor = input.introCompleted
    ? (input.targetViewMode === '3d' ? 0.18 : 0)
    : 0.22;
  const velocityBoost = input.introCompleted
    ? clamp((input.velocityMagnitude - 0.03) / 1.9, 0, 0.28)
    : clamp((input.velocityMagnitude - 0.01) / 1.5, 0, 0.34);
  const targetActivity = Math.max(ambientFloor, velocityBoost);
  const ease = targetActivity > currentActivity
    ? MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.particleRiseLerp * 0.72
    : MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.particleFallLerp * 0.62;

  return lerp(currentActivity, targetActivity, ease);
}

export function applyAmbientParticleAlpha(
  alpha: number,
  particleActivity: number,
  variance: number
): number {
  const density = clamp(0.42 + particleActivity * 1.45 - variance * 0.08, 0.3, 0.82);
  return clamp(alpha * density, 0, 0.82);
}

export function renderAmbientParticle(
  input: AmbientParticleRenderInput,
  visibilityCache: WeakMap<ItemState, string>
): boolean {
  const targetAlpha = clamp(input.alpha * (1 - input.activeViewModeProgress * 0.14), 0, 0.76);

  if (targetAlpha <= 0.006) {
    if (input.item.lastOpacity !== '0.000') {
      input.item.el.style.opacity = '0.000';
      input.item.lastOpacity = '0.000';
    }
    if (visibilityCache.get(input.item) !== 'hidden') {
      input.item.el.style.visibility = 'hidden';
      visibilityCache.set(input.item, 'hidden');
    }
    return true;
  }

  if (visibilityCache.get(input.item) !== 'visible') {
    input.item.el.style.visibility = 'visible';
    visibilityCache.set(input.item, 'visible');
  }

  const opacity = targetAlpha.toFixed(3);
  if (opacity !== input.item.lastOpacity) {
    input.item.el.style.opacity = opacity;
    input.item.lastOpacity = opacity;
  }

  if (!input.shouldUpdateParticleField) {
    return true;
  }

  const speedFactor = clamp(input.velocityMagnitude / 0.42, 0, 1);
  const lateralShift = (input.item.variance - 0.5) * 16 * speedFactor;
  const scale = 0.62 + input.particleActivity * 1.12 + input.item.variance * 0.5;
  const quantizedX = Math.round((input.item.x + lateralShift) * 2) / 2;
  const quantizedY = Math.round(input.item.y * 2) / 2;
  const quantizedZ = Math.round(input.vizZ);
  const transform =
    `translate3d(${quantizedX.toFixed(1)}px, ${quantizedY.toFixed(1)}px, ${quantizedZ.toFixed(0)}px) ` +
    `scale(${scale.toFixed(2)})`;

  if (transform !== input.item.lastTransform) {
    input.item.el.style.transform = transform;
    input.item.lastTransform = transform;
  }

  input.item.currentScreenX = quantizedX;
  input.item.currentScreenY = quantizedY;
  input.item.hasCurrentScreenQuad = false;
  input.item.currentDepth = input.vizZ;
  return true;
}
