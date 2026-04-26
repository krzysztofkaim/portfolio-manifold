import { lerp } from '../../utils/math';
import { MANIFOLD_CONSTANTS } from './ManifoldConstants';
import type { ItemState, ManifoldSceneRuntimeConfig, ManifoldPhaseState, TwoDGridMetrics, ViewMode } from './ManifoldScrollTypes';

export interface ManifoldScrollSystemContext {
  getConfig(): ManifoldSceneRuntimeConfig;
  getExpandedState(): { card: ItemState | null; target: number; quenchUntil: number };
  getFeaturedItem(): ItemState | null;
  getLoopSize(): number;
  getNow(): number;
  getPhaseState(): ManifoldPhaseState;
  getScrollContinuityState(): {
    lastIncomingScroll: number;
    lastInputLoopLength: number;
    stableInputScroll: number;
  };
  getTwoDGridMetrics(): TwoDGridMetrics;
  getViewMode(): ViewMode;
  markScrollActivity(now: number): void;
  setPhaseState(next: Pick<ManifoldPhaseState, 'scroll' | 'targetSpeed'>): void;
  setScrollContinuityState(next: {
    lastIncomingScroll: number;
    lastInputLoopLength: number;
    stableInputScroll: number;
  }): void;
}

/**
 * Manages scroll-based animation progress and continuity.
 * Handles wrapping logic and smooth transitions for the infinite loop experience.
 */
export class ManifoldScrollSystem {
  constructor(private readonly context: ManifoldScrollSystemContext) {}

  setScroll(scroll: number, velocity: number): void {
    const stabilizedScroll = this.stabilizeIncomingScroll(scroll, velocity);
    const now = this.context.getNow();
    const phaseState = this.context.getPhaseState();
    const expandedState = this.context.getExpandedState();
    const hasExpandedCardMotion = expandedState.card !== null && expandedState.target > 0.01;
    const shouldQuenchExpandedMotion =
      hasExpandedCardMotion &&
      now < expandedState.quenchUntil;
    const expandedVelocityScale = shouldQuenchExpandedMotion
      ? MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.expandedMotionVelocityScale
      : velocity < 0
        ? MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.expandedMotionReverseVelocityScale
        : MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.expandedMotionSustainVelocityScale;
    const expandedScrollLerp = shouldQuenchExpandedMotion
      ? MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.expandedMotionScrollLerp
      : MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.expandedMotionSustainScrollLerp;
    const nextScroll = shouldQuenchExpandedMotion
      ? lerp(
          phaseState.scroll,
          stabilizedScroll,
          MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.expandedMotionScrollLerp
        )
      : hasExpandedCardMotion
        ? lerp(phaseState.scroll, stabilizedScroll, expandedScrollLerp)
        : stabilizedScroll;
    const nextVelocity = hasExpandedCardMotion
      ? velocity * expandedVelocityScale
      : velocity;

    if (Math.abs(nextScroll - phaseState.scroll) > 0.02 || Math.abs(nextVelocity) > 0.01) {
      this.context.markScrollActivity(now);
    }

    this.context.setPhaseState({
      scroll: nextScroll,
      targetSpeed: nextVelocity
    });
  }

  getLoopScrollLength(): number {
    if (this.context.getViewMode() === '2d') {
      return this.context.getTwoDGridMetrics().scrollLoop;
    }

    const config = this.context.getConfig();
    return this.context.getLoopSize() / config.camSpeed;
  }

  getFeaturedCardScrollAnchor(): number {
    const featuredItem = this.context.getFeaturedItem();
    if (!featuredItem) {
      return this.getLoopScrollLength() * 1.5;
    }

    return (featuredItem.cardIndex * this.context.getConfig().zGap) / this.context.getConfig().camSpeed;
  }

 normalizeLoopAnchor(
    anchor: number,
    reference: number,
    mode: 'nearest' | 'forward' | 'backward' | 'smart'
  ): number {
    const loop = this.getLoopScrollLength();
    if (loop <= 0) {
      return anchor;
    }

    const offsetLoops = Math.round((reference - anchor) / loop);
    const nearest = anchor + offsetLoops * loop;

    if (mode === 'nearest') {
      return nearest;
    }

    if (mode === 'smart') {
      const diff = nearest - reference;
      // If the shortest path would force a jarring backward jump (more than 400px),
      // Always use the full, natural physical distance and loop forward instead.
      if (diff < -400) {
        return nearest + loop;
      }
      return nearest;
    }

    if (mode === 'forward') {
      if (nearest < reference) {
        return nearest + loop;
      }
      return nearest;
    }

    if (nearest > reference) {
      return nearest - loop;
    }
    return nearest;
  }

  stabilizeIncomingScroll(scroll: number, velocity: number): number {
    const continuity = this.context.getScrollContinuityState();
    const loopLength = Math.max(1, this.getLoopScrollLength());
    const loopChanged = Math.abs(loopLength - continuity.lastInputLoopLength) > 1;

    if (!Number.isFinite(continuity.lastIncomingScroll) || loopChanged) {
      this.context.setScrollContinuityState({
        lastIncomingScroll: scroll,
        lastInputLoopLength: loopLength,
        stableInputScroll: scroll
      });
      return scroll;
    }

    let scrollDelta = scroll - continuity.lastIncomingScroll;
    const directionHint = Math.sign(velocity);
    const directionalThreshold = loopLength * 0.35;

    if (directionHint > 0 && scrollDelta < -directionalThreshold) {
      scrollDelta += Math.ceil((directionalThreshold - scrollDelta) / loopLength) * loopLength;
    } else if (directionHint < 0 && scrollDelta > directionalThreshold) {
      scrollDelta -= Math.ceil((scrollDelta - directionalThreshold) / loopLength) * loopLength;
    } else if (Math.abs(scrollDelta) > loopLength * 0.5) {
      scrollDelta -= Math.round(scrollDelta / loopLength) * loopLength;
    }

    if (Math.abs(scrollDelta) > loopLength * 0.9) {
      scrollDelta -= Math.round(scrollDelta / loopLength) * loopLength;
    }

    const stableInputScroll = continuity.stableInputScroll + scrollDelta;
    this.context.setScrollContinuityState({
      lastIncomingScroll: scroll,
      lastInputLoopLength: loopLength,
      stableInputScroll
    });
    return stableInputScroll;
  }

  resetIncomingScrollContinuity(scroll = this.context.getPhaseState().scroll): void {
    this.context.setScrollContinuityState({
      lastIncomingScroll: scroll,
      lastInputLoopLength: Math.max(1, this.getLoopScrollLength()),
      stableInputScroll: scroll
    });
  }
}
