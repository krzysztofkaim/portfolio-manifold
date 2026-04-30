export interface BlobConfig {
  color: string;
  composite: GlobalCompositeOperation;
  radius: number;
  alpha: number;
  speedX: number;
  speedY: number;
  phaseX: number;
  phaseY: number;
  amplitudeX: number;
  amplitudeY: number;
}

interface BlobRuntimeConfig extends BlobConfig {
  rgb: { b: number; g: number; r: number };
}

const SCHEME_ONE_BLOBS: readonly BlobConfig[] = [
  {
    color: '#f15a22',
    composite: 'screen',
    radius: 0.66,
    alpha: 0.34,
    speedX: 0.08,
    speedY: 0.06,
    phaseX: 0.2,
    phaseY: 0.6,
    amplitudeX: 0.26,
    amplitudeY: 0.34
  },
  {
    color: '#ff8a4a',
    composite: 'screen',
    radius: 0.54,
    alpha: 0.24,
    speedX: 0.06,
    speedY: 0.1,
    phaseX: 1.4,
    phaseY: 0.4,
    amplitudeX: 0.32,
    amplitudeY: 0.22
  },
  {
    color: '#f38c52',
    composite: 'screen',
    radius: 0.46,
    alpha: 0.16,
    speedX: 0.11,
    speedY: 0.08,
    phaseX: 2.2,
    phaseY: 1.3,
    amplitudeX: 0.2,
    amplitudeY: 0.26
  },
  {
    color: '#101b46',
    composite: 'source-over',
    radius: 0.82,
    alpha: 0.28,
    speedX: 0.05,
    speedY: 0.04,
    phaseX: 2.8,
    phaseY: 0.9,
    amplitudeX: 0.22,
    amplitudeY: 0.2
  },
  {
    color: '#081228',
    composite: 'multiply',
    radius: 0.74,
    alpha: 0.2,
    speedX: 0.08,
    speedY: 0.07,
    phaseX: 0.8,
    phaseY: 2.2,
    amplitudeX: 0.18,
    amplitudeY: 0.24
  },
  {
    color: '#ffb36b',
    composite: 'screen',
    radius: 0.34,
    alpha: 0.12,
    speedX: 0.13,
    speedY: 0.1,
    phaseX: 1.7,
    phaseY: 2.6,
    amplitudeX: 0.14,
    amplitudeY: 0.16
  }
] as const;

const SCHEME_ONE_BLOB_RUNTIME: readonly BlobRuntimeConfig[] = SCHEME_ONE_BLOBS.map((blob) => ({
  ...blob,
  rgb: hexToRgb(blob.color)
}));

export class LiquidGradientKernel {
  private readonly pointer = { x: 0.5, y: 0.5 };
  private quality = 0.44;
  private width = 0;
  private height = 0;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private baseGradient: CanvasGradient | null = null;
  private vignetteGradient: CanvasGradient | null = null;

  constructor(
    private readonly canvas:
      | HTMLCanvasElement
      | OffscreenCanvas,
    private readonly context:
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D,
    private readonly maxBlobs = SCHEME_ONE_BLOB_RUNTIME.length
  ) {
    this.context.imageSmoothingEnabled = true;
  }

  setQuality(scale: number): boolean {
    const nextQuality = clamp(scale, 0.3, 0.56);

    if (Math.abs(nextQuality - this.quality) < 0.02) {
      return false;
    }

    this.quality = nextQuality;
    return true;
  }

  resize(viewportWidth: number, viewportHeight: number): void {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.width = Math.max(240, Math.round(this.viewportWidth * this.quality));
    this.height = Math.max(180, Math.round(this.viewportHeight * this.quality));
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.baseGradient = null;
    this.vignetteGradient = null;
  }

  render(time: number, scrollVelocity: number): void {
    if (this.width === 0 || this.height === 0) {
      return;
    }

    const t = time * 0.00032;
    const velocityInfluence = clamp(Math.abs(scrollVelocity) / 2.5, 0, 1);
    this.pointer.x += (0.5 - this.pointer.x) * 0.04;
    this.pointer.y += (0.5 - this.pointer.y) * 0.04;

    this.context.globalCompositeOperation = 'source-over';
    this.context.clearRect(0, 0, this.width, this.height);
    this.context.fillStyle = this.getBaseGradient();
    this.context.fillRect(0, 0, this.width, this.height);

    for (let index = 0; index < Math.min(SCHEME_ONE_BLOB_RUNTIME.length, this.maxBlobs); index += 1) {
      const blob = SCHEME_ONE_BLOB_RUNTIME[index];
      if (!blob) {
        continue;
      }

      const nx =
        0.5 +
        Math.sin(t * (blob.speedX * 10) + blob.phaseX) * blob.amplitudeX +
        (this.pointer.x - 0.5) * (blob.composite === 'multiply' ? -0.12 : 0.18);
      const ny =
        0.5 +
        Math.cos(t * (blob.speedY * 10) + blob.phaseY) * blob.amplitudeY +
        (this.pointer.y - 0.5) * (blob.composite === 'multiply' ? -0.08 : 0.14);

      this.drawBlob(
        clamp(nx, -0.15, 1.15) * this.width,
        clamp(ny, -0.15, 1.15) * this.height,
        blob.radius * Math.min(this.width, this.height) * (1 + velocityInfluence * 0.04),
        blob.rgb,
        blob.alpha,
        blob.composite
      );
    }

    this.drawVignette();
  }

  private getBaseGradient(): CanvasGradient {
    if (!this.baseGradient) {
      const gradient = this.context.createLinearGradient(0, 0, this.width, this.height);
      gradient.addColorStop(0, '#081125');
      gradient.addColorStop(0.38, '#0a0e27');
      gradient.addColorStop(0.7, '#0d1431');
      gradient.addColorStop(1, '#111224');
      this.baseGradient = gradient;
    }

    return this.baseGradient;
  }

  private drawBlob(
    x: number,
    y: number,
    radius: number,
    rgb: { b: number; g: number; r: number },
    alpha: number,
    composite: GlobalCompositeOperation
  ): void {
    const gradient = this.context.createRadialGradient(x, y, radius * 0.06, x, y, radius);
    gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.72})`);
    gradient.addColorStop(0.18, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.48})`);
    gradient.addColorStop(0.52, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.18})`);
    gradient.addColorStop(0.82, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.04})`);
    gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);

    this.context.globalCompositeOperation = composite;
    this.context.fillStyle = gradient;
    this.context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  private drawVignette(): void {
    if (!this.vignetteGradient) {
      this.vignetteGradient = this.context.createRadialGradient(
        this.width * 0.5,
        this.height * 0.5,
        Math.min(this.width, this.height) * 0.15,
        this.width * 0.5,
        this.height * 0.5,
        Math.max(this.width, this.height) * 0.86
      );

      this.vignetteGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      this.vignetteGradient.addColorStop(0.7, 'rgba(2, 4, 12, 0.12)');
      this.vignetteGradient.addColorStop(1, 'rgba(2, 4, 12, 0.42)');
    }

    this.context.globalCompositeOperation = 'source-over';
    this.context.fillStyle = this.vignetteGradient;
    this.context.fillRect(0, 0, this.width, this.height);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = hex.replace('#', '');
  const normalized = value.length === 3 ? value.split('').map((char) => `${char}${char}`).join('') : value;
  const parsed = Number.parseInt(normalized, 16);

  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255
  };
}
