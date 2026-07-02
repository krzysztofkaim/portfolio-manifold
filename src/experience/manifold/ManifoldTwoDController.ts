import { clamp, lerp } from '../../utils/math';
import { MANIFOLD_SECTION_TONES } from '../../config/manifold/ManifoldSceneConfig';
import { MANIFOLD_CONSTANTS } from './ManifoldConstants';
import { computeDampedLerp } from './HyperMath';
import { IS_IOS, IS_SAFARI } from '../../utils/browserDetection';
import type { ItemState, SectionFrameBounds, TwoDCardPose, TwoDGridMetrics } from './ManifoldTypes';

export interface ManifoldTwoDControllerContext {
  getCardItems(): readonly ItemState[];
  getCentered2DCard(): ItemState | null;
  getCurrent2DFrame(): { bounds: SectionFrameBounds | null; sectionTitle: string };
  getEffectiveFocusCard(): ItemState | null;
  getFrameSamplingState(): {
    frameTimeBurst: number;
    frameTimeEma: number;
    lastFrameState: string;
    lastFrameVisualState: string;
    lastLabel: string;
    stillness: number;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  getIntroCompleted(): boolean;
  getIntroScrollAnchor(): number;
  getLayoutState(): {
    isMobileViewport: boolean;
    lastCentered2DCard: ItemState | null;
    targetCardIndex: number;
    transitionGridOrder: Map<number, number>;
    transitionOrderMix: number;
    twoDOffsetX: number;
    twoDOffsetXTarget: number;
    viewportHeight: number;
    viewportWidth: number;
    viewModeTarget: number;
  };
  isTransitionPerformanceMode(): boolean;
  getPhaseVelocity(): { targetSpeed: number; velocity: number };
  getLocalizedSectionTitle(sectionTitle: string): string;
  getSectionFrameElements(): { label: HTMLElement; root: HTMLElement };
  getViewportSize(): { height: number; width: number };
  getWorldState(): { exitReturnActive: boolean; expandedCard: ItemState | null; expandedProgress: number };
  setFrameSamplingState(next: Partial<{
    lastFrameState: string;
    lastFrameVisualState: string;
    lastLabel: string;
    stillness: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>): void;
  setLayoutState(next: Partial<{
    lastCentered2DCard: ItemState | null;
    targetCardIndex: number;
    transitionOrderMix: number;
    twoDOffsetX: number;
    twoDOffsetXTarget: number;
  }>): void;
  updateActivity(now: number): void;
}

export class ManifoldTwoDController {
  private twoDGridMetricsCache: TwoDGridMetrics | null = null;
  private edgeCardHost: HTMLElement | null = null;
  private readonly edgeCardPool: HTMLElement[] = [];
  private lastSectionAccent = '';
  private lastSectionAccentSoft = '';
  private edgeCardCloneCache = new Map<string, HTMLElement>();

  constructor(private readonly context: ManifoldTwoDControllerContext) { }

  private get2DResponsiveScale(): number {
    const layoutState = this.context.getLayoutState();

    if (layoutState.isMobileViewport) {
      // Mobile relies on column reflow (1 or 2 cols), so keep cards large and legible.
      return layoutState.viewportWidth < 380 ? 0.9 : 1.0;
    }

    // Desktop 2D cards should fill more of the viewport while still compressing safely on narrower widths.
    const scale = layoutState.viewportWidth / 1880;
    return clamp(scale, 0.56, 1.08);
  }

  private get2DResponsiveHeightScale(widthScale: number): number {
    const layoutState = this.context.getLayoutState();

    if (layoutState.isMobileViewport) {
      return widthScale;
    }

    // Keep cards taller than they are wide, but allow the body to compress more freely.
    return clamp(0.62 + widthScale * 0.38, 0.72, 1.0);
  }

  private getEdgeCardHost(): HTMLElement | null {
    if (this.edgeCardHost) {
      return this.edgeCardHost;
    }

    this.edgeCardHost = this.context
      .getSectionFrameElements()
      .root.querySelector<HTMLElement>('[data-two-d-edge-cards]');

    return this.edgeCardHost;
  }

  private createEdgeCardElement(): HTMLElement | null {
    const host = this.getEdgeCardHost();
    if (!host) {
      return null;
    }

    const element = document.createElement('div');
    element.className = 'two-d-section-frame__edge-card';
    element.setAttribute('aria-hidden', 'true');

    host.append(element);
    return element;
  }

  private sanitizeEdgeCardClone(overlay: HTMLElement): void {
    // Codex change: side previews use full real card clones, but remain fully passive.
    const pixelCanvases = overlay.querySelectorAll('pixel-canvas');

    for (const pixelCanvas of pixelCanvases) {
      const placeholder = document.createElement('div');
      placeholder.className = pixelCanvas.className || 'card-pixel-canvas';
      placeholder.setAttribute('aria-hidden', 'true');
      pixelCanvas.replaceWith(placeholder);
    }

    const interactiveElements = overlay.querySelectorAll<HTMLElement>(
      'button, a, input, select, textarea, [tabindex], [data-card-page-nav]'
    );

    for (const interactiveElement of interactiveElements) {
      interactiveElement.setAttribute('tabindex', '-1');
      interactiveElement.setAttribute('aria-hidden', 'true');
      if ('disabled' in interactiveElement) {
        (
          interactiveElement as HTMLButtonElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        ).disabled = true;
      }
    }
  }

  private getEdgeCardElement(index: number): HTMLElement | null {
    while (this.edgeCardPool.length <= index) {
      const element = this.createEdgeCardElement();
      if (!element) {
        return null;
      }
      this.edgeCardPool.push(element);
    }

    return this.edgeCardPool[index] ?? null;
  }

  private setEdgeCardVisibility(visibleCount: number): void {
    for (let index = visibleCount; index < this.edgeCardPool.length; index += 1) {
      const element = this.edgeCardPool[index];
      if (!element || element.dataset.edgeVisualState === 'hidden') {
        continue;
      }
      element.style.opacity = '0';
      element.dataset.edgeVisualState = 'hidden';
    }
  }

  private getEdgeCardClone(item: ItemState, baseWidth: number, baseHeight: number): HTMLElement {
    const key = `${item.cardIndex}:${item.cardContentVersion}`;
    const cached = this.edgeCardCloneCache.get(key);
    
    if (cached) {
      return cached.cloneNode(true) as HTMLElement;
    }

    // Capacity management: Delete older versions of the same card to prevent stale leak
    for (const [k] of this.edgeCardCloneCache) {
      if (k.startsWith(`${item.cardIndex}:`)) {
        this.edgeCardCloneCache.delete(k);
      }
    }

    // Global capacity limit
    if (this.edgeCardCloneCache.size >= 20) {
      const firstKey = this.edgeCardCloneCache.keys().next().value;
      if (firstKey !== undefined) {
        this.edgeCardCloneCache.delete(firstKey);
      }
    }

    const template = item.fxEl.cloneNode(true) as HTMLElement;
    template.classList.add('two-d-section-frame__edge-card-shell');
    template.removeAttribute('id');
    template.style.removeProperty('transform');
    template.style.removeProperty('opacity');
    template.style.removeProperty('z-index');

    /* Keep edge previews on the exact same structural footprint as the currently rendered card. */
    template.style.setProperty('--card-scale', '1.0');
    template.style.setProperty('--card-width', `${baseWidth}px`);
    template.style.setProperty('--card-height', `${baseHeight}px`);
    template.style.setProperty('--card-text-scale', '1.0');
    template.style.setProperty('--card-expand', '0');
    template.style.setProperty('--card-expand-shell', '0');
    template.style.setProperty('--card-expand-layout', '0');

    this.sanitizeEdgeCardClone(template);
    this.edgeCardCloneCache.set(key, template);
    
    return template.cloneNode(true) as HTMLElement;
  }

  private updateEdgeCardPreview(
    poolIndex: number,
    side: 'left' | 'right',
    item: ItemState | null,
    alpha: number,
    left: number,
    top: number
  ): void {
    const element = this.getEdgeCardElement(poolIndex);
    if (!element) {
      return;
    }

    const nextContentState = `${item?.cardIndex ?? -1}|${item?.cardContentVersion ?? -1}|${side}`;
    /* USER_REQUEST: SCALE_ALIGNMENT - Shared scale constant to match cards at z: -65 */
    const PERSPECTIVE_SCALE = 0.939;
    const metrics = this.get2DGridMetrics();
    const structuralWidth = item?.lastCardWidth ? Number.parseFloat(item.lastCardWidth) : Number.NaN;
    const structuralHeight = item?.lastCardHeight ? Number.parseFloat(item.lastCardHeight) : Number.NaN;
    const baseWidth = Number.isFinite(structuralWidth) ? structuralWidth : metrics.cardWidth;
    const baseHeight = Number.isFinite(structuralHeight) ? structuralHeight : metrics.cardHeight;

    const perceivedWidth = baseWidth * PERSPECTIVE_SCALE;
    const perceivedHeight = baseHeight * PERSPECTIVE_SCALE;

    const nextVisualState = `${left.toFixed(1)}|${top.toFixed(1)}|${alpha.toFixed(2)}|${perceivedWidth.toFixed(1)}|${perceivedHeight.toFixed(1)}`;

    if (element.dataset.edgeContentState !== nextContentState) {
      if (item?.fxEl) {
        const clone = this.getEdgeCardClone(item, baseWidth, baseHeight);
        element.replaceChildren(clone);
      } else {
        element.replaceChildren();
      }

      element.classList.toggle('two-d-section-frame__edge-card--left', side === 'left');
      element.classList.toggle('two-d-section-frame__edge-card--right', side === 'right');
      element.dataset.edgeContentState = nextContentState;
    }

    if (element.dataset.edgeVisualState === nextVisualState) {
      return;
    }

    /* PERFORMANCE: Using translate3d instead of left/top to leverage GPU acceleration */
    element.style.transform = `translate3d(${left.toFixed(2)}px, ${top.toFixed(2)}px, 0) scale(${PERSPECTIVE_SCALE.toFixed(4)})`;
    element.style.opacity = alpha.toFixed(3);
    element.style.width = `${baseWidth.toFixed(2)}px`;
    element.style.height = `${baseHeight.toFixed(2)}px`;
    element.dataset.edgeVisualState = nextVisualState;
  }

  invalidateGridMetrics(): void {
    this.twoDGridMetricsCache = null;
  }

  focusCardIn2D(cardIndex: number, immediate = false): void {
    const item = this.context.getCardItems().find((candidate) => candidate.cardIndex === cardIndex) ?? null;
    if (!item) {
      return;
    }

    const metrics = this.get2DGridMetrics();
    const column = item.gridOrder % metrics.columns;
    const nextOffset = metrics.stackedMobile ? 0 : column * metrics.spacingX;
    this.context.setLayoutState({
      targetCardIndex: item.cardIndex,
      twoDOffsetXTarget: nextOffset
    });

    if (immediate) {
      this.context.setLayoutState({ twoDOffsetX: nextOffset });
    }
  }

  pan2DBy(deltaX: number, is2DMode: boolean, now: number): void {
    if (!is2DMode || this.get2DGridMetrics().stackedMobile) {
      return;
    }

    const state = this.context.getLayoutState();
    this.context.setLayoutState({
      targetCardIndex: -1,
      twoDOffsetXTarget: state.twoDOffsetXTarget + deltaX
    });
    this.context.updateActivity(now);
  }

  get2DGridMetrics(): TwoDGridMetrics {
    if (this.twoDGridMetricsCache) {
      return this.twoDGridMetricsCache;
    }

    const layoutState = this.context.getLayoutState();
    const baseWidth = layoutState.isMobileViewport ? 320 : 336;
    const baseHeightNative = 460;
    const widthScale = this.get2DResponsiveScale();
    const heightScale = this.get2DResponsiveHeightScale(widthScale);



    const stackedMobile = layoutState.isMobileViewport && layoutState.viewportHeight > layoutState.viewportWidth * 1.08;
    const columns = stackedMobile ? 1 : layoutState.isMobileViewport ? 2 : 3;

    // Compress width harder than height so the grid still fits while body content stays readable.
    const cardWidth = baseWidth * widthScale;
    const cardHeight = baseHeightNative * heightScale;

    // Compress inter-card spacing more than the card body so the content stays legible.
    const spacingCompression = layoutState.isMobileViewport
      ? widthScale
      : clamp(widthScale - 0.18, 0.18, 1);

    // 2. UNIFORM GAPS (Standardized gap aligning with edge preview cards)
    const baseGapX = layoutState.isMobileViewport ? 12 : 42;
    const gapX = baseGapX * spacingCompression;

    // Keep card width tied to responsiveScale, but let spacing collapse first on desktop.
    const spacingX = cardWidth + gapX;

    // Vertical spacing: (Visual height at scale 1.0 + Gap at scale 1.0) * overall scale
    const baseGapY = stackedMobile ? 48 : layoutState.isMobileViewport ? 64 : 110;
    const gapY = baseGapY * clamp(spacingCompression + 0.08, 0.62, 1);

    const spacingY = cardHeight + gapY;

    const cardCount = Math.max(1, this.context.getCardItems().length);
    const rows = Math.max(1, Math.ceil(cardCount / columns));
    const tileWidth = stackedMobile ? spacingX : columns * spacingX;
    const tileHeight = rows * spacingY;

    this.twoDGridMetricsCache = {
      cardHeight,
      cardWidth,
      cardSize: cardWidth,
      columns,
      gapX,
      gapY,
      rows,
      stackedMobile,
      scrollLoop: tileHeight * 3,
      scrollScale: stackedMobile ? 1.02 : layoutState.isMobileViewport ? 1.08 : 1.12,
      spacingX,
      spacingY,
      tileHeight,
      tileWidth
    };

    return this.twoDGridMetricsCache;
  }


  compute2DCardPose(item: ItemState, sceneScroll: number, time: number): TwoDCardPose {
    const metrics = this.get2DGridMetrics();
    const layoutState = this.context.getLayoutState();
    const canonicalPose = this.compute2DCardPoseForGridOrder(item, item.gridOrder, sceneScroll, time, metrics);
    const transitionGridOrder = layoutState.transitionGridOrder.get(item.cardIndex);

    if (transitionGridOrder === undefined || layoutState.transitionOrderMix >= 0.999) {
      return canonicalPose;
    }

    const transitionPose = this.compute2DCardPoseForGridOrder(item, transitionGridOrder, sceneScroll, time, metrics);

    return {
      alpha: lerp(transitionPose.alpha, canonicalPose.alpha, layoutState.transitionOrderMix),
      scale: lerp(transitionPose.scale, canonicalPose.scale, layoutState.transitionOrderMix),
      shiftZ: lerp(transitionPose.shiftZ, canonicalPose.shiftZ, layoutState.transitionOrderMix),
      tiltX: lerp(transitionPose.tiltX, canonicalPose.tiltX, layoutState.transitionOrderMix),
      tiltY: lerp(transitionPose.tiltY, canonicalPose.tiltY, layoutState.transitionOrderMix),
      tiltZ: lerp(transitionPose.tiltZ, canonicalPose.tiltZ, layoutState.transitionOrderMix),
      x: lerp(transitionPose.x, canonicalPose.x, layoutState.transitionOrderMix),
      y: lerp(transitionPose.y, canonicalPose.y, layoutState.transitionOrderMix),
      z: lerp(transitionPose.z, canonicalPose.z, layoutState.transitionOrderMix),
      textScale: lerp(transitionPose.textScale, canonicalPose.textScale, layoutState.transitionOrderMix)
    };
  }

  update2DSectionFrame(viewModeProgress: number, delta: number): void {
    const layoutState = this.context.getLayoutState();
    const metrics = this.get2DGridMetrics();
    const worldState = this.context.getWorldState();
    const exitingTwoD = layoutState.viewModeTarget < 0.5;
    const shouldShow =
      this.context.getIntroCompleted() &&
      !worldState.exitReturnActive &&
      !worldState.expandedCard &&
      worldState.expandedProgress < 0.01 &&
      viewModeProgress > 0.16 &&
      (
        layoutState.viewModeTarget > 0.5 ||
        (viewModeProgress > (exitingTwoD ? 0.32 : 0.5))
      );

    const frameState = this.context.getFrameSamplingState();
    const sectionFrameVisualEase = computeDampedLerp(
      delta,
      MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.sectionFrameVisualEnvelope
    );
    const fastVelocityFloor = MANIFOLD_CONSTANTS.INTERACTION_SENSITIVITY.fastTwoDVelocity;
    const phaseVelocity = this.context.getPhaseVelocity();
    const velocityPressure = clamp(Math.abs(phaseVelocity.velocity) / (fastVelocityFloor * 1.15), 0, 1);
    const targetSpeedPressure = clamp(Math.abs(phaseVelocity.targetSpeed) / (fastVelocityFloor * 1.15), 0, 1);
    const highRefreshFrameBudget = 1000 / 120;
    const frameStressThreshold =
      highRefreshFrameBudget * MANIFOLD_CONSTANTS.PERFORMANCE_THRESHOLDS.frameStressEmaMultiplier;
    const frameStressSpan = Math.max(1, frameStressThreshold - highRefreshFrameBudget);
    const framePressure = clamp(
      (Math.max(frameState.frameTimeEma, frameState.frameTimeBurst) - highRefreshFrameBudget) / frameStressSpan,
      0,
      1
    );
    const motionPressure = Math.max(velocityPressure, targetSpeedPressure * 0.92, framePressure * 0.88);
    const targetStillness = shouldShow ? 1 - motionPressure : 0;
    const stillnessValue = lerp(frameState.stillness, targetStillness, sectionFrameVisualEase);
    this.context.setFrameSamplingState({ stillness: stillnessValue });

    const stillness = clamp(stillnessValue, 0, 1);
    const root = this.context.getSectionFrameElements().root;
    
    // Instead of allocating strings for values, compute purely numeric floats for CSS Typed OM 
    const outlineOpacityV = lerp(0.62, 1, stillness);
    const outlineBeforeOpacityV = lerp(0.38, 0.7, stillness);
    const outlineAfterOpacityV = lerp(0.08, 0.15, stillness);
    const outlineSaturateV = lerp(0.82, 1, stillness);
    const outlineBorderAlphaV = lerp(42, 26, 1 - stillness);
    const outlineRingAlphaV = lerp(4, 10, stillness);
    const outlineGlowAlphaV = lerp(12, 30, stillness);
    const outlineShadowYV = lerp(12, 24, stillness);
    const outlineShadowBlurV = lerp(28, 56, stillness);
    const tabOpacityV = lerp(0.72, 1, stillness);
    const tabBorderAlphaV = lerp(10, 34, stillness);
    const tabGlowAlphaV = lerp(10, 34, stillness);
    const tabShadowYV = lerp(6, 10, stillness);
    const tabShadowBlurV = lerp(14, 24, stillness);

    // Safari: Coarser quantization (256 steps vs 4096) to reduce CSS write frequency.
    // Each write triggers 14 setProperty calls that invalidate the section frame subtree.
    const quantizationSteps = IS_SAFARI ? 255 : 4095;
    const frameVisualState = String(Math.round(stillness * quantizationSteps));

    if (frameVisualState !== frameState.lastFrameVisualState) {
      root.style.setProperty('--two-d-frame-outline-opacity', outlineOpacityV.toFixed(3));
      root.style.setProperty('--two-d-frame-outline-before-opacity', outlineBeforeOpacityV.toFixed(3));
      root.style.setProperty('--two-d-frame-outline-after-opacity', outlineAfterOpacityV.toFixed(3));
      root.style.setProperty('--two-d-frame-outline-saturate', outlineSaturateV.toFixed(3));
      root.style.setProperty('--two-d-frame-outline-border-alpha', `${outlineBorderAlphaV.toFixed(2)}%`);
      root.style.setProperty('--two-d-frame-outline-ring-alpha', `${outlineRingAlphaV.toFixed(2)}%`);
      root.style.setProperty('--two-d-frame-outline-glow-alpha', `${outlineGlowAlphaV.toFixed(2)}%`);
      root.style.setProperty('--two-d-frame-outline-shadow-y', `${outlineShadowYV.toFixed(2)}px`);
      root.style.setProperty('--two-d-frame-outline-shadow-blur', `${outlineShadowBlurV.toFixed(2)}px`);
      root.style.setProperty('--two-d-frame-tab-opacity', tabOpacityV.toFixed(3));
      root.style.setProperty('--two-d-frame-tab-border-alpha', `${tabBorderAlphaV.toFixed(2)}%`);
      root.style.setProperty('--two-d-frame-tab-glow-alpha', `${tabGlowAlphaV.toFixed(2)}%`);
      root.style.setProperty('--two-d-frame-tab-shadow-y', `${tabShadowYV.toFixed(2)}px`);
      root.style.setProperty('--two-d-frame-tab-shadow-blur', `${tabShadowBlurV.toFixed(2)}px`);
      
      this.context.setFrameSamplingState({ lastFrameVisualState: frameVisualState });
    }

    if (!shouldShow) {
      if (frameState.lastFrameState !== '0') {
        root.style.setProperty('--two-d-frame-alpha', '0');
        this.context.setFrameSamplingState({ lastFrameState: '0' });
      }
      this.setEdgeCardVisibility(0);
      return;
    }

    const focusCard = layoutState.lastCentered2DCard ?? this.context.getCentered2DCard() ?? this.context.getEffectiveFocusCard();
    if (!focusCard) {
      this.setEdgeCardVisibility(0);
      return;
    }

    const currentFrame = this.context.getCurrent2DFrame();
    const frameBounds =
      currentFrame.bounds &&
        currentFrame.sectionTitle === focusCard.sectionTitle &&
        currentFrame.bounds.visibleCount > 0
        ? currentFrame.bounds
        : null;

    if (!frameBounds) {
      this.setEdgeCardVisibility(0);
      return;
    }

    const responsiveScale = this.get2DResponsiveScale();
    const stackedMobile = layoutState.isMobileViewport && layoutState.viewportHeight > layoutState.viewportWidth * 1.08;

    // USER_REQUEST: ENLARGED_FRAME - Symmetrical padding for better vertical balance
    // Use a tight 1.1x multiplier to ensure the frame feels tailored to the cards.
    const padFactor = 1.1;
    const padX = (stackedMobile ? 16 : layoutState.isMobileViewport ? 36 : 86) * responsiveScale * padFactor;
    const padTop = (stackedMobile ? 38 : layoutState.isMobileViewport ? 56 : 80) * responsiveScale * padFactor;
    const padBottom = (stackedMobile ? 38 : layoutState.isMobileViewport ? 56 : 80) * responsiveScale * padFactor;

    const targetX = clamp(frameBounds.minX - padX, 0, layoutState.viewportWidth - 120);

    // USER_REQUEST: ACCURATE_DEPENDENCY - Relaxed targetY/height clamping.
    // The frame must follow the cards even if they go off-screen, or else they "leak" outside the border.
    const targetY = clamp(frameBounds.minY - padTop, -2000, layoutState.viewportHeight - 120);
    const targetWidth = clamp(frameBounds.maxX - frameBounds.minX + padX * 2, 180, layoutState.viewportWidth - targetX);
    const targetHeight = clamp(frameBounds.maxY - frameBounds.minY + padTop + padBottom, 140, 5000);

    const frameEase = computeDampedLerp(delta, MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.sectionFrameEnvelope);
    const x = lerp(frameState.x || targetX, targetX, frameEase);
    const y = lerp(frameState.y || targetY, targetY, frameEase);
    const width = lerp(frameState.width || targetWidth, targetWidth, frameEase);
    const height = lerp(frameState.height || targetHeight, targetHeight, frameEase);
    const alphaV = exitingTwoD
        ? clamp((viewModeProgress - 0.18) / 0.16, 0, 1)
        : clamp((viewModeProgress - 0.12) / 0.34, 0, 1);
    
    // Maintain String format purely for cache checking to avoid diffs, but use Typed OM for actual injection
    const nextFrameState = [x.toFixed(2), y.toFixed(2), width.toFixed(2), height.toFixed(2), alphaV.toFixed(3)].join('|');

    this.context.setFrameSamplingState({ x, y, width, height });

    if (nextFrameState !== frameState.lastFrameState) {
      root.style.setProperty('--two-d-frame-x', `${x.toFixed(2)}px`);
      root.style.setProperty('--two-d-frame-y', `${y.toFixed(2)}px`);
      root.style.setProperty('--two-d-frame-width', `${width.toFixed(2)}px`);
      root.style.setProperty('--two-d-frame-height', `${height.toFixed(2)}px`);
      root.style.setProperty('--two-d-frame-alpha', alphaV.toFixed(3));

      this.context.setFrameSamplingState({ lastFrameState: nextFrameState });
    }

    const sectionTone = MANIFOLD_SECTION_TONES[focusCard.sectionTitle as keyof typeof MANIFOLD_SECTION_TONES] ?? MANIFOLD_SECTION_TONES.PROFILE;
    
    if (this.lastSectionAccent !== sectionTone.accent) {
      root.style.setProperty('--two-d-frame-accent', sectionTone.accent);
      this.lastSectionAccent = sectionTone.accent;
    }
    
    if (this.lastSectionAccentSoft !== sectionTone.accentSoft) {
      root.style.setProperty('--two-d-frame-accent-soft', sectionTone.accentSoft);
      this.lastSectionAccentSoft = sectionTone.accentSoft;
    }

    const label = this.context.getSectionFrameElements().label;
    const localizedSectionTitle = this.context.getLocalizedSectionTitle(focusCard.sectionTitle);
    if (frameState.lastLabel !== localizedSectionTitle) {
      label.textContent = localizedSectionTitle;
      this.context.setFrameSamplingState({ lastLabel: localizedSectionTitle });
    }

    if (this.context.isTransitionPerformanceMode() || IS_IOS) {
      // iOS: Skip edge card rendering entirely — the single-column layout makes
      // side previews invisible, and cloneNode(true) on cards creates ~50 DOM nodes
      // per clone, causing memory pressure.
      this.setEdgeCardVisibility(0);
      return;
    }

    /* ──────────────────────────────────────────────────────────────────────
     * COORDINATE SYSTEM BRIDGE
     *
     * Grid cards live in .world (top:50%, left:50%) with translate3d(tx,ty,-65)
     * and CSS perspective: 1000px on .viewport. Edge preview cards live in flat
     * 2D space (.two-d-section-frame at z=0).
     *
     * Two corrections are needed to align edge cards with grid cards:
     *
     * 1. PERSPECTIVE PROJECTION: Cards at z=-65 have their screen positions
     *    compressed toward viewport center by factor 1000/(1000+65) ≈ 0.939.
     *    currentScreenX/Y stores the RAW (pre-perspective) 3D coordinate.
     *
     * 2. TRANSFORM-ORIGIN SHIFT: .card CSS uses transform-origin: 50% 1.5%.
     *    When --card-scale < 1, this shifts the visual center UPWARD by
     *    (cardHeight*0.5 - cardHeight*0.015) * (1 - scale) in 3D space.
     *    This shift is ALSO perspective-projected.
     * ────────────────────────────────────────────────────────────────────── */
    const PERSPECTIVE_DEPTH = 65; // grid cards at z: -65
    const PERSPECTIVE = 1000;     // .viewport { perspective: 1000px }
    const PERSPECTIVE_FACTOR = PERSPECTIVE / (PERSPECTIVE + PERSPECTIVE_DEPTH); // ≈ 0.939

    const baseHeight = 460;
    // .card { transform-origin: 50% 1.5% } → origin Y = 460 * 0.015 = 6.9px from top
    const CARD_ORIGIN_Y = baseHeight * 0.015;
    const CARD_CENTER_Y = baseHeight * 0.5;

    /* USER_REQUEST: MOBILE_ALIGNMENT - Grouping by ROW index (grid row) instead of SECTION.
       This ensures every card in a vertical column (mobile) has its own side previews. */
    const edgePreviewRows = new Map<
      number,
      {
        items: ItemState[];
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
        sectionTitle: string;
      }
    >();
    const viewportCenterY = layoutState.viewportHeight * 0.5;

    for (const item of this.context.getCardItems()) {
      if (item.sectionTitle === '' || item.currentAlpha <= 0.02 || item.currentScreenWidth <= 0 || item.currentScreenHeight <= 0) {
        continue;
      }

      // Apply perspective correction + transform-origin shift to get VISUAL screen position
      const cardScale = item.currentCardScale || 1;
      const originShiftY = (CARD_CENTER_Y - CARD_ORIGIN_Y) * (1 - cardScale);

      const visualScreenY = (item.currentScreenY - originShiftY) * PERSPECTIVE_FACTOR;
      const visualScreenH = item.currentScreenHeight * PERSPECTIVE_FACTOR;
      const visualScreenX = item.currentScreenX * PERSPECTIVE_FACTOR;
      const visualScreenW = item.currentScreenWidth * PERSPECTIVE_FACTOR;

      const centerY = viewportCenterY + visualScreenY;
      const top = centerY - visualScreenH * 0.5;
      const bottom = centerY + visualScreenH * 0.5;

      if (bottom < -48 || top > layoutState.viewportHeight + 48) {
        continue;
      }

      const centerX = layoutState.viewportWidth * 0.5 + visualScreenX;
      const left = centerX - visualScreenW * 0.5;
      const right = centerX + visualScreenW * 0.5;
      
      const rowIndex = Math.floor(item.gridOrder / metrics.columns);
      const existing = edgePreviewRows.get(rowIndex);

      if (existing) {
        existing.items.push(item);
        existing.minX = Math.min(existing.minX, left);
        existing.maxX = Math.max(existing.maxX, right);
        existing.minY = Math.min(existing.minY, top);
        existing.maxY = Math.max(existing.maxY, bottom);
      } else {
        edgePreviewRows.set(rowIndex, {
          items: [item],
          minX: left,
          maxX: right,
          minY: top,
          maxY: bottom,
          sectionTitle: item.sectionTitle
        });
      }
    }

    const previewRows = [...edgePreviewRows.entries()]
      .map(([rowIndex, row]) => ({ rowIndex, ...row }))
      .sort((left, right) => left.rowIndex - right.rowIndex);

    let poolIndex = 0;

    for (const row of previewRows) {
      const sectionCards = [...row.items].sort((left, right) => left.currentScreenX - right.currentScreenX);
      if (sectionCards.length === 0) {
        continue;
      }

      /* Edge preview cards should visually continue the exact same grid:
         same card width, same gap, same baseline, only faded and clipped. */
      const perceivedWidth = metrics.cardWidth * PERSPECTIVE_FACTOR;
      const visualGapX = Math.max(0, metrics.spacingX * PERSPECTIVE_FACTOR - perceivedWidth);
      const visualTop = row.minY;
      const compensationX = metrics.cardWidth * (1 - PERSPECTIVE_FACTOR) * 0.5;
      const compensationY = metrics.cardHeight * (1 - PERSPECTIVE_FACTOR) * 0.5;
      const leftCardLeft = row.minX - visualGapX - perceivedWidth - compensationX;
      const rightCardLeft = row.maxX + visualGapX - compensationX;

      /* USER_REQUEST: CONSISTENT_DIMMING - Align with official section fade logic from orchestrator.
         Grid cards are dimmed to 0.2 if they are outside the active section. */
      const p = clamp((viewModeProgress - 0.02) / 0.7, 0, 1);
      const sectionFade = p * p * (3 - 2 * p);
      let dimFactor = 1;
      if (row.sectionTitle !== focusCard.sectionTitle) {
        dimFactor = lerp(1.0, 0.2, sectionFade);
      }

      const rowCenterY = (row.minY + row.maxY) / 2;
      const rowDistance = clamp(Math.abs(rowCenterY - viewportCenterY) / Math.max(1, layoutState.viewportHeight * 0.46), 0, 1);
      
      /* Applying consistent dimming that respects both section focus and viewport distance */
      const baseAlpha = viewModeProgress * (0.32 + stillness * 0.44) * (1 - rowDistance * 0.42);
      const rowAlpha = clamp(baseAlpha * dimFactor, 0, 0.52);

      /* The edge card DOM is baseWidth × baseHeight (320×460), scaled by combinedScale
         via transform with default transform-origin 50% 50%. Its visual center is at
         (left + baseWidth/2, top + baseHeight/2), unaffected by scale.
         So: edgeTop = rowCenterY - baseHeight/2  →  edge visual center = rowCenterY ✓ */
      const rowTop = visualTop - compensationY;

      this.updateEdgeCardPreview(
        poolIndex,
        'left',
        sectionCards[sectionCards.length - 1] ?? null,
        rowAlpha,
        leftCardLeft,
        rowTop
      );
      poolIndex += 1;

      this.updateEdgeCardPreview(
        poolIndex,
        'right',
        sectionCards[0] ?? null,
        rowAlpha,
        rightCardLeft,
        rowTop
      );
      poolIndex += 1;
    }

    this.setEdgeCardVisibility(poolIndex);
  }

  private compute2DCardPoseForGridOrder(
    item: ItemState,
    gridOrder: number,
    sceneScroll: number,
    time: number,
    metrics: TwoDGridMetrics
  ): TwoDCardPose {
    const layoutState = this.context.getLayoutState();
    const column = ((gridOrder % metrics.columns) + metrics.columns) % metrics.columns;
    const row = Math.floor(gridOrder / metrics.columns);
    const twoDWorldY = (sceneScroll - this.context.getIntroScrollAnchor()) * metrics.scrollScale;

    // USER_REQUEST: GRID_CENTERING - First column is no longer at 0. 
    // We shift the whole grid so its horizontal midpoint is at 0.
    const centerXOffset = (metrics.columns - 1) * 0.5 * metrics.spacingX;

    // USER_REQUEST: VERTICAL_GRID_OFFSET - Push cards down to avoid overlapping with section headers
    const responsiveScale = this.get2DResponsiveScale();
    const verticalGridOffset = 20 * clamp(responsiveScale + 0.08, 0.86, 1);

    const rawX = metrics.stackedMobile ? 0 : column * metrics.spacingX - centerXOffset - layoutState.twoDOffsetX;
    const rawY = row * metrics.spacingY - twoDWorldY + verticalGridOffset;
    const wrappedX = metrics.stackedMobile ? 0 : wrapSigned(rawX, metrics.tileWidth);
    const wrappedY = wrapSigned(rawY, metrics.tileHeight);

    // Codex change: keep a subtle horizontal sway, but lock vertical row alignment in 2D
    // so cards outside the active section sit on the same baseline as the cards inside it.
    const sway = Math.sin(time * 0.0007 + item.variance * 8.4) * (metrics.stackedMobile ? 1.2 : 4);
    const yDrift = 0;

    // Zapobiegamy ucinaniu kart na bokach ekranu
    const lateralFadeStart = layoutState.viewportWidth * 0.38;
    const lateralFadeSpan = layoutState.viewportWidth * 0.25;
    const verticalFadeStart = layoutState.viewportHeight * 0.32;
    const verticalFadeSpan = layoutState.viewportHeight * 0.25;

    const edgeFadeX = metrics.stackedMobile
      ? 1
      : clamp(1 - Math.max(0, Math.abs(wrappedX) - lateralFadeStart) / Math.max(1, lateralFadeSpan), 0, 1);

    const edgeFadeY = clamp(1 - Math.max(0, Math.abs(wrappedY) - verticalFadeStart) / Math.max(1, verticalFadeSpan), 0, 1);

    const sidePresenceFloor = metrics.stackedMobile ? 0.12 : 0.08;
    const alpha = clamp(lerp(sidePresenceFloor, 1, edgeFadeX) * edgeFadeY, sidePresenceFloor, 1);

    // Structural width/height already carry the responsive compression in 2D.
    const scale = 1;
    const yDistance = Math.abs(wrappedY);
    const zPush = metrics.stackedMobile
      ? yDistance * 0.03
      : yDistance * 0.04;

    return {
      alpha,
      scale,
      shiftZ: 0,
      tiltX: 0,
      tiltY: 0,
      tiltZ: 0,
      x: wrappedX + sway,
      y: wrappedY + yDrift,
      z: -65 - zPush,
      textScale: 1
    };
  }

  clear2DSectionFrame(): void {
    const root = this.context.getSectionFrameElements().root;
    root.style.setProperty('--two-d-frame-alpha', '0');
    this.context.setFrameSamplingState({ lastFrameState: '0' });
    this.setEdgeCardVisibility(0);
  }

  clear2DLayoutTargets(): void {
    this.context.setLayoutState({
      targetCardIndex: -1,
      twoDOffsetXTarget: 0
    });
  }
}

function wrapSigned(value: number, size: number): number {
  if (size <= 0) {
    return value;
  }

  return ((((value + size * 0.5) % size) + size) % size) - size * 0.5;
}
