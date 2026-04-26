import { lerp, clamp } from '../../utils/math';
import { computeDampedLerp } from './HyperMath';
import { MANIFOLD_CONSTANTS } from './ManifoldConstants';
import type { ItemState } from './ManifoldTypes';
import { IS_SAFARI } from '../../utils/browserDetection';

export interface VisualStateInput {
  delta: number;
  velocityMagnitude: number;
  targetSpeed: number;
  frameTimeEma: number;
  frameTimeBurst: number;
  is2DMode: boolean;
  viewModeProgress: number;
  viewModeTarget: number;
  fourDTransitionProgress: number;
  expandedCard: ItemState | null;
  expandedProgress: number;
  expandedTarget: number;
}

export interface ManifoldVisualStateManagerContext {
  toggleBodyClass(className: string, active: boolean): void;
  toggleRootClass(className: string, active: boolean): void;
  getWorldElement(): HTMLElement;
}

export class ManifoldVisualStateManager {
  private twoDCardFastness = 0;
  private lastTwoDCardVisualState = '';
  private lastAppliedCardFastness = Number.NaN;
  private lastAppliedTwoDVisualMix = Number.NaN;
  private lastTwoDFastVisualState = false;
  private lastFrameStressState = false;
  private lastViewMorphingState = false;
  private lastVisualTwoDModeState = false;
  private lastVisualFourDModeState = false;
  private lastHasFourDPresenceState = false;
  private lastVisualExpandedState = false;
  private lastCardMorphingState = false;
  private lastTwoDExitRecoveryState = false;
  private lastIsScrollingState = false;
  private lastScrollTime = 0;
  private dynamicVarsEl: HTMLStyleElement | null = null;
  private dynamicVarsRule: CSSStyleDeclaration | null = null;

  constructor(private readonly context: ManifoldVisualStateManagerContext) {}

  getTwoDCardFastness(): number {
    return this.twoDCardFastness;
  }

  update(input: VisualStateInput): void {
    const {
      delta,
      velocityMagnitude,
      targetSpeed,
      frameTimeEma,
      frameTimeBurst,
      is2DMode,
      viewModeProgress,
      viewModeTarget,
      fourDTransitionProgress,
      expandedCard
    } = input;

    const highRefreshFrameBudget = 1000 / 120;
    const frameStressThreshold =
      highRefreshFrameBudget * MANIFOLD_CONSTANTS.PERFORMANCE_THRESHOLDS.frameStressEmaMultiplier;
    const frameStressSpan = Math.max(1, frameStressThreshold - highRefreshFrameBudget);
    const fastVelocityFloor = MANIFOLD_CONSTANTS.INTERACTION_SENSITIVITY.fastTwoDVelocity;
    const fastVelocityCeiling = fastVelocityFloor * 2.35;

    const twoDFastEligible =
      (is2DMode ||
        viewModeProgress > MANIFOLD_CONSTANTS.PERFORMANCE_THRESHOLDS.fastModeViewThreshold ||
        viewModeTarget > MANIFOLD_CONSTANTS.PERFORMANCE_THRESHOLDS.fastModeViewThreshold) &&
      !expandedCard;

    const velocityPressure = clamp(
      (velocityMagnitude - fastVelocityFloor * 0.18) / Math.max(0.001, fastVelocityCeiling - fastVelocityFloor * 0.18),
      0,
      1
    );
    const targetSpeedPressure = clamp(
      (Math.abs(targetSpeed) - fastVelocityFloor * 0.12) /
        Math.max(0.001, fastVelocityCeiling - fastVelocityFloor * 0.12),
      0,
      1
    );
    const framePressure = clamp(
      (Math.max(frameTimeEma, frameTimeBurst) - highRefreshFrameBudget) / frameStressSpan,
      0,
      1
    );

    const targetTwoDCardFastness = twoDFastEligible
      ? Math.max(velocityPressure, targetSpeedPressure * 0.94, framePressure * 0.86)
      : 0;

    this.twoDCardFastness = lerp(
      this.twoDCardFastness,
      targetTwoDCardFastness,
      computeDampedLerp(delta, MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.cardFastVisualEnvelope)
    );

    const rawCardFastness = clamp(this.twoDCardFastness, 0, 1);
    const rawTwoDVisualMix = clamp(viewModeProgress * (1 - clamp(fourDTransitionProgress * 1.15, 0, 1)), 0, 1);
    const cardFastness = Math.round(rawCardFastness * 5) / 5;
    const twoDVisualMix = Math.round(rawTwoDVisualMix * 10) / 10;

    this.updateDynamicCSSVars(cardFastness, twoDVisualMix);

    const twoDFastVisualState =
      twoDFastEligible &&
      (this.lastTwoDFastVisualState ? cardFastness > 0.34 : cardFastness > 0.68);

    if (twoDFastVisualState !== this.lastTwoDFastVisualState) {
      this.context.toggleBodyClass('is-2d-fast', twoDFastVisualState);
      this.lastTwoDFastVisualState = twoDFastVisualState;
    }

    const frameStressState =
      frameTimeEma > frameStressThreshold ||
      frameTimeBurst > highRefreshFrameBudget * MANIFOLD_CONSTANTS.PERFORMANCE_THRESHOLDS.frameStressBurstMultiplier;
    
    if (frameStressState !== this.lastFrameStressState) {
      this.context.toggleBodyClass('is-frame-stressed', frameStressState);
      this.lastFrameStressState = frameStressState;
    }

    // Interaction-driven state for Safari/WebKit composition optimization
    // Add hysteresis: enter at > 0.08, exit at < 0.03
    // Add hold time: keep "is-scrolling" active for 120ms after velocity drops
    const now = performance.now();
    const isVelocityActive = this.lastIsScrollingState ? velocityMagnitude > 0.03 : velocityMagnitude > 0.08;
    
    if (isVelocityActive) {
      this.lastScrollTime = now;
    }
    
    const isScrolling = isVelocityActive || (now - this.lastScrollTime < 120);

    if (isScrolling !== this.lastIsScrollingState) {
      if (IS_SAFARI) {
        this.context.toggleBodyClass('is-scrolling', isScrolling);
      }
      this.lastIsScrollingState = isScrolling;
    }
  }

