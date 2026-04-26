import { describe, expect, it } from 'vitest';
import {
  computeCardProjectionMatrix,
  computeDampedLerp,
  easeInOutCubic,
  parseMatrix3d,
  projectMatrix3dPoint
} from '../../../../src/experience/manifold/HyperMath';

function expectPointCloseTo(
  actual: readonly [number, number],
  expected: readonly [number, number],
  precision = 4
): void {
  expect(actual[0]).toBeCloseTo(expected[0], precision);
  expect(actual[1]).toBeCloseTo(expected[1], precision);
}

describe('HyperMath', () => {
  it('easeInOutCubic is symmetric and continuous around midpoint', () => {
    const left = easeInOutCubic(0.25);
    const right = easeInOutCubic(0.75);

    expect(left).toBeCloseTo(1 - right, 8);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 8);
  });

  it('computeDampedLerp approaches 0 for tiny dt and 1 for huge dt', () => {
    expect(computeDampedLerp(0.0001, 5)).toBeCloseTo(0, 4);
    expect(computeDampedLerp(100000, 5)).toBeCloseTo(1, 6);
  });

  it('computeDampedLerp is monotonic for larger deltas and stronger envelopes', () => {
    expect(computeDampedLerp(16, 5)).toBeLessThan(computeDampedLerp(32, 5));
    expect(computeDampedLerp(16, 2)).toBeLessThan(computeDampedLerp(16, 8));
  });

  it('computeCardProjectionMatrix returns null for degenerate quads', () => {
    expect(
      computeCardProjectionMatrix(100, 100, [0, 0], [1, 1], [2, 2], [3, 3])
    ).toBeNull();
  });

  it('projects a square into a matching matrix and round-trips points', () => {
    const matrix = computeCardProjectionMatrix(100, 100, [10, 20], [110, 20], [110, 120], [10, 120]);

    expect(matrix).not.toBeNull();

    const parsed = parseMatrix3d(matrix!);
    expectPointCloseTo(projectMatrix3dPoint(parsed, 0, 0), [10, 20]);
    expectPointCloseTo(projectMatrix3dPoint(parsed, 100, 0), [110, 20]);
    expectPointCloseTo(projectMatrix3dPoint(parsed, 100, 100), [110, 120]);
    expectPointCloseTo(projectMatrix3dPoint(parsed, 0, 100), [10, 120]);
  });

  it('returns an affine matrix for translated rectangles with no perspective divide', () => {
    const matrix = computeCardProjectionMatrix(200, 80, [30, 40], [230, 40], [230, 120], [30, 120]);

    expect(matrix).not.toBeNull();

    const parsed = parseMatrix3d(matrix!);
    expect(parsed[3]).toBeCloseTo(0, 8);
    expect(parsed[7]).toBeCloseTo(0, 8);
    expectPointCloseTo(projectMatrix3dPoint(parsed, 50, 20), [80, 60]);
    expectPointCloseTo(projectMatrix3dPoint(parsed, 200, 80), [230, 120]);
  });

  it('maps interior points consistently for a perspective trapezoid', () => {
    const matrix = computeCardProjectionMatrix(100, 100, [10, 10], [130, 20], [110, 130], [20, 110]);

    expect(matrix).not.toBeNull();

    const parsed = parseMatrix3d(matrix!);
    expectPointCloseTo(projectMatrix3dPoint(parsed, 0, 0), [10, 10]);
    expectPointCloseTo(projectMatrix3dPoint(parsed, 100, 0), [130, 20]);
    expectPointCloseTo(projectMatrix3dPoint(parsed, 100, 100), [110, 130]);
    expectPointCloseTo(projectMatrix3dPoint(parsed, 0, 100), [20, 110]);

    const center = projectMatrix3dPoint(parsed, 50, 50);
    expect(center[0]).toBeGreaterThan(20);
    expect(center[0]).toBeLessThan(110);
    expect(center[1]).toBeGreaterThan(10);
    expect(center[1]).toBeLessThan(130);
  });

  it('stays finite for quads that are close to the degeneracy threshold', () => {
    const matrix = computeCardProjectionMatrix(100, 100, [0, 0], [100, 0], [100.01, 0.011], [0, 0.01]);

    expect(matrix).not.toBeNull();

    const parsed = parseMatrix3d(matrix!);
    parsed.forEach((value) => {
      expect(Number.isFinite(value)).toBe(true);
    });
  });
});
