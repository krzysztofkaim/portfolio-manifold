import { clamp, lerp } from '../../utils/math';
import { MANIFOLD_CONSTANTS } from './ManifoldConstants';
import type { ItemState, ViewMode } from './ManifoldTypes';

export interface ParticleActivityInput {
  introCompleted: boolean;
  targetViewMode: ViewMode;
  velocityMagnitude: number;
}

export interface StarParticleRenderInput {
  activeViewModeProgress: number;
  alpha: number;
  item: ItemState;
  particleActivity: number;
  shouldUpdateStarField: boolean;
  time: number;
  velocityMagnitude: number;
  vizZ: number;
}

export function updateParticleActivity(
  currentActivity: number,
  input: ParticleActivityInput
): number {
  const ambientParticleActivity = input.introCompleted
    ? (input.targetViewMode === '4d' ? 0.08 : 0.03)
    : 0.08;
  const targetParticleActivity = clamp(
    Math.max(ambientParticleActivity, (input.velocityMagnitude - 0.06) / 2.8),
    0,
    1
  );
  const particleLerp = targetParticleActivity > currentActivity
    ? MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.particleRiseLerp
    : MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.particleFallLerp;

  return lerp(currentActivity, targetParticleActivity, particleLerp);
}

export function applyStarPresenceAlpha(
  alpha: number,
  particleActivity: number,
  variance: number
): number {
  const densityWindow = clamp((particleActivity - variance * 0.92 + 0.54) / 0.22, 0, 1);
  const particlePresence = clamp(0.15 + densityWindow * 1.5, 0.15, 1);
  return alpha * particlePresence;
}

export function renderStarParticle(
  input: StarParticleRenderInput,
  alphaCache: WeakMap<ItemState, number>,
  visibilityCache: WeakMap<ItemState, string>
): boolean {
  if (!input.shouldUpdateStarField) {
    return false;
  }

  const targetAlpha = clamp(input.alpha * (1 - input.activeViewModeProgress * 0.32), 0, 1);
  const cachedAlpha = alphaCache.get(input.item) || 0;
  if (Math.abs(targetAlpha - cachedAlpha) > 0.005) {
    alphaCache.set(input.item, targetAlpha);
    const starOpacity = targetAlpha.toFixed(3);
    input.item.el.style.opacity = starOpacity;
    input.item.lastOpacity = starOpacity;
  }

  if (targetAlpha <= 0.01) {
    return true;
  }

  if (visibilityCache.get(input.item) !== 'visible') {
    input.item.el.style.visibility = 'visible';
    visibilityCache.set(input.item, 'visible');
  }

  const driftX = Math.sin(input.time * 0.00024 + input.item.variance * 9) * 10;
  const driftY = Math.cos(input.time * 0.0002 + input.item.variance * 9) * 10;
  const finalX = Math.round((input.item.x + driftX) * 2) / 2;
  const finalY = Math.round((input.item.y + driftY) * 2) / 2;
  const speedFactor = clamp(input.velocityMagnitude / 1.8, 0, 1);
  const starScale = 0.72 + input.particleActivity * 1.4 + input.item.variance * 0.55;
  const scale = Math.round((starScale * (1 + speedFactor * 0.22)) * 100) / 100;
  const transform =
    `translate3d(${finalX.toFixed(1)}px, ${finalY.toFixed(1)}px, ${input.vizZ.toFixed(0)}px) ` +
    `scale(${scale.toFixed(2)})`;

  if (transform !== input.item.lastTransform) {
    input.item.el.style.transform = transform;
    input.item.lastTransform = transform;
  }

  input.item.currentScreenX = finalX;
  input.item.currentScreenY = finalY;
  input.item.hasCurrentScreenQuad = false;
  input.item.currentDepth = lerp(
    input.vizZ,
    -1800 - Math.abs(finalY) * 0.05,
    input.activeViewModeProgress
  );
  return true;
}
