import Lenis from '@studio-freight/lenis';

/**
 * AUDIT RESOLUTION (2026-04-17):
 * This adapter accesses private internal state of Lenis (animatedScroll, targetScroll, setScroll).
 * This is CRITICAL for performing "scroll rebasing" in horizontal/vertical loops without 
 * resetting the internal lerp (smoothness). 
 * 
 * RECOMMENDED ACTION: If updating @studio-freight/lenis version, you MUST run regression 
 * tests and verify that these internal fields still exist and behave as expected.
 */
type LenisInternalState = {
  // Flag to skip the next native scroll event processing
  __preventNextScrollEvent?: boolean;
  // The current interpolated scroll value (trailing behind target)
  animatedScroll: number;
  // The current scroll value
  scroll: number;
  // Internal method to sync the browser's scroll position without triggering events
  setScroll(scroll: number): void;
  // The destination scroll value
  targetScroll: number;
  // Current velocity
  velocity: number;
};

export interface LenisRebaseAdapter {
  getAnimatedScroll(): number;
  getPreventNextScrollEvent(): boolean;
  getScroll(): number;
  getTargetScroll(): number;
  getVelocity(): number;
  /**
   * Shifts the scroll position of Lenis by a delta without breaking the smooth scroll flow.
   * This preserves velocity and the relative distance between animatedScroll and targetScroll.
   */
  offsetBy(delta: number): number;
  setPreventNextScrollEvent(value: boolean): void;
}

/**
 * Creates an adapter that allows manipulating Lenis internal state for rebasing operations.
 * GUARANTEE: In package.json, lenis is pinned to a specific version to ensure this contract holds.
 */
export function createLenisRebaseAdapter(lenis: Lenis): LenisRebaseAdapter {
  const state = lenis as unknown as LenisInternalState;

  // Validation: Check if the required internal state exists (at least once during creation)
  if (typeof state.animatedScroll === 'undefined' || typeof state.targetScroll === 'undefined') {
    console.error('LenisRebaseAdapter: Critical internal fields missing. Lenis version might be incompatible.');
  }

  return {
    getAnimatedScroll: () => state.animatedScroll,
    getPreventNextScrollEvent: () => state.__preventNextScrollEvent === true,
    getScroll: () => state.scroll,
    getTargetScroll: () => state.targetScroll,
    getVelocity: () => state.velocity,
    offsetBy(delta: number) {
      const nextAnimatedScroll = state.animatedScroll + delta;
      state.animatedScroll = nextAnimatedScroll;
      state.targetScroll += delta;
      state.setScroll(nextAnimatedScroll);
      return nextAnimatedScroll;
    },
    setPreventNextScrollEvent(value: boolean) {
      if (value) {
        state.__preventNextScrollEvent = true;
        return;
      }

      delete state.__preventNextScrollEvent;
    }
  };
}
