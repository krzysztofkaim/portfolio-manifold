/** @vitest-environment happy-dom */
import { describe, it, expect, vi } from 'vitest';
import Lenis from '@studio-freight/lenis';
import { createLenisRebaseAdapter } from '../../../src/scripts/LenisRebaseAdapter';

describe('LenisRebaseAdapter Regression Test', () => {
  it('should be compatible with @studio-freight/lenis 1.0.42 internal state', () => {
    const lenis = new Lenis();
    const adapter = createLenisRebaseAdapter(lenis);

    // 1. Contract check: Are internal fields present?
    expect(adapter.getAnimatedScroll()).toBeTypeOf('number');
    expect(adapter.getTargetScroll()).toBeTypeOf('number');
    expect(adapter.getVelocity()).toBeTypeOf('number');
  });

  it('should correctly shift internal state using offsetBy', () => {
    const lenis = new Lenis();
    
    // We need to cast to any to mock internal state for the test if we want to be precise,
    // or just rely on the real instance.
    const internalState = lenis as any;
    internalState.animatedScroll = 1000;
    internalState.targetScroll = 1200;
    
    // Mock setScroll to avoid side effects in test
    internalState.setScroll = vi.fn();

    const adapter = createLenisRebaseAdapter(lenis);
    const delta = -500;
    
    const nextAnimated = adapter.offsetBy(delta);

    expect(nextAnimated).toBe(500);
    expect(internalState.animatedScroll).toBe(500);
    expect(internalState.targetScroll).toBe(700);
    expect(internalState.setScroll).toHaveBeenCalledWith(500);
  });

  it('should manage __preventNextScrollEvent correctly', () => {
    const lenis = new Lenis();
    const adapter = createLenisRebaseAdapter(lenis);
    const internalState = lenis as any;

    expect(adapter.getPreventNextScrollEvent()).toBe(false);

    adapter.setPreventNextScrollEvent(true);
    expect(internalState.__preventNextScrollEvent).toBe(true);
    expect(adapter.getPreventNextScrollEvent()).toBe(true);

    adapter.setPreventNextScrollEvent(false);
    expect(internalState.__preventNextScrollEvent).toBeUndefined();
    expect(adapter.getPreventNextScrollEvent()).toBe(false);
  });
});
