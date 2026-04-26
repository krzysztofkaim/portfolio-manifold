/**
 * Clamps a number between a minimum and maximum value.
 *
 * @param value - The value to clamp
 * @param min - The lower bound
 * @param max - The upper bound
 * @returns The clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linearly interpolates between two numbers.
 *
 * @param start - The start value
 * @param end - The end value
 * @param alpha - The interpolation factor (typically 0-1)
 * @returns The interpolated value
 */
export function lerp(start: number, end: number, alpha: number): number {
  return start + (end - start) * alpha;
}

/**
 * Performs smooth Hermite interpolation between 0 and 1.
 *
 * @param edge0 - The lower edge
 * @param edge1 - The upper edge
 * @param value - The input value
 * @returns The interpolated value
 */
export function smoothstep(edge0: number, edge1: number, value: number): number {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

/**
 * Maps a value from one range to another.
 *
 * @param value - The value to remap
 * @param inMin - The input range minimum
 * @param inMax - The input range maximum
 * @param outMin - The output range minimum
 * @param outMax - The output range maximum
 * @returns The remapped value
 */
export function remap(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  if (inMax === inMin) {
    return outMin;
  }

  const normalized = (value - inMin) / (inMax - inMin);
  return lerp(outMin, outMax, normalized);
}
