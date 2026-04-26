/** @vitest-environment happy-dom */
import { beforeEach, describe, expect, it } from 'vitest';
import { AdaptiveQuality } from '../../../src/engine/AdaptiveQuality';

describe('AdaptiveQuality', () => {
  let quality: AdaptiveQuality;

  beforeEach(() => {
    // Reset devicePixelRatio to a known value
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 2,
      configurable: true
    });
    quality = new AdaptiveQuality();
  });

  it('initializes with device pixel ratio (capped at 2)', () => {
    expect(quality.currentDpr).toBeLessThanOrEqual(2);
    expect(quality.currentDpr).toBeGreaterThan(0);
  });

  it('returns false until enough samples are collected', () => {
    // 120 is the samples length
    for (let i = 0; i < 119; i++) {
      expect(quality.tick(16)).toBe(false);
    }
  });

  it('calculates average and maintains DPR if FPS is stable', () => {
    // Fill 120 samples with 16.6ms (60 FPS)
    for (let i = 0; i < 119; i++) {
      quality.tick(16.6);
    }
    // 120th sample
    expect(quality.tick(16.6)).toBe(false); // No change if FPS > 55 and already at max
  });

  it('decreases DPR if FPS is low (< 24)', () => {
    // Start at DPR 2
    quality.currentDpr = 2;
    // Bootstrap path should react after the first 15 slow samples.
    for (let i = 0; i < 14; i++) {
      expect(quality.tick(50)).toBe(false);
    }
    const result = quality.tick(50);
    expect(result).toBe(true);
    expect(quality.currentDpr).toBe(1.5); // 2.0 - 0.5
  });

  it('runs the bootstrap quality throttle only once', () => {
    quality.currentDpr = 2;

    for (let i = 0; i < 15; i++) {
      quality.tick(50);
    }
    expect(quality.currentDpr).toBe(1.5);

    for (let i = 0; i < 30; i++) {
      quality.tick(50);
    }
    expect(quality.currentDpr).toBe(1.5);
  });

  it('decreases DPR if FPS is moderate (< 35)', () => {
    // Start at DPR 2
    quality.currentDpr = 2;
    // Fill with moderate frames (33ms = 30 FPS)
    for (let i = 0; i < 119; i++) {
      quality.tick(33.3);
    }
    const result = quality.tick(33.3);
    expect(result).toBe(true);
    expect(quality.currentDpr).toBe(1.75); // 2.0 - 0.25
  });

  it('increases DPR if FPS is high (> 55) and currently reduced', () => {
    // Start at DPR 1
    quality.currentDpr = 1;
    // Fill with fast frames (10ms = 100 FPS)
    for (let i = 0; i < 119; i++) {
      quality.tick(10);
    }
    const result = quality.tick(10);
    expect(result).toBe(true);
    expect(quality.currentDpr).toBe(1.25); // 1.0 + 0.25
  });

  it('clumps DPR to 0.5 minimum', () => {
    // Force low DPR
    quality.currentDpr = 0.5;
    // Fill with slow frames
    for (let i = 0; i < 120; i++) {
      quality.tick(100);
    }
    expect(quality.currentDpr).toBe(0.5);
  });

  it('handles averageMs being 0', () => {
    for (let i = 0; i < 120; i++) {
      quality.tick(0);
    }
    // Result should be 60 FPS (line 25), no change if already at max
    expect(quality.currentDpr).toBeGreaterThan(0);
  });

  it('maintains DPR if FPS is in middle range (35-55)', () => {
    quality.currentDpr = 1.0;
    // Fill with 25ms frames (40 FPS)
    for (let i = 0; i < 120; i++) {
      quality.tick(25);
    }
    expect(quality.currentDpr).toBe(1.0);
  });

  it('handles low device pixel ratio correctly', () => {
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 0.8,
      configurable: true
    });
    const lowQuality = new AdaptiveQuality();
    expect((lowQuality as any).maxDpr).toBe(0.8);
  });

  it('handles undefined device pixel ratio', () => {
    Object.defineProperty(window, 'devicePixelRatio', {
      get: () => undefined,
      configurable: true
    });
    const fallbackQuality = new AdaptiveQuality();
    expect((fallbackQuality as any).maxDpr).toBe(1);
  });
});
