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
import { IS_ANDROID, IS_IOS, IS_SAFARI } from '../../utils/browserDetection';

const IOS_NATIVE_LOOP_MULTIPLIER = 14;
const IOS_LOOP_REBASE_MARGIN_LOOPS = 2;
const IOS_LOOP_REBASE_EMERGENCY_MARGIN_LOOPS = 0.75;
const IOS_LOOP_REBASE_DEFER_VELOCITY = 1.8;
const ANDROID_NATIVE_LOOP_MULTIPLIER = 32;
const ANDROID_LOOP_REBASE_MARGIN_LOOPS = 4;
const ANDROID_LOOP_REBASE_EMERGENCY_MARGIN_LOOPS = 1.1;
const ANDROID_LOOP_REBASE_DEFER_VELOCITY = 1.35;
const MOBILE_NATIVE_SETTLE_VELOCITY = IS_ANDROID ? 2.8 : 2.4;
const MOBILE_TOUCH_END_GRACE_MS = IS_ANDROID ? 140 : 200;
const MOBILE_REBASE_COOLDOWN_MS = IS_ANDROID ? 280 : 360;
const MOBILE_REBASE_SUPPRESS_MS = IS_ANDROID ? 48 : 64;

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
  private readonly useDirectNativeScroll = IS_IOS || IS_ANDROID;
  private lastProxyHeightPx = -1;

  private isNativeTouchActive = false;
  private nativeTouchGraceUntil = 0;
  private lastNativeScrollTop = 0;
  private lastNativeScrollSampleAt = 0;
  private nativeScrollVelocity = 0;
  private pendingRebase: { scroll: number; delta: number } | null = null;
  private lastRebaseAt = 0;
  private suppressNativeScrollUntil = 0;

  constructor(
    private readonly telemetry: LoopTelemetry,
    private readonly getController: () => ScrollController | null,
    private readonly getLenis: () => Lenis | null
  ) {}

  setup(): void {
    window.addEventListener('scroll', this.handleNativeScroll, { passive: true });
    window.addEventListener('resize', this.scheduleResizeSync, { passive: true });
    window.visualViewport?.addEventListener('resize', this.scheduleResizeSync, { passive: true });

    if (this.useDirectNativeScroll) {
      document.addEventListener('touchstart', this.handleNativeTouchStart, { passive: true });
      document.addEventListener('touchend', this.handleNativeTouchEnd, { passive: true });
      document.addEventListener('touchcancel', this.handleNativeTouchEnd, { passive: true });
      window.addEventListener('scrollend', this.handleNativeScrollEnd, { passive: true });
    }

    if (this.shouldBlockPullToRefresh) {
      document.addEventListener('touchstart', this.handleTouchStart, { passive: true });
      document.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    }

    this.lastNativeScrollTop = this.getNativeScrollTop();
    this.lastNativeScrollSampleAt = performance.now();
  }

  destroy(): void {
    window.removeEventListener('scroll', this.handleNativeScroll);
    window.removeEventListener('resize', this.scheduleResizeSync);
    window.visualViewport?.removeEventListener('resize', this.scheduleResizeSync);

    if (this.useDirectNativeScroll) {
      document.removeEventListener('touchstart', this.handleNativeTouchStart);
      document.removeEventListener('touchend', this.handleNativeTouchEnd);
      document.removeEventListener('touchcancel', this.handleNativeTouchEnd);
      window.removeEventListener('scrollend', this.handleNativeScrollEnd);
    }

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
    const initialPhysicalScroll = this.loopScrollLength > 0
      ? this.getLoopPhysicalSpan() * 0.5
      : Math.max(0, initialLogicalScroll);

    this.logicalOffset = initialLogicalScroll - initialPhysicalScroll;
    this.targetScroll = initialPhysicalScroll;
    this.smoothScroll = initialPhysicalScroll;
    this.activeScroll = initialPhysicalScroll;
    this.targetVelocity = 0;
    this.pendingRebase = null;
    this.setPhysicalDocumentScroll(initialPhysicalScroll);
    this.telemetry.logicalScroll = this.toLogicalScroll(initialPhysicalScroll);
    this.getController()?.setScroll(initialLogicalScroll, 0);
    this.lastNativeScrollTop = initialPhysicalScroll;
    this.lastNativeScrollSampleAt = performance.now();
    this.nativeScrollVelocity = 0;
  }

  scrollToLogical(logicalScroll: number, options?: { immediate?: boolean }): void {
    const immediate = options?.immediate ?? true;

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
      this.pendingRebase = null;
      this.setPhysicalDocumentScroll(rebased.scroll);
      this.telemetry.logicalScroll = this.toLogicalScroll(rebased.scroll);
      this.getController()?.setScroll(logicalScroll, 0);
      this.lastNativeScrollTop = rebased.scroll;
      return;
    }

    this.targetScroll = targetPhysicalScroll;
    this.targetVelocity = 0;

    const lenis = this.getLenis();
    if (lenis) {
      lenis.scrollTo(targetPhysicalScroll, {
        duration: 1.3,
        easing: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
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

    if (this.useDirectNativeScroll) {
      this.updateNativeScrollDirect(controller);
      this.flushPendingRebase(false);
      return;
    }

    const rebased = this.maybeRebasePhysicalScroll(this.targetScroll, Math.abs(this.targetVelocity));

    if (rebased.delta !== 0) {
      this.applyRebase(rebased.scroll, rebased.delta);
    }

    const rawDelta = this.lastUpdateTime > 0 ? time - this.lastUpdateTime : 16.67;
    const delta = Math.min(rawDelta, 64);
    this.lastUpdateTime = time;

    const previous = this.smoothScroll;
    this.smoothScroll += (this.targetScroll - this.smoothScroll) * computeDampedLerp(delta, 3.1);
    this.activeScroll += (this.smoothScroll - this.activeScroll) * computeDampedLerp(delta, 5.0);
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

  private updateNativeScrollDirect(controller: ScrollController | null): void {
    const nativeScroll = this.getNativeScrollTop();
    this.targetScroll = nativeScroll;

    const rebased = this.maybeRebasePhysicalScroll(nativeScroll, Math.abs(this.nativeScrollVelocity));
    if (rebased.delta !== 0) {
      if (this.shouldDeferNativeRebase()) {
        this.pendingRebase = rebased;
      } else {
        this.applyRebase(rebased.scroll, rebased.delta);
        this.pendingRebase = null;
      }
    }

    this.activeScroll = this.targetScroll;
    this.smoothScroll = this.targetScroll;
    this.targetVelocity = this.nativeScrollVelocity;

    const logicalScroll = this.toLogicalScroll(this.activeScroll);
    controller?.setScroll(logicalScroll, this.targetVelocity);
    this.telemetry.logicalScroll = logicalScroll;
  }

  private handleNativeScroll = () => {
    if (this.getLenis()) return;

    const now = performance.now();
    if (now < this.suppressNativeScrollUntil) {
      return;
    }

    const nextScrollTop = this.getNativeScrollTop();
    const elapsed = Math.max(now - this.lastNativeScrollSampleAt, 1);
    const delta = nextScrollTop - this.lastNativeScrollTop;
    this.nativeScrollVelocity = (delta / elapsed) * 16.67;
    this.lastNativeScrollTop = nextScrollTop;
    this.lastNativeScrollSampleAt = now;
    this.targetScroll = nextScrollTop;
  };

  private handleNativeTouchStart = () => {
    this.isNativeTouchActive = true;
    this.nativeTouchGraceUntil = 0;
  };

  private handleNativeTouchEnd = () => {
    this.isNativeTouchActive = false;
    this.nativeTouchGraceUntil = performance.now() + MOBILE_TOUCH_END_GRACE_MS;
  };

  private handleNativeScrollEnd = () => {
    this.nativeScrollVelocity = 0;
    this.flushPendingRebase(true);
  };

  private handleTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1) {
      this.touchRefreshGuardArmed = false;
      return;
    }

    const touch = event.touches[0];
    this.touchStartX = touch?.clientX ?? 0;
    this.touchStartY = touch?.clientY ?? 0;
    this.touchRefreshGuardArmed = this.shouldBlockTouchRefreshForTarget(event.target);

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

  private shouldBlockTouchRefreshForTarget(target: EventTarget | null): boolean {
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

  private shouldDeferNativeRebase(): boolean {
    const now = performance.now();
    if (this.isNativeTouchActive || now < this.nativeTouchGraceUntil) {
      return true;
    }

    if (Math.abs(this.nativeScrollVelocity) > MOBILE_NATIVE_SETTLE_VELOCITY) {
      return true;
    }

    if (now - this.lastRebaseAt < MOBILE_REBASE_COOLDOWN_MS) {
      return true;
    }

    return false;
  }

  private flushPendingRebase(force: boolean): void {
    if (!this.pendingRebase) {
      return;
    }

    if (!force && this.shouldDeferNativeRebase()) {
      return;
    }

    const pending = this.pendingRebase;
    this.pendingRebase = null;
    this.applyRebase(pending.scroll, pending.delta);
  }

  private setPhysicalDocumentScroll(scroll: number): void {
    const lenis = this.getLenis();
    if (lenis) {
      lenis.resize();
      lenis.scrollTo(scroll, { immediate: true, force: true });
      return;
    }

    if (Math.abs(this.getNativeScrollTop() - scroll) < 1) {
      return;
    }

    this.suppressNativeScrollUntil = performance.now() + MOBILE_REBASE_SUPPRESS_MS;
    this.lastNativeScrollTop = scroll;
    this.nativeScrollVelocity = 0;

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
    const proxyHeight = this.loopScrollLength > 0
      ? Math.max(viewportHeight + this.getLoopPhysicalSpan(), viewportHeight * 3)
      : viewportHeight * 3;

    const roundedProxyHeight = Math.round(proxyHeight);
    if (roundedProxyHeight !== this.lastProxyHeightPx) {
      this.scrollProxy.style.height = `${roundedProxyHeight}px`;
      this.lastProxyHeightPx = roundedProxyHeight;
    }
    this.getLenis()?.resize();
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
      this.nativeScrollVelocity = 0;
      this.lastRebaseAt = startedAt;
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
        createLenisRebaseAdapter(this.getLenis()!).setPreventNextScrollEvent(false);
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
      : IS_ANDROID
        ? ANDROID_LOOP_REBASE_MARGIN_LOOPS
        : MANIFOLD_LOOP_REBASE_MARGIN_LOOPS;
    const emergencyMarginLoops = IS_IOS
      ? IOS_LOOP_REBASE_EMERGENCY_MARGIN_LOOPS
      : IS_ANDROID
        ? ANDROID_LOOP_REBASE_EMERGENCY_MARGIN_LOOPS
        : MANIFOLD_LOOP_REBASE_EMERGENCY_MARGIN_LOOPS;
    const deferVelocity = IS_IOS
      ? IOS_LOOP_REBASE_DEFER_VELOCITY
      : IS_ANDROID
        ? ANDROID_LOOP_REBASE_DEFER_VELOCITY
        : MANIFOLD_LOOP_REBASE_DEFER_VELOCITY;
    const edgeMargin = Math.min(this.loopScrollLength * edgeMarginLoops, totalSpan * 0.4);
    const emergencyEdgeMargin = Math.min(
      this.loopScrollLength * emergencyMarginLoops,
      edgeMargin * 0.6
    );
    const min = edgeMargin;
    const max = totalSpan - edgeMargin;
    const emergencyMin = emergencyEdgeMargin;
    const emergencyMax = totalSpan - emergencyEdgeMargin;

    const effectiveVelocity = this.useDirectNativeScroll
      ? Math.max(velocityMagnitude, Math.abs(this.nativeScrollVelocity))
      : velocityMagnitude;

    if (
      effectiveVelocity > deferVelocity &&
      physicalScroll >= emergencyMin &&
      physicalScroll <= emergencyMax
    ) {
      return { scroll: physicalScroll, delta: 0 };
    }

    if (physicalScroll < min || physicalScroll > max) {
      const normalized =
        physicalScroll + Math.round((center - physicalScroll) / this.loopScrollLength) * this.loopScrollLength;
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
    const rebased = this.maybeRebasePhysicalScroll(physicalScroll, Number.POSITIVE_INFINITY);
    if (rebased.delta !== 0) {
      if (this.useDirectNativeScroll && this.shouldDeferNativeRebase()) {
        this.pendingRebase = rebased;
        return;
      }
      this.applyRebase(rebased.scroll, rebased.delta);
    }
  }

  private getLoopPhysicalSpan(): number {
    const multiplier = IS_IOS
      ? IOS_NATIVE_LOOP_MULTIPLIER
      : IS_ANDROID
        ? ANDROID_NATIVE_LOOP_MULTIPLIER
        : MANIFOLD_LOOP_MULTIPLIER;
    return this.loopScrollLength * multiplier;
  }

  private getViewportHeight(): number {
    return Math.max(1, Math.round(window.visualViewport?.height ?? window.innerHeight));
  }
}
