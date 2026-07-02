import Lenis from '@studio-freight/lenis';
import {
  MANIFOLD_LOOP_MULTIPLIER,
  MANIFOLD_LOOP_REBASE_DEFER_VELOCITY,
  MANIFOLD_LOOP_REBASE_EMERGENCY_MARGIN_LOOPS,
  MANIFOLD_LOOP_REBASE_MARGIN_LOOPS
} from '../../config/manifold/ManifoldBootConfig';
import { createLenisRebaseAdapter } from '../LenisRebaseAdapter';
import type { LoopTelemetry } from './ManifoldAppDiagnostics';
import { computeDampedLerp } from '../../experience/manifold/HyperMath';
import { IS_IOS, IS_SAFARI } from '../../utils/browserDetection';

const IOS_NATIVE_LOOP_MULTIPLIER = 14;
const IOS_LOOP_REBASE_MARGIN_LOOPS = 2;
const IOS_LOOP_REBASE_EMERGENCY_MARGIN_LOOPS = 0.75;
const IOS_LOOP_REBASE_DEFER_VELOCITY = 1.8;

export interface ScrollController {
  getInitialScrollAnchor(): number;
  setScroll(scroll: number, velocity: number): void;
}

/**
 * Orchestrates scroll synchronization between the browser's native scroll (or Lenis)
 * and the internal "logical" scroll state used by the Manifold engine.
 * Handles rebase logic for the infinite loop experience.
 */
export class ManifoldAppScroll {
  private targetScroll = window.scrollY;
  private smoothScroll = window.scrollY;
  private activeScroll = window.scrollY;
  private logicalOffset = 0;
  private targetVelocity = 0;
  private loopScrollLength = 0;
  private lenisRebaseUnlockRaf = 0;
  private scrollProxy: HTMLElement | null = null;
  private lastUpdateTime = 0;
  private touchStartX = 0;
  private touchStartY = 0;
  private touchRefreshGuardArmed = false;
  private resizeSyncRaf = 0;
  private readonly shouldBlockPullToRefresh = IS_IOS && IS_SAFARI;
  private lastProxyHeightPx = -1;

  constructor(
    private readonly telemetry: LoopTelemetry,
    private readonly getController: () => ScrollController | null,
    private readonly getLenis: () => Lenis | null
  ) {}

  setup(): void {
    window.addEventListener('scroll', this.handleNativeScroll);
    window.addEventListener('resize', this.scheduleResizeSync, {
      passive: true
    });
    window.visualViewport?.addEventListener('resize', this.scheduleResizeSync, {
      passive: true
    });

    if (this.shouldBlockPullToRefresh) {
      document.addEventListener('touchstart', this.handleTouchStart, {
        passive: true
      });
      document.addEventListener('touchmove', this.handleTouchMove, {
        passive: false
      });
    }
  }

  destroy(): void {
    window.removeEventListener('scroll', this.handleNativeScroll);
    window.removeEventListener('resize', this.scheduleResizeSync);
    window.visualViewport?.removeEventListener(
      'resize',
      this.scheduleResizeSync
    );
    if (this.shouldBlockPullToRefresh) {
      document.removeEventListener('touchstart', this.handleTouchStart);
      document.removeEventListener('touchmove', this.handleTouchMove);
    }
    if (this.lenisRebaseUnlockRaf) {
      window.cancelAnimationFrame(this.lenisRebaseUnlockRaf);
    }
    if (this.resizeSyncRaf) {
      window.cancelAnimationFrame(this.resizeSyncRaf);
      this.resizeSyncRaf = 0;
    }
  }

  attachScrollProxy(element: HTMLElement | null): void {
    this.scrollProxy = element;
    this.updateScrollProxyHeight();
  }

  setLoopScrollLength(length: number): void {
    this.loopScrollLength = length;
    this.updateScrollProxyHeight();
  }

