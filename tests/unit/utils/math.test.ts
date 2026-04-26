import { describe, expect, it } from 'vitest';
import { clamp, lerp, smoothstep, remap } from '../../../src/utils/math';

describe('math utilities', () => {
  describe('clamp', () => {
    it('returns value if within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });
    it('returns min if value is below range', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });
    it('returns max if value is above range', () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('lerp', () => {
    it('interpolates correctly', () => {
      expect(lerp(0, 10, 0.5)).toBe(5);
      expect(lerp(10, 20, 0.1)).toBe(11);
    });
  });

  describe('smoothstep', () => {
    it('returns 0 for values below edge0', () => {
      expect(smoothstep(0, 1, -1)).toBe(0);
    });
    it('returns 1 for values above edge1', () => {
      expect(smoothstep(0, 1, 2)).toBe(1);
    });
    it('returns 0.5 at midpoint', () => {
      expect(smoothstep(0, 1, 0.5)).toBe(0.5);
    });
  });

  describe('remap', () => {
    it('remaps values correctly', () => {
      expect(remap(5, 0, 10, 0, 100)).toBe(50);
      expect(remap(0.5, 0, 1, 10, 20)).toBe(15);
    });
    it('returns outMin if inMin === inMax to avoid division by zero', () => {
      expect(remap(5, 10, 10, 50, 100)).toBe(50);
    });
  });
});
