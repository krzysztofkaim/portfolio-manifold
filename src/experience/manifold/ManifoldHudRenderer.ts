import { MANIFOLD_CONSTANTS } from './ManifoldConstants';
import type { HudCoordinateSample, HudElements } from './ManifoldTypes';

const HUD_COORD_AXES = ['X', 'Y', 'Z', 'W'] as const;
const SECTION_SCRAMBLE_CHARS = '#<>/01';
const INITIAL_SECTION_PROMPT = 'SCROLL';
const INITIAL_SECTION_REVEAL_DELAY_MS = 420;
const SECTION_SCRAMBLE_DURATION_MS = 280;

export interface ManifoldHudFocus {
  card: string;
  section: string;
}

export interface ManifoldHudSnapshot {
  coordinates: readonly HudCoordinateSample[];
  focus: ManifoldHudFocus;
  fps: string;
  now: number;
  perfModeLabel: string;
  velocity: string;
}

interface ManifoldHudLocaleConfig {
  performanceMode: (modeLabel: string) => string;
  scrollPrompt: string;
}

export class ManifoldHudRenderer {
  private performanceModeLabel = 'FULL RATE';
  private pendingPerformanceModeLabel: string | null = null;
  private pendingPerformanceModeSince = 0;
  private lastFps = '';
  private lastPerf = '';
  private lastVelocity = '';
  private lastCoord = '';
  private lastSection = '';
  private lastCard = '';
  private initialSectionPromptActive = true;
  private pendingSectionTarget = 'PROFILE';
  private sectionRevealTimeout = 0;
  private sectionScrambleRaf = 0;
  private sectionScrambleToken = 0;
  private temporaryFocusCard = '';
  private temporaryFocusSection = '';
  private temporaryFocusUntil = 0;
  private localeConfig: ManifoldHudLocaleConfig = {
    performanceMode: (modeLabel) => modeLabel,
    scrollPrompt: INITIAL_SECTION_PROMPT
  };
  private readonly hudCoordNodes: Record<(typeof HUD_COORD_AXES)[number], { label: HTMLElement; value: HTMLElement }>;

  constructor(private readonly elements: HudElements) {
    this.hudCoordNodes = this.initializeCoordinateReadout();
    this.lastSection = this.localeConfig.scrollPrompt;
  }

  setLocale(config: ManifoldHudLocaleConfig): void {
    const previousPerformanceMode = this.performanceModeLabel;
    this.localeConfig = config;
    this.performanceModeLabel = config.performanceMode(previousPerformanceMode);
    this.pendingPerformanceModeLabel = this.pendingPerformanceModeLabel
      ? config.performanceMode(this.pendingPerformanceModeLabel)
      : null;
    if (this.lastPerf) {
      this.lastPerf = config.performanceMode(this.lastPerf);
      this.elements.perfMode.textContent = this.lastPerf;
    }
    if (!this.initialSectionPromptActive) {
      return;
    }

    this.lastSection = config.scrollPrompt;
    this.elements.section.textContent = config.scrollPrompt;
    this.elements.section.dataset.text = config.scrollPrompt;
  }

  render(snapshot: ManifoldHudSnapshot): void {
    const nextPerf = this.resolvePerformanceModeLabel(this.localeConfig.performanceMode(snapshot.perfModeLabel), snapshot.now);
    const nextCoordKey = this.serializeHudCoordinateSamples(snapshot.coordinates);

    if (snapshot.fps !== this.lastFps) {
      this.elements.fps.textContent = snapshot.fps;
      this.lastFps = snapshot.fps;
    }

    if (nextPerf !== this.lastPerf) {
      this.elements.perfMode.textContent = nextPerf;
      this.lastPerf = nextPerf;
    }

    if (snapshot.velocity !== this.lastVelocity) {
      this.elements.velocity.textContent = snapshot.velocity;
      this.lastVelocity = snapshot.velocity;
    }

    if (nextCoordKey !== this.lastCoord) {
      this.updateCoordinateReadout(snapshot.coordinates);
      this.lastCoord = nextCoordKey;
    }

    if (this.temporaryFocusUntil > snapshot.now) {
      if (this.elements.section.textContent !== this.temporaryFocusSection) {
        this.elements.section.textContent = this.temporaryFocusSection;
        this.elements.section.dataset.text = this.temporaryFocusSection;
      }

      if (this.elements.card.textContent !== this.temporaryFocusCard) {
        this.elements.card.textContent = this.temporaryFocusCard;
        this.elements.card.dataset.text = this.temporaryFocusCard;
      }

      return;
    }

    if (this.temporaryFocusUntil !== 0) {
      this.temporaryFocusUntil = 0;
      this.temporaryFocusSection = '';
      this.temporaryFocusCard = '';
      this.lastSection = '';
      this.lastCard = '';
    }

    if (this.initialSectionPromptActive) {
      this.pendingSectionTarget = snapshot.focus.section;
    } else if (snapshot.focus.section !== this.lastSection) {
      this.elements.section.textContent = snapshot.focus.section;
      this.elements.section.dataset.text = snapshot.focus.section;
      this.lastSection = snapshot.focus.section;
    }

    if (snapshot.focus.card !== this.lastCard) {
      this.elements.card.textContent = snapshot.focus.card;
      this.elements.card.dataset.text = snapshot.focus.card;
      this.lastCard = snapshot.focus.card;
    }
  }

  noteInitialScrollGesture(): void {
    if (!this.initialSectionPromptActive || this.sectionRevealTimeout || this.sectionScrambleRaf) {
      return;
    }

    this.sectionRevealTimeout = window.setTimeout(() => {
      this.sectionRevealTimeout = 0;
      this.playSectionReveal(this.pendingSectionTarget || 'PROFILE');
    }, INITIAL_SECTION_REVEAL_DELAY_MS);
  }