  initialize(initialLogicalScroll: number): void {
    // iOS Safari must start away from the native scroll edges; otherwise a normal swipe can become pull-to-refresh.
    const initialPhysicalScroll =
      this.loopScrollLength > 0
        ? this.getLoopPhysicalSpan() * 0.5
        : Math.max(0, initialLogicalScroll);

    this.logicalOffset = initialLogicalScroll - initialPhysicalScroll;
    this.targetScroll = initialPhysicalScroll;
    this.smoothScroll = initialPhysicalScroll;
    this.activeScroll = initialPhysicalScroll;
    this.targetVelocity = 0;
    this.setPhysicalDocumentScroll(initialPhysicalScroll);
    this.telemetry.logicalScroll = this.toLogicalScroll(initialPhysicalScroll);
    this.getController()?.setScroll(initialLogicalScroll, 0);
  }

  scrollToLogical(
    logicalScroll: number,
    options?: { immediate?: boolean }
  ): void {
    const immediate = options?.immediate ?? true;

    // Always use the full, natural physical distance
    const targetPhysicalScroll = logicalScroll - this.logicalOffset;

    if (immediate) {
      const rebased = this.maybeRebasePhysicalScroll(targetPhysicalScroll, 0);
      if (rebased.delta !== 0) {
        this.logicalOffset -= rebased.delta;
      }
      this.targetScroll = rebased.scroll;
      this.smoothScroll = rebased.scroll;
      this.activeScroll = rebased.scroll;
      this.targetVelocity = 0;
      this.setPhysicalDocumentScroll(rebased.scroll);
      this.telemetry.logicalScroll = this.toLogicalScroll(rebased.scroll);
      this.getController()?.setScroll(logicalScroll, 0);
      return;
    }

    this.targetScroll = targetPhysicalScroll;
    this.targetVelocity = 0;

    const lenis = this.getLenis();
    if (lenis) {
      lenis.scrollTo(targetPhysicalScroll, {
        duration: 1.3,
        easing: (t: number) =>
          t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
        force: true,
        immediate: false
      });
      return;
    }

    window.scrollTo({ top: targetPhysicalScroll, behavior: 'smooth' });
  }

  getLogicalScroll(): number {
    return this.toLogicalScroll(this.activeScroll);
  }

  getTargetVelocity(): number {
    return this.targetVelocity;
  }

  update(time: number): void {
    const controller = this.getController();
    const lenis = this.getLenis();

    if (lenis) {
      const lenisStartedAt = performance.now();
      lenis.raf(time);
      this.telemetry.lenisMs = performance.now() - lenisStartedAt;

      // Ensure 3D engine is synced in the same frame
      if (typeof window !== 'undefined' && window.__sceneManager) {
        window.__sceneManager.syncScroll(lenis.scroll);
      }

      this.activeScroll = this.targetScroll;
      this.smoothScroll = this.targetScroll;
      const logicalScroll = this.toLogicalScroll(this.targetScroll);
      controller?.setScroll(logicalScroll, this.targetVelocity);
      this.telemetry.logicalScroll = logicalScroll;
      return;
    }

    this.telemetry.lenisMs = 0;
    const rebased = this.maybeRebasePhysicalScroll(
      this.targetScroll,
      Math.abs(this.targetVelocity)
    );

    if (rebased.delta !== 0) {
      this.applyRebase(rebased.scroll, rebased.delta);
    }

    const rawDelta =
      this.lastUpdateTime > 0 ? time - this.lastUpdateTime : 16.67;
    const delta = Math.min(rawDelta, 64);
    this.lastUpdateTime = time;

    const previous = this.smoothScroll;
    this.smoothScroll +=
      (this.targetScroll - this.smoothScroll) * computeDampedLerp(delta, 3.1);
    this.activeScroll +=
      (this.smoothScroll - this.activeScroll) * computeDampedLerp(delta, 5.0);
    this.targetVelocity = this.smoothScroll - previous;

    const logicalScroll = this.toLogicalScroll(this.activeScroll);
    controller?.setScroll(logicalScroll, this.targetVelocity);
    this.telemetry.logicalScroll = logicalScroll;
  }

  handleLenisScroll(scroll: number, velocity: number): void {
    this.targetScroll = scroll;
    this.targetVelocity = velocity;
  }

  maybeRebaseLenis(target: number): number {
    const rebased = this.maybeRebasePhysicalScroll(target, 0);
    if (rebased.delta !== 0) {
      return this.applyLenisRebase(rebased.delta);
    }
    return target;
  }

