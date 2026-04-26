import { clamp, lerp } from '../../utils/math';
import { pretextLayoutService } from '../../ui/text/PretextLayoutService';
import type { FourDSceneState, ItemState } from './ManifoldTypes';

export interface HintMeasurement {
  height: number;
  width: number;
}

export interface ItemScreenRect {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
}

export interface ManifoldHintControllerContext {
  hasExpandedCardOpen(): boolean;
  getClosestVisibleCard(): ItemState | null;
  getContextHintState(): {
    anchorX: number;
    anchorY: number;
    copy: HTMLElement | null;
    copyText: { kicker: string; title: string };
    dot: SVGCircleElement | null;
    geometry: string;
    hint: HTMLElement;
    lastAlpha: string;
    lastSide: 'left' | 'right';
    labelX: number;
    labelY: number;
    measurement: HintMeasurement;
    motionKey: number;
    path: SVGPathElement | null;
  };
  getCurrentFourDScene(): FourDSceneState | null;
  getExitReturnActive(): boolean;
  getFeaturedItem(): ItemState | null;
  getFourDTransitionProgress(): number;
  getHintTimingState(): { introCompleted: boolean; introProgress: number; introTarget: number };
  getIntroHintState(): {
    anchorX: number;
    anchorY: number;
    copy: HTMLElement | null;
    copyText: { kicker: string; title: string };
    dot: SVGCircleElement | null;
    geometry: string;
    hint: HTMLElement;
    labelX: number;
    labelY: number;
    measurement: HintMeasurement;
    motionKey: number;
    path: SVGPathElement | null;
  };
  getItemScreenRect(item: ItemState | null): ItemScreenRect | null;
  getLastScrollActivityAt(): number;
  getNowVelocity(): number;
  getRootSceneScreenRect(scene: FourDSceneState | null): ItemScreenRect | null;
  getTargetViewMode(): '2d' | '3d' | '4d';
  getViewport(): { height: number; isMobile: boolean; width: number };
  isHudNavOpen(): boolean;
  setContextHintState(next: Partial<{
    anchorX: number;
    anchorY: number;
    geometry: string;
    labelX: number;
    labelY: number;
    lastAlpha: string;
    lastSide: 'left' | 'right';
    measurement: HintMeasurement;
    motionKey: number;
  }>): void;
  setIntroHintState(next: Partial<{
    anchorX: number;
    anchorY: number;
    geometry: string;
    labelX: number;
    labelY: number;
    measurement: HintMeasurement;
    motionKey: number;
  }>): void;
}

export class ManifoldHintController {
  constructor(private readonly context: ManifoldHintControllerContext) {}

  refreshHintMeasurements(): void {
    const viewport = this.context.getViewport().isMobile ? 'mobile' : 'desktop';
    const introState = this.context.getIntroHintState();
    const contextState = this.context.getContextHintState();
    this.context.setIntroHintState({
      measurement: pretextLayoutService.measureHintCopy({
        variant: 'intro',
        viewport,
        kicker: introState.copyText.kicker,
        title: introState.copyText.title
      })
    });
    this.context.setContextHintState({
      measurement: pretextLayoutService.measureHintCopy({
        variant: 'context',
        viewport,
        kicker: contextState.copyText.kicker,
        title: contextState.copyText.title
      })
    });
  }

