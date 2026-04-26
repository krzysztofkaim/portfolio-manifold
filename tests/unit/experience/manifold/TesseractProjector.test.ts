import { describe, expect, it } from 'vitest';
import {
  TesseractProjector,
  projectHyperVertex,
  rotateTesseractVertex
} from '../../../../src/experience/manifold/TesseractProjector';
import { MANIFOLD_CONSTANTS } from '../../../../src/experience/manifold/ManifoldConstants';

function norm4([x, y, z, w]: readonly [number, number, number, number]): number {
  return x * x + y * y + z * z + w * w;
}

function expectVectorCloseTo(
  actual: readonly number[],
  expected: readonly number[],
  precision = 8
): void {
  expect(actual).toHaveLength(expected.length);

  actual.forEach((value, index) => {
    expect(value).toBeCloseTo(expected[index]!, precision);
  });
}

describe('TesseractProjector', () => {
  it('rotateTesseractVertex is identity at zero angles and preserves 4D norm', () => {
    const vertex: readonly [number, number, number, number] = [1, -1, 1, -1];

    expect(rotateTesseractVertex(vertex, 0, 0, 0, 0)).toEqual(vertex);

    const rotated = rotateTesseractVertex(vertex, 0.3, 0.5, 0.7, 0.9);
    expect(norm4(rotated)).toBeCloseTo(norm4(vertex), 8);
  });

  it('exposes 16 vertices consisting only of plus/minus ones', () => {
    expect(TesseractProjector.vertices).toHaveLength(16);

    for (const vertex of TesseractProjector.vertices) {
      expect(vertex.every((value) => value === -1 || value === 1)).toBe(true);
    }
  });

  it('exposes 32 edges and each edge differs in exactly one coordinate', () => {
    expect(TesseractProjector.edges).toHaveLength(32);

    for (const [leftIndex, rightIndex] of TesseractProjector.edges) {
      const left = TesseractProjector.vertices[leftIndex]!;
      const right = TesseractProjector.vertices[rightIndex]!;
      const diffs = left.filter((value, axis) => value !== right[axis]).length;
      expect(diffs).toBe(1);
    }
  });

  it('reuses cached scene for identical inputs', () => {
    const input = {
      fourDProgress: 1,
      scroll: 0,
      time: 1000,
      turns: 0.25,
      viewportSize: { width: 800, height: 600 }
    } as const;

    const first = TesseractProjector.computeScene(input);
    const second = TesseractProjector.computeScene(input);

    expect(second).toBe(first);
  });

  it('rotation is periodic over full turns on each plane', () => {
    const vertex: readonly [number, number, number, number] = [1, -1, 1, -1];
    const fullTurn = Math.PI * 2;

    expectVectorCloseTo(rotateTesseractVertex(vertex, fullTurn, 0, 0, 0), vertex);
    expectVectorCloseTo(rotateTesseractVertex(vertex, 0, fullTurn, 0, 0), vertex);
    expectVectorCloseTo(rotateTesseractVertex(vertex, 0, 0, fullTurn, 0), vertex);
    expectVectorCloseTo(rotateTesseractVertex(vertex, 0, 0, 0, fullTurn), vertex);
  });

  it('rotates each plane independently with expected quarter-turn behavior', () => {
    const quarterTurn = Math.PI / 2;

    expectVectorCloseTo(rotateTesseractVertex([1, 0, 0, 0], quarterTurn, 0, 0, 0), [0, 0, 0, 1]);
    expectVectorCloseTo(rotateTesseractVertex([0, 1, 0, 0], 0, quarterTurn, 0, 0), [0, 0, 1, 0]);
    expectVectorCloseTo(rotateTesseractVertex([0, 0, 1, 0], 0, 0, quarterTurn, 0), [0, 0, 0, 1]);
    expectVectorCloseTo(rotateTesseractVertex([1, 0, 0, 0], 0, 0, 0, quarterTurn), [0, 1, 0, 0]);
  });

  it('projectHyperVertex clamps lens denominators to finite screen coordinates', () => {
    const projected = projectHyperVertex(
      [1, 1, MANIFOLD_CONSTANTS.TESSERACT_PHYSICS.zLensOrigin, MANIFOLD_CONSTANTS.TESSERACT_PHYSICS.wLensOrigin],
      320,
      240,
      180
    );

    expect(Number.isFinite(projected.x)).toBe(true);
    expect(Number.isFinite(projected.y)).toBe(true);
    expect(Number.isFinite(projected.z3)).toBe(true);
    expect(projected.x).toBeGreaterThan(320);
    expect(projected.y).toBeGreaterThan(240);
  });

  it('computeScene returns sorted edges and face z-indices covering the full face set', () => {
    const scene = TesseractProjector.computeScene({
      fourDProgress: 1,
      scroll: 0,
      time: 400,
      turns: 0.125,
      viewportSize: { width: 1280, height: 720 }
    });

    expect(scene.edgeStates).toHaveLength(TesseractProjector.edges.length);
    expect(scene.faceStates).toHaveLength(TesseractProjector.faces.length);

    for (let index = 1; index < scene.edgeStates.length; index += 1) {
      expect(scene.edgeStates[index]!.z).toBeGreaterThanOrEqual(scene.edgeStates[index - 1]!.z);
    }

    const zIndices = scene.faceStates
      .map((face) => face.zIndex)
      .sort((left, right) => left - right);

    expect(zIndices[0]).toBe(MANIFOLD_CONSTANTS.TESSERACT_PHYSICS.faceZIndexBase);
    expect(zIndices.at(-1)).toBe(
      MANIFOLD_CONSTANTS.TESSERACT_PHYSICS.faceZIndexBase + TesseractProjector.faces.length - 1
    );
    expect(new Set(zIndices).size).toBe(TesseractProjector.faces.length);
  });

  it('scales face alpha down with fourDProgress while keeping it clamped', () => {
    const visibleScene = TesseractProjector.computeScene({
      fourDProgress: 1,
      scroll: 0,
      time: 250,
      turns: 0.2,
      viewportSize: { width: 1024, height: 768 }
    });
    const fadedScene = TesseractProjector.computeScene({
      fourDProgress: 0.25,
      scroll: 0,
      time: 250,
      turns: 0.2,
      viewportSize: { width: 1024, height: 768 }
    });

    visibleScene.faceStates.forEach((face, index) => {
      const fadedFace = fadedScene.faceStates[index]!;
      expect(fadedFace.alpha).toBeLessThanOrEqual(face.alpha);
      expect(fadedFace.alpha).toBeGreaterThanOrEqual(0.06);
      expect(fadedFace.alpha).toBeLessThanOrEqual(0.98);
    });
  });
});
