import { clamp, lerp } from '../../utils/math';
import { MANIFOLD_CONSTANTS } from './ManifoldConstants';
import type { ViewMode } from './ManifoldTypes';

interface LoopParticle {
  alpha: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  size: number;
}

export interface CanvasParticleActivityInput {
  introCompleted: boolean;
  targetViewMode: ViewMode;
  velocityMagnitude: number;
}

export interface CanvasParticleRenderInput {
  activeViewModeProgress: number;
  cameraZ: number;
  introCompleted: boolean;
  loopSize: number;
  particleActivity: number;
  perspectiveDepth: number;
  targetViewMode: ViewMode;
  velocityMagnitude: number;
  viewportHeight: number;
  viewportWidth: number;
  visualFourDProgress: number;
}

const DEFAULT_PARTICLE_COUNT = 56;
const GOLDEN_RATIO = 0.61803398875;
const SILVER_RATIO = 0.41421356237;
const ALPHA_BUCKET_STEP = 0.05;
const ALPHA_BUCKET_COUNT = 16;

interface ParticleBatch {
  positions: number[];
}

export function updateCanvasParticleActivity(
  currentActivity: number,
  input: CanvasParticleActivityInput
): number {
  const ambientFloor = input.introCompleted
    ? (input.targetViewMode === '3d' ? 0.12 : 0)
    : 0.18;
  const velocityBoost = input.introCompleted
    ? clamp((input.velocityMagnitude - 0.02) / 1.45, 0, 0.34)
    : clamp((input.velocityMagnitude - 0.01) / 1.15, 0, 0.38);
  const targetActivity = Math.max(ambientFloor, velocityBoost);
  const easing = targetActivity > currentActivity
    ? MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.particleRiseLerp * 0.86
    : MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.particleFallLerp * 0.8;

  return lerp(currentActivity, targetActivity, easing);
}

export class ManifoldCanvasParticleField {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D | null;
  private readonly particles: LoopParticle[];
  private readonly batches: ParticleBatch[];
  private dpr = 1;
  private height = 0;
  private isCanvasClear = true;
  private width = 0;

  constructor(canvas: HTMLCanvasElement, count = DEFAULT_PARTICLE_COUNT) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d', { alpha: true, desynchronized: true });
    this.particles = Array.from({ length: count }, (_, index) => ({
      alpha: 0.2 + this.seed(index + 301) * 0.8,
      baseX: 0,
      baseY: 0,
      baseZ: 0,
      size: 0.7 + this.seed(index + 401) * 1.8
    }));
    this.batches = Array.from({ length: ALPHA_BUCKET_COUNT }, () => ({
      positions: []
    }));
  }

  resize(width: number, height: number, dpr: number): void {
    this.width = Math.max(1, Math.round(width));
    this.height = Math.max(1, Math.round(height));
    this.dpr = Math.max(1, dpr);
    this.canvas.width = Math.max(1, Math.round(this.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(this.height * this.dpr));
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.context?.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  layout(loopSize: number, viewportWidth: number, viewportHeight: number): void {
    const spreadX = viewportWidth * 0.86;
    const spreadY = viewportHeight * 0.88;
    const safeLoop = Math.max(1, loopSize);
    const count = Math.max(1, this.particles.length);

    for (let index = 0; index < this.particles.length; index += 1) {
      const particle = this.particles[index];
      const u = this.fract(index * GOLDEN_RATIO + this.seed(index + 101) * 0.17);
      const v = this.fract(index * SILVER_RATIO + this.seed(index + 201) * 0.19);
      const z = (index + this.seed(index + 501) * 0.75) / count;
      particle.baseX = (u - 0.5) * spreadX;
      particle.baseY = (v - 0.5) * spreadY;
      particle.baseZ = -z * safeLoop;
    }
  }

  clear(): void {
    this.context?.clearRect(0, 0, this.width, this.height);
    this.isCanvasClear = true;
  }

  render(input: CanvasParticleRenderInput): void {
    if (!this.context || this.width <= 0 || this.height <= 0) {
      return;
    }

    const enabled =
      input.visualFourDProgress < 0.01 &&
      input.activeViewModeProgress < 0.04 &&
      (!input.introCompleted || input.targetViewMode === '3d');

    if (!enabled) {
      if (!this.isCanvasClear) {
        this.context.clearRect(0, 0, this.width, this.height);
        this.isCanvasClear = true;
      }
      return;
    }

    this.context.clearRect(0, 0, this.width, this.height);

    const perspective = Math.max(240, input.perspectiveDepth);
    const motionBoost = 1 + clamp(input.velocityMagnitude / 0.34, 0, 1) * 0.18;
    const alphaBase = clamp(0.16 + input.particleActivity * 1.6, 0.14, 0.52);
    const visibleDensity = clamp(0.48 + input.particleActivity * 1.7, 0.48, 1);
    const loopSize = Math.max(1, input.loopSize);
    let drewParticles = false;

    for (let index = 0; index < this.batches.length; index += 1) {
      this.batches[index]!.positions.length = 0;
    }

    for (let index = 0; index < this.particles.length; index += 1) {
      const particle = this.particles[index];
      if (particle.alpha > visibleDensity) {
        continue;
      }
      let vizZ = ((particle.baseZ + input.cameraZ) % loopSize + loopSize) % loopSize;

      if (vizZ > perspective * 0.14) {
        vizZ -= loopSize;
      }

      if (vizZ > perspective * 0.12 || vizZ < -loopSize * 0.98) {
        continue;
      }

      const scale = perspective / Math.max(1, perspective - vizZ);
      const screenX = input.viewportWidth * 0.5 + particle.baseX * scale;
      const screenY = input.viewportHeight * 0.5 + particle.baseY * scale;

      if (screenX < -24 || screenX > input.viewportWidth + 24 || screenY < -24 || screenY > input.viewportHeight + 24) {
        continue;
      }

      const depthFade = clamp(1 - Math.abs(vizZ) / (loopSize * 0.62), 0.12, 1);
      const alpha = alphaBase * particle.alpha * depthFade;
      
      if (alpha <= 0.015) {
        continue;
      }

      const bucketIndex = clamp(
        Math.round(alpha / ALPHA_BUCKET_STEP),
        0,
        ALPHA_BUCKET_COUNT - 1
      );
      const batch = this.batches[bucketIndex]!;
      const size = particle.size * scale * motionBoost;
      const positions = batch.positions;
      positions.push(screenX, screenY, size);
      drewParticles = true;
    }

    if (!drewParticles) {
      this.isCanvasClear = true;
      return;
    }

    for (let bucketIndex = 0; bucketIndex < this.batches.length; bucketIndex += 1) {
      const positions = this.batches[bucketIndex]!.positions;
      if (positions.length === 0) {
        continue;
      }

      const alpha = Math.min(bucketIndex * ALPHA_BUCKET_STEP, 1).toFixed(2);
      this.context.fillStyle = `rgba(255, 214, 133, ${alpha})`;
      for (let i = 0; i < positions.length; i += 3) {
        const size = positions[i + 2]!;
        const halfSize = size;
        this.context.fillRect(
          positions[i]! - halfSize,
          positions[i + 1]! - halfSize,
          size * 2,
          size * 2
        );
      }
    }

    this.isCanvasClear = false;
  }

  private seed(input: number): number {
    const value = Math.sin(input * 12.9898 + 78.233) * 43758.5453;
    return value - Math.floor(value);
  }

  private fract(value: number): number {
    return value - Math.floor(value);
  }
}