  updateIntroHint(): void {
    const introState = this.context.getIntroHintState();
    const timing = this.context.getHintTimingState();
    const featuredItem = this.context.getFeaturedItem();

    if (!featuredItem || !introState.copy || (timing.introCompleted && timing.introTarget >= 1 && !this.context.getExitReturnActive())) {
      return;
    }

    const progressKey = Math.round(timing.introProgress * 1000);
    const featureX = Math.round(featuredItem.currentScreenX * 2);
    const featureY = Math.round(featuredItem.currentScreenY * 2);
    const hintMotionKey = progressKey * 100000 + featureX * 100 + featureY;
    if (hintMotionKey === introState.motionKey && introState.geometry) {
      return;
    }

    this.context.setIntroHintState({ motionKey: hintMotionKey });

    const rect = this.context.getItemScreenRect(featuredItem);
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const { isMobile } = this.context.getViewport();
    const edgeProgress = isMobile ? 0.56 : 0.58;
    const fallbackAnchorX = rect.left + rect.width * 0.06;
    const fallbackAnchorY = rect.top + rect.height * edgeProgress;
    const edgeInset = clamp(rect.width * (isMobile ? 0.05 : 0.04), isMobile ? 14 : 16, isMobile ? 24 : 28);
    const targetAnchorX = fallbackAnchorX + edgeInset;
    const targetAnchorY = fallbackAnchorY;
    const copyWidth = introState.measurement.width;
    const copyHeight = introState.measurement.height;
    const leftRailX = rect.left - clamp(rect.width * (isMobile ? 0.12 : 0.13), isMobile ? 26 : 34, isMobile ? 42 : 60);
    const bottomRailY = rect.bottom + clamp(rect.height * (isMobile ? 0.1 : 0.11), isMobile ? 24 : 28, isMobile ? 38 : 46);
    const targetLabelX = rect.right + clamp(rect.width * (isMobile ? 0.04 : 0.06), isMobile ? 12 : 18, isMobile ? 22 : 30);
    const targetLabelY = bottomRailY - copyHeight - clamp(rect.height * (isMobile ? 0.08 : 0.09), isMobile ? 18 : 24, isMobile ? 28 : 34);
    const joinX = targetLabelX - clamp(copyWidth * 0.18, 24, 40);
    const joinY = targetLabelY + copyHeight * 0.42;

    const anchorX = lerp(introState.anchorX || targetAnchorX, targetAnchorX, 0.18);
    const anchorY = lerp(introState.anchorY || targetAnchorY, targetAnchorY, 0.18);
    const labelX = lerp(introState.labelX || targetLabelX, targetLabelX, 0.18);
    const labelY = lerp(introState.labelY || targetLabelY, targetLabelY, 0.18);

    const pathD = [
      `M ${anchorX.toFixed(2)} ${anchorY.toFixed(2)}`,
      `L ${leftRailX.toFixed(2)} ${anchorY.toFixed(2)}`,
      `L ${leftRailX.toFixed(2)} ${bottomRailY.toFixed(2)}`,
      `L ${joinX.toFixed(2)} ${bottomRailY.toFixed(2)}`,
      `L ${joinX.toFixed(2)} ${joinY.toFixed(2)}`,
      `L ${labelX.toFixed(2)} ${joinY.toFixed(2)}`
    ].join(' ');
    const geometry = [anchorX.toFixed(2), anchorY.toFixed(2), labelX.toFixed(2), labelY.toFixed(2), pathD].join('|');

    this.context.setIntroHintState({ anchorX, anchorY, labelX, labelY });

    if (geometry !== introState.geometry) {
      introState.hint.style.setProperty('--intro-copy-x', `${labelX.toFixed(2)}px`);
      introState.hint.style.setProperty('--intro-copy-y', `${labelY.toFixed(2)}px`);
      introState.path?.setAttribute('d', pathD);
      introState.dot?.setAttribute('cx', anchorX.toFixed(2));
      introState.dot?.setAttribute('cy', anchorY.toFixed(2));
      introState.dot?.setAttribute('r', isMobile ? '4.4' : '5.6');
      this.context.setIntroHintState({ geometry });
    }
  }