  syncModeStates(input: {
    introCompleted: boolean;
    viewModeProgress: number;
    viewModeTarget: number;
    fourDTarget: number;
    fourDTransitionProgress: number;
    targetViewMode: string;
    exitingFourDTo2D: boolean;
    expandedCard: ItemState | null;
    expandedProgress: number;
    expandedTarget: number;
  }): void {
    const {
      introCompleted,
      viewModeProgress,
      viewModeTarget,
      fourDTarget,
      fourDTransitionProgress,
      targetViewMode,
      exitingFourDTo2D,
      expandedCard,
      expandedProgress,
      expandedTarget
    } = input;

    const twoDPresentationProgress = introCompleted
      ? clamp(
          exitingFourDTo2D
            ? Math.max(viewModeProgress, (1 - clamp(fourDTransitionProgress, 0, 1)) * 1.24 + 0.04)
            : viewModeProgress,
          0,
          1
        )
      : 0;

    const viewMorphingState =
      Math.abs(viewModeTarget - viewModeProgress) > 0.015 ||
      Math.abs(fourDTarget - fourDTransitionProgress) > 0.015;

    if (viewMorphingState !== this.lastViewMorphingState) {
      this.context.toggleBodyClass('is-view-morphing', viewMorphingState);
      this.lastViewMorphingState = viewMorphingState;
    }

    
    const cardMorphingState =
      expandedCard !== null && Math.abs(expandedTarget - expandedProgress) > 0.015;
    if (cardMorphingState !== this.lastCardMorphingState) {
      this.context.toggleBodyClass('is-card-morphing', cardMorphingState);
      this.lastCardMorphingState = cardMorphingState;
    }

    const visualTwoDModeState =
      introCompleted &&
      (
        this.lastVisualTwoDModeState
          ? twoDPresentationProgress > (exitingFourDTo2D ? 0.18 : 0.3)
          : twoDPresentationProgress > (exitingFourDTo2D ? 0.36 : 0.62)
      );
    if (visualTwoDModeState !== this.lastVisualTwoDModeState) {
      this.context.toggleBodyClass('is-2d-mode', visualTwoDModeState);
      this.context.toggleRootClass('is-2d-mode', visualTwoDModeState);
      this.lastVisualTwoDModeState = visualTwoDModeState;
    }

    const visualFourDModeState =
      introCompleted &&
      (
        targetViewMode === '4d' ||
        fourDTarget > 0.5 ||
        (this.lastVisualFourDModeState ? fourDTransitionProgress > 0.04 : fourDTransitionProgress > 0.18)
      );
    if (visualFourDModeState !== this.lastVisualFourDModeState) {
      this.context.toggleBodyClass('is-4d-mode', visualFourDModeState);
      this.context.toggleRootClass('is-4d-mode', visualFourDModeState);
      this.lastVisualFourDModeState = visualFourDModeState;
    }

    const hasFourDPresence =
      introCompleted &&
      (
        this.lastVisualFourDModeState ||
        targetViewMode === '4d' ||
        (this.lastHasFourDPresenceState
          ? (fourDTransitionProgress > 0.008 || fourDTarget > 0.015)
          : (fourDTransitionProgress > 0.04 || fourDTarget > 0.08))
      );
    if (hasFourDPresence !== this.lastHasFourDPresenceState) {
      this.context.toggleBodyClass('has-4d-presence', hasFourDPresence);
      this.context.toggleRootClass('has-4d-presence', hasFourDPresence);
      this.lastHasFourDPresenceState = hasFourDPresence;
    }

    const visualExpandedState =
      expandedCard !== null &&
      (this.lastVisualExpandedState ? expandedProgress > 0.08 : expandedProgress > 0.2);
    if (visualExpandedState !== this.lastVisualExpandedState) {
      this.context.toggleBodyClass('has-expanded-card', visualExpandedState);
      this.lastVisualExpandedState = visualExpandedState;
    }

    const twoDExitRecoveryState =
      introCompleted &&
      targetViewMode === '3d' &&
      expandedCard === null &&
      fourDTransitionProgress < 0.02 &&
      (
        this.lastTwoDExitRecoveryState
          ? viewModeProgress > 0.02
          : (viewModeProgress > 0.02 && viewModeProgress < 0.22)
      );
    if (twoDExitRecoveryState !== this.lastTwoDExitRecoveryState) {
      this.context.toggleBodyClass('is-exiting-2d-mode', twoDExitRecoveryState);
      this.lastTwoDExitRecoveryState = twoDExitRecoveryState;
    }
  }

