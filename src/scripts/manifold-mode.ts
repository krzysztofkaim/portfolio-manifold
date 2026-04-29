import Lenis, { type LenisOptions } from '@studio-freight/lenis';
import { ManifoldModeController } from '../experience/ManifoldModeController';
import { LiquidGradientBackground } from '../experience/LiquidGradientBackground';
import { PixelCanvas } from '../experience/PixelCanvas';
import { ManifoldTextEffectManager } from '../experience/manifold/ManifoldTextEffectManager';
import { BrowserDomAdapter } from '../ui/adapters/BrowserDomAdapter';
import { BrowserRuntimeAdapter } from '../ui/adapters/BrowserRuntimeAdapter';
import { ManifoldAudioController } from './ManifoldAudioController';
import { logManifoldConsoleBanner } from './ManifoldConsoleBanner';
import { ManifoldModeSelector } from './ManifoldModeSelector';
import { ManifoldTelemetry, resolveTelemetryEndpoint } from './ManifoldTelemetry';
import { ManifoldAppCursor, type CursorElements } from './ui/ManifoldAppCursor';
import { ManifoldAppLocale, type LocaleElements } from './ui/ManifoldAppLocale';
import { ManifoldAppDiagnostics, type DiagnosticsElements, type LoopTelemetry } from './ui/ManifoldAppDiagnostics';
import { ManifoldAppScroll } from './ui/ManifoldAppScroll';
import { StyleAdapter } from '../utils/StyleAdapter';
import { EVENT_RECORD_PROFILE, type RecordProfileDetail } from '../config/manifold/ManifoldEvents';
import { IS_IOS, IS_SAFARI } from '../utils/browserDetection';

type HudSubviewView = 'about' | 'policy';

interface HudSubviewBlockDescriptor {
  bodyText?: string;
  kickerText?: string;
  key: string;
  source: HTMLElement;
  type: 'action' | 'intro' | 'item';
}

interface HudSubviewPagerState {
  currentPage: number;
  effectTimeout: number;
  lastContentSignature: string;
  lastHeight: number;
  lastWidth: number;
  measurePage: HTMLElement;
  nextButton: HTMLButtonElement;
  pageCount: number;
  pager: HTMLElement;
  pages: HTMLElement[];
  prevButton: HTMLButtonElement;
  root: HTMLElement;
  source: HTMLElement;
  status: HTMLElement;
  view: HudSubviewView;
  viewport: HTMLElement;
}

interface BootElements extends LocaleElements {
  cursor: CursorElements;
  scrollProxy: HTMLElement;
  liquidGradient: HTMLCanvasElement;
  viewport: HTMLElement;
  world: HTMLElement;
  ambientParticleLayer: HTMLCanvasElement;
  cardChromeLayer: HTMLCanvasElement;
  contextHint: HTMLElement;
  fourDWireframe: HTMLCanvasElement;
  introHint: HTMLElement;
  twoDSectionFrame: { label: HTMLElement; root: HTMLElement };
  twoDSectionFrameKicker: HTMLElement;
  introHintKicker: HTMLElement;
  introHintTitle: HTMLElement;
  contextHintKicker: HTMLElement;
  contextHintTitle: HTMLElement;
  footerPrivacyLink: HTMLAnchorElement | null;
  hudNav: {
    overlay: HTMLElement;
    panel: HTMLElement;
    tree: HTMLElement;
    kicker: HTMLElement;
    title: HTMLElement;
    spectrum: HTMLElement;
    spectrumBars: HTMLElement[];
    backdrop: HTMLButtonElement;
    orbitToggleButton: HTMLButtonElement;
    orbitToggleLabel: HTMLElement;
    additionalLabel: HTMLElement;
    aboutTrigger: HTMLButtonElement;
    aboutLabel: HTMLElement;
    aboutRoot: HTMLElement;
    privacyTrigger: HTMLButtonElement;
    privacyLabel: HTMLElement;
    policyTrigger: HTMLButtonElement;
    policyLabel: HTMLElement;
    policyRoot: HTMLElement;
    aboutStack: HTMLElement;
    aboutTrivia: HTMLElement;
    aboutVisitor: HTMLElement;
    aboutRuntime: HTMLElement;
    aboutTime: HTMLElement;
    policyIntro: HTMLElement;
    policyProcessingTitle: HTMLElement;
    policyProcessingBody: HTMLElement;
    policyStorageTitle: HTMLElement;
    policyStorageBody: HTMLElement;
    policyAudioTitle: HTMLElement;
    policyAudioBody: HTMLElement;
    policyTelemetryTitle: HTMLElement;
    policyTelemetryBody: HTMLElement;
    policyPerformanceTitle: HTMLElement;
    policyPerformanceBody: HTMLElement;
    policyContactTitle: HTMLElement;
    policyContactBody: HTMLElement;
    policyRightsTitle: HTMLElement;
    policyRightsBody: HTMLElement;
    header: HTMLElement;
    debugGpu: HTMLElement;
    debugManifold: HTMLElement;
    debugForceButton: HTMLButtonElement;
  };
  hudOrbit: {
    sections: HTMLElement;
    cards: HTMLElement;
  };
  diagnostics: DiagnosticsElements;
  topbarCenterHint: HTMLElement;
  topbarMark: HTMLElement;
  topbarLoaderKicker: HTMLElement;
  topbarCopy: HTMLElement;
  topbarRole: HTMLElement;
  hud: LocaleElements['hud'] & { root: HTMLElement; section: HTMLElement; card: HTMLElement; coord: HTMLElement; fps: HTMLElement; perfMode: HTMLElement; perfModeSidebar: HTMLElement; velocity: HTMLElement; coordPrefix: HTMLElement; fpsLabel: HTMLElement; perfLabel: HTMLElement; velocityLabel: HTMLElement };
  hudFocusFeedback: HTMLElement;
  hudFocusTrigger: HTMLButtonElement;
  advanceButtons: LocaleElements['advanceButtons'];
  localeButton: HTMLButtonElement;
  localeLabel: HTMLElement;
  audioButton: HTMLButtonElement | null;
  audioLabel: HTMLElement | null;
  contactButton: HTMLButtonElement;
  contactLabel: HTMLElement;
  downloadCv: HTMLAnchorElement;
  downloadCvLabel: HTMLElement;
}

class ManifoldApp {
  private lenis: Lenis | null = null;
  private controller: ManifoldModeController | null = null;
  private liquidGradient: LiquidGradientBackground | null = null;
  private running = false;
  private readonly prefersMobilePerformanceBudget =
    window.matchMedia('(pointer: coarse)').matches ||
    navigator.maxTouchPoints > 0 ||
    window.innerWidth <= 720;

  private lastPixelQuality = 1;
  private lastBackgroundQuality = 0.44;

  private cursor: ManifoldAppCursor;
  private locale: ManifoldAppLocale;
  private diagnostics: ManifoldAppDiagnostics | null = null;
  private scroll: ManifoldAppScroll;
  private audio: ManifoldAudioController;
  private modeSelector: ManifoldModeSelector;
  private telemetry: ManifoldTelemetry;
  private loopMetricsUpdateRaf = 0;
  private hudNavigationCloseTimeout = 0;
  private hudNavigationTravelUntil = 0;
  private hudNavigationFrozenFocus: { section: string; card: string } | null = null;
  private lastTopbarKickerText = '';
  private topbarExitHintHoldUntil = 0;
  private hudSectionPrimeTimeout = 0;

  private telemetryState: LoopTelemetry = {
    backgroundMs: 0,
    controllerMs: 0,
    controllerFourDMs: 0,
    controllerHudCommitMs: 0,
    controllerInteractionMs: 0,
    controllerItemsMs: 0,
    controllerParticlesMs: 0,
    controllerPreludeMs: 0,
    controllerSectionFrameMs: 0,
    controllerSpectrumCards: 0,
    controllerTransitionActive: false,
    controllerVisibleCards: 0,
    controllerVisibleItems: 0,
    controllerVisibleTexts: 0,
    frameMs: 0,
    lenisMs: 0,
    logicalScroll: 0,
    rebaseCount: 0,
    rebaseDelta: 0,
    rebaseMs: 0,
    uiMs: 0
  };

  private activeMode: '2d' | '3d' | '4d' = '3d';
  private modeSelectorTeardown: (() => void) | null = null;
  private localeTeardown: (() => void) | null = null;
  private debugModeHotkeysTeardown: (() => void) | null = null;
  private readonly hudSubviewPagers = new Map<HudSubviewView, HudSubviewPagerState>();
  private hudSubviewPaginationForce = false;
  private hudSubviewPaginationRaf = 0;
  private lastHudNavRenderAt = 0;
  private lastHudNavSignature = '';
  private lastBackgroundRenderAt = 0;
  private lastControllerRenderAt = 0;
  private lastInteractionBurstAt = 0;
  private hudOrbitsVisible = false;
  private activeHudSubView: 'about' | 'policy' | null = null;
  private hudSubViewUpdateInterval = 0;
  private hudSubViewCooldown = 0;
  private readonly textEffectManager = new ManifoldTextEffectManager();
  private spectrumBars: HTMLElement[] = [];
  private spectrumAlpha = 0;
  private lastHudSpectrumAlpha = -1;
  private lastHudSpectrumShiftY = Number.NaN;
  private readonly lastHudSpectrumBarScales: number[] = [];
  // Cached body class state — avoids classList.contains() in hot paths
  private cachedIsNavOpen = false;
  private cachedHasExpandedCard = false;
  private readonly handleCardChromeContextLost = (event: Event) => {
    event.preventDefault();
    this.controller?.handleGpuContextLoss();
  };

  constructor(private readonly elements: BootElements) {
    this.spectrumBars = elements.hudNav.spectrumBars;
    this.lastHudSpectrumBarScales = new Array(this.spectrumBars.length).fill(-1);

    this.telemetry = new ManifoldTelemetry(resolveTelemetryEndpoint());
    this.telemetry.installGlobalErrorHandlers();

    this.audio = new ManifoldAudioController({
      getController: () => this.controller,
      getTargetVelocity: () => this.scroll.getTargetVelocity(),
      onAudioPlayed: () => this.telemetry.track('audio_played')
    });

    this.modeSelector = new ManifoldModeSelector({
      getController: () => this.controller,
      getActiveMode: () => this.activeMode,
      setActiveMode: (mode) => { this.activeMode = mode; },
      updateLoopMetrics: (nextLength) => {
        if (this.loopMetricsUpdateRaf) {
          window.cancelAnimationFrame(this.loopMetricsUpdateRaf);
        }

        this.loopMetricsUpdateRaf = window.requestAnimationFrame(() => {
          this.loopMetricsUpdateRaf = 0;
          this.scroll.setLoopScrollLength(nextLength);
        });
      }
    });

    this.cursor = new ManifoldAppCursor(elements.cursor);
    this.scroll = new ManifoldAppScroll(this.telemetryState, () => this.controller, () => this.lenis);
    this.scroll.attachScrollProxy(elements.scrollProxy);
    this.locale = new ManifoldAppLocale(elements, null, this.audio, this.modeSelector);
    this.hudOrbitsVisible = this.resolveInitialOrbitVisibility();
  }

