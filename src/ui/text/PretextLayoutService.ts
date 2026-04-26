import {
  clearCache as clearPretextCache,
  prepareWithSegments,
  walkLineRanges,
  type PreparedTextWithSegments
} from '@chenglou/pretext';

type HintVariant = 'context' | 'intro';
type HintViewport = 'desktop' | 'mobile';

interface HintMeasureInput {
  readonly kicker: string;
  readonly title: string;
  readonly variant: HintVariant;
  readonly viewport: HintViewport;
}

interface AudioButtonMeasureInput {
  readonly mobile: boolean;
  readonly text: string;
}

interface BoxMetrics {
  readonly fontRem: number;
  readonly letterSpacingEm: number;
}

interface HintViewportMetrics {
  readonly heightPx: number;
  readonly kicker: BoxMetrics;
  readonly minWidthPx: number;
  readonly paddingXRem: number;
  readonly title: BoxMetrics;
}

interface PreparedCacheEntry {
  readonly graphemeCount: number;
  readonly prepared: PreparedTextWithSegments;
}

interface SizeMeasurement {
  readonly height: number;
  readonly width: number;
}

const PRETEXT_FONT_FAMILY = "'JetBrains Mono', monospace";
const PRETEXT_SINGLE_LINE_SPAN_PX = 4096;
const PRETEXT_FALLBACK_ROOT_FONT_PX = 16;

const HINT_LAYOUT_METRICS: Readonly<Record<HintVariant, Readonly<Record<HintViewport, HintViewportMetrics>>>> = {
  intro: {
    desktop: {
      minWidthPx: 238,
      heightPx: 78,
      paddingXRem: 0.8,
      kicker: {
        fontRem: 0.56,
        letterSpacingEm: 0.18
      },
      title: {
        fontRem: 0.72,
        letterSpacingEm: 0.18
      }
    },
    mobile: {
      minWidthPx: 170,
      heightPx: 58,
      paddingXRem: 0.58,
      kicker: {
        fontRem: 0.56,
        letterSpacingEm: 0.18
      },
      title: {
        fontRem: 0.58,
        letterSpacingEm: 0.18
      }
    }
  },
  context: {
    desktop: {
      minWidthPx: 216,
      heightPx: 72,
      paddingXRem: 0.74,
      kicker: {
        fontRem: 0.56,
        letterSpacingEm: 0.18
      },
      title: {
        fontRem: 0.64,
        letterSpacingEm: 0.16
      }
    },
    mobile: {
      minWidthPx: 172,
      heightPx: 56,
      paddingXRem: 0.58,
      kicker: {
        fontRem: 0.56,
        letterSpacingEm: 0.18
      },
      title: {
        fontRem: 0.64,
        letterSpacingEm: 0.16
      }
    }
  }
};

const AUDIO_BUTTON_METRICS = {
  desktop: {
    borderPx: 2,
    fontRem: 0.68,
    gapRem: 0.46,
    iconWidthRem: 0.92,
    letterSpacingEm: 0.14,
    paddingLeftRem: 0.74,
    paddingRightRem: 0.9
  },
  mobileFixedRem: 2.35
} as const;

class PretextLayoutService {
  private readonly preparedCache = new Map<string, PreparedCacheEntry>();
  private readonly sizeCache = new Map<string, SizeMeasurement>();
  private rootFontPx = PRETEXT_FALLBACK_ROOT_FONT_PX;

  syncRootFontPx(): void {
    if (typeof window === 'undefined') {
      this.rootFontPx = PRETEXT_FALLBACK_ROOT_FONT_PX;
      return;
    }

    const nextFontPx = Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize);
    const resolvedFontPx =
      Number.isFinite(nextFontPx) && nextFontPx > 0 ? nextFontPx : PRETEXT_FALLBACK_ROOT_FONT_PX;
    // Tolerance of 0.5px avoids cache-busting on micro browser-zoom changes.
    if (Math.abs(resolvedFontPx - this.rootFontPx) >= 0.5) {
      this.rootFontPx = resolvedFontPx;
      this.clear();
      return;
    }

