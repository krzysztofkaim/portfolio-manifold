import { clamp } from '../utils/math';

interface NavigatorWithDeviceMemory extends Navigator {
  deviceMemory?: number;
}

/**
 * Manages adaptive rendering quality based on performance monitoring (FPS).
 * Adjusts Device Pixel Ratio (DPR) dynamically to maintain target performance.
 */
export class AdaptiveQuality {
  private readonly samples = new Float32Array(120);
  private sampleIndex = 0;
  private sampleCount = 0;
  private bootstrapChecked = false;
  private readonly maxDpr = Math.min(window.devicePixelRatio || 1, 2);
  currentDpr: number;

  constructor() {
    const mem = (navigator as NavigatorWithDeviceMemory).deviceMemory || 8;
    const cpu = navigator.hardwareConcurrency || 8;
    
    // Heuristic: Start at lower quality on low-end hardware to ensure smooth initial experience
    this.currentDpr = (mem <= 4 || cpu <= 4) ? Math.max(0.75, this.maxDpr * 0.8) : this.maxDpr;
  }

  /**
   * Updates performance metrics and determines if quality adjustment is needed.
   *
   * @param deltaMs - Time elapsed since the last frame in milliseconds
   * @returns True if quality was adjusted, false otherwise
   */
  tick(deltaMs: number): boolean {
    this.samples[this.sampleIndex] = deltaMs;
    this.sampleIndex = (this.sampleIndex + 1) % this.samples.length;
    this.sampleCount = Math.min(this.sampleCount + 1, this.samples.length);

    // BOOTSTRAP PATH: After first 15 samples, throttle immediately if performing poorly
    if (!this.bootstrapChecked && this.sampleCount === 15) {
      this.bootstrapChecked = true;
      let initialTotal = 0;
      for (let i = 0; i < 15; i++) initialTotal += this.samples[i];
      const initialFps = 15000 / initialTotal;

      if (initialFps < 30) {
        this.currentDpr = Math.max(0.5, this.currentDpr - 0.5);
        this.sampleCount = 0; // Reset metrics to start fresh with adjusted quality
        this.sampleIndex = 0;
        return true;
      }
    }

    if (this.sampleCount < this.samples.length) {
      return false;
    }

    let total = 0;
    for (let index = 0; index < this.samples.length; index += 1) {
      total += this.samples[index];
    }

    const averageMs = total / this.samples.length;
    const averageFps = averageMs > 0 ? 1000 / averageMs : 60;
    let nextDpr = this.currentDpr;

    if (averageFps < 24) {
      nextDpr = Math.max(0.5, this.currentDpr - 0.5);
    } else if (averageFps < 35) {
      nextDpr = Math.max(0.75, this.currentDpr - 0.25);
    } else if (averageFps > 55) {
      nextDpr = Math.min(this.maxDpr, this.currentDpr + 0.25);
    }

    nextDpr = clamp(nextDpr, 0.5, this.maxDpr);

    if (Math.abs(nextDpr - this.currentDpr) < 0.001) {
      return false;
    }

    this.currentDpr = nextDpr;
    return true;
  }
}