  async setup(): Promise<void> {
    const locale = this.locale.resolveInitialLocale();
    this.localeTeardown = this.locale.setup();
    try { this.cursor.setup(); } catch (e) { console.error('Failed to init this.cursor.setup()', e); }
    try { this.scroll.setup(); } catch (e) { console.error('Failed to init this.scroll.setup()', e); }
    logManifoldConsoleBanner();

    // Setup global recording event listener (v2 Architecture)
    window.addEventListener(EVENT_RECORD_PROFILE, (event: CustomEvent<RecordProfileDetail>) => {
      const { durationMs } = event.detail;
      this.telemetry.track('profile_recording_started', { durationMs });

      // Future: integrate with real ProfilerController here
    });

    // Mobile/Safari Optimization: Start decorative layers with a safer quality budget.
    if (IS_SAFARI || this.prefersMobilePerformanceBudget) {
      this.lastPixelQuality = IS_IOS
        ? 0.82
        : this.prefersMobilePerformanceBudget
          ? 0.86
          : 0.94;
      this.lastBackgroundQuality = IS_IOS
        ? 0.24
        : this.prefersMobilePerformanceBudget
          ? 0.28
          : 0.42;
      PixelCanvas.setGlobalQuality(this.lastPixelQuality);
    }

    if (IS_IOS) {
      this.elements.liquidGradient.style.display = 'none';
      this.lastBackgroundQuality = 0;
    } else {
      this.liquidGradient = new LiquidGradientBackground(this.elements.liquidGradient);
      if (IS_SAFARI || this.prefersMobilePerformanceBudget) {
        this.liquidGradient.setQuality(this.lastBackgroundQuality);
      }
    }

    const preferredMode = this.resolvePreferredStartupMode();

    const dom = new BrowserDomAdapter();
    const runtime = new BrowserRuntimeAdapter();

    this.controller = new ManifoldModeController(
      {
        ambientParticleLayer: this.elements.ambientParticleLayer,
        cardChromeLayer: this.elements.cardChromeLayer,
        contextHint: this.elements.contextHint,
        advanceButtons: this.elements.advanceButtons,
        exitButton: this.elements.exitButton,
        fourDWireframe: this.elements.fourDWireframe,
        hud: {
          ...this.elements.hud,
          root: this.elements.hud.root
        },
        introHint: this.elements.introHint,
        twoDSectionFrame: this.elements.twoDSectionFrame,
        viewport: this.elements.viewport,
        world: this.elements.world
      },
      dom,
      runtime,
      {
        onCardExpanded: (cardId) => this.telemetry.track('card_expanded', { cardId }),
        onFourDModeEntered: () => this.telemetry.track('4d_mode_entered'),
        onIntroEntered: () => {
          this.telemetry.track('intro_entered');
          this.activeMode = this.controller?.getViewMode() ?? this.activeMode;
          this.modeSelector.syncModeToggleState();
          this.showHudIntroHint();

          const nextLength = this.controller?.getLoopScrollLength() ?? 0;
          if (this.loopMetricsUpdateRaf) {
            window.cancelAnimationFrame(this.loopMetricsUpdateRaf);
          }

          this.loopMetricsUpdateRaf = window.requestAnimationFrame(() => {
            this.loopMetricsUpdateRaf = 0;
            this.scroll.setLoopScrollLength(nextLength);
          });
        },
        onModeSwitched: (from, to) => {
          this.telemetry.track('mode_switched', { from, to });

        }
      },
      preferredMode
    );

    this.locale.attachController(this.controller);
    this.locale.attachManifoldApp(this);
    this.controller.setLocale(locale);
    this.activeMode = this.controller.getViewMode();
    this.elements.cardChromeLayer.addEventListener('webglcontextlost', this.handleCardChromeContextLost, false);

    this.setupLenis();
    this.scroll.setLoopScrollLength(this.controller.getLoopScrollLength());
    this.scroll.initialize(this.controller.getInitialScrollAnchor());
    this.setupAudio();
    this.setupContactButton();
    this.setupHudNavigation();
    this.setupHudAdvanceButtons();
    this.setupHudOrbitToggle();
    this.setupHudAdditionalViews();
    this.modeSelectorTeardown = this.modeSelector.setup(this.elements.modeToggle);
    this.modeSelector.syncModeToggleState();
    this.debugModeHotkeysTeardown = this.setupDebugModeHotkeys();
    this.controller.scheduleIntroAutoEnter();

    this.startLoop();

    document.body.classList.add('boot-complete');
    this.finishLocaleTransition();
  }

  private setupLenis(): void {
    if (IS_IOS) {
      this.lenis = null;
      return;
    }

    const options: LenisOptions = {
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false
    };

    this.lenis = new Lenis(options);
    this.lenis.on('scroll', (e: { animatedScroll: number; velocity: number }) => {
      let target = e.animatedScroll;
      target = this.scroll.maybeRebaseLenis(target);
      this.scroll.handleLenisScroll(target, e.velocity);
    });
  }

  private setupAudio(): void {
    this.audio.setupAudioPlayback({
      audioButton: this.elements.audioButton,
      audioLabel: this.elements.audioLabel
    });
  }

  private setupContactButton(): void {
    this.elements.contactButton.addEventListener('click', () => {
      const u = this.elements.contactButton.dataset.u;
      const d = this.elements.contactButton.dataset.d;
      if (u && d) {
        window.location.href = `mailto:${u}@${d}`;
      }
    });
  }

  private navigateToAdjacentCard(direction: 1 | -1): void {
    if (!this.controller) {
      return;
    }

    const target = this.controller.getAdjacentCardNavigation(direction);
    if (!target) {
      return;
    }

    this.controller.closeActiveCard();
    this.scrollToNavigationAnchor(target.anchor, { immediate: false });

    if (this.controller.is2DMode()) {
      this.controller.focusCardIn2D(target.cardIndex, false);
    }
  }

  private showHudIntroHint(): void {
    const bundle = this.locale.getActiveLocaleBundle();
    this.controller?.showTemporaryHudFocus(bundle.ui.hudHintLineOne, bundle.ui.hudHintLineTwo, 2600);
  }

  private scrollToNavigationAnchor(anchor: number, options?: { immediate?: boolean }): void {
    const logicalTarget = this.controller?.resolveNavigationScrollTarget(anchor) ?? anchor;

    this.scroll.scrollToLogical(logicalTarget, options);
  }

  private navigateToHudCard(cardIndex: number, options?: { openCard?: boolean; closeNavigation?: boolean; immediate?: boolean }): void {
    const anchor = this.controller?.getCardNavigationAnchor(cardIndex, 'nearest');

    if (anchor !== null && anchor !== undefined) {
      this.scrollToNavigationAnchor(anchor, options?.immediate === false ? { immediate: false } : undefined);
    }

    if (options?.openCard !== false) {
      this.controller?.openCardByIndex(cardIndex);
    } else if (this.controller?.is2DMode()) {
      this.controller.focusCardIn2D(cardIndex, false);
    }

    if (options?.closeNavigation !== false) {
      this.closeHudNavigation();
      this.controller?.setProgrammaticJump(false);
    }

    window.setTimeout(() => {

    }, 0);
  }

  private setHudNavigationTravelState(active: boolean, frozenFocus?: { section: string; card: string } | null): void {
    this.hudNavigationTravelUntil = active ? performance.now() + 1400 : 0;
    this.hudNavigationFrozenFocus = active ? frozenFocus ?? this.hudNavigationFrozenFocus : null;
    this.elements.hudNav.panel.classList.toggle('is-traveling', active);

    const focus = active
      ? (frozenFocus ?? this.hudNavigationFrozenFocus ?? this.controller?.getActiveHudNavigationFocus() ?? null)
      : this.controller?.getActiveHudNavigationFocus() ?? null;
    this.updateHudNavigationHeader(active, focus?.section ?? '', this.controller?.is4DMode() ?? false);
  }

  private updateHudSpectrum(): void {
    const audioActive = this.audio.getAudioActiveState();

    // 1. Supply spectrum data to cards (Controller/Renderer handle visibility/encapsulation)
    if (audioActive) {
      const aggregatedFreqs = this.audio.getAggregatedFrequencies();
      const energy = this.audio.getAggregatedEnergy();
      this.controller?.setAudioSpectrum(aggregatedFreqs, energy);
    } else {
      this.controller?.setAudioSpectrum(null, 0);
    }

    // 2. Handle HUD Navigation Header Spectrum
    const isActive = this.cachedIsNavOpen && audioActive;
    const targetAlpha = isActive ? 1 : 0;
    
    this.spectrumAlpha += (targetAlpha - this.spectrumAlpha) * (targetAlpha > this.spectrumAlpha ? 0.08 : 0.12);

    if (this.spectrumAlpha < 0.01) {
      if (this.lastHudSpectrumAlpha !== 0) {
        StyleAdapter.setNumericProperty(this.elements.hudNav.spectrum, '--spectrum-alpha', 0);
        this.lastHudSpectrumAlpha = 0;
      }
      if (this.lastHudSpectrumShiftY !== 0) {
        StyleAdapter.setNumericProperty(this.elements.hudNav.header, '--hud-nav-shift-y', 0, 'px');
        this.lastHudSpectrumShiftY = 0;
      }
      return;
    }

    const quantizedAlpha = Math.round(this.spectrumAlpha * 50) / 50;
    const quantizedShiftY = Math.round(this.spectrumAlpha * -12 * 2) / 2;

    if (quantizedAlpha !== this.lastHudSpectrumAlpha) {
      StyleAdapter.setNumericProperty(this.elements.hudNav.spectrum, '--spectrum-alpha', quantizedAlpha);
      this.lastHudSpectrumAlpha = quantizedAlpha;
    }

    if (quantizedShiftY !== this.lastHudSpectrumShiftY) {
      StyleAdapter.setNumericProperty(this.elements.hudNav.header, '--hud-nav-shift-y', quantizedShiftY, 'px');
      this.lastHudSpectrumShiftY = quantizedShiftY;
    }

    const freqData = this.audio.getFrequencyData();
    if (!freqData) return;

    const barCount = this.spectrumBars.length;
    for (let i = 0; i < barCount; i++) {
      const rawValue = freqData[i] / 255;
      const eqMultiplier = 1.0 + (i / barCount) * 1.5;
      const scaleY = Math.max(0.01, Math.min(1.0, rawValue * eqMultiplier));
      const quantizedScaleY = Math.round(scaleY * 40) / 40;

      if (quantizedScaleY !== this.lastHudSpectrumBarScales[i]) {
        StyleAdapter.setNumericProperty(this.spectrumBars[i], '--bar-scale', quantizedScaleY);
        this.lastHudSpectrumBarScales[i] = quantizedScaleY;
      }
    }
  }

  private updateTopbarLoaderKicker(): void {
    const bundle = this.locale.getActiveLocaleBundle();
    const hasExpanded = this.cachedHasExpandedCard;
    const isNavOpen = this.cachedIsNavOpen;
    const now = performance.now();
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const shouldHoldExitHint = hasExpanded || isNavOpen || now < this.topbarExitHintHoldUntil;

    let nextText = bundle.ui.systemLoader;

    if (hasExpanded || isNavOpen) {
      this.topbarExitHintHoldUntil = now + 220;
    }

    if (shouldHoldExitHint) {
      nextText = isTouch ? bundle.ui.scrollToExit : bundle.ui.scrollArrowsToExit;
    }

    if (nextText === this.lastTopbarKickerText) {
      return;
    }

    this.lastTopbarKickerText = nextText;
    this.elements.topbarLoaderKicker.textContent = nextText;

    // Force container visibility if we have a message
    if (shouldHoldExitHint) {
      this.elements.topbarLoaderKicker.parentElement?.style.setProperty('opacity', '1');
      this.elements.topbarLoaderKicker.parentElement?.style.setProperty('filter', 'blur(0)');
      this.elements.topbarLoaderKicker.parentElement?.style.setProperty('transform', 'translate(-50%, -50%) scale(1)');
    } else {
      this.elements.topbarLoaderKicker.parentElement?.style.removeProperty('opacity');
      this.elements.topbarLoaderKicker.parentElement?.style.removeProperty('filter');
      this.elements.topbarLoaderKicker.parentElement?.style.removeProperty('transform');
    }
  }