  /**
   * Fallback listener that synchronizes the target scroll when Lenis is inactive or disabled.
   * When Lenis is running, it handles synchronization through handleLenisScroll() directly.
   */
  private handleNativeScroll = () => {
    if (this.getLenis()) return;
    this.targetScroll = this.getNativeScrollTop();
  };

  private handleTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1) {
      this.touchRefreshGuardArmed = false;
      return;
    }

    const touch = event.touches[0];
    this.touchStartX = touch?.clientX ?? 0;
    this.touchStartY = touch?.clientY ?? 0;
    this.touchRefreshGuardArmed = this.shouldBlockTouchRefreshForTarget(
      event.target
    );

    if (this.touchRefreshGuardArmed && this.isAtTopBoundary()) {
      this.recoverFromNativeScrollEdge();
    }
  };

  private handleTouchMove = (event: TouchEvent) => {
    if (!this.touchRefreshGuardArmed || event.touches.length !== 1) {
      return;
    }

    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    const deltaX = Math.abs(touch.clientX - this.touchStartX);
    const deltaY = touch.clientY - this.touchStartY;

    // Only intercept a downward edge pull on iOS Safari; normal scrolling stays native.
    if (deltaY < 14 || deltaY <= deltaX * 1.1) {
      return;
    }

    if (this.isAtTopBoundary()) {
      this.recoverFromNativeScrollEdge();
      event.preventDefault();
    }
  };

  private scheduleResizeSync = () => {
    if (this.resizeSyncRaf) {
      return;
    }

    this.resizeSyncRaf = window.requestAnimationFrame(() => {
      this.resizeSyncRaf = 0;
      this.updateScrollProxyHeight();
      this.recoverFromNativeScrollEdge();
    });
  };

  private toLogicalScroll(physicalScroll: number): number {
    return physicalScroll + this.logicalOffset;
  }

  private shouldBlockTouchRefreshForTarget(
    target: EventTarget | null
  ): boolean {
    if (!(target instanceof Element)) {
      return true;
    }

    return !target.closest(
      'input, textarea, select, option, [contenteditable=""], [contenteditable="true"], [data-allow-pull-refresh]'
    );
  }

  private isAtTopBoundary(): boolean {
    return this.getNativeScrollTop() <= 4;
  }

  private getNativeScrollTop(): number {
    return document.scrollingElement?.scrollTop ?? window.scrollY ?? 0;
  }

  private setPhysicalDocumentScroll(scroll: number): void {
    const lenis = this.getLenis();
    if (lenis) {
      lenis.resize(); // Force DOM height recalculation before aggressive scroll
      lenis.scrollTo(scroll, { immediate: true, force: true });
      return;
    }

    if (Math.abs(this.getNativeScrollTop() - scroll) < 1) {
      return;
    }

    if (IS_IOS && document.scrollingElement) {
      document.scrollingElement.scrollTop = scroll;
      if (Math.abs(this.getNativeScrollTop() - scroll) < 2) {
        return;
      }
    }

    window.scrollTo(0, scroll);
  }

  private updateScrollProxyHeight(): void {
    if (!this.scrollProxy) {
      return;
    }

    const viewportHeight = this.getViewportHeight();
    const proxyHeight =
      this.loopScrollLength > 0
        ? Math.max(
            viewportHeight + this.getLoopPhysicalSpan(),
            viewportHeight * 3
          )
        : viewportHeight * 3;

    const roundedProxyHeight = Math.round(proxyHeight);
    if (roundedProxyHeight !== this.lastProxyHeightPx) {
      this.scrollProxy.style.height = `${roundedProxyHeight}px`;
      this.lastProxyHeightPx = roundedProxyHeight;
    }
    this.getLenis()?.resize(); // Force boundary update
  }

  private applyRebase(nextScroll: number, delta: number): void {
    const startedAt = performance.now();
    if (delta !== 0) {
      this.logicalOffset -= delta;
      this.telemetry.rebaseCount += 1;
      this.telemetry.rebaseDelta = delta;
      this.smoothScroll += delta;
      this.activeScroll += delta;
      this.targetVelocity = 0;
    }

    this.targetScroll = nextScroll;
    this.setPhysicalDocumentScroll(nextScroll);
    this.telemetry.rebaseMs = performance.now() - startedAt;
  }

  private applyLenisRebase(delta: number): number {
    const lenis = this.getLenis();
    if (!lenis || delta === 0) {
      return this.targetScroll;
    }

    const startedAt = performance.now();
    this.logicalOffset -= delta;
    this.telemetry.rebaseCount += 1;
    this.telemetry.rebaseDelta = delta;

    const rebaseAdapter = createLenisRebaseAdapter(lenis);
    const nextAnimatedScroll = rebaseAdapter.offsetBy(delta);

    if (this.lenisRebaseUnlockRaf) {
      window.cancelAnimationFrame(this.lenisRebaseUnlockRaf);
    }

    rebaseAdapter.setPreventNextScrollEvent(true);

    this.lenisRebaseUnlockRaf = window.requestAnimationFrame(() => {
      if (this.getLenis()) {
        createLenisRebaseAdapter(this.getLenis()!).setPreventNextScrollEvent(
          false
        );
      }
      this.lenisRebaseUnlockRaf = 0;
    });

    this.telemetry.rebaseMs = performance.now() - startedAt;
    return nextAnimatedScroll;
  }

  private maybeRebasePhysicalScroll(
    physicalScroll: number,
    velocityMagnitude = 0
  ): { scroll: number; delta: number } {
    if (this.loopScrollLength <= 0) {
      return { scroll: physicalScroll, delta: 0 };
    }

    const totalSpan = this.getLoopPhysicalSpan();
    const center = totalSpan * 0.5;
    const edgeMarginLoops = IS_IOS
      ? IOS_LOOP_REBASE_MARGIN_LOOPS
      : MANIFOLD_LOOP_REBASE_MARGIN_LOOPS;
    const emergencyMarginLoops = IS_IOS
      ? IOS_LOOP_REBASE_EMERGENCY_MARGIN_LOOPS
      : MANIFOLD_LOOP_REBASE_EMERGENCY_MARGIN_LOOPS;
    const deferVelocity = IS_IOS
      ? IOS_LOOP_REBASE_DEFER_VELOCITY
      : MANIFOLD_LOOP_REBASE_DEFER_VELOCITY;
    const edgeMargin = Math.min(
      this.loopScrollLength * edgeMarginLoops,
      totalSpan * 0.4
    );
    const emergencyEdgeMargin = Math.min(
      this.loopScrollLength * emergencyMarginLoops,
      edgeMargin * 0.6
    );
    const min = edgeMargin;
    const max = totalSpan - edgeMargin;
    const emergencyMin = emergencyEdgeMargin;
    const emergencyMax = totalSpan - emergencyEdgeMargin;

    if (
      velocityMagnitude > deferVelocity &&
      physicalScroll >= emergencyMin &&
      physicalScroll <= emergencyMax
    ) {
      return { scroll: physicalScroll, delta: 0 };
    }

    if (physicalScroll < min || physicalScroll > max) {
      const normalized =
        physicalScroll +
        Math.round((center - physicalScroll) / this.loopScrollLength) *
          this.loopScrollLength;
      const delta = normalized - physicalScroll;
      return { scroll: normalized, delta };
    }

    return { scroll: physicalScroll, delta: 0 };
  }

  private recoverFromNativeScrollEdge(): void {
    if (this.getLenis() || this.loopScrollLength <= 0) {
      return;
    }

    const physicalScroll = this.getNativeScrollTop();
    const rebased = this.maybeRebasePhysicalScroll(
      physicalScroll,
      Number.POSITIVE_INFINITY
    );
    if (rebased.delta !== 0) {
      this.applyRebase(rebased.scroll, rebased.delta);
    }
  }

  private getLoopPhysicalSpan(): number {
    // Keep iOS' physical document shorter than desktop Lenis while preserving enough room for rebasing.
    const multiplier = IS_IOS
      ? IOS_NATIVE_LOOP_MULTIPLIER
      : MANIFOLD_LOOP_MULTIPLIER;
    return this.loopScrollLength * multiplier;
  }

  private getViewportHeight(): number {
    return Math.max(
      1,
      Math.round(window.visualViewport?.height ?? window.innerHeight)
    );
  }
}
