import { MANIFOLD_CONSTANTS } from './ManifoldConstants';

export type ScreenQuadPoint = readonly [number, number];

export function easeInOutCubic(value: number): number {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

export function computeDampedLerp(deltaMs: number, envelope: number): number {
  return 1 - Math.exp(-(deltaMs / 1000) * envelope);
}

export function computeCardProjectionMatrix(
  width: number,
  height: number,
  topLeft: ScreenQuadPoint,
  topRight: ScreenQuadPoint,
  bottomRight: ScreenQuadPoint,
  bottomLeft: ScreenQuadPoint
): string | null {
  // Solve the 4-point homography that maps the source rectangle
  // [0..width] x [0..height] onto the target quad.
  //
  // `g` and `h` are the projective terms. When they are 0, the mapping is affine.
  // Non-zero values introduce the perspective divide needed to turn a rectangle into
  // an arbitrary convex quad in screen space.
  const x0 = topLeft[0];
  const y0 = topLeft[1];
  const x1 = topRight[0];
  const y1 = topRight[1];
  const x2 = bottomRight[0];
  const y2 = bottomRight[1];
  const x3 = bottomLeft[0];
  const y3 = bottomLeft[1];
  const dx1 = x1 - x2;
  const dy1 = y1 - y2;
  const dx2 = x3 - x2;
  const dy2 = y3 - y2;
  const dx3 = x0 - x1 + x2 - x3;
  const dy3 = y0 - y1 + y2 - y3;
  const determinant = dx1 * dy2 - dx2 * dy1;

  // A near-zero determinant means the quad is degenerate or numerically unstable:
  // corners are collapsing toward a line, overlapping, or otherwise cannot produce
  // a reliable homography. Returning null lets callers fade/cull that face instead.
  if (Math.abs(determinant) < MANIFOLD_CONSTANTS.TESSERACT_PHYSICS.determinantEpsilon) {
    return null;
  }

  const g = (dx3 * dy2 - dx2 * dy3) / determinant;
  const h = (dx1 * dy3 - dx3 * dy1) / determinant;
  // With g/h known, the remaining coefficients are solved analytically from the four
  // corner constraints and then written into CSS matrix3d form.
  const a = (x1 - x0 + g * x1) / width;
  const b = (x3 - x0 + h * x3) / height;
  const c = x0;
  const d = (y1 - y0 + g * y1) / width;
  const e = (y3 - y0 + h * y3) / height;
  const f = y0;
  const matrix = [a, d, 0, g / width, b, e, 0, h / height, 0, 0, 1, 0, c, f, 0, 1];

  return `matrix3d(${matrix.map((value) => (Number.isFinite(value) ? value.toFixed(8) : '0')).join(',')})`;
}

export function parseMatrix3d(matrix: string): Float32Array {
  return new Float32Array(matrix.replace('matrix3d(', '').replace(')', '').split(',').map(Number));
}

export function projectMatrix3dPoint(matrix: Float32Array, px: number, py: number): ScreenQuadPoint {
  const a = matrix[0]!;
  const b = matrix[4]!;
  const c = matrix[12]!;
  const d = matrix[1]!;
  const e = matrix[5]!;
  const f = matrix[13]!;
  const g = matrix[3]!;
  const h = matrix[7]!;
  const w = g * px + h * py + 1;

  return [(a * px + b * py + c) / w, (d * px + e * py + f) / w];
}
