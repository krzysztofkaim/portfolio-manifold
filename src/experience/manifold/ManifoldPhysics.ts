import { clamp, lerp } from '../../utils/math';
import { MANIFOLD_CONSTANTS } from './ManifoldConstants';
import { easeInOutCubic } from './HyperMath';
import type { FeaturedPose, ItemState } from './ManifoldTypes';

export interface MotionContext {
  mouseX: number;
  time: number;
  velocity: number;
}

export interface CardMotionSnapshot {
  inertiaY: number;
  inertiaZ: number;
  inertiaRotX: number;
  inertiaRotY: number;
  inertiaRotZ: number;
  response: number;
  rot: number;
  variance: number;
}

export interface CardMotionState {
  inertiaY: number;
  inertiaZ: number;
  inertiaRotX: number;
  inertiaRotY: number;
  inertiaRotZ: number;
}

export interface FeaturedPoseInput extends MotionContext {
  cameraZ: number;
  introProgress: number;
  loopSize: number;
}

export function computeCardMotionState(
  snapshot: CardMotionSnapshot,
  context: MotionContext
): CardMotionState {
  const motion = MANIFOLD_CONSTANTS.CARD_MOTION;
  const timeSeconds = context.time * 0.001;
  const ambientLift = Math.sin(
    timeSeconds * (motion.ambientLiftFrequencyBase + snapshot.variance * motion.ambientLiftFrequencyVariance) +
      snapshot.variance * motion.ambientLiftPhaseVariance
  ) * motion.ambientLiftAmplitude;
  const targetInertiaZ = clamp(
    context.velocity * (motion.inertiaVelocityBase + snapshot.variance * motion.inertiaVelocityVariance),
    -motion.inertiaVelocityClamp,
    motion.inertiaVelocityClamp
  );
  const targetRotX =
    clamp(context.velocity * motion.rotXVelocityScalar, -motion.rotXClamp, motion.rotXClamp) +
    Math.sin(timeSeconds * motion.rotXWaveFrequency + snapshot.variance * motion.rotXWavePhaseVariance) *
      motion.rotXWaveAmplitude;
  const targetRotY =
    Math.sin(timeSeconds * motion.rotYWaveFrequency + snapshot.variance * motion.rotYWavePhaseVariance) *
      motion.rotYWaveAmplitude +
    context.mouseX * (motion.rotYMouseBase + snapshot.variance * motion.rotYMouseVariance);
  const targetRotZ =
    snapshot.rot + Math.sin(timeSeconds * motion.rotZWaveFrequency + snapshot.variance * motion.rotZWavePhaseVariance) * motion.rotZWaveAmplitude;

  return {
    inertiaZ: lerp(snapshot.inertiaZ, targetInertiaZ, snapshot.response * motion.inertiaZResponse),
    inertiaY: lerp(snapshot.inertiaY, ambientLift, snapshot.response * motion.inertiaYResponse),
    inertiaRotZ: lerp(snapshot.inertiaRotZ, targetRotZ, snapshot.response * motion.inertiaRotZResponse),
    inertiaRotY: lerp(snapshot.inertiaRotY, targetRotY, snapshot.response * motion.inertiaRotYResponse),
    inertiaRotX: lerp(snapshot.inertiaRotX, targetRotX, snapshot.response * motion.inertiaRotXResponse)
  };
}

export function applyCardMotion(item: ItemState, context: MotionContext): void {
  const next = computeCardMotionState(item, context);
  item.inertiaZ = next.inertiaZ;
  item.inertiaY = next.inertiaY;
  item.inertiaRotZ = next.inertiaRotZ;
  item.inertiaRotY = next.inertiaRotY;
  item.inertiaRotX = next.inertiaRotX;
}

export function computeFeaturedCardPose(featured: ItemState, input: FeaturedPoseInput): FeaturedPose {
  const topology = MANIFOLD_CONSTANTS.SPATIAL_TOPOLOGY;
  let normalZ = featured.baseZ + input.cameraZ;

  if (normalZ > 500) {
    normalZ -= input.loopSize;
  }

  applyCardMotion(featured, input);

  const eased = easeInOutCubic(input.introProgress);
  return {
    x: lerp(topology.featuredIntroX, featured.x, eased),
    y: lerp(topology.featuredIntroY, featured.y + featured.inertiaY, eased),
    z: lerp(topology.featuredIntroZ, normalZ, eased),
    rotZ: lerp(topology.featuredIntroRotZ, featured.inertiaRotZ, eased),
    tiltX: lerp(topology.featuredIntroTiltX, featured.inertiaRotX, eased),
    tiltY: lerp(0, featured.inertiaRotY, eased),
    shiftZ: lerp(0, featured.inertiaZ, eased)
  };
}