  destroy(): void {
    if (this.sectionRevealTimeout) {
      window.clearTimeout(this.sectionRevealTimeout);
      this.sectionRevealTimeout = 0;
    }

    if (this.sectionScrambleRaf) {
      window.cancelAnimationFrame(this.sectionScrambleRaf);
      this.sectionScrambleRaf = 0;
    }
  }

  private initializeCoordinateReadout(): Record<(typeof HUD_COORD_AXES)[number], { label: HTMLElement; value: HTMLElement }> {
    const nodes: Partial<Record<(typeof HUD_COORD_AXES)[number], { label: HTMLElement; value: HTMLElement }>> = {};
    const coordRoot = this.elements.coord;
    const fragment = document.createDocumentFragment();
 
    coordRoot.replaceChildren();
 
    const prefix = document.createElement('span');
    prefix.className = 'hud-coord-prefix';
    prefix.textContent = 'COORD';
    fragment.append(prefix);

    for (const axis of HUD_COORD_AXES) {
      const pair = document.createElement('span');
      pair.className = 'hud-coord-value';
      pair.style.display = 'none';

      const axisLabel = document.createElement('span');
      axisLabel.className = 'hud-coord-axis';
      axisLabel.textContent = axis;

      const valueNode = document.createElement('strong');
      valueNode.className = 'hud-coord-number';
      valueNode.textContent = '0';

      pair.append(axisLabel, valueNode);
      nodes[axis] = { label: pair, value: valueNode };
      fragment.append(pair);
    }
 
    coordRoot.append(fragment);
    return nodes as Record<(typeof HUD_COORD_AXES)[number], { label: HTMLElement; value: HTMLElement }>;
  }

  private serializeHudCoordinateSamples(samples: readonly HudCoordinateSample[]): string {
    return samples.map((sample) => `${sample.axis}:${Math.round(sample.value)}`).join('|');
  }

  private updateCoordinateReadout(samples: readonly HudCoordinateSample[]): void {
    const sampleMap = new Map(samples.map((sample) => [sample.axis, Math.round(sample.value)]));

    for (const axis of HUD_COORD_AXES) {
      const { label, value } = this.hudCoordNodes[axis];
      const nextValue = sampleMap.get(axis);
      const isVisible = nextValue !== undefined;

      const nextDisplay = isVisible ? '' : 'none';
      if (label.style.display !== nextDisplay) {
        label.style.display = nextDisplay;
      }
      
      if (isVisible) {
        const text = String(nextValue);
        if (value.textContent !== text) {
          value.textContent = text;
        }
      }
    }
  }

  private playSectionReveal(targetText: string): void {
    const normalizedTarget = targetText || 'PROFILE';
    const token = ++this.sectionScrambleToken;
    const startedAt = performance.now();
    const prefixLength = Math.max(0, normalizedTarget.length - 2);

    const tick = (now: number) => {
      if (token !== this.sectionScrambleToken) {
        return;
      }

      const progress = Math.min(1, (now - startedAt) / SECTION_SCRAMBLE_DURATION_MS);
      const revealCount = Math.floor(progress * normalizedTarget.length);
      let nextText = '';

      for (let index = 0; index < normalizedTarget.length; index += 1) {
        if (index < revealCount) {
          nextText += normalizedTarget[index] ?? '';
          continue;
        }

        if (index < prefixLength) {
          nextText += normalizedTarget[index] ?? '';
          continue;
        }

        const charIndex = (token + index + Math.floor(now / 34)) % SECTION_SCRAMBLE_CHARS.length;
        nextText += SECTION_SCRAMBLE_CHARS[charIndex] ?? SECTION_SCRAMBLE_CHARS[0];
      }

      this.elements.section.textContent = progress >= 1 ? normalizedTarget : nextText;

      if (progress < 1) {
        this.sectionScrambleRaf = window.requestAnimationFrame(tick);
        return;
      }

      this.elements.section.dataset.text = normalizedTarget;
      this.lastSection = normalizedTarget;
      this.initialSectionPromptActive = false;
      this.sectionScrambleRaf = 0;
    };

    this.sectionScrambleRaf = window.requestAnimationFrame(tick);
  }

  showTemporaryFocus(section: string, card: string, durationMs = 2600): void {
    this.temporaryFocusSection = section;
    this.temporaryFocusCard = card;
    this.temporaryFocusUntil = performance.now() + Math.max(0, durationMs);
    this.elements.section.textContent = section;
    this.elements.section.dataset.text = section;
    this.elements.card.textContent = card;
    this.elements.card.dataset.text = card;
  }

  private resolvePerformanceModeLabel(nextLabel: string, now: number): string {
    if (nextLabel === this.performanceModeLabel) {
      this.pendingPerformanceModeLabel = null;
      this.pendingPerformanceModeSince = 0;
      return this.performanceModeLabel;
    }

    if (this.pendingPerformanceModeLabel !== nextLabel) {
      this.pendingPerformanceModeLabel = nextLabel;
      this.pendingPerformanceModeSince = now;
      return this.performanceModeLabel;
    }

    if (now - this.pendingPerformanceModeSince < MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.performanceModeDebounceMs) {
      return this.performanceModeLabel;
    }

    this.performanceModeLabel = nextLabel;
    this.pendingPerformanceModeLabel = null;
    this.pendingPerformanceModeSince = 0;
    return this.performanceModeLabel;
  }
}
