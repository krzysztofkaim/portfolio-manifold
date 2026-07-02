import { lerp } from '../../utils/math';
import { computeDampedLerp } from './HyperMath';
import { MANIFOLD_CONSTANTS } from './ManifoldConstants';
import type { ViewMode } from './ManifoldTypes';

export interface ManifoldTransitionState {
  viewModeTarget: number;
  viewModeProgress: number;
  fourDTarget: number;
  fourDProgress: number;
  fourDTransitionProgress: number;
  exitingFourDTo2D: boolean;
  targetViewMode: ViewMode;
  pendingIntroViewMode: ViewMode | null;
}

export interface ManifoldTransitionManagerContext {
  isIntroCompleted(): boolean;
  onModeSwitched?(previous: ViewMode, current: ViewMode): void;
  onFourDModeEntered?(): void;
  onModeTransitionStarted?(mode: ViewMode, previous: ViewMode): void;
  captureTwoDTransitionGridOrder(): void;
  clearTwoDTransitionGridOrder(): void;
}

export class ManifoldTransitionManager {
  private state: ManifoldTransitionState = {
    viewModeTarget: 0,
    viewModeProgress: 0,
    fourDTarget: 0,
    fourDProgress: 0,
    fourDTransitionProgress: 0,
    exitingFourDTo2D: false,
    targetViewMode: '3d',
    pendingIntroViewMode: null
  };

  constructor(private readonly context: ManifoldTransitionManagerContext, initialViewMode?: ViewMode) {
    if (initialViewMode && initialViewMode !== '3d') {
      this.state.targetViewMode = initialViewMode;
      if (initialViewMode === '2d') {
        this.state.viewModeTarget = 1;
        this.state.viewModeProgress = 1;
        this.state.pendingIntroViewMode = '2d';
      }
    }
  }

  getState(): Readonly<ManifoldTransitionState> {
    return this.state;
  }

  getTargetViewMode(): ViewMode {
    return this.state.targetViewMode;
  }

  is2DActive(): boolean {
    return this.state.targetViewMode === '2d';
  }

  is4DActive(): boolean {
    return this.state.targetViewMode === '4d';
  }

  setViewMode(mode: ViewMode): void {
    if (!this.context.isIntroCompleted()) {
      if (mode === '2d') {
        this.state.pendingIntroViewMode = '2d';
      }
      return;
    }

    this.state.pendingIntroViewMode = null;
    this.applyModeTransition(mode);
  }

  queueIntroViewMode(mode: ViewMode): void {
    if (this.context.isIntroCompleted()) {
      this.setViewMode(mode);
      return;
    }
    this.state.pendingIntroViewMode = mode;
  }

  resolvePendingIntroMode(): ViewMode | null {
    const mode = this.state.pendingIntroViewMode;
    this.state.pendingIntroViewMode = null;
    return mode;
  }

  update(delta: number): void {
    const introCompleted = this.context.isIntroCompleted();

    this.state.viewModeProgress = lerp(
      this.state.viewModeProgress,
      this.state.viewModeTarget,
      computeDampedLerp(delta, MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.manifoldMode2D)
    );

    this.state.fourDProgress = lerp(
      this.state.fourDProgress,
      this.state.fourDTarget,
      computeDampedLerp(delta, MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.manifoldMode4D)
    );

    this.state.fourDTransitionProgress = lerp(
      this.state.fourDTransitionProgress,
      introCompleted ? this.state.fourDTarget : 0,
      computeDampedLerp(delta, MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.hyperspaceMorph)
    );

    if (
      this.state.exitingFourDTo2D &&
      (this.state.targetViewMode !== '2d' || (this.state.fourDTransitionProgress < 0.025 && this.state.viewModeProgress > 0.985))
    ) {
      this.state.exitingFourDTo2D = false;
    }
  }

  forceResetTo3D(): void {
    this.state.targetViewMode = '3d';
    this.state.viewModeTarget = 0;
    this.state.viewModeProgress = 0;
    this.state.fourDTarget = 0;
    this.state.fourDProgress = 0;
    this.state.fourDTransitionProgress = 0;
    this.state.exitingFourDTo2D = false;
  }

  private applyModeTransition(mode: ViewMode): void {
    const nextTwoDTarget = mode === '2d' ? 1 : 0;
    const nextFourDTarget = mode === '4d' ? 1 : 0;

    if (
      mode === this.state.targetViewMode &&
      nextTwoDTarget === this.state.viewModeTarget &&
      nextFourDTarget === this.state.fourDTarget
    ) {
      return;
    }

    const previousMode = this.state.targetViewMode;
    this.state.targetViewMode = mode;
    this.state.viewModeTarget = nextTwoDTarget;
    this.state.fourDTarget = nextFourDTarget;

    this.context.onModeSwitched?.(previousMode, mode);

    if (mode === '4d' && previousMode !== '4d') {
      this.context.onFourDModeEntered?.();
    }

    if (mode === '2d') {
      this.state.exitingFourDTo2D =
        previousMode === '4d' || this.state.fourDProgress > 0.08 || this.state.fourDTransitionProgress > 0.08;

      if (this.state.exitingFourDTo2D) {
        this.context.captureTwoDTransitionGridOrder();
      } else {
        this.context.clearTwoDTransitionGridOrder();
      }
    }

    this.context.onModeTransitionStarted?.(mode, previousMode);
  }
}