  updateContextHint(time: number): void {
    const contextState = this.context.getContextHintState();
    if (!contextState.copy) {
      return;
    }

    const isIdleEnough = time - this.context.getLastScrollActivityAt() > 5000;
    const velocityMagnitude = Math.abs(this.context.getNowVelocity());
    const timing = this.context.getHintTimingState();
    const shouldShow =
      timing.introCompleted &&
      !this.context.getExitReturnActive() &&
      !this.context.hasExpandedCardOpen() &&
      !this.context.isHudNavOpen() &&
      isIdleEnough &&
      velocityMagnitude < 0.04;

    const alphaText = (shouldShow ? 1 : 0).toFixed(3);
    if (alphaText !== contextState.lastAlpha) {
      contextState.hint.style.setProperty('--context-hint-alpha', alphaText);
      this.context.setContextHintState({ lastAlpha: alphaText });
    }

    if (!shouldShow) {
      return;
    }

    const { targetViewMode, fourDTransitionProgress } = { 
      targetViewMode: this.context.getTargetViewMode(),
      fourDTransitionProgress: this.context.getFourDTransitionProgress()
    };
    const closestCard = this.context.getClosestVisibleCard();
    const currentScene = this.context.getCurrentFourDScene();
    const viewport = this.context.getViewport();

    const useFourDAnchor =
      currentScene !== null &&
      (targetViewMode === '4d' || fourDTransitionProgress > 0.72);
    
    // Compute movement-based motion key to skip getBoundingClientRect when possible
    const itemX = closestCard ? Math.round(closestCard.currentScreenX * 2) : 0;
    const itemY = closestCard ? Math.round(closestCard.currentScreenY * 2) : 0;
    const sceneIdx = currentScene ? 1 : 0;
    const viewportKey = viewport.width * 1000 + viewport.height;
    const hintMotionKey = itemX * 10000000 + itemY * 10000 + sceneIdx * 1000 + viewportKey;

    if (hintMotionKey === contextState.motionKey && contextState.geometry) {
      return;
    }

    this.context.setContextHintState({ motionKey: hintMotionKey });

    const rect = useFourDAnchor
      ? this.context.getRootSceneScreenRect(currentScene)
      : this.context.getItemScreenRect(closestCard);
    
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const copyWidth = contextState.measurement.width;
    const copyHeight = contextState.measurement.height;
    const viewportInset = viewport.isMobile ? 10 : 18;
    const anchorInset = clamp(rect.width * 0.06, 12, 22);
    const labelGap = clamp(Math.min(rect.width, copyWidth) * 0.024, viewport.isMobile ? 8 : 10, viewport.isMobile ? 14 : 18);
    const elbowOffset = clamp(Math.min(rect.width, copyWidth) * 0.08, 14, 24);
    const preferredRightLabelX = rect.right + labelGap;
    const preferredLeftLabelX = rect.left - labelGap - copyWidth;
    const fitsRight = preferredRightLabelX + copyWidth <= viewport.width - viewportInset;
    const fitsLeft = preferredLeftLabelX >= viewportInset;
    const hintSide: 'left' | 'right' = !fitsRight && fitsLeft ? 'left' : 'right';
    const targetAnchorX = hintSide === 'right' ? rect.right - anchorInset : rect.left + anchorInset;
    const unclampedLabelY = rect.top + rect.height * (viewport.isMobile ? 0.24 : 0.21) - copyHeight * 0.5;
    const targetAnchorY = rect.top + rect.height * (viewport.isMobile ? 0.54 : 0.5);
    const targetLabelX = clamp(
      hintSide === 'right' ? preferredRightLabelX : preferredLeftLabelX,
      viewportInset,
      Math.max(viewportInset, viewport.width - copyWidth - viewportInset)
    );
    const targetLabelY = clamp(
      unclampedLabelY,
      viewportInset,
      Math.max(viewportInset, viewport.height - copyHeight - viewportInset)
    );
    const joinX = hintSide === 'right' ? targetLabelX - elbowOffset : targetLabelX + copyWidth + elbowOffset;
    const joinY = targetLabelY + copyHeight * 0.36;

    let anchorX = contextState.anchorX;
    let anchorY = contextState.anchorY;
    let labelX = contextState.labelX;
    let labelY = contextState.labelY;

    if (hintSide !== contextState.lastSide) {
      anchorX = targetAnchorX;
      anchorY = targetAnchorY;
      labelX = targetLabelX;
      labelY = targetLabelY;
      this.context.setContextHintState({ lastSide: hintSide });
    }

    anchorX = lerp(anchorX || targetAnchorX, targetAnchorX, 0.16);
    anchorY = lerp(anchorY || targetAnchorY, targetAnchorY, 0.16);
    labelX = lerp(labelX || targetLabelX, targetLabelX, 0.16);
    labelY = lerp(labelY || targetLabelY, targetLabelY, 0.16);

    const pathD = [
      `M ${anchorX.toFixed(2)} ${anchorY.toFixed(2)}`,
      `L ${joinX.toFixed(2)} ${anchorY.toFixed(2)}`,
      `L ${joinX.toFixed(2)} ${joinY.toFixed(2)}`,
      `L ${labelX.toFixed(2)} ${joinY.toFixed(2)}`
    ].join(' ');
    const geometry = [anchorX.toFixed(2), anchorY.toFixed(2), labelX.toFixed(2), labelY.toFixed(2), pathD].join('|');

    this.context.setContextHintState({ anchorX, anchorY, labelX, labelY });

    if (geometry !== contextState.geometry) {
      contextState.hint.style.setProperty('--context-copy-x', `${labelX.toFixed(2)}px`);
      contextState.hint.style.setProperty('--context-copy-y', `${labelY.toFixed(2)}px`);
      contextState.path?.setAttribute('d', pathD);
      contextState.dot?.setAttribute('cx', anchorX.toFixed(2));
      contextState.dot?.setAttribute('cy', anchorY.toFixed(2));
      contextState.dot?.setAttribute('r', viewport.isMobile ? '4.2' : '5.2');
      this.context.setContextHintState({ geometry });
    }
  }
}
