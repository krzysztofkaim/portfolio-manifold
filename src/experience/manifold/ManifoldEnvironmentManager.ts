import { clamp, lerp } from '../../utils/math';
import {
  updateCanvasParticleActivity,
  type ManifoldCanvasParticleField
} from './ManifoldCanvasParticleField';
import { MANIFOLD_CONSTANTS } from './ManifoldConstants';
import type { ViewMode } from './ManifoldTypes';

export interface ManifoldEnvironmentState {
  currentPerspectiveDepth: number;
  currentWorldTiltX: number;
  currentWorldTiltY: number;
  estimatedRefreshCap: number;
  fpsDisplay: number;
  frameTimeBurst: number;
  frameTimeEma: number;
  lastPerspective: string;
  lastWorldTransform: string;
  particleActivity: number;
  topbarEnergy: number;
  topbarLineKey: number;
}

export interface ManifoldEnvironmentInput {
  activeViewModeProgress: number;
  delta: number;
  introCompleted: boolean;
  targetViewMode: ViewMode;
  velocityMagnitude: number;
  viewVelocity: number;
  viewTargetSpeed: number;
  mouseX: number;
  mouseY: number;
}

export interface ManifoldEnvironmentContext {
  getState(): ManifoldEnvironmentState;
  setState(next: Partial<ManifoldEnvironmentState>): void;
  getTopbar(): HTMLElement | null;
  getViewportElement(): HTMLElement;
  getWorldElement(): HTMLElement;
}

export class ManifoldEnvironmentManager {
  private static readonly COMMON_REFRESH_CAPS = [60, 75, 90, 100, 120, 144, 165, 180, 240];
  private fpsSampleElapsed = 0;
  private fpsSampleFrames = 0;
  private fpsSampleTarget = 120;

  constructor(
    private readonly context: ManifoldEnvironmentContext,
    private readonly particleField: ManifoldCanvasParticleField
  ) {}

  updateFrameMetrics(delta: number): void {
    const state = this.context.getState();
    const frameTimeEma = lerp(
      state.frameTimeEma,
      delta,
      MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.frameTimeEmaLerp
    );
    const frameTimeBurst =
      delta > state.frameTimeBurst
        ? delta
        : lerp(state.frameTimeBurst, delta, MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.frameTimeBurstDecayLerp);
    this.fpsSampleElapsed += delta;
    this.fpsSampleFrames += 1;
    if (this.fpsSampleElapsed >= MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.fullRateSamplingMs) {
      this.fpsSampleTarget = (this.fpsSampleFrames * 1000) / this.fpsSampleElapsed;
      this.fpsSampleElapsed = 0;
      this.fpsSampleFrames = 0;
    }

    const estimatedRefreshCap = Math.max(
      state.estimatedRefreshCap,
      this.snapRefreshCap(this.fpsSampleTarget)
    );

    const fpsDisplay = lerp(
      state.fpsDisplay,
      this.fpsSampleTarget,
      this.fpsSampleTarget >= state.fpsDisplay
        ? MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.fpsRiseLerp
        : MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.fpsFallLerp
    );

    this.context.setState({
      estimatedRefreshCap,
      fpsDisplay,
      frameTimeBurst,
      frameTimeEma
    });
  }

  private snapRefreshCap(value: number): number {
    const clamped = clamp(value, 24, 360);

    for (const candidate of ManifoldEnvironmentManager.COMMON_REFRESH_CAPS) {
      if (Math.abs(clamped - candidate) <= Math.max(2, candidate * 0.03)) {
        return candidate;
      }
    }

    return Math.round(clamped);
  }

  updateTopbarAndParticles(input: Pick<ManifoldEnvironmentInput, 'introCompleted' | 'targetViewMode' | 'velocityMagnitude'>): void {
    const state = this.context.getState();
    const topbarTarget = input.introCompleted ? clamp((input.velocityMagnitude - 0.02) / 2.2, 0, 1) : 0;
    const topbarEase =
      topbarTarget > state.topbarEnergy
        ? MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.topbarRiseLerp
        : MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.topbarFallLerp;
    const topbarEnergy = lerp(state.topbarEnergy, topbarTarget, topbarEase);
    const particleActivity = updateCanvasParticleActivity(state.particleActivity, input);

    const topbar = this.context.getTopbar();
    if (topbar) {
      const spread = (0.08 + topbarEnergy * 0.92).toFixed(3);
      const glow = topbarEnergy.toFixed(3);
      const lineStateKey = Math.round(topbarEnergy * 100);
      if (lineStateKey !== state.topbarLineKey) {
        topbar.style.setProperty('--topbar-line-spread', spread);
        topbar.style.setProperty('--topbar-line-glow', topbarEnergy > 0.05 ? glow : '0');
        this.context.setState({ topbarLineKey: lineStateKey });
      }
    }

    this.context.setState({
      particleActivity,
      topbarEnergy
    });
  }

  updateWorldEnvironment(input: Pick<ManifoldEnvironmentInput, 'activeViewModeProgress' | 'mouseX' | 'mouseY' | 'viewVelocity'>): void {
    const state = this.context.getState();
    const tiltModeMix = 1 - input.activeViewModeProgress;
    const tiltX = (input.mouseY * 5 - input.viewVelocity * 0.5) * tiltModeMix;
    const tiltY = input.mouseX * 5 * tiltModeMix;
    const worldTransform = `${tiltX.toFixed(2)}|${tiltY.toFixed(2)}`;

    if (worldTransform !== state.lastWorldTransform) {
      this.context.getWorldElement().style.transform = `rotateX(${tiltX.toFixed(3)}deg) rotateY(${tiltY.toFixed(3)}deg) translateZ(0)`;
    }

    const perspectiveDepth = lerp(
      MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.perspectiveNear,
      MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.perspectiveFar,
      input.activeViewModeProgress
    );
    const perspective = `${perspectiveDepth.toFixed(0)}px`;

    if (perspective !== state.lastPerspective) {
      this.context.getViewportElement().style.perspective = perspective;
    }

    this.context.setState({
      currentPerspectiveDepth: perspectiveDepth,
      currentWorldTiltX: tiltX,
      currentWorldTiltY: tiltY,
      lastPerspective: perspective,
      lastWorldTransform: worldTransform
    });
  }

  renderParticles(input: Parameters<ManifoldCanvasParticleField['render']>[0]): void {
    this.particleField.render(input);
  }
}