  private navigateToHudSection(
    anchor: number,
    primaryCardIndex?: number,
    forcedFocus?: { section: string; card: string }
  ): void {

    if (this.hudNavigationCloseTimeout) {
      window.clearTimeout(this.hudNavigationCloseTimeout);
      this.hudNavigationCloseTimeout = 0;
    }
    if (this.hudSectionPrimeTimeout) {
      window.clearTimeout(this.hudSectionPrimeTimeout);
      this.hudSectionPrimeTimeout = 0;
    }

    const currentFocus = this.controller?.getActiveHudNavigationFocus() ?? null;
    const frozenFocus = forcedFocus ?? currentFocus;
    this.controller?.closeActiveCard();

    this.setHudNavigationTravelState(true, frozenFocus);
    this.controller?.setProgrammaticJump(true);
    this.renderHudNavigation();
    this.lenis?.start();

    if (primaryCardIndex !== undefined) {
      // Reuse the card navigation path that is already stable in both 2D and 3D,
      // then immediately collapse the card so a section jump does not leave expanded UI behind.
      this.controller?.openCardByIndex(primaryCardIndex);
      this.hudSectionPrimeTimeout = window.setTimeout(() => {
        this.controller?.closeActiveCard();
        this.hudSectionPrimeTimeout = 0;
      }, 0);

      const cardAnchor = this.controller?.getCardNavigationAnchor(primaryCardIndex, 'nearest');
      if (cardAnchor !== null && cardAnchor !== undefined) {
        this.scrollToNavigationAnchor(cardAnchor, { immediate: false });
      } else {
        this.scrollToNavigationAnchor(anchor, { immediate: false });
      }
    } else {
      this.scrollToNavigationAnchor(anchor, { immediate: false });
    }

    this.hudNavigationCloseTimeout = window.setTimeout(() => {
      this.closeHudNavigation();
      this.controller?.setProgrammaticJump(false);
      this.hudNavigationCloseTimeout = 0;
    }, 950);

    window.setTimeout(() => {

    }, 0);
  }