  private updateDynamicCSSVars(cardFastness: number, twoDVisualMix: number): void {
    const precision = IS_SAFARI ? 2 : 3;
    const cardVisualState = twoDVisualMix.toFixed(precision) + '|' + cardFastness.toFixed(precision);

    if (cardVisualState !== this.lastTwoDCardVisualState) {
      if (!this.dynamicVarsEl) {
        this.dynamicVarsEl = document.createElement('style');
        this.dynamicVarsEl.id = 'manifold-dynamic-vars';
        this.dynamicVarsEl.textContent = `
          .item { transform-style: preserve-3d; }
          .card { transform-style: flat; }
          .card.is-expanded { background-color: rgba(8, 12, 24, calc(var(--card-expand-shell, 0) * 0.84)) !important; }
        `;
        document.head.append(this.dynamicVarsEl);
        const sheet = this.dynamicVarsEl.sheet as CSSStyleSheet;
        const ruleIndex = sheet.insertRule(':root {}', sheet.cssRules.length);
        this.dynamicVarsRule = (sheet.cssRules[ruleIndex] as CSSStyleRule).style;
      }

      // Avoid DOM style reads in the hot path by tracking the last applied values in JS.
      const cardFastnessDelta = Number.isFinite(this.lastAppliedCardFastness)
        ? Math.abs(cardFastness - this.lastAppliedCardFastness)
        : Number.POSITIVE_INFINITY;
      const visualMixDelta = Number.isFinite(this.lastAppliedTwoDVisualMix)
        ? Math.abs(twoDVisualMix - this.lastAppliedTwoDVisualMix)
        : Number.POSITIVE_INFINITY;

      if (this.dynamicVarsRule && (!IS_SAFARI || cardFastnessDelta > 0.04 || visualMixDelta > 0.04)) {
        const r = this.dynamicVarsRule;
        
        if (IS_SAFARI) {
          // Batch all properties into a single string to prevent multiple style recalculations
          const css = `
            --card-fastness: ${cardFastness.toFixed(precision)};
            --two-d-visual-mix: ${twoDVisualMix.toFixed(precision)};
            --js-card-pixel-opacity: ${(0.94 + (-0.22 - 0.64 * cardFastness) * twoDVisualMix).toFixed(precision)};
            --js-card-core-overlay-opacity: ${(1 + (-0.28 - 0.62 * cardFastness) * twoDVisualMix).toFixed(precision)};
            --js-card-core-glow-opacity: ${(0.7 + (-0.28 - 0.37 * cardFastness) * twoDVisualMix).toFixed(precision)};
            --js-card-core-icon-opacity: ${(1 + (-0.6 * cardFastness) * twoDVisualMix).toFixed(precision)};
            --js-card-shell-ring-alpha: ${(0.08 + (-0.02 - 0.022 * cardFastness) * twoDVisualMix).toFixed(precision)};
            --js-card-shell-shadow-y: ${(20 + (-6 - 6 * cardFastness) * twoDVisualMix).toFixed(precision)}px;
            --js-card-shell-shadow-blur: ${(50 + (-18 - 14 * cardFastness) * twoDVisualMix).toFixed(precision)}px;
            --js-card-shell-shadow-alpha: ${(0.45 + (-0.17 - 0.12 * cardFastness) * twoDVisualMix).toFixed(precision)};
            --js-two-d-card-outside-ring-alpha: ${(0.035 - 0.011 * cardFastness).toFixed(precision)};
            --js-two-d-card-outside-shadow-y: ${(8 - 4 * cardFastness).toFixed(precision)}px;
            --js-two-d-card-outside-shadow-blur: ${(20 - 10 * cardFastness).toFixed(precision)}px;
            --js-two-d-card-outside-shadow-alpha: ${(0.16 - 0.04 * cardFastness).toFixed(precision)};
            --js-card-header-top-alpha: ${(0.96 + (0 - 0.02 * cardFastness) * twoDVisualMix).toFixed(precision)};
            --js-card-header-bottom-alpha: ${(0.90 + (0 - 0.06 * cardFastness) * twoDVisualMix).toFixed(precision)};
          `;
          r.cssText = css;
        } else {
          r.setProperty('--card-fastness', cardFastness.toFixed(precision));
          r.setProperty('--two-d-visual-mix', twoDVisualMix.toFixed(precision));
          r.setProperty('--js-card-pixel-opacity', (0.94 + (-0.22 - 0.64 * cardFastness) * twoDVisualMix).toFixed(precision));
          r.setProperty('--js-card-core-overlay-opacity', (1 + (-0.28 - 0.62 * cardFastness) * twoDVisualMix).toFixed(precision));
          r.setProperty('--js-card-core-glow-opacity', (0.7 + (-0.28 - 0.37 * cardFastness) * twoDVisualMix).toFixed(precision));
          r.setProperty('--js-card-core-icon-opacity', (1 + (-0.6 * cardFastness) * twoDVisualMix).toFixed(precision));
          r.setProperty('--js-card-shell-ring-alpha', (0.08 + (-0.02 - 0.022 * cardFastness) * twoDVisualMix).toFixed(precision));
          r.setProperty('--js-card-shell-shadow-y', `${(20 + (-6 - 6 * cardFastness) * twoDVisualMix).toFixed(precision)}px`);
          r.setProperty('--js-card-shell-shadow-blur', `${(50 + (-18 - 14 * cardFastness) * twoDVisualMix).toFixed(precision)}px`);
          r.setProperty('--js-card-shell-shadow-alpha', (0.45 + (-0.17 - 0.12 * cardFastness) * twoDVisualMix).toFixed(precision));
          r.setProperty('--js-two-d-card-outside-ring-alpha', (0.035 - 0.011 * cardFastness).toFixed(precision));
          r.setProperty('--js-two-d-card-outside-shadow-y', `${(8 - 4 * cardFastness).toFixed(precision)}px`);
          r.setProperty('--js-two-d-card-outside-shadow-blur', `${(20 - 10 * cardFastness).toFixed(precision)}px`);
          r.setProperty('--js-two-d-card-outside-shadow-alpha', (0.16 - 0.04 * cardFastness).toFixed(precision));
          r.setProperty('--js-card-header-top-alpha', (0.96 + (0 - 0.02 * cardFastness) * twoDVisualMix).toFixed(precision));
          r.setProperty('--js-card-header-bottom-alpha', (0.90 + (0 - 0.06 * cardFastness) * twoDVisualMix).toFixed(precision));
        }

        this.lastAppliedCardFastness = cardFastness;
        this.lastAppliedTwoDVisualMix = twoDVisualMix;
      }

      this.lastTwoDCardVisualState = cardVisualState;
    }
  }
}