    this.rootFontPx = resolvedFontPx;
  }

  clear(): void {
    this.preparedCache.clear();
    this.sizeCache.clear();
    clearPretextCache();
  }

  measureHintCopy(input: HintMeasureInput): SizeMeasurement {
    const cacheKey = `hint::${input.variant}::${input.viewport}::${input.kicker}::${input.title}::${this.rootFontPx}`;
    const cached = this.sizeCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const viewportMetrics = HINT_LAYOUT_METRICS[input.variant][input.viewport];
    const paddingX = this.toPx(viewportMetrics.paddingXRem) * 2;
    const kickerWidth = this.measureTrackedText(
      input.kicker,
      viewportMetrics.kicker.fontRem,
      400,
      viewportMetrics.kicker.letterSpacingEm
    );
    const titleWidth = this.measureTrackedText(
      input.title,
      viewportMetrics.title.fontRem,
      700,
      viewportMetrics.title.letterSpacingEm
    );
    const measuredWidth = Math.ceil(Math.max(kickerWidth, titleWidth) + paddingX);

    const measurement = {
      width: Math.max(viewportMetrics.minWidthPx, measuredWidth),
      height: viewportMetrics.heightPx
    };
    this.sizeCache.set(cacheKey, measurement);
    return measurement;
  }

  measureAudioButtonWidth(input: AudioButtonMeasureInput): number {
    if (input.mobile) {
      return Math.ceil(this.toPx(AUDIO_BUTTON_METRICS.mobileFixedRem));
    }

    const cacheKey = `audio::${input.mobile ? 'mobile' : 'desktop'}::${input.text}::${this.rootFontPx}`;
    const cached = this.sizeCache.get(cacheKey);
    if (cached) {
      return cached.width;
    }

    const labelWidth = this.measureTrackedText(
      input.text,
      AUDIO_BUTTON_METRICS.desktop.fontRem,
      400,
      AUDIO_BUTTON_METRICS.desktop.letterSpacingEm
    );
    const chromeWidth =
      this.toPx(AUDIO_BUTTON_METRICS.desktop.paddingLeftRem + AUDIO_BUTTON_METRICS.desktop.paddingRightRem) +
      this.toPx(AUDIO_BUTTON_METRICS.desktop.iconWidthRem + AUDIO_BUTTON_METRICS.desktop.gapRem) +
      AUDIO_BUTTON_METRICS.desktop.borderPx;

    const measurement = {
      width: Math.ceil(labelWidth + chromeWidth),
      height: 0
    };
    this.sizeCache.set(cacheKey, measurement);
    return measurement.width;
  }

  private measureTrackedText(
    text: string,
    fontRem: number,
    fontWeight: number,
    letterSpacingEm: number
  ): number {
    if (!text) {
      return 0;
    }

    const fontPx = this.toPx(fontRem);
    const prepared = this.getPreparedEntry(text, this.createFontShorthand(fontPx, fontWeight));
    let naturalWidth = 0;

    walkLineRanges(prepared.prepared, PRETEXT_SINGLE_LINE_SPAN_PX, (line) => {
      if (line.width > naturalWidth) {
        naturalWidth = line.width;
      }
    });

    const trackingWidth =
      Math.max(0, prepared.graphemeCount - 1) * fontPx * letterSpacingEm;

    return naturalWidth + trackingWidth;
  }

  private getPreparedEntry(text: string, font: string): PreparedCacheEntry {
    const cacheKey = `${font}::${text}`;
    const cached = this.preparedCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const prepared: PreparedCacheEntry = {
      prepared: prepareWithSegments(text, font),
      graphemeCount: Array.from(text).length
    };
    this.preparedCache.set(cacheKey, prepared);
    return prepared;
  }

  private createFontShorthand(fontPx: number, fontWeight: number): string {
    return `${fontWeight} ${fontPx.toFixed(3)}px ${PRETEXT_FONT_FAMILY}`;
  }

  private toPx(rem: number): number {
    return rem * this.rootFontPx;
  }
}

export const pretextLayoutService = new PretextLayoutService();