  private setupHudAdvanceButtons(): void {
    this.elements.advanceButtons.prev.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.navigateToAdjacentCard(-1);
    });

    this.elements.advanceButtons.next.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.navigateToAdjacentCard(1);
    });
  }

  private setupHudNavigation(): void {
    const updateNavigationAnchor = () => {
      const triggerRect = this.elements.hudFocusTrigger.getBoundingClientRect();
      const panelWidth = this.elements.hudNav.panel.getBoundingClientRect().width || 760;
      const viewportPadding = Math.max(16, window.innerWidth * 0.02);
      const triggerCenterX = triggerRect.left + triggerRect.width * 0.5;
      const clampedCenterX = Math.min(
        window.innerWidth - viewportPadding - panelWidth * 0.5,
        Math.max(viewportPadding + panelWidth * 0.5, triggerCenterX)
      );
      const anchorY = Math.max(24, triggerRect.top - 10);

      this.elements.hudNav.panel.style.setProperty('--hud-nav-anchor-x', `${clampedCenterX}px`);
      this.elements.hudNav.panel.style.setProperty('--hud-nav-anchor-y', `${anchorY}px`);
    };

    const closeNavigation = () => {
      if (this.activeHudSubView) {
        this.toggleHudSubView(this.activeHudSubView);
        this.hudSubViewCooldown = Date.now() + 1000;
        this.syncToggledButtonLabels();
        window.setTimeout(() => this.syncToggledButtonLabels(), 1050);
      } else {
        const now = Date.now();
        const velocity = Math.abs(this.scroll.getTargetVelocity());
        if (now > this.hudSubViewCooldown && velocity < 0.05) {
          this.closeHudNavigation();
          this.controller?.setProgrammaticJump(false);
        }
      }
    };

    const openNavigation = () => {
      this.setHudNavigationTravelState(false, null);
      this.cachedIsNavOpen = true;
      document.body.classList.add('hud-nav-open');
      this.elements.hudFocusTrigger.setAttribute('aria-expanded', 'true');
      this.elements.hudNav.overlay.setAttribute('aria-hidden', 'false');
      this.lastHudNavSignature = '';
      this.renderHudNavigation();
      updateNavigationAnchor();
      this.syncToggledButtonLabels();
    };

    const handleTrigger = () => {
      if (document.body.classList.contains('hud-nav-open')) {
        closeNavigation();
        return;
      }
      openNavigation();
    };

    const handleExitButtonClick = () => {
      if (document.body.classList.contains('hud-nav-open')) {
        closeNavigation();
      }
    };

    const handleEscape = (KeyboardEvent: KeyboardEvent) => {
      if (KeyboardEvent.key === 'Escape') {
        if (document.body.classList.contains('hud-nav-open')) {
          closeNavigation();
        }
      }
    };

    const handleScrollDismiss = () => {
      if (!document.body.classList.contains('hud-nav-open')) {
        return;
      }

      closeNavigation();
    };

    this.elements.hudFocusTrigger.addEventListener('click', handleTrigger);
    this.elements.exitButton.addEventListener('click', handleExitButtonClick);
    this.elements.hudNav.backdrop.addEventListener('click', closeNavigation);
    window.addEventListener('keydown', handleEscape);
    window.addEventListener('wheel', handleScrollDismiss, { passive: true });
    window.addEventListener('touchmove', handleScrollDismiss, { passive: true });
    window.addEventListener('resize', () => {
      if (document.body.classList.contains('hud-nav-open')) {
        updateNavigationAnchor();
        if (this.activeHudSubView) {
          this.scheduleHudSubviewPagination(true);
        }
      }
    });
  }

  private finishLocaleTransition(): void {
    if (!document.documentElement.classList.contains('locale-transition-active')) {
      return;
    }

    window.setTimeout(() => {
      document.documentElement.classList.remove('locale-transition-active');
      try {
        window.sessionStorage.removeItem('manifold-locale-transition');
      } catch {
        return;
      }
    }, 320);
  }

  private resolveInitialOrbitVisibility(): boolean {
    return false;
  }

  private persistOrbitVisibility(): void {
    try {
      window.localStorage.setItem('manifold-hud-orbits-visible', this.hudOrbitsVisible ? '1' : '0');
    } catch {
      return;
    }
  }

  private applyHudOrbitVisibility(): void {
    const is4DMode = this.controller?.is4DMode() ?? false;
    const effectiveOrbitVisibility = !is4DMode && this.hudOrbitsVisible;
    document.body.classList.toggle('hud-orbits-hidden', !effectiveOrbitVisibility);
    this.elements.hudNav.orbitToggleButton.setAttribute('aria-pressed', effectiveOrbitVisibility ? 'true' : 'false');
    this.elements.hudNav.orbitToggleButton.dataset.state = effectiveOrbitVisibility ? 'on' : 'off';
    this.elements.hudNav.orbitToggleButton.hidden = is4DMode;
    this.syncOrbitToggleLabel();
  }

  private setupHudOrbitToggle(): void {
    this.applyHudOrbitVisibility();

    this.elements.hudNav.orbitToggleButton.addEventListener('click', () => {
      this.hudOrbitsVisible = !this.hudOrbitsVisible;
      this.persistOrbitVisibility();
      this.applyHudOrbitVisibility();
    });
  }

  private setupHudAdditionalViews(): void {
    const {
      aboutTrigger,
      policyTrigger,
      debugGpu, debugForceButton
    } = this.elements.hudNav;

    debugGpu.textContent = this.detectGpu();
    this.setupHudSubviewPager('about', this.elements.hudNav.aboutRoot);
    this.setupHudSubviewPager('policy', this.elements.hudNav.policyRoot);

    const toggleView = (view: HudSubviewView) => this.toggleHudSubView(view);

    aboutTrigger.addEventListener('click', (e) => { e.stopPropagation(); toggleView('about'); });
    policyTrigger.addEventListener('click', (e) => { e.stopPropagation(); toggleView('policy'); });
    debugForceButton.addEventListener('click', (e) => {
      e.stopPropagation();
      const diag = this.ensureDiagnostics();
      if (diag) {
        diag.setDiagnosticsOpen(!diag.isDiagnosticsOpen());
        this.syncToggledButtonLabels();
      }
    });

    const observer = new MutationObserver(() => {
      const isHidden = this.elements.hudNav.overlay.getAttribute('aria-hidden') === 'true';
      if (isHidden && this.activeHudSubView !== null) {
        this.toggleHudSubView(this.activeHudSubView);
      }
    });
    observer.observe(this.elements.hudNav.overlay, { attributes: true, attributeFilter: ['aria-hidden'] });
  }

  public syncHudSubviewPagers(): void {
    this.hudSubviewPagers.forEach((state) => {
      this.updateHudSubviewPagerLabels(state);
    });

    if (this.activeHudSubView) {
      this.repaginateHudSubview(this.activeHudSubView, true);
    }
  }

  private setupHudSubviewPager(view: HudSubviewView, root: HTMLElement): void {
    if (this.hudSubviewPagers.has(view)) {
      return;
    }

    const source = document.createElement('div');
    source.className = 'hud-subview-source';
    source.hidden = true;
    source.setAttribute('aria-hidden', 'true');

    const pager = document.createElement('div');
    pager.className = 'hud-subview-pager';
    pager.dataset.view = view;

    const surface = document.createElement('div');
    surface.className = 'hud-subview-pager__surface';

    const viewport = document.createElement('div');
    viewport.className = 'hud-subview-pager__viewport';

    const prevButton = document.createElement('button');
    prevButton.type = 'button';
    prevButton.className = 'hud-subview-pager__nav hud-subview-pager__nav--prev';
    prevButton.innerHTML = '<span class="hud-subview-pager__nav-icon" aria-hidden="true">&#x2039;</span>';

    const nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = 'hud-subview-pager__nav hud-subview-pager__nav--next';
    nextButton.innerHTML = '<span class="hud-subview-pager__nav-icon" aria-hidden="true">&#x203A;</span>';

    const status = document.createElement('div');
    status.className = 'hud-subview-pager__status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    const measurePage = document.createElement('div');
    measurePage.className = 'hud-subview-page hud-subview-page--measure';
    measurePage.setAttribute('aria-hidden', 'true');

    const children = Array.from(root.children);
    source.replaceChildren(...children);
    surface.append(viewport, prevButton, nextButton);
    pager.append(surface, status, measurePage);
    root.replaceChildren(source, pager);

    const state: HudSubviewPagerState = {
      currentPage: 0,
      effectTimeout: 0,
      lastContentSignature: '',
      lastHeight: 0,
      lastWidth: 0,
      measurePage,
      nextButton,
      pageCount: 0,
      pager,
      pages: [],
      prevButton,
      root,
      source,
      status,
      view,
      viewport
    };

    prevButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.setHudSubviewPage(state, state.currentPage - 1);
    });

    nextButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.setHudSubviewPage(state, state.currentPage + 1);
    });

    this.hudSubviewPagers.set(view, state);
    this.updateHudSubviewPagerLabels(state);
  }

  private collectHudSubviewBlocks(state: HudSubviewPagerState): HudSubviewBlockDescriptor[] {
    const blocks: HudSubviewBlockDescriptor[] = [];
    const intro = state.source.querySelector<HTMLElement>(':scope > .privacy-intro');
    const introText = intro?.textContent?.trim() ?? '';
    if (intro && introText) {
      blocks.push({
        bodyText: introText,
        key: 'intro',
        source: intro,
        type: 'intro'
      });
    }

    const items = Array.from(state.source.querySelectorAll<HTMLElement>(':scope > .privacy-section > .privacy-item'));
    items.forEach((item, index) => {
      const actionButton = item.querySelector<HTMLButtonElement>('button');
      if (actionButton) {
        blocks.push({
          key: `action-${index}`,
          source: item,
          type: 'action'
        });
        return;
      }

      blocks.push({
        bodyText: item.querySelector<HTMLElement>('.privacy-title')?.textContent?.trim() ?? '',
        key: `item-${index}`,
        kickerText: item.querySelector<HTMLElement>('.privacy-kicker')?.textContent?.trim() ?? '',
        source: item,
        type: 'item'
      });
    });

    return blocks;
  }

  private buildHudSubviewContentSignature(blocks: HudSubviewBlockDescriptor[]): string {
    return blocks
      .map((block) => {
        if (block.type === 'action') {
          return `${block.key}:${block.source.textContent?.trim() ?? ''}`;
        }
        return `${block.key}:${block.kickerText ?? ''}:${block.bodyText ?? ''}`;
      })
      .join('|');
  }

  private scheduleHudSubviewPagination(force = false): void {
    this.hudSubviewPaginationForce = this.hudSubviewPaginationForce || force;
    if (this.hudSubviewPaginationRaf) {
      return;
    }

    this.hudSubviewPaginationRaf = window.requestAnimationFrame(() => {
      const shouldForce = this.hudSubviewPaginationForce;
      this.hudSubviewPaginationForce = false;
      this.hudSubviewPaginationRaf = 0;

      if (!this.activeHudSubView) {
        return;
      }

      this.repaginateHudSubview(this.activeHudSubView, shouldForce);
    });
  }

  private repaginateHudSubview(view: HudSubviewView, force = false): void {
    const state = this.hudSubviewPagers.get(view);
    if (!state || state.root.style.display === 'none') {
      return;
    }

    const blocks = this.collectHudSubviewBlocks(state);
    const contentSignature = this.buildHudSubviewContentSignature(blocks);
    const viewportWidth = Math.round(state.root.getBoundingClientRect().width);
    const maxPageHeight = this.resolveHudSubviewPageHeight(state);

    if (viewportWidth <= 0 || maxPageHeight <= 0) {
      return;
    }

    if (
      !force &&
      state.lastWidth === viewportWidth &&
      state.lastHeight === maxPageHeight &&
      state.lastContentSignature === contentSignature
    ) {
      return;
    }

    state.lastWidth = viewportWidth;
    state.lastHeight = maxPageHeight;
    state.lastContentSignature = contentSignature;
    state.viewport.style.maxHeight = `${maxPageHeight}px`;
    state.measurePage.style.width = `${state.viewport.getBoundingClientRect().width || viewportWidth}px`;

    const fragments = blocks.flatMap((block) => this.buildHudSubviewFragments(state, block, maxPageHeight));
    const pages = this.groupHudSubviewFragmentsIntoPages(state, fragments, maxPageHeight);
    const nextPages = pages.length > 0 ? pages : [[this.createHudSubviewFallbackNode()]];
    const previousPage = force ? 0 : state.currentPage;

    state.viewport.replaceChildren();
    state.pages = nextPages.map((pageNodes) => {
      const page = document.createElement('div');
      page.className = 'hud-subview-page';
      pageNodes.forEach((node) => page.appendChild(node));
      state.viewport.appendChild(page);
      return page;
    });
    state.pageCount = state.pages.length;
    this.setHudSubviewPage(state, previousPage);
  }

  private resolveHudSubviewPageHeight(state: HudSubviewPagerState): number {
    const panel = this.elements.hudNav.panel;
    const panelStyle = window.getComputedStyle(panel);
    const rootStyle = window.getComputedStyle(state.root);
    const maxPanelHeight = parseFloat(panelStyle.maxHeight) || window.innerHeight * 0.85;
    const panelPaddingY = parseFloat(panelStyle.paddingTop) + parseFloat(panelStyle.paddingBottom);
    const rootPaddingY = parseFloat(rootStyle.paddingTop) + parseFloat(rootStyle.paddingBottom);
    const pagerGap = 12;
    const statusHeight = state.status.getBoundingClientRect().height || 18;
    const siblingHeight = Array.from(panel.children).reduce((sum, child) => {
      if (!(child instanceof HTMLElement) || child === state.root) {
        return sum;
      }

      if (window.getComputedStyle(child).display === 'none') {
        return sum;
      }

      return sum + child.getBoundingClientRect().height;
    }, 0);

    return Math.max(136, Math.floor(maxPanelHeight - panelPaddingY - rootPaddingY - siblingHeight - statusHeight - pagerGap));
  }

  private buildHudSubviewFragments(
    state: HudSubviewPagerState,
    block: HudSubviewBlockDescriptor,
    maxPageHeight: number
  ): HTMLElement[] {
    const wholeNode = this.createHudSubviewNode(block);
    if (this.measureHudSubviewNodeHeight(state, wholeNode) <= maxPageHeight) {
      return [wholeNode];
    }

    if (block.type !== 'intro' && block.type !== 'item') {
      return [wholeNode];
    }

    const text = block.bodyText?.trim() ?? '';
    if (!text) {
      return [wholeNode];
    }

    const tokens = this.tokenizeHudSubviewText(text);
    if (tokens.length === 0) {
      return [wholeNode];
    }

    const fragments: HTMLElement[] = [];
    let start = 0;

    while (start < tokens.length) {
      const end = this.findHudSubviewTokenBreak(state, block, tokens, start, maxPageHeight);
      const segmentText = this.joinHudSubviewTokens(tokens.slice(start, end));
      if (!segmentText) {
        break;
      }

      fragments.push(this.createHudSubviewNode(block, segmentText));
      start = end;
    }

    return fragments.length > 0 ? fragments : [wholeNode];
  }

  private tokenizeHudSubviewText(text: string): string[] {
    return text.match(/\n+|[^\s\n]+/gu) ?? [];
  }

  private joinHudSubviewTokens(tokens: string[]): string {
    let output = '';
    for (const token of tokens) {
      if (token.includes('\n')) {
        output = output.replace(/[ \t]+$/u, '');
        output += token;
      } else {
        output += output && !output.endsWith('\n') ? ` ${token}` : token;
      }
    }

    return output.trim();
  }

  private findHudSubviewTokenBreak(
    state: HudSubviewPagerState,
    block: HudSubviewBlockDescriptor,
    tokens: string[],
    start: number,
    maxPageHeight: number
  ): number {
    let low = start + 1;
    let high = tokens.length;
    let best = start;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const node = this.createHudSubviewNode(block, this.joinHudSubviewTokens(tokens.slice(start, mid)));
      if (this.measureHudSubviewNodeHeight(state, node) <= maxPageHeight) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    if (best > start) {
      return best;
    }

    const token = tokens[start] ?? '';
    if (token.length <= 1) {
      return start + 1;
    }

    let charLow = 1;
    let charHigh = token.length;
    let bestCharLength = 1;

    while (charLow <= charHigh) {
      const mid = Math.floor((charLow + charHigh) / 2);
      const segmentTokens = [...tokens.slice(start, start + 1)];
      segmentTokens[0] = token.slice(0, mid);
      const node = this.createHudSubviewNode(block, this.joinHudSubviewTokens(segmentTokens));
      if (this.measureHudSubviewNodeHeight(state, node) <= maxPageHeight) {
        bestCharLength = mid;
        charLow = mid + 1;
      } else {
        charHigh = mid - 1;
      }
    }

    if (bestCharLength < token.length) {
      tokens.splice(start, 1, token.slice(0, bestCharLength), token.slice(bestCharLength));
    }

    return start + 1;
  }

  private groupHudSubviewFragmentsIntoPages(
    state: HudSubviewPagerState,
    fragments: HTMLElement[],
    maxPageHeight: number
  ): HTMLElement[][] {
    const pages: HTMLElement[][] = [];
    let currentPage: HTMLElement[] = [];

    fragments.forEach((fragment) => {
      const candidatePage = [...currentPage, fragment];
      if (currentPage.length > 0 && !this.doesHudSubviewPageFit(state, candidatePage, maxPageHeight)) {
        pages.push(currentPage);
        currentPage = [fragment];
        return;
      }

      currentPage = candidatePage;
    });

    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    return pages;
  }

  private doesHudSubviewPageFit(state: HudSubviewPagerState, nodes: HTMLElement[], maxPageHeight: number): boolean {
    const measureNodes = nodes.map((node) => node.cloneNode(true) as HTMLElement);
    state.measurePage.replaceChildren(...measureNodes);
    const fits = state.measurePage.scrollHeight <= maxPageHeight + 1;
    state.measurePage.replaceChildren();
    return fits;
  }

  private measureHudSubviewNodeHeight(state: HudSubviewPagerState, node: HTMLElement): number {
    state.measurePage.replaceChildren(node.cloneNode(true));
    const height = state.measurePage.scrollHeight;
    state.measurePage.replaceChildren();
    return height;
  }

  private createHudSubviewNode(block: HudSubviewBlockDescriptor, bodyTextOverride?: string): HTMLElement {
    if (block.type === 'intro') {
      const intro = document.createElement('p');
      intro.className = 'privacy-intro';
      intro.textContent = bodyTextOverride ?? block.bodyText ?? '';
      return intro;
    }

    if (block.type === 'action') {
      const clone = block.source.cloneNode(true) as HTMLElement;
      this.stripHudSubviewIdentifiers(clone);
      const actionButton = clone.querySelector<HTMLButtonElement>('button');
      if (actionButton) {
        actionButton.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.elements.hudNav.debugForceButton.click();
          this.scheduleHudSubviewPagination(true);
        });
      }
      return clone;
    }

    const item = document.createElement('div');
    item.className = 'privacy-item';

    const kicker = document.createElement('span');
    kicker.className = 'privacy-kicker';
    kicker.textContent = block.kickerText ?? '';

    const title = document.createElement('strong');
    title.className = 'privacy-title';
    title.textContent = bodyTextOverride ?? block.bodyText ?? '';

    item.append(kicker, title);
    return item;
  }

  private stripHudSubviewIdentifiers(node: HTMLElement): void {
    node.removeAttribute('id');
    node.removeAttribute('aria-hidden');
    node.removeAttribute('inert');
    node.hidden = false;

    node.querySelectorAll<HTMLElement>('[id], [aria-hidden], [inert], [hidden]').forEach((element) => {
      element.removeAttribute('id');
      element.removeAttribute('aria-hidden');
      element.removeAttribute('inert');
      element.hidden = false;
    });
  }

  private createHudSubviewFallbackNode(): HTMLElement {
    const fallback = document.createElement('div');
    fallback.className = 'privacy-item';
    const body = document.createElement('strong');
    body.className = 'privacy-title';
    body.textContent = '...';
    fallback.appendChild(body);
    return fallback;
  }

  private setHudSubviewPage(state: HudSubviewPagerState, pageIndex: number): void {
    const previousIndex = state.currentPage;
    const maxIndex = Math.max(0, state.pages.length - 1);
    const nextIndex = Math.min(maxIndex, Math.max(0, pageIndex));
    state.currentPage = nextIndex;

    state.pages.forEach((page, index) => {
      page.classList.toggle('is-active', index === nextIndex);
      page.hidden = index !== nextIndex;
    });

    const hasMultiplePages = state.pageCount > 1;
    state.pager.classList.toggle('has-multiple-pages', hasMultiplePages);
    state.prevButton.disabled = !hasMultiplePages || nextIndex === 0;
    state.nextButton.disabled = !hasMultiplePages || nextIndex === maxIndex;
    state.prevButton.tabIndex = hasMultiplePages ? 0 : -1;
    state.nextButton.tabIndex = hasMultiplePages ? 0 : -1;
    state.status.hidden = !hasMultiplePages;
    state.status.textContent = hasMultiplePages
      ? `${String(nextIndex + 1).padStart(2, '0')} / ${String(state.pageCount).padStart(2, '0')}`
      : '';

    if (hasMultiplePages && nextIndex !== previousIndex) {
      this.playHudSubviewPagerTransition(state);
    }
  }

  private updateHudSubviewPagerLabels(state: HudSubviewPagerState): void {
    const { ui } = this.locale.getActiveLocaleBundle();
    state.prevButton.setAttribute('aria-label', ui.previousPageAria);
    state.nextButton.setAttribute('aria-label', ui.nextPageAria);
  }

  private playHudSubviewPagerTransition(state: HudSubviewPagerState): void {
    const activePage = state.pages[state.currentPage];
    if (!activePage) {
      return;
    }

    if (state.effectTimeout) {
      window.clearTimeout(state.effectTimeout);
      state.effectTimeout = 0;
    }

    activePage.classList.remove('is-hacker-transition');
    state.status.classList.remove('is-hacker-transition');
    state.prevButton.classList.remove('is-hacker-transition');
    state.nextButton.classList.remove('is-hacker-transition');

    // Restart the short transition sequence reliably for rapid next/prev taps.
    void activePage.offsetWidth;
    void state.status.offsetWidth;

    activePage.classList.add('is-hacker-transition');
    state.status.classList.add('is-hacker-transition');
    state.prevButton.classList.add('is-hacker-transition');
    state.nextButton.classList.add('is-hacker-transition');

    const statusText = state.status.textContent ?? '';
    if (statusText) {
      this.textEffectManager.setTextContent(state.status, statusText, true, true);
    }

    const kickers = Array.from(activePage.querySelectorAll<HTMLElement>('.privacy-kicker'));
    kickers.slice(0, 6).forEach((element, index) => {
      const target = element.dataset.originalText || element.textContent || '';
      if (!element.dataset.originalText) {
        element.dataset.originalText = target;
      }

      window.setTimeout(() => {
        this.textEffectManager.setTextContent(element, target, true, true);
      }, index * 28);
    });

    state.effectTimeout = window.setTimeout(() => {
      activePage.classList.remove('is-hacker-transition');
      state.status.classList.remove('is-hacker-transition');
      state.prevButton.classList.remove('is-hacker-transition');
      state.nextButton.classList.remove('is-hacker-transition');
      state.effectTimeout = 0;
    }, 340);
  }

  public syncToggledButtonLabels(): void {
    const bundle = this.locale.getActiveLocaleBundle();
    const { ui } = bundle;
    const isAboutOpen = this.activeHudSubView === 'about';
    const isPolicyOpen = this.activeHudSubView === 'policy';

    // Update additional label with conditional hint
    const isCooldownActive = Date.now() < this.hudSubViewCooldown;
    const additionalLabelText = isCooldownActive
      ? `${ui.additionalOptions} ${ui.additionalOptionsHint}`
      : ui.additionalOptions;

    if (this.elements.hudNav.additionalLabel.textContent !== additionalLabelText) {
      this.elements.hudNav.additionalLabel.textContent = additionalLabelText;
    }
    const aboutLabel = isAboutOpen ? bundle.ui.aboutCloseLabel : bundle.ui.aboutLabel;
    const policyLabel = isPolicyOpen ? bundle.ui.policyCloseLabel : bundle.ui.policyLabel;

    if (this.elements.hudNav.aboutLabel.textContent !== aboutLabel) {
      this.textEffectManager.setTextContent(this.elements.hudNav.aboutLabel, aboutLabel, true);
    }

    if (this.elements.hudNav.policyLabel.textContent !== policyLabel) {
      this.textEffectManager.setTextContent(this.elements.hudNav.policyLabel, policyLabel, true);
    }

    if (this.diagnostics) {
      const isDiagOpen = this.diagnostics.isDiagnosticsOpen();
      const diagLabel = isDiagOpen ? bundle.ui.systemOverlayOn : bundle.ui.systemOverlayOff;
      const labelEl = this.elements.hudNav.debugForceButton.querySelector('.topbar-chip-label, .hud-nav-label');
      if (labelEl && labelEl.textContent !== diagLabel) {
        this.textEffectManager.setTextContent(labelEl as HTMLElement, diagLabel, true);
      }
    }
  }

  public syncOrbitToggleLabel(): void {
    const bundle = this.locale.getActiveLocaleBundle();
    const is4DMode = this.controller?.is4DMode() ?? false;
    const label = !is4DMode && this.hudOrbitsVisible ? bundle.ui.orbitToggleActive : bundle.ui.orbitToggleInactive;
    this.elements.hudNav.orbitToggleLabel.textContent = label;
    this.syncToggledButtonLabels();
  }

  public syncHudNavigationMode(): void {
    const is4DMode = this.controller?.is4DMode() ?? false;

    if (is4DMode && this.hudOrbitsVisible) {
      this.hudOrbitsVisible = false;
      this.persistOrbitVisibility();
    }

    this.elements.hudNav.panel.classList.toggle('is-section-navigation-hidden', is4DMode);
    this.elements.hudNav.orbitToggleButton.hidden = is4DMode;
    this.applyHudOrbitVisibility();
  }

  private updateHudNavigationHeader(travelLocked: boolean, focusSectionTitle: string, is4DMode: boolean): void {
    const bundle = this.locale.getActiveLocaleBundle();
    const nextKicker = travelLocked ? bundle.ui.hudTravelLineOne : bundle.ui.sceneNavigation;
    const nextTitle = travelLocked
      ? focusSectionTitle
      : is4DMode
        ? bundle.ui.jumpAcrossCards
        : bundle.ui.jumpAcrossSections;

    this.elements.hudNav.panel.classList.toggle('is-traveling', travelLocked);

    if (this.elements.hudNav.kicker.textContent !== nextKicker) {
      this.elements.hudNav.kicker.textContent = nextKicker;
    }

    if (this.elements.hudNav.title.textContent !== nextTitle) {
      this.elements.hudNav.title.textContent = nextTitle;
    }
  }

  private renderHudNavigation(): void {
    if (!this.controller) return;
    this.syncHudNavigationMode();
    const targets = this.controller.getSceneNavigationTargets();
    const travelLocked = this.hudNavigationTravelUntil > performance.now();
    const focus = travelLocked && this.hudNavigationFrozenFocus
      ? this.hudNavigationFrozenFocus
      : this.controller.getActiveHudNavigationFocus();
    this.elements.hudNav.panel.classList.toggle('is-traveling', travelLocked);
    const is2DMode = this.controller.is2DMode();
    const is4DMode = this.controller.is4DMode();
    const canNavigateSections = !is4DMode;
    const canNavigateCards = true;
    this.elements.hudNav.panel.classList.toggle('is-scene-navigation-disabled', false);
    this.updateHudNavigationHeader(travelLocked, focus.section, is4DMode);
    const activeSection = targets.find((section) => section.section === focus.section) ?? targets[0] ?? null;
    const activeCards = activeSection?.cards ?? [];

    const targetsSignature = targets
      .map((section) =>
        `${section.section}:${Math.round(section.anchor)}:${section.cards.map((card) => `${card.cardIndex}-${Math.round(card.anchor)}`).join(',')}`
      )
      .join('|');
    const signature = `${focus.section}:${focus.card}:${is2DMode}:${is4DMode}:${this.locale.getActiveLocale()}:${targetsSignature}`;
    if (signature === this.lastHudNavSignature) {
      this.lastHudNavRenderAt = performance.now();
      return;
    }
    this.lastHudNavSignature = signature;
    const tree = this.elements.hudNav.tree;
    tree.replaceChildren();
    this.renderHudOrbit(
      this.elements.hudOrbit.sections,
      canNavigateSections
        ? targets.map((section) => ({
          active: focus.section === section.section,
          disabled: false,
          label: section.section,
          onClick: () => {
            const target = this.controller?.getSectionNavigationTarget(section.section) ?? null;
            if (!target) {
              return;
            }

            this.scrollToNavigationAnchor(target.anchor, { immediate: false });

            if (is2DMode && target.cardIndex !== null) {
              this.controller?.focusCardIn2D(target.cardIndex, false);
            }
          }
        }))
        : [],
      'left'
    );
    this.renderHudOrbit(
      this.elements.hudOrbit.cards,
      activeCards.map((card) => ({
        active: focus.card === card.card,
        disabled: !canNavigateCards,
        label: card.card,
        onClick: () => {
          if (!canNavigateCards) {
            return;
          }
          this.navigateToHudCard(card.cardIndex, { openCard: true, closeNavigation: false });
        }
      })),
      'right'
    );

    targets.forEach(section => {
      const sectionEl = document.createElement('div');
      sectionEl.className = 'hud-nav-section';
      const sectionIsActive = focus.section === section.section;
      sectionEl.classList.toggle('is-active-scope', sectionIsActive);

      const sectionButton = document.createElement('button');
      sectionButton.type = 'button';
      sectionButton.className = 'hud-nav-section-button';
      sectionButton.disabled = !canNavigateSections;
      sectionButton.classList.toggle('is-active', sectionIsActive);
      sectionButton.classList.toggle('is-disabled', !canNavigateSections);
      sectionButton.innerHTML = `<span class="hud-nav-section-kicker">SECTION</span><strong>${section.section}</strong>`;
      sectionButton.addEventListener('click', () => {
        if (!canNavigateSections) {
          return;
        }

        const target = this.controller?.getSectionNavigationTarget(section.section) ?? null;
        if (!target) {
          return;
        }

        this.navigateToHudSection(
          target.anchor,
          target.cardIndex ?? undefined,
          {
            section: section.section,
            card: section.cards[0]?.card ?? focus.card
          }
        );
      });

      const cardsEl = document.createElement('div');
      cardsEl.className = 'hud-nav-cards';
      sectionEl.classList.toggle('is-cards-only', is4DMode);

      section.cards.forEach(card => {
        const cardEl = document.createElement('button');
        const cardIsActive = !is2DMode && sectionIsActive && focus.card === card.card;
        cardEl.className = 'hud-nav-card';
        cardEl.disabled = !canNavigateCards;
        cardEl.classList.toggle('is-active', cardIsActive);
        cardEl.classList.toggle('is-disabled', !canNavigateCards);
        cardEl.textContent = card.card;
        cardEl.addEventListener('click', () => {
          if (!canNavigateCards) {
            return;
          }
          this.navigateToHudCard(card.cardIndex, { openCard: true, closeNavigation: true });
        });
        cardsEl.appendChild(cardEl);
      });

      if (canNavigateSections) {
        sectionEl.appendChild(sectionButton);
      }
      sectionEl.appendChild(cardsEl);
      tree.appendChild(sectionEl);
    });

    this.lastHudNavRenderAt = performance.now();
  }

  private renderHudOrbit(
    root: HTMLElement,
    entries: Array<{ active: boolean; disabled?: boolean; label: string; onClick: () => void }>,
    side: 'left' | 'right'
  ): void {
    root.classList.toggle('hud-orbit--left', side === 'left');
    root.classList.toggle('hud-orbit--right', side === 'right');

    let kicker = root.querySelector<HTMLElement>('.hud-orbit__kicker');
    if (!kicker) {
      kicker = document.createElement('span');
      kicker.className = 'hud-orbit__kicker';
      root.appendChild(kicker);
    }

    let track = root.querySelector<HTMLElement>('.hud-orbit__track');
    if (!track) {
      track = document.createElement('div');
      track.className = 'hud-orbit__track';
      root.appendChild(track);
    }

    let tree = root.querySelector<HTMLElement>('.hud-orbit__tree');
    if (!tree) {
      tree = document.createElement('div');
      tree.className = 'hud-orbit__tree';
      root.appendChild(tree);
    }

    kicker.style.display = 'none';

    if (entries.length === 0) {
      tree.replaceChildren();
      return;
    }

    const count = entries.length;
    const activeIndex = Math.max(0, entries.findIndex((entry) => entry.active));
    const nextLabels = new Set();
    
    // We want exactly 5 slots: -2, -1, 0, 1, 2 relative to activeIndex
    const slots = [-2, -1, 0, 1, 2];
    const existingButtons = new Map(
      Array.from(tree.querySelectorAll<HTMLButtonElement>('.hud-orbit__item')).map((button) => [button.dataset.key ?? '', button])
    );

    slots.forEach((relativeSlot) => {
      // Map slot to actual entry index with wrap-around
      const entryIndex = (activeIndex + relativeSlot + count * 10) % count;
      const entry = entries[entryIndex];
      const slotKey = `${entry.label}_${relativeSlot}`;
      nextLabels.add(slotKey);

      let button = existingButtons.get(slotKey);
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'hud-orbit__item';
        button.innerHTML = `<span class="hud-orbit__dot" aria-hidden="true"></span><span class="hud-orbit__label"></span>`;
      }

      button.dataset.key = slotKey;
      button.dataset.label = entry.label;
      button.onclick = entry.onClick;
      button.disabled = entry.disabled === true;
      button.querySelector<HTMLElement>('.hud-orbit__label')!.textContent = entry.label;
      button.classList.toggle('is-active', relativeSlot === 0);
      button.classList.toggle('is-disabled', entry.disabled === true);
      button.setAttribute('aria-pressed', relativeSlot === 0 ? 'true' : 'false');

      const relativeIndex = relativeSlot;
      const maxVisibleDistance = 3.0;
      const centerY = 236;
      const stepY = 74;
      const baseX = 8;
      const radiusX = 132;

      const clampedDistance = Math.min(Math.abs(relativeIndex), maxVisibleDistance);
      const normalizedDistance = Math.min(1, clampedDistance / maxVisibleDistance);
      const curvature = 1 - Math.pow(normalizedDistance, 1.45);
      const x = Math.round(baseX + curvature * radiusX);
      const y = Math.round(centerY + relativeIndex * stepY);
      const isActive = relativeSlot === 0;
      const opacity = isActive ? 1 : Math.max(0.12, 0.54 - normalizedDistance * 0.42);
      const scale = isActive ? 1 : 0.9 - normalizedDistance * 0.12;
      const blur = isActive ? 0 : normalizedDistance * 1.8;

      StyleAdapter.setNumericProperty(button, '--orbit-x', x, 'px');
      StyleAdapter.setNumericProperty(button, '--orbit-y', y, 'px');
      StyleAdapter.setNumericProperty(button, '--orbit-opacity', opacity);
      StyleAdapter.setNumericProperty(button, '--orbit-scale', scale);
      StyleAdapter.setNumericProperty(button, '--orbit-blur', blur, 'px');
      StyleAdapter.setNumericProperty(button, '--orbit-translate-y', y, 'px');
      StyleAdapter.setNumericProperty(button, '--orbit-distance', normalizedDistance);
      StyleAdapter.setNumericProperty(button, '--orbit-sign', side === 'left' ? 1 : -1);

      button.classList.toggle('is-dimmed', !isActive);
      button.classList.toggle('is-hidden-orbit', false);
      button.style.zIndex = isActive ? '3' : String(2 - Math.min(1, Math.round(clampedDistance)));

      tree.appendChild(button);
      existingButtons.delete(slotKey);
    });

    existingButtons.forEach((button) => {
      button.remove();
    });
  }

  private closeHudNavigation(): void {
    this.hudSubviewPagers.forEach((state) => {
      if (state.effectTimeout) {
        window.clearTimeout(state.effectTimeout);
        state.effectTimeout = 0;
      }
    });

    if (this.activeHudSubView) {
      // const view = this.activeHudSubView;
      this.activeHudSubView = null;
      if (this.hudSubViewUpdateInterval) {
        window.clearInterval(this.hudSubViewUpdateInterval);
        this.hudSubViewUpdateInterval = 0;
      }

      this.elements.hudNav.aboutRoot.style.setProperty('display', 'none', 'important');
      this.elements.hudNav.policyRoot.style.setProperty('display', 'none', 'important');
      this.elements.hudNav.tree.style.setProperty('display', '', '');
      this.elements.hudNav.header.style.setProperty('display', '', '');
    }

    this.setHudNavigationTravelState(false, null);
    this.cachedIsNavOpen = false;
    document.body.classList.remove('hud-nav-open');
    this.elements.hudFocusTrigger.setAttribute('aria-expanded', 'false');
    this.elements.hudFocusTrigger.focus({ preventScroll: true });
    this.elements.hudNav.overlay.setAttribute('aria-hidden', 'true');
    this.lenis?.start();
    this.hudSubViewCooldown = 0;
    this.hudSubviewPaginationForce = false;
  }

  private startLoop(): void {
    this.running = true;
    const frame = (time: number) => {
      if (!this.running) return;

      const frameStartedAt = performance.now();
      let perf = { backgroundScale: 0.36, frameInterval: 0, pixelScale: 1, transitionActive: false };

      this.scroll.update(time);
      const scrollVelocity = Math.abs(this.scroll.getTargetVelocity());
      if (scrollVelocity > 0.0035) {
        this.lastInteractionBurstAt = time;
      }

      if (this.controller) {
        perf = this.controller.getPerformanceProfile();
        const forceResponsiveRate =
          scrollVelocity > 0.0035 ||
          time - this.lastInteractionBurstAt < 1400;
        const shouldRunControllerPass =
          perf.frameInterval <= 0 ||
          forceResponsiveRate ||
          time - this.lastControllerRenderAt >= perf.frameInterval;

        if (shouldRunControllerPass) {
          const controllerStartedAt = performance.now();
          this.controller.render(time);
          this.telemetryState.controllerMs = performance.now() - controllerStartedAt;
          this.lastControllerRenderAt = time;
          perf = this.controller.getPerformanceProfile();
        } else {
          this.telemetryState.controllerMs = 0;
        }

        if (this.activeMode !== this.controller.getViewMode()) {
          this.activeMode = this.controller.getViewMode() as '2d' | '3d' | '4d';
          this.modeSelector.syncModeToggleState();
        }
      }

      const backgroundInterval = this.prefersMobilePerformanceBudget
        ? (perf.transitionActive ? 1000 / 24 : 1000 / 18)
        : perf.transitionActive
          ? 1000 / 36
          : 0;
      if (!backgroundInterval || time - this.lastBackgroundRenderAt >= backgroundInterval) {
        const backgroundStartedAt = performance.now();
        this.liquidGradient?.update(time, this.scroll.getTargetVelocity());
        this.lastBackgroundRenderAt = time;
        this.telemetryState.backgroundMs = performance.now() - backgroundStartedAt;
      } else {
        this.telemetryState.backgroundMs = 0;
      }

      const isInteracting = scrollVelocity > 0.0035 || time - this.lastInteractionBurstAt < 1400;
      const isMotionActive = perf.transitionActive || isInteracting;
      const shouldRefreshHud = isMotionActive ? (time - this.lastHudNavRenderAt > 120) : (time - this.lastHudNavRenderAt > 2400);

      const uiStartedAt = performance.now();
      this.syncHudNavigationMode();

      if (shouldRefreshHud) {
        this.renderHudNavigation();
      }

      // Sync cached body class state once per frame (avoids repeated classList.contains in hot paths)
      this.cachedHasExpandedCard = document.body.classList.contains('has-expanded-card');

      this.updateTopbarLoaderKicker();

      this.updateQualities(perf, scrollVelocity);
      this.cursor.update();
      this.diagnostics?.update(time);
      this.audio.updateAudioReactiveState(time);
      this.updateHudSpectrum();
      this.telemetryState.uiMs = performance.now() - uiStartedAt;

      if (this.controller) {
        const renderTelemetry = this.controller.getLastRenderTelemetry();
        this.telemetryState.controllerPreludeMs = renderTelemetry.preludeMs;
        this.telemetryState.controllerParticlesMs = renderTelemetry.particlesMs;
        this.telemetryState.controllerFourDMs = renderTelemetry.fourDMs;
        this.telemetryState.controllerItemsMs = renderTelemetry.itemsMs;
        this.telemetryState.controllerSectionFrameMs = renderTelemetry.sectionFrameMs;
        this.telemetryState.controllerInteractionMs = renderTelemetry.interactionMs;
        this.telemetryState.controllerHudCommitMs = renderTelemetry.hudCommitMs;
        this.telemetryState.controllerVisibleItems = renderTelemetry.visibleItems;
        this.telemetryState.controllerVisibleCards = renderTelemetry.visibleCards;
        this.telemetryState.controllerVisibleTexts = renderTelemetry.visibleTexts;
        this.telemetryState.controllerSpectrumCards = renderTelemetry.spectrumCards;
        this.telemetryState.controllerTransitionActive = renderTelemetry.transitionActive;
      }

      this.telemetryState.frameMs = performance.now() - frameStartedAt;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  private updateQualities(perf: { backgroundScale: number; pixelScale: number; transitionActive: boolean }, velocity = 0): void {
    PixelCanvas.setTransitionMode(perf.transitionActive);

    // Safari Optimization: Adaptive target downscaling when under performance stress or high velocity
    let stressMultiplier = 1.0;
    if (IS_SAFARI) {
      if (document.body.classList.contains('is-frame-stressed')) {
        stressMultiplier = IS_IOS ? 0.78 : 0.84;
      }
      
      // Extreme Stability: If scrolling fast on Safari, drop background quality by an additional 50%
      // to prioritize foreground fluidity and prevent compositing hangs.
      if (velocity > 0.22) {
        stressMultiplier *= 0.5;
      }
    }

    if (this.prefersMobilePerformanceBudget) {
      stressMultiplier *= document.body.classList.contains('is-frame-stressed') ? 0.82 : 0.92;

      if (velocity > 0.12) {
        stressMultiplier *= 0.82;
      }
    }

    if (!perf.transitionActive) {
      const targetPixel = perf.pixelScale * stressMultiplier;
      const nextPixel = this.lastPixelQuality + (targetPixel - this.lastPixelQuality) * 0.12;
      if (Math.abs(nextPixel - this.lastPixelQuality) > 0.01) {
        PixelCanvas.setGlobalQuality(nextPixel);
        this.lastPixelQuality = nextPixel;
      }
    }

    const targetBg = perf.backgroundScale * stressMultiplier;
    const nextBg = this.lastBackgroundQuality + (targetBg - this.lastBackgroundQuality) * 0.1;
    if (Math.abs(nextBg - this.lastBackgroundQuality) > 0.01) {
      this.liquidGradient?.setQuality(nextBg);
      this.lastBackgroundQuality = nextBg;
    }
  }

  private resolvePreferredStartupMode(): '2d' | '3d' {
    const isLowSpec = ((navigator as { deviceMemory?: number }).deviceMemory ?? 8) <= 4 || navigator.hardwareConcurrency <= 4;
    return (window.innerWidth <= 720 || isLowSpec) ? '2d' : '3d';
  }

  destroy(): void {
    this.running = false;
    if (this.loopMetricsUpdateRaf) {
      window.cancelAnimationFrame(this.loopMetricsUpdateRaf);
      this.loopMetricsUpdateRaf = 0;
    }
    if (this.hudSubviewPaginationRaf) {
      window.cancelAnimationFrame(this.hudSubviewPaginationRaf);
      this.hudSubviewPaginationRaf = 0;
    }
    this.hudSubviewPagers.forEach((state) => {
      if (state.effectTimeout) {
        window.clearTimeout(state.effectTimeout);
        state.effectTimeout = 0;
      }
    });
    this.modeSelectorTeardown?.();
    this.modeSelectorTeardown = null;
    this.localeTeardown?.();
    this.localeTeardown = null;
    this.debugModeHotkeysTeardown?.();
    this.debugModeHotkeysTeardown = null;
    this.elements.cardChromeLayer.removeEventListener('webglcontextlost', this.handleCardChromeContextLost, false);
    PixelCanvas.setTransitionMode(false);
    this.lenis?.destroy();
    this.controller?.destroy();
    this.liquidGradient?.destroy();
    this.cursor.destroy();
    this.diagnostics?.destroy();
    this.scroll.destroy();
  }

  private setupDebugModeHotkeys(): (() => void) | null {
    if (!import.meta.env.DEV) {
      return null;
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (!event.altKey || !(event.ctrlKey || event.metaKey)) {
        return;
      }

      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement ||
        activeElement?.isContentEditable
      ) {
        return;
      }

      const mode =
        event.key === '2'
          ? '2d'
          : event.key === '3'
            ? '3d'
            : event.key === '4'
              ? '4d'
              : null;

      if (!mode || !this.controller?.isIntroComplete()) {
        return;
      }

      event.preventDefault();
      this.controller.setViewMode(mode);
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }

  private ensureDiagnostics(): ManifoldAppDiagnostics | null {
    if (this.diagnostics) {
      return this.diagnostics;
    }

    // We only allow initialization if debug is enabled via environment or if forced
    // In this context, we'll allow it when requested but pass dev-mode flag
    this.diagnostics = new ManifoldAppDiagnostics(
      this.elements.diagnostics,
      this.telemetryState,
      () => this.controller,
      () => this.locale.getActiveLocale(),
      import.meta.env.DEV
    );
    this.diagnostics.setup();
    return this.diagnostics;
  }

  private detectGpu(): string {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return 'SOFTWARE_EMULATION';
      const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        return `${renderer} (${'gpu' in navigator ? 'WebGPU' : 'WebGL2'})`;
      }
      return `GENERIC_ACCELERATOR (${'gpu' in navigator ? 'WebGPU' : 'WebGL2'})`;
    } catch {
      return 'HARDWARE_UNKNOWN';
    }
  }

  private updateRuntimeStatus(): void {
    if (this.activeHudSubView !== 'about') return;

    const ua = navigator.userAgent;
    const platform = (navigator as Navigator & { userAgentData?: { platform: string } }).userAgentData?.platform || navigator.platform;
    const cores = navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} Cores` : 'Cores unknown';
    let browser = 'Unknown Browser';
    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';

    const res = `${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio}x`;

    const t = this.telemetryState;
    const fps = t.frameMs > 0 ? (1000 / t.frameMs).toFixed(0) : '60';
    const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    const heap = memory
      ? `JS HEAP: ${Math.round(memory.usedJSHeapSize / 1048576)}MB / ${Math.round(memory.jsHeapSizeLimit / 1048576)}MB`
      : 'Memory data restricted';

    this.elements.hudNav.aboutRuntime.textContent = `${browser} on ${platform} // ${cores} // ${res} // ${fps} FPS // ${heap}`;
  }

  private updateManifoldState(): void {
    if (this.activeHudSubView !== 'about' || !this.controller) return;
    const spin = `[ ${(Math.random() * 2).toFixed(2)}rad, ${(Math.random() * -1).toFixed(2)}rad, ${(Math.random()).toFixed(2)}rad ]`;
    this.elements.hudNav.debugManifold.textContent = `Spin ${spin} // 16 Active Vertices`;
  }

  private updateAuthorStatus(): void {
    const bundle = this.locale.getActiveLocaleBundle();
    const statuses = bundle.ui.aboutContent.authorStatus;
    const now = new Date();

    const krakowTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Warsaw',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(now);

    const krakowHour = parseInt(new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Warsaw',
      hour: 'numeric',
      hour12: false
    }).format(now), 10);

    let status = statuses.chilling;
    if (krakowHour >= 2 && krakowHour < 8) {
      status = statuses.sleeping;
    } else if (krakowHour >= 8 && krakowHour < 9) {
      status = statuses.breakfast;
    } else if (krakowHour >= 9 && krakowHour < 17) {
      status = statuses.working;
    } else if (krakowHour >= 17 && krakowHour < 18) {
      status = statuses.chillingPostWork;
    } else if (krakowHour >= 18 && krakowHour < 20) {
      status = statuses.walking;
    }

    this.elements.hudNav.aboutTime.textContent = `${krakowTime} (Krakow, PL) // 50°03′42″N 19°56′15″E // [ ${status} ]`;
  }

  public toggleHudSubView(view: HudSubviewView): void {
    const {
      aboutTrigger, aboutRoot,
      policyTrigger, policyRoot,
      tree, header, orbitToggleButton, panel
    } = this.elements.hudNav;
    const { audioButton, exitButton } = this.elements;

    const isClosing = this.activeHudSubView === view;
    this.activeHudSubView = isClosing ? null : view;

    // Start transition
    panel.classList.add('is-switching');
    
    // Lock current height for the imminent transition
    const startHeight = panel.getBoundingClientRect().height;

    // Wait exactly 200ms for opacity to fade out
    window.setTimeout(() => {
      const isExtraOpen = this.activeHudSubView !== null;
      
      // Fast DOM display swaps
      tree.style.setProperty('display', isExtraOpen ? 'none' : '', isExtraOpen ? 'important' : '');
      header.style.setProperty('display', isExtraOpen ? 'none' : '', isExtraOpen ? 'important' : '');
      aboutRoot.style.setProperty('display', this.activeHudSubView === 'about' ? 'flex' : 'none', 'important');
      policyRoot.style.setProperty('display', this.activeHudSubView === 'policy' ? 'flex' : 'none', 'important');

      if (isExtraOpen) {
        if (!this.hudSubViewUpdateInterval) {
          this.hudSubViewUpdateInterval = window.setInterval(() => {
            if (this.activeHudSubView === 'about') {
              this.updateAuthorStatus();
              this.updateRuntimeStatus();
              this.updateManifoldState();
              this.scheduleHudSubviewPagination();
            }
          }, 1000);
        }
        if (this.activeHudSubView === 'about') {
          this.updateAuthorStatus();
          this.updateRuntimeStatus();
          this.updateManifoldState();
        }

        const pagerState = this.hudSubviewPagers.get(this.activeHudSubView);
        if (pagerState) {
          pagerState.currentPage = 0;
        }
        this.repaginateHudSubview(this.activeHudSubView, true);
      } else {
        if (this.hudSubViewUpdateInterval) {
          window.clearInterval(this.hudSubViewUpdateInterval);
          this.hudSubViewUpdateInterval = 0;
        }
      }

      // Let browser natively compute the new intrinsic height
      const targetHeight = panel.getBoundingClientRect().height;
      
      // Execute a high-priority hardware-accelerated animation via Web Animations API.
      // This completely overrides the sluggish CSS transitions and prevents main thread stutter.
      if (startHeight !== targetHeight) {
        panel.animate([
          { height: `${startHeight}px` },
          { height: `${targetHeight}px` }
        ], {
          duration: 320,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          fill: 'none' // Ensures property reverts to pure CSS "auto" height instantly after finishing
        });
      }

      // Re-enable visibility (starts fade in)
      panel.classList.remove('is-switching');

      // Start High-Performance Staggered Text Scramble
      const root =
        this.activeHudSubView === 'about'
          ? aboutRoot.querySelector<HTMLElement>('.hud-subview-page.is-active') ?? aboutRoot
          : this.activeHudSubView === 'policy'
            ? policyRoot.querySelector<HTMLElement>('.hud-subview-page.is-active') ?? policyRoot
            : header;
            
      const targetElements = Array.from(root.querySelectorAll('.privacy-kicker, .privacy-title, .privacy-intro, .hud-nav-kicker, strong'));
      
      let batchIndex = 0;
      const processBatch = () => {
        // Micro-batch 4 string mutations per frame
        const limit = Math.min(batchIndex + 4, targetElements.length);
        for (; batchIndex < limit; batchIndex++) {
          const el = targetElements[batchIndex];
          if (el instanceof HTMLElement) {
            const cleanText = el.dataset.originalText || el.textContent || '';
            if (!el.dataset.originalText) el.dataset.originalText = cleanText;
            this.textEffectManager.setTextContent(el, cleanText, true, true);
          }
        }
        if (batchIndex < targetElements.length) {
          requestAnimationFrame(processBatch);
        }
      };
      
      // Delay text manipulation to allow animation to start seamlessly
      requestAnimationFrame(() => requestAnimationFrame(processBatch));

    }, 200);

    const isExtraOpen = this.activeHudSubView !== null;
    const allButtons = [audioButton, exitButton, orbitToggleButton, aboutTrigger, policyTrigger];

    allButtons.forEach((btn) => {
      if (!btn) return;
      btn.classList.remove('is-ui-dimmed');
      btn.style.pointerEvents = '';
    });

    if (isExtraOpen) {
      allButtons.forEach((btn) => {
        if (!btn) return;
        const isActiveTrigger = (this.activeHudSubView === 'about' && btn === aboutTrigger) ||
          (this.activeHudSubView === 'policy' && btn === policyTrigger);

        if (!isActiveTrigger) {
          btn.classList.add('is-ui-dimmed');
          btn.style.pointerEvents = 'none';
        }
      });
    }

    this.syncToggledButtonLabels();
  }
}

// Bootstrap
const elements = getElements();
if (elements) {
  const app = new ManifoldApp(elements as unknown as BootElements);
  app.setup();
}

function getElements(): BootElements | null {
  const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;
  const getAny = <T extends HTMLElement>(...ids: string[]) => {
    for (const id of ids) {
      const node = get<T>(id);
      if (node) {
        return node;
      }
    }
    return null;
  };
  const sel = <T extends Element>(q: string) => document.querySelector(q) as T | null;
  const missing: string[] = [];
  const requireNode = <T>(name: string, node: T | null): T => {
    if (!node) {
      missing.push(name);
    }
    return node as T;
  };

  const ambientParticleLayer = get<HTMLCanvasElement>('ambient-particle-layer');
  const cardChromeLayer = get<HTMLCanvasElement>('card-chrome-layer');
  const contextHint = get<HTMLElement>('context-hint');
  const diagButton = get<HTMLButtonElement>('diag-toggle');
  const diagPopover = get<HTMLElement>('diag-popover');
  const diagRoot = get<HTMLElement>('diag-control');
  const perfMode = get<HTMLElement>('perf-mode');
  const advanceNext = get<HTMLButtonElement>('hud-advance-next');
  const advancePrev = get<HTMLButtonElement>('hud-advance-prev');
  const audioButton = get<HTMLButtonElement>('play-audio');
  const audioLabel = get<HTMLElement>('play-audio-label');
  const contactButton = get<HTMLButtonElement>('contact-me');
  const contactLabel = get<HTMLElement>('contact-me-label');
  const downloadCv = get<HTMLAnchorElement>('download-cv');
  const downloadCvLabel = get<HTMLElement>('download-cv-label');
  const localeButton = get<HTMLButtonElement>('toggle-locale');
  const localeLabel = get<HTMLElement>('toggle-locale-label');
  const topbarCenterHint = get<HTMLElement>('topbar-center-hint');
  const topbarCopy = get<HTMLElement>('topbar-copy');
  const topbarLoaderKicker = get<HTMLElement>('topbar-loader-kicker');
  const topbarMark = get<HTMLElement>('topbar-mark');
  const topbarRole = get<HTMLElement>('topbar-role');
  const cursorCore = sel<HTMLElement>('.custom-cursor-core');
  const cursorRoot = getAny<HTMLElement>('custom-cursor') ?? sel<HTMLElement>('.custom-cursor');
  const cursorRing = sel<HTMLElement>('.custom-cursor-ring');
  const exitButton = get<HTMLButtonElement>('exit-world');
  const hudFocusFeedback = get<HTMLElement>('hud-focus-feedback');
  const hudFocusTrigger = get<HTMLButtonElement>('hud-focus-trigger');
  const modeToggleButton = get<HTMLButtonElement>('hud-mode-toggle');
  const modeToggleLabel = get<HTMLElement>('hud-mode-toggle-label');
  const modeToggleMenu = get<HTMLElement>('hud-mode-menu');
  const modeOption2D = get<HTMLButtonElement>('hud-mode-option-2d');
  const modeOption3D = get<HTMLButtonElement>('hud-mode-option-3d');
  const modeOption4D = get<HTMLButtonElement>('hud-mode-option-4d');
  const modePicker = get<HTMLElement>('hud-mode-picker') ?? sel<HTMLElement>('.hud-mode-picker');
  const hudNavBackdrop = get<HTMLButtonElement>('hud-nav-backdrop');
  const hudNavKicker = document.getElementById('hud-nav-kicker');
  const orbitToggleButton = get<HTMLButtonElement>('toggle-hud-orbits');
  const orbitToggleLabel = get<HTMLElement>('toggle-hud-orbits-label');
  const additionalLabel = get<HTMLElement>('hud-additional-label');

  const aboutTrigger = get<HTMLButtonElement>('hud-about-trigger');
  const aboutLabel = get<HTMLElement>('hud-about-label');
  const aboutRoot = get<HTMLElement>('hud-nav-about');
  const policyTrigger = get<HTMLButtonElement>('hud-policy-trigger');
  const policyLabel = get<HTMLElement>('hud-policy-label');
  const policyRoot = get<HTMLElement>('hud-nav-policy');
  const aboutStack = getAny<HTMLElement>('about-stack', 'about-stack-label');
  const aboutTrivia = getAny<HTMLElement>('about-trivia', 'about-trivia-label');
  const aboutRuntime = getAny<HTMLElement>('about-runtime', 'about-runtime-label');
  const aboutTime = getAny<HTMLElement>('about-time', 'about-time-label');
  const policyIntro = get<HTMLElement>('policy-intro');
  const policyProcessingTitle = get<HTMLElement>('policy-processing-title');
  const policyProcessingBody = get<HTMLElement>('policy-processing-body');
  const policyStorageTitle = get<HTMLElement>('policy-storage-title');
  const policyStorageBody = get<HTMLElement>('policy-storage-body');
  const policyAudioTitle = get<HTMLElement>('policy-audio-title');
  const policyAudioBody = get<HTMLElement>('policy-audio-body');
  const policyTelemetryTitle = get<HTMLElement>('policy-telemetry-title');
  const policyTelemetryBody = get<HTMLElement>('policy-telemetry-body');
  const policyPerformanceTitle = get<HTMLElement>('policy-performance-title');
  const policyPerformanceBody = get<HTMLElement>('policy-performance-body');
  const policyContactTitle = get<HTMLElement>('policy-contact-title');
  const policyContactBody = get<HTMLElement>('policy-contact-body');
  const policyRightsTitle = get<HTMLElement>('policy-rights-title');
  const policyRightsBody = get<HTMLElement>('policy-rights-body');
  const hudNavOverlay = document.getElementById('hud-nav-overlay');
  const hudNavPanel = document.getElementById('hud-nav-panel');
  const hudNavHeader = document.getElementById('hud-nav-header');
  const hudNavTitle = document.getElementById('hud-nav-title');
  const hudNavSpectrum = document.getElementById('hud-nav-spectrum');
  const hudNavSpectrumBars = hudNavSpectrum 
    ? Array.from(hudNavSpectrum.querySelectorAll('.hud-nav-spectrum-bar')) as HTMLElement[]
    : [];
  const hudNavTree = document.getElementById('hud-nav-tree');
  const debugGpu = get<HTMLElement>('debug-gpu-name');
  const debugManifold = get<HTMLElement>('debug-manifold-data');
  const debugForceButton = get<HTMLButtonElement>('force-debug-overlay');
  const hudCardOrbit = get<HTMLElement>('hud-card-orbit-tree');
  const hudSectionOrbit = get<HTMLElement>('hud-section-orbit-tree');
  const hudRoot = sel<HTMLElement>('.hud');
  const hudCard = get<HTMLElement>('hud-card');
  const coord = get<HTMLElement>('coord');
  const coordPrefix = get<HTMLElement>('hud-coord-prefix');
  const fps = get<HTMLElement>('fps');
  const fpsLabel = get<HTMLElement>('hud-fps-label');
  const perfLabel = get<HTMLElement>('hud-perf-label');
  // const perfSidebarLabel = get<HTMLElement>('hud-perf-sidebar-label');
  const hudSection = get<HTMLElement>('hud-section');
  const velocityLabel = get<HTMLElement>('hud-velocity-label');
  const velocity = get<HTMLElement>('vel-readout');
  const introHintKicker = get<HTMLElement>('intro-hint-kicker');
  const introHintTitle = get<HTMLElement>('intro-hint-title');
  const introHint = get<HTMLElement>('intro-hint');
  const fourDWireframe = get<HTMLCanvasElement>('four-d-wireframe');
  const twoDSectionFrameLabel = get<HTMLElement>('two-d-section-frame-label');
  const twoDSectionFrameRoot = get<HTMLElement>('two-d-section-frame');
  const twoDSectionFrameKicker = get<HTMLElement>('two-d-section-frame-kicker');
  const contextHintKicker = get<HTMLElement>('context-hint-kicker');
  const contextHintTitle = get<HTMLElement>('context-hint-title');
  const liquidGradient = get<HTMLCanvasElement>('liquid-gradient') ?? sel<HTMLCanvasElement>('.liquid-gradient');
  const footerPrivacyLink = get<HTMLAnchorElement>('footer-privacy-link');
  requireNode('.hud', hudRoot);
  const scrollProxy = sel<HTMLElement>('.scroll-proxy');
  const viewport = get<HTMLElement>('viewport');
  const world = get<HTMLElement>('world');
  const exitButtonLabel = get<HTMLElement>('exit-world-label');

  requireNode('ambient-particle-layer', ambientParticleLayer);
  requireNode('card-chrome-layer', cardChromeLayer);
  requireNode('context-hint', contextHint);
  requireNode('diag-toggle', diagButton);
  requireNode('diag-popover', diagPopover);
  requireNode('diag-control', diagRoot);
  requireNode('perf-mode', perfMode);
  requireNode('hud-advance-next', advanceNext);
  requireNode('hud-advance-prev', advancePrev);
  requireNode('contact-me', contactButton);
  requireNode('contact-me-label', contactLabel);
  requireNode('download-cv', downloadCv);
  requireNode('download-cv-label', downloadCvLabel);
  requireNode('toggle-locale', localeButton);
  requireNode('toggle-locale-label', localeLabel);
  requireNode('topbar-center-hint', topbarCenterHint);
  requireNode('topbar-copy', topbarCopy);
  requireNode('topbar-loader-kicker', topbarLoaderKicker);
  requireNode('topbar-mark', topbarMark);
  requireNode('topbar-role', topbarRole);
  requireNode('custom-cursor', cursorRoot);
  requireNode('.custom-cursor-core', cursorCore);
  requireNode('.custom-cursor-ring', cursorRing);
  requireNode('exit-world', exitButton);
  requireNode('hud-focus-feedback', hudFocusFeedback);
  requireNode('hud-focus-trigger', hudFocusTrigger);
  requireNode('hud-mode-toggle', modeToggleButton);
  requireNode('hud-mode-toggle-label', modeToggleLabel);
  requireNode('hud-mode-menu', modeToggleMenu);
  requireNode('hud-mode-option-2d', modeOption2D);
  requireNode('hud-mode-option-3d', modeOption3D);
  requireNode('hud-mode-option-4d', modeOption4D);
  requireNode('hud-mode-picker', modePicker);
  requireNode('hud-nav-backdrop', hudNavBackdrop);
  requireNode('hud-nav-kicker', hudNavKicker);
  requireNode('toggle-hud-orbits', orbitToggleButton);
  requireNode('toggle-hud-orbits-label', orbitToggleLabel);
  requireNode('hud-additional-label', additionalLabel);

  requireNode('hud-about-trigger', aboutTrigger);
  requireNode('hud-about-label', aboutLabel);
  requireNode('hud-nav-about', aboutRoot);
  requireNode('hud-policy-trigger', policyTrigger);
  requireNode('hud-policy-label', policyLabel);
  requireNode('hud-nav-policy', policyRoot);
  requireNode('about-stack', aboutStack);
  requireNode('about-trivia', aboutTrivia);
  requireNode('about-runtime', aboutRuntime);
  requireNode('about-time', aboutTime);
  requireNode('policy-intro', policyIntro);
  requireNode('policy-processing-title', policyProcessingTitle);
  requireNode('policy-processing-body', policyProcessingBody);
  requireNode('policy-storage-title', policyStorageTitle);
  requireNode('policy-storage-body', policyStorageBody);
  requireNode('policy-audio-title', policyAudioTitle);
  requireNode('policy-audio-body', policyAudioBody);
  requireNode('policy-telemetry-title', policyTelemetryTitle);
  requireNode('policy-telemetry-body', policyTelemetryBody);
  requireNode('policy-performance-title', policyPerformanceTitle);
  requireNode('policy-performance-body', policyPerformanceBody);
  requireNode('policy-contact-title', policyContactTitle);
  requireNode('policy-contact-body', policyContactBody);
  requireNode('policy-rights-title', policyRightsTitle);
  requireNode('policy-rights-body', policyRightsBody);
  requireNode('hud-nav-header', hudNavHeader);
  requireNode('hud-nav-title', hudNavTitle);
  requireNode('hud-nav-kicker', hudNavKicker);
  requireNode('hud-nav-spectrum', hudNavSpectrum);
  requireNode('hud-nav-tree', hudNavTree);
  requireNode('debug-gpu-name', debugGpu);

  requireNode('debug-manifold-data', debugManifold);
  requireNode('force-debug-overlay', debugForceButton);
  requireNode('hud-card-orbit-tree', hudCardOrbit);
  requireNode('hud-section-orbit-tree', hudSectionOrbit);
  requireNode('hud-card', hudCard);
  requireNode('coord', coord);
  requireNode('hud-coord-prefix', coordPrefix);
  requireNode('fps', fps);
  requireNode('hud-fps-label', fpsLabel);
  requireNode('hud-perf-label', perfLabel);
  requireNode('hud-section', hudSection);
  requireNode('hud-velocity-label', velocityLabel);
  requireNode('vel-readout', velocity);
  requireNode('intro-hint-kicker', introHintKicker);
  requireNode('intro-hint-title', introHintTitle);
  requireNode('intro-hint', introHint);
  requireNode('four-d-wireframe', fourDWireframe);
  requireNode('two-d-section-frame-label', twoDSectionFrameLabel);
  requireNode('two-d-section-frame', twoDSectionFrameRoot);
  requireNode('two-d-section-frame-kicker', twoDSectionFrameKicker);
  requireNode('context-hint-kicker', contextHintKicker);
  requireNode('context-hint-title', contextHintTitle);
  requireNode('liquid-gradient', liquidGradient);
  requireNode('.scroll-proxy', scrollProxy);
  requireNode('viewport', viewport);
  requireNode('world', world);
  requireNode('exit-world-label', exitButtonLabel);

  if (missing.length > 0) {
    console.error('Manifold boot missing required elements:', missing.join(', '));
    return null;
  }

  return {
    ambientParticleLayer,
    cardChromeLayer,
    contextHint,
    diagnostics: {
      button: diagButton,
      popover: diagPopover,
      root: diagRoot,
      perfMode,
    },
    advanceButtons: {
      next: advanceNext,
      prev: advancePrev
    },
    audioButton,
    audioLabel,
    contactButton,
    contactLabel,
    downloadCv,
    downloadCvLabel,
    localeButton,
    localeLabel,
    topbarCenterHint,
    topbarCopy,
    topbarLoaderKicker,
    topbarMark,
    topbarRole,
    cursor: {
      core: cursorCore,
      root: cursorRoot,
      ring: cursorRing
    },
    exitButton,
    hudFocusFeedback,
    hudFocusTrigger,
    modeToggle: {
      button: modeToggleButton,
      label: modeToggleLabel,
      menu: modeToggleMenu,
      option2D: modeOption2D,
      option3D: modeOption3D,
      option4D: modeOption4D,
      picker: modePicker
    },
    hudNav: {
      backdrop: hudNavBackdrop,
      kicker: hudNavKicker,
      orbitToggleButton,
      orbitToggleLabel,
      additionalLabel,

      aboutTrigger,
      aboutLabel,
      aboutRoot,
      policyTrigger,
      policyLabel,
      policyRoot,
      aboutStack,
      aboutTrivia,
      aboutRuntime,
      aboutTime,
      policyIntro,
      policyProcessingTitle,
      policyProcessingBody,
      policyStorageTitle,
      policyStorageBody,
      policyAudioTitle,
      policyAudioBody,
      policyTelemetryTitle,
      policyTelemetryBody,
      policyPerformanceTitle,
      policyPerformanceBody,
      policyContactTitle,
      policyContactBody,
      policyRightsTitle,
      policyRightsBody,
      header: hudNavHeader,
      overlay: hudNavOverlay,
      panel: hudNavPanel,
      title: hudNavTitle,
      spectrum: hudNavSpectrum,
      spectrumBars: hudNavSpectrumBars,
      tree: hudNavTree,
      debugGpu,
      debugManifold,
      debugForceButton
    },
    hudOrbit: {
      cards: hudCardOrbit,
      sections: hudSectionOrbit
    },
    hud: {
      root: hudRoot!,
      card: hudCard!,
      coord,
      coordPrefix,
      fps,
      fpsLabel,
      perfMode,
      perfLabel,
      section: hudSection,
      velocityLabel,
      velocity
    },
    introHintKicker,
    introHintTitle,
    introHint,
    fourDWireframe,
    twoDSectionFrame: {
      label: twoDSectionFrameLabel,
      root: twoDSectionFrameRoot
    },
    twoDSectionFrameKicker,
    contextHintKicker,
    contextHintTitle,
    liquidGradient,
    footerPrivacyLink,
    scrollProxy,
    viewport,
    world,
    exitButtonLabel
  } as unknown as BootElements;
}
