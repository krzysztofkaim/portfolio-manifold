import { clamp, lerp } from '../utils/math';
import { StyleAdapter } from '../utils/StyleAdapter';
import { IS_SAFARI, SAFARI_VERSION } from '../utils/browserDetection';
import {
  MANIFOLD_MOBILE_BREAKPOINT,
  MANIFOLD_SCENE_CONFIG,
  MANIFOLD_SECTION_HEADINGS,
  MANIFOLD_SECTION_TONES,
  CARD_ICON_PATHS,
  CARD_PIXEL_PRESETS,
  createManifoldSceneRuntimeConfig,
  type ManifoldSceneRuntimeConfig
} from '../config/manifold/ManifoldSceneConfig';
import {
  getLocalizedCvCards,
  getLocalizedFeaturedIntroCard,
  getLocalePerfModeLabel,
  getManifoldLocaleBundle,
  localizeSectionTitle,
  type ManifoldLocale
} from '../i18n/manifoldLocale';
import { createManifoldAtlasState, createManifoldPhaseState } from '../ui/manifold/ManifoldState';
import type { IDomAdapter, IRuntimeAdapter } from '../ui/ports';
import { pretextLayoutService } from '../ui/text/PretextLayoutService';
import { ObjectPool } from '../utils/ObjectPool';
import { computeDampedLerp, computeCardProjectionMatrix, easeInOutCubic, projectMatrix3dPoint } from './manifold/HyperMath';
import { ManifoldCardChromeRenderer, type CardChromeInstance } from './manifold/ManifoldCardChromeRenderer';
import { MANIFOLD_CONSTANTS } from './manifold/ManifoldConstants';
import { ManifoldHudRenderer, type ManifoldHudSnapshot } from './manifold/ManifoldHudRenderer';
import { ManifoldHintController } from './manifold/ManifoldHintController';
import { ManifoldInputController } from './manifold/ManifoldInputController';
import { ManifoldInputService } from './manifold/ManifoldInputService';
import { ManifoldEnvironmentManager } from './manifold/ManifoldEnvironmentManager';
import type { ManifoldModeObserver } from './manifold/ManifoldModeObserver';
import { ManifoldCanvasParticleField } from './manifold/ManifoldCanvasParticleField';
import { ManifoldCardExpandController } from './manifold/ManifoldCardExpandController';
import { ManifoldDomRenderer } from './manifold/ManifoldDomRenderer';
import { ManifoldPhysicsOrchestrator } from './manifold/ManifoldPhysicsOrchestrator';
import { ManifoldPhysicsRuntime } from './manifold/ManifoldPhysicsRuntime';
import { ManifoldTextEffectManager } from './manifold/ManifoldTextEffectManager';
import { scheduleCardTitleMarqueeSync } from './manifold/CardTitleMarquee';
import {
  findCardItemByIndex,
  getAdjacentCardNavigation as resolveAdjacentCardNavigation,
  getCardNavigationAnchor as resolveCardNavigationAnchor,
  getCentered2DCard,
  getEffectiveFocusCard,
  getHudFocus,
  getSectionNavigationTargets as resolveSectionNavigationTargets
} from './manifold/ManifoldNavigation';
import { computeFeaturedCardPose } from './manifold/ManifoldPhysics';
import { ManifoldScrollSystem } from './manifold/ManifoldScrollSystem';
import { ManifoldTwoDController } from './manifold/ManifoldTwoDController';
import { ManifoldTransitionManager } from './manifold/ManifoldTransitionManager';
import { ManifoldVisualStateManager } from './manifold/ManifoldVisualStateManager';
import { InsideTesseractProjector } from './manifold/InsideTesseractProjector';
import { TesseractProjector } from './manifold/TesseractProjector';
import type { RendererContext } from './manifold/ManifoldDomRenderer';
import type { PhysicsContext } from './manifold/ManifoldPhysicsOrchestrator';
import type {
  CardRenderLayout,
  ControllerElements,
  SceneNavigationSection,
  CvCardContent,
  FeaturedPose,
  FourDSceneState,
  HudCoordinateSample,
  ItemState,
  ItemType,
  MutableScreenQuad,
  PixelCanvasHost,
  SectionFrameBounds,
  TwoDGridMetrics,
  ViewMode
} from './manifold/ManifoldTypes';

const MANIFOLD_FOUR_D_CARD_SIZE = MANIFOLD_CONSTANTS.TESSERACT_PHYSICS.faceCardExtent;
const INTRO_AUTO_ENTER_DELAY_MS = 900;
const INITIAL_ENTRY_SCROLL_OFFSET_PX = 180;
const ACTIVE_FOUR_D_VARIANT: FourDSceneState['variant'] = 'classic';
const CARD_ACCESSIBILITY_ALLOW_FOCUS = 1 << 0;
const CARD_ACCESSIBILITY_ALLOW_EXPANDED_PANEL = 1 << 1;
const CARD_ACCESSIBILITY_ALLOW_EXPANDED_CONTROLS = 1 << 2;
const CARD_ACCESSIBILITY_HIDDEN = 1 << 3;

interface HintCopyMeasurement {
  height: number;
  width: number;
}

interface ItemScreenRect {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
}

export interface ManifoldRenderTelemetry {
  fourDMs: number;
  hudCommitMs: number;
  interactionMs: number;
  itemsMs: number;
  particlesMs: number;
  preludeMs: number;
  sectionFrameMs: number;
  spectrumCards: number;
  transitionActive: boolean;
  visibleCards: number;
  visibleItems: number;
  visibleTexts: number;
}

/**
 * Manages the "Manifold" experience mode, orchestrating 2D, 3D, and 4D transitions.
 * Coordinates input handling, physics updates, and DOM rendering for the immersive portfolio interface.
 */
export class ManifoldModeController {
  private readonly world: HTMLElement;
  private cardChromeRenderer: ManifoldCardChromeRenderer | null = null;
  private readonly chromeInstancesPool: CardChromeInstance[];
  private readonly fourDWireframe: HTMLCanvasElement;
  private readonly fourDWireframeContext: CanvasRenderingContext2D | null;
  private readonly topbar: HTMLElement | null;
  private readonly introHint: HTMLElement;
  private readonly introHintCopy: HTMLElement | null;
  private readonly introHintPath: SVGPathElement | null;
  private readonly introHintDot: SVGCircleElement | null;
  private introHintKickerText: string;
  private introHintTitleText: string;
  private readonly contextHint: HTMLElement;
  private readonly contextHintCopy: HTMLElement | null;
  private readonly contextHintPath: SVGPathElement | null;
  private readonly contextHintDot: SVGCircleElement | null;
  private contextHintKickerText: string;
  private contextHintTitleText: string;
  private readonly hudRenderer: ManifoldHudRenderer;
  private readonly inputController: ManifoldInputController;
  private readonly inputService: ManifoldInputService;
  private readonly cardExpandController: ManifoldCardExpandController;
  private readonly transitionManager: ManifoldTransitionManager;
  private readonly visualStateManager: ManifoldVisualStateManager;
  private readonly textEffectManager = new ManifoldTextEffectManager();
  private readonly twoDSectionFrameRoot: HTMLElement;
  private readonly twoDSectionFrameLabel: HTMLElement;
  private readonly items: ItemState[] = [];
  private currentAudioSpectrum: Float32Array | null = null;
  private currentAudioEnergy = 0;
  private readonly sectionAccentRgbCache = new Map<string, [number, number, number]>();
  private readonly resizeObserver: ResizeObserver;
  private readonly deviceMemory =
    'deviceMemory' in navigator
      ? ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8)
      : 8;
  private readonly hardwareThreads = navigator.hardwareConcurrency || 8;
  private isMobileViewport = false;
  private readonly prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private locale: ManifoldLocale = 'en';

  private readonly config: ManifoldSceneRuntimeConfig;

  private readonly phaseState = createManifoldPhaseState();

  private loopSize = 0;
  private lastTime = 0;
  private hudTimer = 0;
  private lastWorldTransform = '';
  private currentWorldTiltX = 0;
  private currentWorldTiltY = 0;
  private lastPerspective = '';
  private currentPerspectiveDepth: number = MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.perspectiveNear;
  private particleActivity = 0;
  private featuredItem: ItemState | null = null;
  private introProgress = 0;
  private introTarget = 0;
  private introScrollAnchor = 0;
  private worldScrollReference = 0;
  private introCompleted = false;
  private exitReturnActive = false;
  private exitSceneOffset = 0;
  private expandedCard: ItemState | null = null;
  private expandedProgress = 0;
  private expandedTarget = 0;
  private collapsedExpandedCard: ItemState | null = null;
  private collapsedExpandedFade = 0;
  private pendingIntroExit = false;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private cardItemsCache: ItemState[] = [];
  private cardItemsBySectionCache = new Map<string, ItemState[]>();
  private twoDOffsetX = 0;
  private twoDOffsetXTarget = 0;
  private twoDTargetCardIndex = -1;
  private twoDTransitionGridOrder = new Map<number, number>();
  private twoDTransitionOrderMix = 1;
  private exitingFourDTo2D = false;
  private get targetViewMode(): ViewMode { return this.transitionManager.getState().targetViewMode; }

  private get viewModeProgress(): number { return this.transitionManager.getState().viewModeProgress; }
  private get viewModeTarget(): number { return this.transitionManager.getState().viewModeTarget; }
  private get fourDProgress(): number { return this.transitionManager.getState().fourDProgress; }
  private get fourDTarget(): number { return this.transitionManager.getState().fourDTarget; }
  private get fourDTransitionProgress(): number { return this.transitionManager.getState().fourDTransitionProgress; }

  private continuousSceneScroll = 0;
  private lastSceneScrollForLoop = 0;
  private lastIncomingScroll = Number.NaN;
  private stableInputScroll = 0;
  private lastInputLoopLength = 0;
  private lastRawSceneOffset = 0;
  private stableSceneOffset = 0;

  private hoveredCard: ItemState | null = null;
  private hoverCheckAccumulator = 0;
  private lastActivityAt = 0;
  private lastScrollActivityAt = 0;
  private topbarEnergy = 0;
  private topbarLineKey = -1;
  private introHintAnchorX = 0;
  private introHintAnchorY = 0;
  private introHintLabelX = 0;
  private introHintLabelY = 0;
  private contextHintAnchorX = 0;
  private contextHintAnchorY = 0;
  private contextHintLabelX = 0;
  private contextHintLabelY = 0;
  private lastContextHintSide: 'left' | 'right' = 'right';
  private lastIntroHintAlpha = '';
  private adaptiveCooldownUntil = 0;
  private wasHudNavigationOpen = false;
  private lastCentered2DCard: ItemState | null = null;
  private fpsDisplay = 120;
  private estimatedRefreshCap = 120;
  private frameTimeEma = 1000 / 120;
  private frameTimeBurst = 1000 / 120;
  private audioEnergy = 0;
  private audioPulse = 0;
  private audioActive = false;
  private sharedSpectrumActive = false;
  private currentQuantizedSpectrum = new Float32Array(16).fill(0.01);
  private lastIntroHintGeometry = '';
  private introHintMeasurement: HintCopyMeasurement = { width: 0, height: 0 };
  private lastContextHintAlpha = '';
  private lastContextHintGeometry = '';
  private contextHintMeasurement: HintCopyMeasurement = { width: 0, height: 0 };
  private twoDSectionFrameX = 0;
  private twoDSectionFrameY = 0;
  private twoDSectionFrameWidth = 0;
  private twoDSectionFrameHeight = 0;
  private twoDSectionFrameStillness = 1;
  private lastTwoDSectionFrameState = '';
  private lastTwoDSectionFrameVisualState = '';
  private lastTwoDSectionFrameLabel = '';
  private current2DFrameBounds: SectionFrameBounds | null = null;
  private current2DFrameSectionTitle = '';
  private lastTransitionSnapshotBodyState = false;
  private lastFastTwoDScrollSnapshotState = false;
  private gpuCardChromeMix = 0;
  private chromeInstancesActiveCount = 0;
  private lastGpuCardChromeActive = false;
  private gpuCardChromeDisabled = false;
  private currentFourDScene: FourDSceneState | null = null;
  private fourDCanvasWidth = 0;
  private fourDCanvasHeight = 0;
  private fourDCanvasDpr = 1;
  private fourDFaceOverlays: HTMLElement[] = [];
  private pendingHudSnapshot: ManifoldHudSnapshot | null = null;
  private readonly fourDFaceOverlayPool: ObjectPool<HTMLElement, ItemState>;
  private readonly particleField: ManifoldCanvasParticleField;
  private fourDFaceOverlaysActive = false;
  private expandedRevealSchedulerRaf = 0;
  private expandedRevealSchedulerToken = 0;
  private expandedMotionQuenchUntil = 0;
  private introAutoEnterTimeout = 0;
  private _overlayCornerCache: ({
    matrix: string;
    tl: readonly [number, number];
    tr: readonly [number, number];
    br: readonly [number, number];
    bl: readonly [number, number];
  } | null)[] = [];
  private readonly physicsRuntime: ManifoldPhysicsRuntime;
  private readonly domRenderer: ManifoldDomRenderer;
  private readonly scrollSystem: ManifoldScrollSystem;
  private readonly hintController: ManifoldHintController;
  private readonly twoDController: ManifoldTwoDController;
  private readonly environmentManager: ManifoldEnvironmentManager;
  private transitionPerformanceMode = false;
  private lastParticleRenderAt = 0;
  private rawScrollVelocity = 0;
  private programmaticJumpActive = false;

  constructor(
    private readonly elements: ControllerElements,
    private readonly dom: IDomAdapter,
    private readonly runtime: IRuntimeAdapter,
    private readonly observer: ManifoldModeObserver = {},
    private readonly initialViewMode: ViewMode = '3d'
  ) {
    const viewport = this.runtime.getViewportSize();
    const atlasState = createManifoldAtlasState(this.runtime.now(), viewport);

    this.isMobileViewport = viewport.width <= MANIFOLD_MOBILE_BREAKPOINT;
    this.config = createManifoldSceneRuntimeConfig({
      isMobileViewport: this.isMobileViewport,
      prefersReducedMotion: this.prefersReducedMotion,
      deviceMemory: this.deviceMemory,
      hardwareThreads: this.hardwareThreads
    });
    this.loopSize = this.config.itemCount * this.config.zGap;
    this.viewportWidth = atlasState.viewportWidth;
    this.viewportHeight = atlasState.viewportHeight;
    this.lastActivityAt = atlasState.lastActivityAt;
    this.lastScrollActivityAt = atlasState.lastScrollActivityAt;
    this.adaptiveCooldownUntil = atlasState.adaptiveCooldownUntil;

    this.world = elements.world;
    this.particleField = new ManifoldCanvasParticleField(elements.ambientParticleLayer, this.config.starCount);

    this.chromeInstancesPool = createCardChromeInstancePool(this.config.itemCount);
    this.fourDWireframe = elements.fourDWireframe;
    this.fourDWireframeContext = this.fourDWireframe.getContext('2d', { alpha: true, desynchronized: !IS_SAFARI || SAFARI_VERSION >= 17 });
    this.introHint = elements.introHint;
    this.introHintCopy = this.introHint.querySelector<HTMLElement>('#intro-hint-copy');
    this.introHintPath = this.introHint.querySelector<SVGPathElement>('#intro-hint-path');
    this.introHintDot = this.introHint.querySelector<SVGCircleElement>('#intro-hint-dot');
    this.introHintKickerText =
      this.introHintCopy?.querySelector<HTMLElement>('.intro-hint-kicker')?.textContent?.trim() || 'Entry Point';
    this.introHintTitleText =
      this.introHintCopy?.querySelector<HTMLElement>('strong')?.textContent?.trim() || 'Entering Automatically';
    this.contextHint = elements.contextHint;
    this.contextHintCopy = this.contextHint.querySelector<HTMLElement>('#context-hint-copy');
    this.contextHintPath = this.contextHint.querySelector<SVGPathElement>('#context-hint-path');
    this.contextHintDot = this.contextHint.querySelector<SVGCircleElement>('#context-hint-dot');
    this.contextHintKickerText =
      this.contextHintCopy?.querySelector<HTMLElement>('.intro-hint-kicker')?.textContent?.trim() || 'Scroll To Browse';
    this.contextHintTitleText =
      this.contextHintCopy?.querySelector<HTMLElement>('strong')?.textContent?.trim() || 'Click Card For Details';
    this.hudRenderer = new ManifoldHudRenderer(elements.hud);
    this.hudRenderer.setLocale({
      performanceMode: (modeLabel) => getLocalePerfModeLabel(this.locale, modeLabel),
      scrollPrompt: getManifoldLocaleBundle(this.locale).ui.scrollPrompt
    });
    this.fourDFaceOverlayPool = new ObjectPool<HTMLElement, ItemState>({
      create: (sourceItem) => this.createFourDFaceOverlay(sourceItem),
      activate: (overlay, sourceItem) => this.activateFourDFaceOverlay(overlay, sourceItem),
      reset: (overlay) => this.resetFourDFaceOverlayElement(overlay),
      destroy: (overlay) => overlay.remove()
    });
    this.transitionManager = new ManifoldTransitionManager({
      isIntroCompleted: () => this.introCompleted,
      onModeSwitched: (previous, current) => this.observer.onModeSwitched?.(previous, current),
      onFourDModeEntered: () => this.observer.onFourDModeEntered?.(),
      onModeTransitionStarted: (mode) => {
        if (mode === '2d') {
          const focusCard = this.expandedCard ?? this.getEffectiveFocusCard() ?? this.featuredItem;
          if (focusCard) {
            this.twoDController.focusCardIn2D(focusCard.cardIndex, false);
          }
        } else {
          this.twoDController.clear2DSectionFrame();
          this.twoDController.clear2DLayoutTargets();
          if (this.lastCentered2DCard) {
            this.lastCentered2DCard = null;
          }
        }
      },
      captureTwoDTransitionGridOrder: () => this.captureTwoDTransitionGridOrder(),
      clearTwoDTransitionGridOrder: () => {
        this.twoDTransitionGridOrder.clear();
        this.twoDTransitionOrderMix = 1;
      }
    }, this.initialViewMode);

    this.visualStateManager = new ManifoldVisualStateManager({
      toggleBodyClass: (className, active) => this.dom.toggleBodyClass(className, active),
      toggleRootClass: (className, active) => this.dom.toggleRootClass(className, active),
      getWorldElement: () => this.world
    });

    this.twoDSectionFrameRoot = elements.twoDSectionFrame.root;
    this.twoDSectionFrameLabel = elements.twoDSectionFrame.label;
    this.topbar = this.dom.querySelector<HTMLElement>('.topbar');
    this.environmentManager = new ManifoldEnvironmentManager(
      {
        getState: () => ({
          currentPerspectiveDepth: this.currentPerspectiveDepth,
          currentWorldTiltX: this.currentWorldTiltX,
          currentWorldTiltY: this.currentWorldTiltY,
          estimatedRefreshCap: this.estimatedRefreshCap,
          fpsDisplay: this.fpsDisplay,
          frameTimeBurst: this.frameTimeBurst,
          frameTimeEma: this.frameTimeEma,
          lastPerspective: this.lastPerspective,
          lastWorldTransform: this.lastWorldTransform,
          particleActivity: this.particleActivity,
          topbarEnergy: this.topbarEnergy,
          topbarLineKey: this.topbarLineKey
        }),
        setState: (next) => {
          if (next.currentPerspectiveDepth !== undefined) this.currentPerspectiveDepth = next.currentPerspectiveDepth;
          if (next.currentWorldTiltX !== undefined) this.currentWorldTiltX = next.currentWorldTiltX;
          if (next.currentWorldTiltY !== undefined) this.currentWorldTiltY = next.currentWorldTiltY;
          if (next.estimatedRefreshCap !== undefined) this.estimatedRefreshCap = next.estimatedRefreshCap;
          if (next.fpsDisplay !== undefined) this.fpsDisplay = next.fpsDisplay;
          if (next.frameTimeBurst !== undefined) this.frameTimeBurst = next.frameTimeBurst;
          if (next.frameTimeEma !== undefined) this.frameTimeEma = next.frameTimeEma;
          if (next.lastPerspective !== undefined) this.lastPerspective = next.lastPerspective;
          if (next.lastWorldTransform !== undefined) this.lastWorldTransform = next.lastWorldTransform;
          if (next.particleActivity !== undefined) this.particleActivity = next.particleActivity;
          if (next.topbarEnergy !== undefined) this.topbarEnergy = next.topbarEnergy;
          if (next.topbarLineKey !== undefined) this.topbarLineKey = next.topbarLineKey;
        },
        getTopbar: () => this.topbar,
        getViewportElement: () => this.elements.viewport,
        getWorldElement: () => this.world
      },
      this.particleField
    );
    this.twoDController = new ManifoldTwoDController({
      getCardItems: () => this.cardItemsCache,
      getCentered2DCard: () => this.getCentered2DCard(),
      getCurrent2DFrame: () => ({
        bounds: this.current2DFrameBounds,
        sectionTitle: this.current2DFrameSectionTitle
      }),
      getEffectiveFocusCard: () => this.getEffectiveFocusCard(),
      getFrameSamplingState: () => ({
        frameTimeBurst: this.frameTimeBurst,
        frameTimeEma: this.frameTimeEma,
        lastFrameState: this.lastTwoDSectionFrameState,
        lastFrameVisualState: this.lastTwoDSectionFrameVisualState,
        lastLabel: this.lastTwoDSectionFrameLabel,
        stillness: this.twoDSectionFrameStillness,
        x: this.twoDSectionFrameX,
        y: this.twoDSectionFrameY,
        width: this.twoDSectionFrameWidth,
        height: this.twoDSectionFrameHeight
      }),
      getIntroCompleted: () => this.introCompleted,
      getIntroScrollAnchor: () => this.introScrollAnchor,
      getLayoutState: () => ({
        isMobileViewport: this.isMobileViewport,
        lastCentered2DCard: this.lastCentered2DCard,
        targetCardIndex: this.twoDTargetCardIndex,
        transitionGridOrder: this.twoDTransitionGridOrder,
        transitionOrderMix: this.twoDTransitionOrderMix,
        twoDOffsetX: this.twoDOffsetX,
        twoDOffsetXTarget: this.twoDOffsetXTarget,
        viewportHeight: this.viewportHeight,
        viewportWidth: this.viewportWidth,
        viewModeTarget: this.viewModeTarget
      }),
      isTransitionPerformanceMode: () => this.transitionPerformanceMode,
      getPhaseVelocity: () => ({
        targetSpeed: this.phaseState.targetSpeed,
        velocity: this.phaseState.velocity
      }),
      getLocalizedSectionTitle: (sectionTitle) => this.getLocalizedSectionTitle(sectionTitle),
      getSectionFrameElements: () => ({
        label: this.twoDSectionFrameLabel,
        root: this.twoDSectionFrameRoot
      }),
      getViewportSize: () => ({ height: this.viewportHeight, width: this.viewportWidth }),
      getWorldState: () => ({
        exitReturnActive: this.exitReturnActive,
        expandedCard: this.expandedCard,
        expandedProgress: this.expandedProgress
      }),
      setFrameSamplingState: (next) => {
        if (next.lastFrameState !== undefined) this.lastTwoDSectionFrameState = next.lastFrameState;
        if (next.lastFrameVisualState !== undefined) this.lastTwoDSectionFrameVisualState = next.lastFrameVisualState;
        if (next.lastLabel !== undefined) this.lastTwoDSectionFrameLabel = next.lastLabel;
        if (next.stillness !== undefined) this.twoDSectionFrameStillness = next.stillness;
        if (next.x !== undefined) this.twoDSectionFrameX = next.x;
        if (next.y !== undefined) this.twoDSectionFrameY = next.y;
        if (next.width !== undefined) this.twoDSectionFrameWidth = next.width;
        if (next.height !== undefined) this.twoDSectionFrameHeight = next.height;
      },
      setLayoutState: (next) => {
        if (next.lastCentered2DCard !== undefined) this.lastCentered2DCard = next.lastCentered2DCard;
        if (next.targetCardIndex !== undefined) this.twoDTargetCardIndex = next.targetCardIndex;
        if (next.transitionOrderMix !== undefined) this.twoDTransitionOrderMix = next.transitionOrderMix;
        if (next.twoDOffsetX !== undefined) this.twoDOffsetX = next.twoDOffsetX;
        if (next.twoDOffsetXTarget !== undefined) this.twoDOffsetXTarget = next.twoDOffsetXTarget;
      },
      updateActivity: (now) => {
        this.lastActivityAt = now;
        this.lastScrollActivityAt = now;
      }
    });
    this.scrollSystem = new ManifoldScrollSystem({
      getConfig: () => this.config,
      getExpandedState: () => ({
        card: this.expandedCard,
        quenchUntil: this.expandedMotionQuenchUntil,
        target: this.expandedTarget
      }),
      getFeaturedItem: () => this.featuredItem,
      getLoopSize: () => this.loopSize,
      getNow: () => this.runtime.now(),
      getPhaseState: () => this.phaseState,
      getScrollContinuityState: () => ({
        lastIncomingScroll: this.lastIncomingScroll,
        lastInputLoopLength: this.lastInputLoopLength,
        stableInputScroll: this.stableInputScroll
      }),
      getTwoDGridMetrics: () => this.twoDController.get2DGridMetrics(),
      getViewMode: () => this.targetViewMode,
      markScrollActivity: (now) => {
        this.lastActivityAt = now;
        this.lastScrollActivityAt = now;
      },
      setPhaseState: (next) => {
        this.phaseState.scroll = next.scroll;
        this.phaseState.targetSpeed = next.targetSpeed;
      },
      setScrollContinuityState: (next) => {
        this.lastIncomingScroll = next.lastIncomingScroll;
        this.lastInputLoopLength = next.lastInputLoopLength;
        this.stableInputScroll = next.stableInputScroll;
      }
    });
    this.physicsRuntime = new ManifoldPhysicsRuntime(new ManifoldPhysicsOrchestrator());
    this.domRenderer = new ManifoldDomRenderer();
    this.cardExpandController = new ManifoldCardExpandController({
      animateCardHandoff: (item, expanded) => this.textEffectManager.animateCardHandoff(item, expanded),
      animateCardTitle: (item, expanded) => this.textEffectManager.animateCardTitle(item, expanded),
      focusCardIn2D: (cardIndex, immediate) => this.twoDController.focusCardIn2D(cardIndex, immediate),
      getExpandedState: () => ({
        card: this.expandedCard,
        progress: this.expandedProgress,
        quenchUntil: this.expandedMotionQuenchUntil,
        schedulerRaf: this.expandedRevealSchedulerRaf,
        schedulerToken: this.expandedRevealSchedulerToken,
        target: this.expandedTarget
      }),
      getRevealLayers: (element) => this.textEffectManager.getRevealLayers(element),
      getRuntimeNow: () => this.runtime.now(),
      getViewMode: () => this.targetViewMode,
      isIntroCompleted: () => this.introCompleted,
      isMobileViewport: () => this.isMobileViewport,
      is2DMode: () => this.is2DMode(),
      requestAnimationFrame: (callback) => window.requestAnimationFrame(callback),
      scheduleTimeout: (callback, delay) => window.setTimeout(callback, delay),
      setCardMobilePage: (item, page) => this.setCardMobilePage(item, page),
      setExpandedState: (next) => {
        if (next.card !== undefined) this.expandedCard = next.card;
        if (next.quenchUntil !== undefined) this.expandedMotionQuenchUntil = next.quenchUntil;
        if (next.schedulerRaf !== undefined) this.expandedRevealSchedulerRaf = next.schedulerRaf;
        if (next.schedulerToken !== undefined) this.expandedRevealSchedulerToken = next.schedulerToken;
        if (next.target !== undefined) this.expandedTarget = next.target;
      },
      setPhaseVelocityScale: (scale) => {
        this.phaseState.velocity *= scale;
        this.phaseState.targetSpeed *= scale;
      },
      updateActivity: (now) => {
        this.lastActivityAt = now;
        this.lastScrollActivityAt = now;
      }
    });
    this.hintController = new ManifoldHintController({
      hasExpandedCardOpen: () => this.expandedCard !== null && this.expandedTarget > 0.01,
      getClosestVisibleCard: () => this.getClosestVisibleCard(),
      getContextHintState: () => ({
        anchorX: this.contextHintAnchorX,
        anchorY: this.contextHintAnchorY,
        copy: this.contextHintCopy,
        copyText: {
          kicker: this.contextHintKickerText,
          title: this.contextHintTitleText
        },
        dot: this.contextHintDot,
        geometry: this.lastContextHintGeometry,
        hint: this.contextHint,
        lastAlpha: this.lastContextHintAlpha,
        lastSide: this.lastContextHintSide,
        labelX: this.contextHintLabelX,
        labelY: this.contextHintLabelY,
        measurement: this.contextHintMeasurement,
        motionKey: this._lastContextHintMotionKey,
        path: this.contextHintPath
      }),
      getCurrentFourDScene: () => this.currentFourDScene,
      getExitReturnActive: () => this.exitReturnActive,
      getFeaturedItem: () => this.featuredItem,
      getFourDTransitionProgress: () => this.fourDTransitionProgress,
      getHintTimingState: () => ({
        introCompleted: this.introCompleted,
        introProgress: this.introProgress,
        introTarget: this.introTarget
      }),
      getIntroHintState: () => ({
        anchorX: this.introHintAnchorX,
        anchorY: this.introHintAnchorY,
        copy: this.introHintCopy,
        copyText: {
          kicker: this.introHintKickerText,
          title: this.introHintTitleText
        },
        dot: this.introHintDot,
        geometry: this.lastIntroHintGeometry,
        hint: this.introHint,
        labelX: this.introHintLabelX,
        labelY: this.introHintLabelY,
        measurement: this.introHintMeasurement,
        motionKey: this._lastIntroHintProgress,
        path: this.introHintPath
      }),
      getItemScreenRect: (item) => this.getItemScreenRect(item),
      getLastScrollActivityAt: () => this.lastScrollActivityAt,
      getNowVelocity: () => this.phaseState.velocity,
      getRootSceneScreenRect: (scene) => this.getFourDSceneScreenRect(scene),
      getTargetViewMode: () => this.targetViewMode,
      getViewport: () => ({
        height: this.viewportHeight,
        isMobile: this.isMobileViewport,
        width: this.viewportWidth
      }),
      isHudNavOpen: () => document.body.classList.contains('hud-nav-open'),
      setContextHintState: (next) => {
        if (next.anchorX !== undefined) this.contextHintAnchorX = next.anchorX;
        if (next.anchorY !== undefined) this.contextHintAnchorY = next.anchorY;
        if (next.geometry !== undefined) this.lastContextHintGeometry = next.geometry;
        if (next.labelX !== undefined) this.contextHintLabelX = next.labelX;
        if (next.labelY !== undefined) this.contextHintLabelY = next.labelY;
        if (next.lastAlpha !== undefined) this.lastContextHintAlpha = next.lastAlpha;
        if (next.lastSide !== undefined) this.lastContextHintSide = next.lastSide;
        if (next.measurement !== undefined) this.contextHintMeasurement = next.measurement;
        if (next.motionKey !== undefined) this._lastContextHintMotionKey = next.motionKey;
      },
      setIntroHintState: (next) => {
        if (next.anchorX !== undefined) this.introHintAnchorX = next.anchorX;
        if (next.anchorY !== undefined) this.introHintAnchorY = next.anchorY;
        if (next.geometry !== undefined) this.lastIntroHintGeometry = next.geometry;
        if (next.labelX !== undefined) this.introHintLabelX = next.labelX;
        if (next.labelY !== undefined) this.introHintLabelY = next.labelY;
        if (next.measurement !== undefined) this.introHintMeasurement = next.measurement;
        if (next.motionKey !== undefined) this._lastIntroHintProgress = next.motionKey;
      }
    });

    this.resizeObserver = this.dom.createResizeObserver(() => {
      pretextLayoutService.syncRootFontPx();
      this.layoutItems();
      this.refreshHintMeasurements();
      this.particleField.resize(this.viewportWidth, this.viewportHeight, window.devicePixelRatio || 1);
      this.particleField.layout(this.loopSize, this.viewportWidth, this.viewportHeight);
      this.cardChromeRenderer?.resize(this.viewportWidth, this.viewportHeight);
    });

    pretextLayoutService.syncRootFontPx();
    this.createItems();
    this.layoutItems();
    this.refreshHintMeasurements();
    this.particleField.resize(this.viewportWidth, this.viewportHeight, window.devicePixelRatio || 1);
    this.particleField.layout(this.loopSize, this.viewportWidth, this.viewportHeight);
    const initCardChrome = () => {
      this.cardChromeRenderer = new ManifoldCardChromeRenderer(elements.cardChromeLayer, this.config.itemCount);
      if (this.cardChromeRenderer.isSupported()) {
        this.dom.addBodyClass('has-gpu-card-chrome');
      }
      this.cardChromeRenderer.resize(this.viewportWidth, this.viewportHeight);
      this.cardChromeRenderer.prewarm(this.viewportWidth, this.viewportHeight);
    };

    if (this.initialViewMode === '2d') {
      window.setTimeout(initCardChrome, 800);
    } else {
      initCardChrome();
    }
    this.introScrollAnchor = this.getInitialScrollAnchor();

    this.inputService = new ManifoldInputService({
      advanceNext: () => this.elements.advanceButtons.next.click(),
      advancePrev: () => this.elements.advanceButtons.prev.click(),
      closeExpandedCard: () => this.closeExpandedCard(),
      findCardState: (cardEl) => this.findCardState(cardEl),
      get2DGridMetrics: () => this.get2DGridMetrics(),
      getExpandedCard: () => this.expandedCard,
      getExpandedTarget: () => this.expandedTarget,
      getHoveredCard: () => this.hoveredCard,
      getIntroCompleted: () => this.introCompleted,
      getIntroTarget: () => this.introTarget,
      getViewportSize: () => ({
        width: this.viewportWidth || this.runtime.getViewportSize().width,
        height: this.viewportHeight || this.runtime.getViewportSize().height
      }),
      is2DMode: () => this.is2DMode(),
      is4DMode: () => this.is4DMode(),
      isEntryTarget: (target, x, y) => this.isEntryTarget(target, x, y),
      isHudNavigationOpen: () => this.dom.bodyHasClass('hud-nav-open'),
      markInteractionActivity: () => {
        this.lastActivityAt = this.runtime.now();
      },
      pan2DBy: (deltaX) => this.pan2DBy(deltaX),
      resolveCardTarget: (target, x, y) => this.resolveCardTarget(target, x, y),
      setCardMobilePage: (item, page) => this.setCardMobilePage(item, page),
      setHoveredCard: (item) => this.setHoveredCard(item),
      toggleExpandedCard: (item) => this.toggleExpandedCard(item),
      triggerIntroEnter: () => this.triggerIntroEnter(),
      triggerIntroExit: () => this.triggerIntroExit(),
      updatePhaseMouse: (mouseX, mouseY) => {
        this.phaseState.mouseX = mouseX;
        this.phaseState.mouseY = mouseY;
      }
    });
    this.inputController = new ManifoldInputController(this.runtime, {
      exitButton: this.elements.exitButton,
      featuredInteractiveEl: this.featuredItem?.fxEl ?? null,
      viewport: this.elements.viewport
    }, {
      handleExitClick: this.inputService.handleExitClick.bind(this.inputService),
      handleFeaturedClick: this.inputService.handleFeaturedClick.bind(this.inputService),
      handleFeaturedKeydown: this.inputService.handleFeaturedKeydown.bind(this.inputService),
      handleGlobalKeydown: this.inputService.handleGlobalKeydown.bind(this.inputService),
      handlePointerLeave: this.inputService.handlePointerLeave.bind(this.inputService),
      handlePointerMove: this.inputService.handlePointerMove.bind(this.inputService),
      handleViewportClick: this.inputService.handleViewportClick.bind(this.inputService),
      handleViewportPointerDown: this.inputService.handleViewportPointerDown.bind(this.inputService),
      handleViewportPointerUp: this.inputService.handleViewportPointerUp.bind(this.inputService),
      handleWheel: this.inputService.handleWheel.bind(this.inputService)
    });
    this.dom.observeResize(this.resizeObserver, this.elements.viewport);
    this.inputController.attach();
    this.dom.addBodyClass('is-intro-active');
    this.setupInteractiveButtonHooks();
  }

  private setupInteractiveButtonHooks(): void {
    const chips = this.dom.querySelectorAll<HTMLElement>('.topbar-chip');
    const hudButtons = this.dom.querySelectorAll<HTMLElement>('.hud-mode-option, .hud-side-toggle');
    
    const attachHover = (el: HTMLElement) => {
      // Find the specific text targets. If explicitly marked, use those to preserve sibling HTML spacing/colors.
      let targets = Array.from(el.querySelectorAll<HTMLElement>('.scramble-target'));
      
      // Fallback to standard labels if no explicit targets are defined
      if (targets.length === 0) {
        const label = el.querySelector<HTMLElement>('.topbar-chip-label, .hud-mode-toggle-label, span:not([class*="glyph"]):not([class*="icon"])');
        if (label) targets = [label];
      }
      
      if (targets.length === 0) return;

      el.addEventListener('mouseenter', () => {
        targets.forEach(target => {
          // Resolve original text, cache it so we don't accidentally grab partial scrambles
          const targetText = target.dataset.originalText || target.textContent?.trim() || '';
          if (!target.dataset.originalText && targetText) {
            target.dataset.originalText = targetText;
          }
          if (targetText) {
            this.textEffectManager.setTextContent(target, targetText, true, true);
          }
        });
      });
    };

    chips.forEach(attachHover);
    hudButtons.forEach(attachHover);
  }

  setScroll(scroll: number, velocity: number): void {
    this.rawScrollVelocity = velocity;
    this.scrollSystem.setScroll(scroll, velocity);
  }

  setProgrammaticJump(active: boolean): void {
    if (this.programmaticJumpActive === active) {
      return;
    }

    this.programmaticJumpActive = active;
    this.resetIncomingScrollContinuity(this.phaseState.scroll);
  }

  getLoopScrollLength(): number {
    return this.scrollSystem.getLoopScrollLength();
  }

  getFeaturedCardScrollAnchor(): number {
    return this.scrollSystem.getFeaturedCardScrollAnchor();
  }

  getInitialScrollAnchor(): number {
    return this.getFeaturedCardScrollAnchor() - INITIAL_ENTRY_SCROLL_OFFSET_PX / this.config.camSpeed;
  }

  isIntroComplete(): boolean {
    return this.introCompleted;
  }

  is2DMode(): boolean {
    return this.targetViewMode === '2d';
  }

  is4DMode(): boolean {
    return this.targetViewMode === '4d';
  }

  getViewMode(): ViewMode {
    return this.targetViewMode;
  }

  isTransitionPerformanceMode(): boolean {
    return this.transitionPerformanceMode;
  }

  getLocale(): ManifoldLocale {
    return this.locale;
  }

  showTemporaryHudFocus(section: string, card: string, durationMs = 2600): void {
    this.hudRenderer.showTemporaryFocus(section, card, durationMs);
  }

  setLocale(locale: ManifoldLocale): void {
    if (this.locale === locale) {
      return;
    }

    this.locale = locale;
    const ui = getManifoldLocaleBundle(locale).ui;
    this.introHintKickerText = ui.entryPoint;
    this.introHintTitleText = ui.enteringAutomatically;
    this.contextHintKickerText = ui.scrollToBrowse;
    this.contextHintTitleText = ui.clickCardForDetails;
    this.lastTwoDSectionFrameLabel = '';
    this.hudRenderer.setLocale({
      performanceMode: (modeLabel) => getLocalePerfModeLabel(locale, modeLabel),
      scrollPrompt: ui.scrollPrompt
    });
    this.refreshLocalizedPresentation();
  }

  setViewMode(mode: ViewMode): void {
    this.transitionManager.setViewMode(mode);
  }

  queueIntroViewMode(mode: ViewMode): void {
    this.transitionManager.queueIntroViewMode(mode);
  }

  closeActiveCard(): void {
    this.closeExpandedCard();
  }

  openCardByIndex(cardIndex: number): void {
    if (this.is2DMode()) {
      this.focusCardIn2D(cardIndex, true);
    }

    const item = findCardItemByIndex(this.cardItemsCache, cardIndex);
    if (!item) {
      return;
    }

    this.toggleExpandedCard(item);
  }

  openFocusedCard(): void {
    const focusCard = this.expandedCard ?? this.getEffectiveFocusCard();
    if (!focusCard) {
      return;
    }

    this.openCardByIndex(focusCard.cardIndex);
  }

  scheduleIntroAutoEnter(delayMs = INTRO_AUTO_ENTER_DELAY_MS): void {
    if (this.introCompleted || this.introTarget >= 1) {
      return;
    }

    if (this.introAutoEnterTimeout) {
      window.clearTimeout(this.introAutoEnterTimeout);
    }

    this.introAutoEnterTimeout = window.setTimeout(() => {
      this.introAutoEnterTimeout = 0;
      if (this.introCompleted || this.introTarget >= 1) {
        return;
      }

      this.triggerIntroEnter();
    }, Math.max(0, delayMs));
  }

  focusCardIn2D(cardIndex: number, immediate = false): void {
    this.twoDController.focusCardIn2D(cardIndex, immediate);
  }

  pan2DBy(deltaX: number): void {
    this.twoDController.pan2DBy(deltaX, this.is2DMode(), this.runtime.now());
  }

  isSettledNearScroll(anchor: number, tolerance = 18): boolean {
    const scrollSettled = Math.abs(this.phaseState.scroll - anchor) <= tolerance && Math.abs(this.phaseState.velocity) <= 0.08;

    if (!scrollSettled || !this.is2DMode()) {
      return scrollSettled;
    }

    return Math.abs(this.twoDOffsetXTarget - this.twoDOffsetX) <= 4;
  }

  getActiveHudNavigationFocus(): { section: string; card: string } {
    return this.getHudFocus();
  }

  getCurrentSceneScroll(): number {
    const sceneOffset = this.exitReturnActive ? this.exitSceneOffset : this.introCompleted ? this.stableSceneOffset : 0;
    return this.introScrollAnchor + sceneOffset;
  }

  private getSectionNavigationReferenceScroll(): number {
    const currentSceneScroll = this.getCurrentSceneScroll();

    if (this.is2DMode() || this.is4DMode()) {
      return currentSceneScroll;
    }

    const focusCard = this.expandedCard ?? this.getEffectiveFocusCard() ?? this.featuredItem;
    if (!focusCard) {
      return currentSceneScroll;
    }

    return this.normalizeLoopAnchor(this.getAnchorForCard(focusCard), currentSceneScroll, 'nearest');
  }

  resolveNavigationScrollTarget(anchor: number): number {
    return this.phaseState.scroll + (anchor - this.getCurrentSceneScroll());
  }

  normalizeNavigationAnchor(anchor: number): number {
    return this.normalizeLoopAnchor(anchor, this.getSectionNavigationReferenceScroll(), 'nearest');
  }

  getCardNavigationAnchor(cardIndex: number, mode: 'nearest' | 'forward' | 'backward' | 'smart' = 'nearest'): number | null {
    return resolveCardNavigationAnchor({
      cardIndex,
      cardItems: this.cardItemsCache,
      getAnchorForCard: (item) => this.getAnchorForCard(item),
      mode,
      normalizeAnchor: (anchor, anchorMode) => this.normalizeLoopAnchor(anchor, this.getCurrentSceneScroll(), anchorMode)
    });
  }

  getAdjacentCardNavigation(direction: 1 | -1): { anchor: number; cardIndex: number } | null {
    return resolveAdjacentCardNavigation({
      cardItems: this.cardItemsCache,
      currentCard: this.expandedCard ?? this.getEffectiveFocusCard(),
      direction,
      featuredItem: this.featuredItem,
      getAnchorForCard: (item) => this.getAnchorForCard(item),
      normalizeAnchor: (anchor, anchorMode) => this.normalizeLoopAnchor(anchor, this.getCurrentSceneScroll(), anchorMode)
    });
  }

  getSectionNavigationAnchor(sectionKey: string): number {
    const targets = this.getSceneNavigationTargets();
    const target = targets.find(t => t.section === sectionKey);
    if (!target) return 0;
    return target.anchor;
  }

  setAudioSpectrum(spectrum: Float32Array | null, energy = 0): void {
    this.currentAudioSpectrum = spectrum;
    this.currentAudioEnergy = energy;
  }

  setAudioReactiveState(energy: number, pulse: number, active: boolean): void {
    this.audioEnergy = clamp(energy, 0, 1);
    this.audioPulse = clamp(pulse, 0, 1);
    this.audioActive = active;
  }

  private syncSharedAudioSpectrum(): void {
    const spectrum = this.currentAudioSpectrum;
    if (!spectrum || this.currentAudioEnergy <= 0.001) {
      if (!this.sharedSpectrumActive) {
        return;
      }

      this.currentQuantizedSpectrum.fill(0.01);
      this.sharedSpectrumActive = false;
      return;
    }

    for (let i = 0; i < 16; i += 1) {
      this.currentQuantizedSpectrum[i] = Math.max(0.01, Math.round((spectrum[i] ?? 0) * 100) / 100);
    }
    this.sharedSpectrumActive = true;
  }

  getSceneNavigationTargets(): SceneNavigationSection[] {
    return resolveSectionNavigationTargets({
      cardItems: this.cardItemsCache,
      getAnchorForCard: (item) => this.getAnchorForCard(item),
      getAnchorForItemIndex: (itemIndex) => this.getScrollAnchorForItemIndex(itemIndex),
      normalizeAnchor: (anchor, mode) => this.normalizeLoopAnchor(anchor, this.getSectionNavigationReferenceScroll(), mode),
      sectionHeadings: MANIFOLD_SECTION_HEADINGS,
      is2DMode: this.is2DMode()
    }).map((section) => ({
      ...section,
      section: this.getLocalizedSectionTitle(section.section)
    }));
  }

  getSectionNavigationTarget(sectionTitle: string): { anchor: number; cardIndex: number | null; section: string } | null {
    const rawSectionTitle =
      MANIFOLD_SECTION_HEADINGS.find((candidate) =>
        candidate === sectionTitle || this.getLocalizedSectionTitle(candidate) === sectionTitle
      ) ?? null;

    if (!rawSectionTitle) {
      return null;
    }

    const sectionCards = [...(this.cardItemsBySectionCache.get(rawSectionTitle) ?? [])]
      .filter((item) => item.type === 'card')
      .sort((left, right) => left.cardIndex - right.cardIndex);

    if (sectionCards.length === 0) {
      return null;
    }

    const representativeCard = sectionCards[Math.floor(sectionCards.length * 0.5)] ?? sectionCards[0] ?? null;
    if (!representativeCard) {
      return null;
    }

    const anchor =
      this.getCardNavigationAnchor(representativeCard.cardIndex, 'nearest') ??
      this.normalizeLoopAnchor(this.getAnchorForCard(representativeCard), this.getSectionNavigationReferenceScroll(), 'nearest');

    return {
      anchor,
      cardIndex: representativeCard.cardIndex,
      section: this.getLocalizedSectionTitle(rawSectionTitle)
    };
  }

  render(time: number): void {
    if (this.lastTime === 0) {
      this.lastTime = time;
    }

    const delta = Math.max(time - this.lastTime, 1);
    this.lastTime = time;
    this.hudTimer += delta;
    const renderStartedAt = performance.now();
    let particlesMs = 0;
    let hudCommitMs = 0;
    let visibleItems = 0;
    let visibleCards = 0;
    let visibleTexts = 0;
    let spectrumCards = 0;

    const performanceProfile = this.getPerformanceProfile();

    const hudRefreshInterval =
      this.introCompleted &&
        this.targetViewMode === '3d' &&
        !this.expandedCard &&
        this.viewModeProgress < 0.08 &&
        Math.max(Math.abs(this.phaseState.targetSpeed), Math.abs(this.phaseState.velocity)) > 0.18
        ? MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.hudRefreshMs * 2.2
        : MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.hudRefreshMs;

    if (this.hudTimer >= hudRefreshInterval) {
      this.hudTimer = 0;
      const loopCoord =
        ((this.phaseState.scroll % this.getLoopScrollLength()) + this.getLoopScrollLength()) %
        this.getLoopScrollLength();

      this.pendingHudSnapshot = {
        coordinates: this.getHudCoordinateSamples(loopCoord),
        focus: this.getHudFocus(),
        fps: this.formatHudFps(),
        now: time,
        perfModeLabel: performanceProfile.modeLabel,
        velocity: Math.abs(this.phaseState.velocity).toFixed(2)
      };
    }

    this.phaseState.velocity = lerp(
      this.phaseState.velocity,
      this.phaseState.targetSpeed,
      MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.velocitySmoothingLerp
    );
    this.environmentManager.updateFrameMetrics(delta);
    const activeViewModeProgress = this.introCompleted ? this.viewModeProgress : 0;

    const velocityMagnitude = Math.abs(this.phaseState.velocity);
    if (this.introCompleted && velocityMagnitude > 0.05) {
      this.hudRenderer.noteInitialScrollGesture();
    }
    const highRefreshFrameBudget = 1000 / 120;
    const frameStressThreshold =
      highRefreshFrameBudget * MANIFOLD_CONSTANTS.PERFORMANCE_THRESHOLDS.frameStressEmaMultiplier;
    const frameStressSpan = Math.max(1, frameStressThreshold - highRefreshFrameBudget);

    this.transitionManager.update(delta);

    this.visualStateManager.update({
      delta,
      velocityMagnitude,
      targetSpeed: this.phaseState.targetSpeed,
      frameTimeEma: this.frameTimeEma,
      frameTimeBurst: this.frameTimeBurst,
      is2DMode: this.is2DMode(),
      viewModeProgress: this.viewModeProgress,
      viewModeTarget: this.viewModeTarget,
      fourDTransitionProgress: this.fourDTransitionProgress,
      expandedCard: this.expandedCard,
      expandedProgress: this.expandedProgress,
      expandedTarget: this.expandedTarget
    });

    this.visualStateManager.syncModeStates({
      introCompleted: this.introCompleted,
      viewModeProgress: this.viewModeProgress,
      viewModeTarget: this.viewModeTarget,
      fourDTarget: this.fourDTarget,
      fourDTransitionProgress: this.fourDTransitionProgress,
      targetViewMode: this.targetViewMode,
      exitingFourDTo2D: this.transitionManager.getState().exitingFourDTo2D,
      expandedCard: this.expandedCard,
      expandedProgress: this.expandedProgress,
      expandedTarget: this.expandedTarget
    });

    this.environmentManager.updateTopbarAndParticles({
      introCompleted: this.introCompleted,
      targetViewMode: this.targetViewMode,
      velocityMagnitude
    });

    const expandedEase = computeDampedLerp(delta, MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.expandedEnvelope);
    this.expandedProgress = lerp(this.expandedProgress, this.expandedTarget, expandedEase);
    if (this.expandedCard || this.expandedTarget > 0.01) {
      this.collapsedExpandedCard = null;
      this.collapsedExpandedFade = 0;
    } else if (this.collapsedExpandedCard) {
      this.collapsedExpandedFade = lerp(this.collapsedExpandedFade, 0, expandedEase);
      if (this.collapsedExpandedFade < 0.015) {
        this.collapsedExpandedCard = null;
        this.collapsedExpandedFade = 0;
      }
    }

    const twoDPresentationProgress = this.introCompleted
      ? clamp(
        this.transitionManager.getState().exitingFourDTo2D
          ? Math.max(this.viewModeProgress, (1 - clamp(this.fourDTransitionProgress, 0, 1)) * 1.24 + 0.04)
          : this.viewModeProgress,
        0,
        1
      )
      : 0;

    const twoDTransitionOrderTarget =
      this.targetViewMode === '2d' && this.twoDTransitionGridOrder.size > 0
        ? clamp((twoDPresentationProgress - 0.16) / 0.5, 0, 1)
        : 1;
    this.twoDTransitionOrderMix = lerp(
      this.twoDTransitionOrderMix,
      twoDTransitionOrderTarget,
      computeDampedLerp(delta, MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.lateralPanBase)
    );
    if (
      this.twoDTransitionGridOrder.size > 0 &&
      this.targetViewMode === '2d' &&
      this.twoDTransitionOrderMix > 0.995 &&
      this.viewModeProgress > 0.92
    ) {
      this.twoDTransitionGridOrder.clear();
      this.twoDTransitionOrderMix = 1;
    }
    this.twoDOffsetX = lerp(
      this.twoDOffsetX,
      this.twoDOffsetXTarget,
      this.viewModeTarget > 0.5
        ? computeDampedLerp(delta, MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.lateralPanFast)
        : computeDampedLerp(delta, MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.lateralPanBase)
    );

    const transitionMorphPressure = Math.max(
      Math.abs(this.viewModeTarget - this.viewModeProgress),
      Math.abs(this.fourDTarget - this.fourDTransitionProgress)
    );
    const framePressure = clamp(
      (Math.max(this.frameTimeEma, this.frameTimeBurst) - highRefreshFrameBudget) / frameStressSpan,
      0,
      1
    );
    this.transitionPerformanceMode =
      this.introCompleted &&
      !this.expandedCard &&
      (transitionMorphPressure > 0.045 ||
        (transitionMorphPressure > 0.015 &&
          (framePressure > 0.18 ||
            velocityMagnitude > 0.55 ||
            Math.abs(this.phaseState.targetSpeed) > 0.55)));

    if (this.expandedTarget === 0 && this.expandedProgress < 0.01 && this.expandedCard) {
      this.collapsedExpandedCard =
        this.fourDTransitionProgress > 0.001 ? this.expandedCard : null;
      this.collapsedExpandedFade = this.collapsedExpandedCard ? 1 : 0;
      this.expandedCard.fxEl.classList.remove('is-expanded');
      this.expandedCard = null;
      this.adaptiveCooldownUntil = Math.max(this.adaptiveCooldownUntil, this.runtime.now() + 1800);
    }

    if (this.pendingIntroExit && this.viewModeProgress < 0.02) {
      this.pendingIntroExit = false;
      this.exitReturnActive = true;
      this.exitSceneOffset = this.phaseState.scroll - this.worldScrollReference;
      this.setHoveredCard(null);
    }

    this.environmentManager.updateWorldEnvironment({
      activeViewModeProgress,
      mouseX: this.phaseState.mouseX,
      mouseY: this.phaseState.mouseY,
      viewVelocity: this.phaseState.velocity
    });
    const perspectiveDepth = this.currentPerspectiveDepth;

    const rawSceneOffset = this.phaseState.scroll - this.worldScrollReference;

    if (this.exitReturnActive) {
      const returnEase = computeDampedLerp(delta, MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.exitEnvelope);
      this.exitSceneOffset = lerp(this.exitSceneOffset, 0, returnEase);

      if (Math.abs(this.exitSceneOffset) < 2.5) {
        this.exitSceneOffset = 0;
        this.exitReturnActive = false;
        this.worldScrollReference = this.phaseState.scroll;
        this.introCompleted = false;
        this.introTarget = 0;
        this.setAccessibilityState(false);
        this.transitionManager.forceResetTo3D();
        this.twoDOffsetX = 0;
        this.twoDOffsetXTarget = 0;
        this.twoDTargetCardIndex = -1;
        this.exitingFourDTo2D = false;
        this.transitionPerformanceMode = false;
        this.pendingIntroExit = false;
        this.continuousSceneScroll = 0;
        this.lastParticleRenderAt = 0;
        this.lastSceneScrollForLoop = 0;
        this.resetIncomingScrollContinuity(this.phaseState.scroll);
        this.stableSceneOffset = 0;
        this.dom.removeBodyClass('intro-complete', 'is-2d-mode', 'is-4d-mode', 'has-4d-presence', 'is-2d-fast', 'is-frame-stressed', 'is-view-morphing', 'is-card-morphing', 'is-exiting-2d-mode');
        this.dom.removeRootClass('is-2d-mode', 'is-4d-mode', 'has-4d-presence');
        this.dom.removeBodyClass('is-transition-snapshots');
        this.dom.addBodyClass('is-intro-active');
        this.setHoveredCard(null);
      }
    } else if (this.introCompleted) {
      const loopLength = Math.max(1, this.getLoopScrollLength());
      let sceneOffsetDelta = rawSceneOffset - this.lastRawSceneOffset;

      if (Math.abs(sceneOffsetDelta) > loopLength * 0.7) {
        sceneOffsetDelta -= Math.round(sceneOffsetDelta / loopLength) * loopLength;
      }

      this.stableSceneOffset += sceneOffsetDelta;
      this.lastRawSceneOffset = rawSceneOffset;
      this.exitSceneOffset = this.stableSceneOffset;
    } else {
      this.stableSceneOffset = 0;
      this.lastRawSceneOffset = 0;
    }

    const introEase = computeDampedLerp(delta, MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.introEnvelope);
    this.introProgress = lerp(this.introProgress, this.introTarget, introEase);

    if (!this.introCompleted && this.introTarget === 1 && this.introProgress > 0.80) {
      this.introCompleted = true;

      this.setAccessibilityState(true);

      this.exitReturnActive = false;
      this.exitSceneOffset = 0;
      this.stableSceneOffset = 0;
      this.lastRawSceneOffset = 0;
      this.worldScrollReference = this.phaseState.scroll;
      this.resetIncomingScrollContinuity(this.phaseState.scroll);
      if (this.transitionManager.getState().pendingIntroViewMode) {
        const nextMode = this.transitionManager.resolvePendingIntroMode();
        if (nextMode) this.transitionManager.setViewMode(nextMode);
      }
      this.dom.removeBodyClass('is-intro-active', 'is-entering-world');
      this.dom.addBodyClass('intro-complete');
      this.observer.onIntroEntered?.();
    }

    const introMix = easeInOutCubic(this.introProgress);
    const introHintAlpha = this.exitReturnActive ? 0 : clamp(1 - introMix, 0, 1);
    const introHintAlphaText = introHintAlpha.toFixed(3);

    if (introHintAlphaText !== this.lastIntroHintAlpha) {
      this.introHint.style.setProperty('--intro-hint-alpha', introHintAlphaText);
      this.lastIntroHintAlpha = introHintAlphaText;
    }

    const sceneOffset = this.exitReturnActive ? this.exitSceneOffset : this.introCompleted ? this.stableSceneOffset : 0;
    const sceneScroll = this.introScrollAnchor + sceneOffset;

    if (this.introCompleted) {
      const scrollDelta = sceneScroll - this.lastSceneScrollForLoop;
      if (Math.abs(scrollDelta) < this.getLoopScrollLength() * 0.4) {
        this.continuousSceneScroll += scrollDelta;
      }
      this.lastSceneScrollForLoop = sceneScroll;
    } else {
      this.lastSceneScrollForLoop = sceneScroll;
      this.continuousSceneScroll = 0;
    }
    const cameraZ = sceneScroll * this.config.camSpeed;
    const activeFourDProgress = this.introCompleted ? this.fourDProgress : 0;
    const visualFourDProgress = this.introCompleted ? this.fourDTransitionProgress : 0;
    const particleRenderIntervalMs = this.transitionPerformanceMode
      ? 1000 / 20
      : (
        this.targetViewMode === '3d'
          ? (
            this.particleActivity > 0.22 || velocityMagnitude > 0.12
              ? 1000 / 48
              : 1000 / 36
          )
          : (
            this.introCompleted
              ? 1000 / 24
              : 1000 / 36
          )
      );
    const shouldRenderParticles =
      this.lastParticleRenderAt === 0 ||
      time - this.lastParticleRenderAt >= particleRenderIntervalMs;
    if (shouldRenderParticles) {
      const particlesStartedAt = performance.now();
      this.environmentManager.renderParticles({
        activeViewModeProgress,
        cameraZ,
        introCompleted: this.introCompleted,
        loopSize: this.loopSize,
        particleActivity: this.particleActivity,
        perspectiveDepth,
        targetViewMode: this.targetViewMode,
        velocityMagnitude,
        viewportHeight: this.viewportHeight,
        viewportWidth: this.viewportWidth,
        visualFourDProgress
      });
      this.lastParticleRenderAt = time;
      particlesMs = performance.now() - particlesStartedAt;
    }
    const featuredPose = this.computeFeaturedPose(time, cameraZ);
    const twoDGridMetrics =
      activeViewModeProgress > 0.01 || this.viewModeTarget > 0.5 ? this.get2DGridMetrics() : null;
    const centered2DCard =
      this.is2DMode() && twoDPresentationProgress > 0.08 ? this.getCentered2DCard() : this.lastCentered2DCard;
    this.lastCentered2DCard = centered2DCard ?? null;
    const active2DSectionTitle =
      this.is2DMode() && twoDPresentationProgress > 0.08
        ? (this.expandedCard?.sectionTitle ?? centered2DCard?.sectionTitle ?? '')
        : '';
    const shouldTrack2DFrameBounds =
      !this.expandedCard &&
      !this.transitionPerformanceMode &&
      twoDPresentationProgress > (this.exitingFourDTo2D ? 0.34 : 0.5) &&
      active2DSectionTitle.length > 0 &&
      (this.viewModeTarget > 0.5 || twoDPresentationProgress > 0.5);
    this.current2DFrameSectionTitle = shouldTrack2DFrameBounds ? active2DSectionTitle : '';
    this.current2DFrameBounds = shouldTrack2DFrameBounds
      ? {
        minX: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
        visibleCount: 0
      }
      : null;
    const compactCardAspect =
      MANIFOLD_CONSTANTS.LAYOUT_GRID.compactCardHeight / MANIFOLD_CONSTANTS.LAYOUT_GRID.compactCardWidth;
    const compactWidthTarget = twoDGridMetrics?.cardWidth ?? (this.isMobileViewport
      ? Math.min(this.viewportWidth * 0.42, 220)
      : Math.min(this.viewportWidth * 0.18, 300));
    const compactHeightTarget = twoDGridMetrics?.cardHeight ?? compactWidthTarget * compactCardAspect;
    const compactLayoutProgress = clamp(
      (
        twoDPresentationProgress -
        (this.exitingFourDTo2D ? 0.56 : 0.72)
      ) /
      (this.exitingFourDTo2D ? 0.24 : 0.28),
      0,
      1
    );
    const compactWidthPx = Math.round(lerp(
      MANIFOLD_CONSTANTS.LAYOUT_GRID.compactCardWidth,
      compactWidthTarget,
      compactLayoutProgress
    ));
    const compactHeightPx = Math.round(lerp(
      MANIFOLD_CONSTANTS.LAYOUT_GRID.compactCardHeight,
      compactHeightTarget,
      compactLayoutProgress
    ));
    const cardRenderLayout: CardRenderLayout = {
      compactWidth: `${compactWidthPx}px`,
      compactHeight: `${compactHeightPx}px`,
      compactWidthPx,
      compactHeightPx,
      expandedWidth: this.isMobileViewport
        ? `${Math.min(this.viewportWidth * 0.9, 560).toFixed(0)}px`
        : `${Math.min(this.viewportWidth * 0.78, 1040).toFixed(0)}px`,
      expandedHeight: this.isMobileViewport
        ? `${Math.min(this.viewportHeight * 0.78, 620).toFixed(0)}px`
        : `${Math.min(this.viewportHeight * 0.74, 700).toFixed(0)}px`
    };
    const gpuCardChromeEligible =
      !this.gpuCardChromeDisabled &&
      (this.cardChromeRenderer?.isSupported() ?? false) &&
      this.introCompleted &&
      !this.transitionPerformanceMode &&
      !this.expandedCard;

    const gpuCardChromeMotion = Math.max(velocityMagnitude, Math.abs(this.phaseState.targetSpeed));
    const gpuCardChromeRise = clamp((gpuCardChromeMotion - 0.05) / 0.22, 0, 1);
    const gpuCardChromeFastFade = 1 - clamp((gpuCardChromeMotion - 0.52) / 0.28, 0, 1);
    const gpuModeFade = 1 - clamp(activeViewModeProgress * 4.0 + visualFourDProgress * 4.0, 0, 1);

    const gpuCardChromeTarget = gpuCardChromeEligible && this.targetViewMode === '3d'
      ? gpuCardChromeRise * gpuCardChromeFastFade * gpuModeFade
      : 0;
    const reverseScrollActivationMode =
      !this.expandedCard &&
      this.targetViewMode === '3d' &&
      activeViewModeProgress < 0.08 &&
      visualFourDProgress < 0.02 &&
      (this.phaseState.velocity < -0.04 || this.phaseState.targetSpeed < -0.04);

    const suppressHoverChecks =
      this.transitionPerformanceMode ||
      (!this.expandedCard &&
        (
          (
            this.is2DMode() &&
            (velocityMagnitude > 0.16 || Math.abs(this.phaseState.targetSpeed) > 0.16)
          ) ||
          (
            this.targetViewMode === '3d' &&
            activeViewModeProgress < 0.08 &&
            visualFourDProgress < 0.02 &&
            (velocityMagnitude > 0.10 || Math.abs(this.phaseState.targetSpeed) > 0.10)
          )
        ));
    const fastTwoDScrollSnapshotMode =
      this.is2DMode() &&
      !this.expandedCard &&
      activeViewModeProgress > 0.72 &&
      visualFourDProgress < 0.01 &&
      this.visualStateManager.getTwoDCardFastness() > 0.68 &&
      Math.abs(this.rawScrollVelocity) > 20;
    const transitionSnapshotsActive = this.transitionPerformanceMode || fastTwoDScrollSnapshotMode;
    if (transitionSnapshotsActive !== this.lastTransitionSnapshotBodyState) {
      this.dom.toggleBodyClass('is-transition-snapshots', transitionSnapshotsActive);
      this.lastTransitionSnapshotBodyState = transitionSnapshotsActive;
    }
    this.lastFastTwoDScrollSnapshotState = fastTwoDScrollSnapshotMode;
    const quiet2DPointerWindow =
      this.is2DMode() &&
      this.inputService.isPointerActive() &&
      !suppressHoverChecks &&
      velocityMagnitude < 0.075 &&
      Math.abs(this.phaseState.targetSpeed) < 0.075 &&
      (this.inputService.isPointerDirty() || this.hoveredCard !== null);
    const shouldMaintainCardScreenQuads =
      !this.transitionPerformanceMode &&
      (
        (gpuCardChromeTarget > 0.025 && gpuCardChromeEligible) ||
        (!this.is2DMode() && this.inputService.isPointerActive() && !suppressHoverChecks) ||
        quiet2DPointerWindow
      );
    const fourDStartedAt = performance.now();
    this.currentFourDScene =
      visualFourDProgress > 0.001 ? this.computeFourDScene(sceneScroll, time, visualFourDProgress) : null;
    this.renderFourDWireframe(this.currentFourDScene, visualFourDProgress);
    this.chromeInstancesActiveCount = 0;

    if (this.currentFourDScene && visualFourDProgress > 0.001) {
      if (!this.fourDFaceOverlaysActive) {
        this.fourDFaceOverlaysActive = true;
      }
      this.renderFourDFaceOverlays(this.currentFourDScene, visualFourDProgress);
    } else if (this.fourDFaceOverlaysActive) {
      this.destroyFourDFaceOverlays();
    }
    const fourDMs = performance.now() - fourDStartedAt;
    const physicsContext: PhysicsContext = {
      activeFourDProgress,
      activeViewModeProgress,
      cameraZ,
      expandedCard: this.expandedCard,
      expandedCardKey: this.expandedCard?.cardIndex ?? null,
      expandedProgress: this.expandedProgress,
      expandedTarget: this.expandedTarget,
      introCompleted: this.introCompleted,
      is2DMode: this.is2DMode(),
      loopSize: this.loopSize,
      mouseX: this.phaseState.mouseX,
      now: time,
      reverseScrollActivationMode,
      targetViewMode: this.targetViewMode,
      velocityMagnitude,
      visualFourDProgress,
      contextRevealByType: {
        card: this.getContextRevealForType('card'),
        star: this.getContextRevealForType('star'),
        text: this.getContextRevealForType('text')
      },
      getContextRevealForType: (type) => this.getContextRevealForType(type)
    };

    const rendererContext: RendererContext = {
      activeViewModeProgress,
      time,
      velocityMagnitude,
      viewportHeight: this.viewportHeight,
      viewportWidth: this.viewportWidth
    };

    const itemsStartedAt = performance.now();
    this.physicsRuntime.prepareFrame(this.items, physicsContext);
    this.syncSharedAudioSpectrum();

    for (let index = 0; index < this.items.length; index += 1) {
      const item = this.items[index];
      const result = this.physicsRuntime.computeItem(item, physicsContext);
      const reversePrewarmCard = false;

      const isVisible = this.domRenderer.updateItemVisibility(item, result.alpha,
        result.alpha > 0 || result.skipAlphaCheck || result.isExpandedMorphing || result.isNearCamera);

      if (!isVisible) continue;
      visibleItems += 1;

      if (activeViewModeProgress > 0.9 && item.type !== 'card') {
        this.domRenderer.updateItemVisibility(item, 0, false);
        continue;
      }

      this.domRenderer.updateZIndex(
        item,
        this.expandedCard === item && (this.expandedTarget > 0.01 || this.expandedProgress > 0.01)
          ? 'expanded'
          : 'base'
      );

      if (item.type === 'text') {
        visibleTexts += 1;
        this.domRenderer.renderTextItem(item, result.alpha, rendererContext, result.vizZ);
        if (item.el.style.display !== 'none') {
          this.domRenderer.setRotatedTransform(item, item.x, item.y, result.vizZ, item.rot);
          this.updateTextFx(item, velocityMagnitude, time);
        }
        continue;
      }

      visibleCards += 1;
      if (this.currentAudioSpectrum && this.currentAudioEnergy > 0.001 && item.currentAlpha > 0.01) {
        spectrumCards += 1;
      }

      this.renderCardItem(
        item,
        result.vizZ,
        time,
        featuredPose,
        sceneScroll,
        activeViewModeProgress,
        visualFourDProgress,
        active2DSectionTitle,
        twoDGridMetrics,
        cardRenderLayout,
        this.currentFourDScene,
        shouldMaintainCardScreenQuads || (this.expandedCard === item) || reversePrewarmCard,
        this.currentQuantizedSpectrum
      );
    }
    const itemsMs = performance.now() - itemsStartedAt;
    this.gpuCardChromeMix = lerp(
      this.gpuCardChromeMix,
      gpuCardChromeTarget,
      computeDampedLerp(delta, MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.cardFastVisualEnvelope)
    );
    const gpuCardChromeActive = this.gpuCardChromeMix > 0.025;

    if (gpuCardChromeActive !== this.lastGpuCardChromeActive) {
      this.dom.toggleBodyClass('has-gpu-card-chrome-active', gpuCardChromeActive);
      this.lastGpuCardChromeActive = gpuCardChromeActive;
    }

    if (this.cardChromeRenderer?.isSupported()) {
      this.cardChromeRenderer.render(
        this.chromeInstancesPool,
        gpuCardChromeActive ? this.chromeInstancesActiveCount : 0,
        this.viewportWidth,
        this.viewportHeight
      );
    }

    if (this.is2DMode() && !this.expandedCard) {
      const centeredCard = this.lastCentered2DCard;
      if (centeredCard) {
        this.twoDTargetCardIndex = centeredCard.cardIndex;
      }
    } else if (!this.is2DMode()) {
      this.lastCentered2DCard = null;
    }

    const sectionFrameStartedAt = performance.now();
    this.update2DSectionFrame(twoDPresentationProgress, delta);
    const sectionFrameMs = performance.now() - sectionFrameStartedAt;

    const interactionStartedAt = performance.now();
    if (!this.transitionPerformanceMode) {
      this.updateIntroHint();
      this.updateContextHint(time);
    }

    this.hoverCheckAccumulator += delta;
    if (suppressHoverChecks && this.hoveredCard) {
      this.setHoveredCard(null);
    }

    const shouldCheckHover =
      !suppressHoverChecks &&
      this.inputService.isPointerActive() &&
      (this.inputService.isPointerDirty() ||
        ((this.hoveredCard === null || Math.abs(this.phaseState.velocity) > 0.35) &&
          this.hoverCheckAccumulator >= 24) ||
        (this.hoveredCard !== null && this.hoverCheckAccumulator >= 80));

    if (shouldCheckHover) {
      this.hoverCheckAccumulator = 0;
      this.inputService.clearPointerDirty();
      this.updateCardHover();
    }
    const interactionMs = performance.now() - interactionStartedAt;

    if (this.pendingHudSnapshot) {
      const hudCommitStartedAt = performance.now();
      this.hudRenderer.render(this.pendingHudSnapshot);
      this.pendingHudSnapshot = null;
      hudCommitMs = performance.now() - hudCommitStartedAt;
    }

    this.lastRenderTelemetry.preludeMs = Math.max(
      0,
      performance.now() - renderStartedAt - particlesMs - fourDMs - itemsMs - sectionFrameMs - interactionMs - hudCommitMs
    );
    this.lastRenderTelemetry.particlesMs = particlesMs;
    this.lastRenderTelemetry.fourDMs = fourDMs;
    this.lastRenderTelemetry.itemsMs = itemsMs;
    this.lastRenderTelemetry.sectionFrameMs = sectionFrameMs;
    this.lastRenderTelemetry.interactionMs = interactionMs;
    this.lastRenderTelemetry.hudCommitMs = hudCommitMs;
    this.lastRenderTelemetry.visibleItems = visibleItems;
    this.lastRenderTelemetry.visibleCards = visibleCards;
    this.lastRenderTelemetry.visibleTexts = visibleTexts;
    this.lastRenderTelemetry.spectrumCards = spectrumCards;
    this.lastRenderTelemetry.transitionActive = this.transitionPerformanceMode;
  }

  private getHudCoordinateSamples(loopCoord: number): HudCoordinateSample[] {
    if (this.is4DMode()) {
      const loopLength = Math.max(1, this.getLoopScrollLength());
      const turnProgress = this.continuousSceneScroll / loopLength;
      const spin = turnProgress * Math.PI * MANIFOLD_CONSTANTS.TESSERACT_PHYSICS.hyperSpinScalar;
      return [
        { axis: 'X', value: this.phaseState.mouseX * 100 },
        { axis: 'Y', value: this.phaseState.mouseY * -100 },
        { axis: 'Z', value: ((loopCoord / loopLength) * 200) - 100 },
        { axis: 'W', value: (spin * 180) / Math.PI }
      ];
    }

    if (this.is2DMode()) {
      const metrics = this.get2DGridMetrics();
      const scrollWorldY = (this.phaseState.scroll - this.introScrollAnchor) * metrics.scrollScale;
      return [
        { axis: 'X', value: metrics.spacingX === 0 ? 0 : this.twoDOffsetX / metrics.spacingX },
        { axis: 'Y', value: metrics.spacingY === 0 ? 0 : scrollWorldY / metrics.spacingY }
      ];
    }

    const loopLength = Math.max(1, this.getLoopScrollLength());
    const sceneDepth = ((loopCoord / loopLength) * 200) - 100;
    return [
      { axis: 'X', value: this.phaseState.mouseX * 100 },
      { axis: 'Y', value: this.phaseState.mouseY * -100 },
      { axis: 'Z', value: sceneDepth }
    ];
  }

  public handleGpuContextLoss(): void {
    if (this.gpuCardChromeDisabled) {
      return;
    }

    this.gpuCardChromeDisabled = true;
    this.gpuCardChromeMix = 0;
    this.chromeInstancesActiveCount = 0;
    this.lastGpuCardChromeActive = false;
    this.cardChromeRenderer?.disable();
    this.dom.removeBodyClass('has-gpu-card-chrome', 'has-gpu-card-chrome-active');
  }

  destroy(): void {
    if (this.introAutoEnterTimeout) {
      window.clearTimeout(this.introAutoEnterTimeout);
      this.introAutoEnterTimeout = 0;
    }
    this.dom.disconnectResizeObserver(this.resizeObserver);
    this.inputController.detach();
    if (this.expandedRevealSchedulerRaf) {
      window.cancelAnimationFrame(this.expandedRevealSchedulerRaf);
      this.expandedRevealSchedulerRaf = 0;
    }
    this.hudRenderer.destroy();
    this.physicsRuntime.destroy();
    this.cardChromeRenderer?.destroy();

    // Dispose of managed item effects and scheduled reveals before clearing items
    this.cardExpandController.destroy(this.items);
    this.textEffectManager.destroy(this.items);

    this.destroyFourDFaceOverlays();
    this.fourDFaceOverlayPool.drain();
    this.world.replaceChildren();
    this.items.length = 0;
    this.transitionPerformanceMode = false;
    this.lastParticleRenderAt = 0;
    this.lastTransitionSnapshotBodyState = false;
    this.lastFastTwoDScrollSnapshotState = false;
    this.dom.removeBodyClass('is-2d-fast', 'is-frame-stressed', 'is-view-morphing', 'is-card-morphing', 'is-exiting-2d-mode', 'has-gpu-card-chrome', 'has-gpu-card-chrome-active');
    this.dom.removeBodyClass('is-transition-snapshots');
    if (this.topbar) {
      this.topbar.style.removeProperty('--topbar-line-spread');
      this.topbar.style.removeProperty('--topbar-line-glow');
    }
    this.introHint.style.removeProperty('--intro-anchor-x');
    this.introHint.style.removeProperty('--intro-anchor-y');
    this.introHint.style.removeProperty('--intro-copy-x');
    this.introHint.style.removeProperty('--intro-copy-y');
    this.introHint.style.removeProperty('--intro-hint-alpha');
    this.introHintPath?.setAttribute('d', '');
    this.contextHint.style.removeProperty('--context-copy-x');
    this.contextHint.style.removeProperty('--context-copy-y');
    this.contextHint.style.removeProperty('--context-hint-alpha');
    this.contextHintPath?.setAttribute('d', '');
    this.twoDSectionFrameRoot.style.removeProperty('--two-d-frame-x');
    this.twoDSectionFrameRoot.style.removeProperty('--two-d-frame-y');
    this.twoDSectionFrameRoot.style.removeProperty('--two-d-frame-width');
    this.twoDSectionFrameRoot.style.removeProperty('--two-d-frame-height');
    this.twoDSectionFrameRoot.style.removeProperty('--two-d-frame-alpha');
    this.twoDSectionFrameRoot.style.removeProperty('--two-d-frame-accent');
    this.twoDSectionFrameRoot.style.removeProperty('--two-d-frame-accent-soft');
    this.twoDSectionFrameRoot.style.removeProperty('--two-d-frame-outline-opacity');
    this.twoDSectionFrameRoot.style.removeProperty('--two-d-frame-outline-before-opacity');
    this.twoDSectionFrameRoot.style.removeProperty('--two-d-frame-outline-after-opacity');
    this.twoDSectionFrameRoot.style.removeProperty('--two-d-frame-outline-saturate');
    this.twoDSectionFrameRoot.style.removeProperty('--two-d-frame-outline-border-alpha');
    this.twoDSectionFrameRoot.style.removeProperty('--two-d-frame-outline-ring-alpha');
    this.twoDSectionFrameRoot.style.removeProperty('--two-d-frame-outline-glow-alpha');
    this.twoDSectionFrameRoot.style.removeProperty('--two-d-frame-outline-shadow-y');
    this.twoDSectionFrameRoot.style.removeProperty('--two-d-frame-outline-shadow-blur');
    this.twoDSectionFrameRoot.style.removeProperty('--two-d-frame-tab-opacity');
    this.twoDSectionFrameRoot.style.removeProperty('--two-d-frame-tab-border-alpha');
    this.twoDSectionFrameRoot.style.removeProperty('--two-d-frame-tab-glow-alpha');
    this.twoDSectionFrameRoot.style.removeProperty('--two-d-frame-tab-shadow-y');
    this.twoDSectionFrameRoot.style.removeProperty('--two-d-frame-tab-shadow-blur');
    this.dom.removeBodyClass('is-2d-mode');
    this.dom.removeRootClass('is-2d-mode');
  }

  getPerformanceProfile(): {
    backgroundScale: number;
    frameInterval: number;
    modeLabel: string;
    pixelScale: number;
    transitionActive: boolean;
  } {
    const now = this.runtime.now();
    const introAnimating = !this.introCompleted || Math.abs(this.introTarget - this.introProgress) > 0.01;
    const expandedAnimating =
      this.expandedCard !== null || this.expandedProgress > 0.01 || this.expandedTarget > 0;
    const hudNavigationOpen = document.body.classList.contains('hud-nav-open');
    const lowEndDevice = this.deviceMemory <= 4 || this.hardwareThreads <= 4;
    const twoDHeavy = this.is2DMode() || this.viewModeProgress > 0.5;
    const fourDHeavy = this.is4DMode() || this.fourDProgress > 0.22;
    const manifoldHeavy = twoDHeavy || fourDHeavy;
    const transitionActive = this.transitionPerformanceMode;
    const highRefreshFrameBudget = 1000 / 120;
    const frameStress = this.frameTimeEma > highRefreshFrameBudget * 1.16 || this.frameTimeBurst > highRefreshFrameBudget * 1.9;
    const severeFrameStress =
      this.frameTimeEma > highRefreshFrameBudget * 1.42 || this.frameTimeBurst > highRefreshFrameBudget * 2.35;
    const fullRatePixelScale = twoDHeavy
      ? (lowEndDevice ? 0.74 : 0.84)
      : manifoldHeavy
        ? (lowEndDevice ? 0.82 : 0.92)
        : lowEndDevice ? 0.94 : 1;
    const fullRateBackgroundScale = twoDHeavy
      ? (lowEndDevice ? 0.18 : 0.22)
      : manifoldHeavy
        ? (lowEndDevice ? 0.22 : 0.26)
        : lowEndDevice ? 0.28 : 0.32;

    if (hudNavigationOpen) {
      this.adaptiveCooldownUntil = now + 2600;
    } else if (this.wasHudNavigationOpen) {
      this.adaptiveCooldownUntil = Math.max(this.adaptiveCooldownUntil, now + 2600);
    }

    this.wasHudNavigationOpen = hudNavigationOpen;

    const activeMotion =
      Math.abs(this.phaseState.velocity) > 0.003 ||
      Math.abs(this.phaseState.targetSpeed) > 0.003 ||
      this.inputService.isPointerDirty() ||
      introAnimating ||
      expandedAnimating;

    if (activeMotion) {
      this.lastActivityAt = now;
    }

    const idleMs = now - this.lastActivityAt;
    const adaptiveCooldownActive = now < this.adaptiveCooldownUntil;

    if (hudNavigationOpen || adaptiveCooldownActive) {
      return {
        frameInterval: 0,
        modeLabel: hudNavigationOpen ? 'FOCUS LOCK' : 'FULL RATE',
        pixelScale: severeFrameStress ? Math.max(0.7, fullRatePixelScale - 0.1) : frameStress ? Math.max(0.72, fullRatePixelScale - 0.05) : fullRatePixelScale,
        transitionActive,
        backgroundScale:
          severeFrameStress
            ? Math.max(0.18, fullRateBackgroundScale - 0.08)
            : frameStress
              ? Math.max(0.2, fullRateBackgroundScale - 0.04)
              : fullRateBackgroundScale
      };
    }

    if (introAnimating || expandedAnimating || idleMs < 3200) {
      return {
        frameInterval: 0,
        modeLabel: transitionActive ? 'TRANSITION' : frameStress ? 'FULL RATE+' : 'FULL RATE',
        pixelScale: severeFrameStress ? Math.max(0.7, fullRatePixelScale - 0.1) : frameStress ? Math.max(0.72, fullRatePixelScale - 0.05) : fullRatePixelScale,
        transitionActive,
        backgroundScale:
          transitionActive
            ? Math.max(0.16, fullRateBackgroundScale - 0.12)
            : severeFrameStress
              ? Math.max(0.18, fullRateBackgroundScale - 0.08)
              : frameStress
                ? Math.max(0.2, fullRateBackgroundScale - 0.04)
                : fullRateBackgroundScale
      };
    }

    if (idleMs < 9000) {
      return {
        frameInterval: 1000 / 60,
        modeLabel: 'BALANCED',
        pixelScale: manifoldHeavy ? (lowEndDevice ? 0.8 : 0.88) : lowEndDevice ? 0.88 : 0.92,
        transitionActive,
        backgroundScale: manifoldHeavy ? (lowEndDevice ? 0.22 : 0.26) : lowEndDevice ? 0.26 : 0.3
      };
    }

    return {
      frameInterval: 1000 / 30,
      modeLabel: 'POWER SAVE',
      pixelScale: lowEndDevice ? 0.76 : 0.82,
      transitionActive,
      backgroundScale: lowEndDevice ? 0.26 : 0.3
    };
  }

  getLastRenderTelemetry(): Readonly<ManifoldRenderTelemetry> {
    return this.lastRenderTelemetry;
  }

  private createItems(): void {
    const fragment = document.createDocumentFragment();
    let cardSequenceIndex = 0;
    const localizedCards = getLocalizedCvCards(this.locale);
    const localizedIntroCard = getLocalizedFeaturedIntroCard(this.locale);
    const localizedUi = getManifoldLocaleBundle(this.locale).ui;

    for (let index = 0; index < this.config.itemCount; index += 1) {
      const item = document.createElement('div');
      item.className = 'item';
      const isHeading = index % 4 === 0;

      if (isHeading) {
        const text = document.createElement('div');
        text.className = 'big-text';
        const sectionTitle = MANIFOLD_SECTION_HEADINGS[Math.floor(index / 4) % MANIFOLD_SECTION_HEADINGS.length] ?? 'PROFILE';
        const localizedSectionTitle = this.getLocalizedSectionTitle(sectionTitle);
        text.textContent = localizedSectionTitle;
        text.dataset.text = localizedSectionTitle;
        item.append(text);
        fragment.append(item);
        const state = this.createBaseItem(item, text, 'text', false, index);
        state.sectionTitle = sectionTitle;
        this.items.push(state);
        continue;
      }

      const card = document.createElement('div');
      card.className = 'card';
      card.tabIndex = 0;
      const sideMark = String(index + 1).padStart(2, '0');
      const isFeatured = index === this.config.featuredIndex;
      const entryGrid = isFeatured ? document.createElement('div') : null;
      if (entryGrid) {
        entryGrid.className = 'entry-wireframe';
        entryGrid.setAttribute('aria-hidden', 'true');
        item.append(entryGrid);
      }
      const mainCardData = localizedCards[cardSequenceIndex % localizedCards.length] ?? localizedCards[0];
      const cardData = isFeatured ? localizedIntroCard : mainCardData;
      const sectionTitle =
        MANIFOLD_SECTION_HEADINGS[Math.floor(index / 4) % MANIFOLD_SECTION_HEADINGS.length] ?? 'PROFILE';
      const sectionTone = MANIFOLD_SECTION_TONES[sectionTitle];
      const pixelPreset = CARD_PIXEL_PRESETS[cardSequenceIndex % CARD_PIXEL_PRESETS.length] ?? CARD_PIXEL_PRESETS[0];
      const iconPath = CARD_ICON_PATHS[cardSequenceIndex % CARD_ICON_PATHS.length] ?? CARD_ICON_PATHS[0];
      const factsHtml = cardData.facts
        .map(
          (fact) => `
            <li>
              <strong class="card-expanded-term" data-reveal-text="${fact.label}">${fact.label}</strong>
              <span class="card-expanded-value" data-reveal-text="${fact.value}">${fact.value}</span>
            </li>
          `
        )
        .join('');
      card.dataset.cardIndex = String(index);
      card.dataset.mobilePage = '0';
      const titleScale = clamp(1 - Math.max(0, cardData.title.length - 5) * 0.06, 0.64, 1);
      card.innerHTML = `
        <div class="card-header-panel">
          <div class="card-rail">
            <span class="card-rail-dot"></span>
          </div>
          <div class="card-header-body">
            <div class="card-kicker">
              <span class="card-signal">${cardData.signal}</span>
              <span class="card-slash">//</span>
              <span class="card-mode">${cardData.mode}</span>
              <span
                class="card-handoff"
                data-preview-handoff="${cardData.handoff}"
                data-expanded-handoff="${cardData.expandedHandoff}"
              >${cardData.handoff}</span>
            </div>
            <h2
              class="card-title"
              style="--card-title-scale:${titleScale.toFixed(3)};"
              data-preview-title="${cardData.title}"
              data-expanded-title="${cardData.expandedTitle}"
            ><span class="card-title-track">${cardData.title}</span></h2>
          </div>
        </div>
        <div class="card-body">
          <div class="card-preview-layer">
            <div class="card-core" aria-hidden="true">
              <pixel-canvas
                class="card-pixel-canvas"
                data-gap="${pixelPreset.gap}"
                data-speed="${pixelPreset.speed}"
                data-colors="${pixelPreset.colors}"
              ></pixel-canvas>
              <div class="card-core-glow"></div>
              <div class="card-core-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
                  <path d="${iconPath}"></path>
                </svg>
              </div>
              <span class="card-core-chip">${cardData.chip}</span>
              <div class="card-spectrum" aria-hidden="true">
                ${Array.from({ length: 16 })
          .map((_, i) => `<div class="card-spectrum-bar" data-index="${i}"></div>`)
          .join('')}
              </div>
            </div>
            <div class="card-id-row">
              <span class="card-id">${cardData.id}</span>
              <span class="card-status-dot" style="background:${MANIFOLD_SCENE_CONFIG.colors[index % MANIFOLD_SCENE_CONFIG.colors.length]};"></span>
            </div>
            <div class="card-footer">
              <span>${cardData.previewLeftLabel}: ${cardData.previewLeft}</span>
              <span>${cardData.previewRightLabel}: ${cardData.previewRight}</span>
            </div>
            <div class="card-index">${sideMark}</div>
          </div>
          <div class="card-transition-snapshot" aria-hidden="true">
            <div class="card-transition-snapshot__rail"></div>
            <div class="card-transition-snapshot__header">
              <span class="card-transition-snapshot__signal">${cardData.signal}</span>
              <span class="card-transition-snapshot__mode">${cardData.mode}</span>
            </div>
            <strong class="card-transition-snapshot__title">${cardData.title}</strong>
            <div class="card-transition-snapshot__bars" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div class="card-transition-snapshot__footer">
              <span class="card-transition-snapshot__chip">${cardData.chip}</span>
              <span class="card-transition-snapshot__id">${cardData.id}</span>
            </div>
          </div>
          <div class="card-expanded-panel">
            <div class="card-expanded-shell">
              <div class="card-expanded-meta" data-reveal-text="${cardData.eyebrow}">${cardData.eyebrow}</div>
              <p class="card-expanded-lead" data-reveal-text="${cardData.lead}">${cardData.lead}</p>
              <div class="card-expanded-grid">
                <div class="card-expanded-block card-expanded-block--highlights">
                  <span class="card-expanded-label" data-reveal-text="${localizedUi.cardHighlights}">${localizedUi.cardHighlights}</span>
                  <ul class="card-expanded-list">
                    ${cardData.highlights.map((point) => `<li data-reveal-text="${point}">${point}</li>`).join('')}
                  </ul>
                </div>
                <div class="card-expanded-block card-expanded-block--snapshot">
                  <span class="card-expanded-label" data-reveal-text="${localizedUi.cardSnapshot}">${localizedUi.cardSnapshot}</span>
                  <ul class="card-expanded-list card-expanded-list--facts">
                    ${factsHtml}
                  </ul>
                </div>
              </div>
              <div class="card-expanded-surface">
                <span data-reveal-text="${cardData.surfaceKicker}">${cardData.surfaceKicker}</span>
                <strong data-reveal-text="${cardData.surfaceValue}">${cardData.surfaceValue}</strong>
                <p data-reveal-text="${cardData.surfaceText}">${cardData.surfaceText}</p>
              </div>
            </div>
            <div class="card-expanded-mobile-nav" aria-label="Card content pages">
              <span class="card-expanded-mobile-indicator">01 / 02</span>
            </div>
            <div class="card-expanded-mobile-tap card-expanded-mobile-tap--prev" data-card-page-nav="prev"></div>
            <div class="card-expanded-mobile-tap card-expanded-mobile-tap--next" data-card-page-nav="next"></div>
            <div class="card-expanded-mobile-hint card-expanded-mobile-hint--prev" aria-hidden="true"><span>←</span></div>
            <div class="card-expanded-mobile-hint card-expanded-mobile-hint--next" aria-hidden="true"><span>→</span></div>
          </div>
        </div>
      `;
      card.dataset.section = sectionTitle;
      if (sectionTone) {
        card.style.setProperty('--card-accent', sectionTone.accent);
        card.style.setProperty('--card-accent-soft', sectionTone.accentSoft);
        card.style.setProperty('--card-rail-end', sectionTone.railEnd);
      }
      const mobilePrevTap = card.querySelector<HTMLElement>('.card-expanded-mobile-tap--prev');
      const mobileNextTap = card.querySelector<HTMLElement>('.card-expanded-mobile-tap--next');
      const mobilePrevHint = card.querySelector<HTMLElement>('.card-expanded-mobile-hint--prev');
      const mobileNextHint = card.querySelector<HTMLElement>('.card-expanded-mobile-hint--next');

      const handleMobilePagerPointerDown = (event: PointerEvent) => {
        event.stopPropagation();
      };
      const handleMobilePagerClick = (direction: -1 | 1) => (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        this.setCardMobilePage(state, state.mobilePage + direction);
      };

      mobilePrevTap?.addEventListener('pointerdown', handleMobilePagerPointerDown);
      mobileNextTap?.addEventListener('pointerdown', handleMobilePagerPointerDown);
      mobilePrevHint?.addEventListener('pointerdown', handleMobilePagerPointerDown);
      mobileNextHint?.addEventListener('pointerdown', handleMobilePagerPointerDown);
      item.append(card);
      fragment.append(item);

      const state = this.createBaseItem(item, card, 'card', isFeatured, index);
      state.cardTitle = cardData.title;
      state.expandedCardTitle = cardData.expandedTitle;
      state.defaultCardContent = mainCardData;
      state.entryGridEl = entryGrid;
      state.gridOrder = cardSequenceIndex;
      state.expandedHandoff = cardData.expandedHandoff;
      state.introCardContent = isFeatured ? localizedIntroCard : null;
      state.sectionTitle = sectionTitle;
      state.titleEl = card.querySelector<HTMLElement>('.card-title');
      state.handoffEl = card.querySelector<HTMLElement>('.card-handoff');
      state.pixelCanvasEl = card.querySelector<PixelCanvasHost>('pixel-canvas');
      state.expandedPanelEl = card.querySelector<HTMLElement>('.card-expanded-panel');
      state.mobilePrevNavEl = mobilePrevTap;
      state.mobileNextNavEl = mobileNextTap;
      state.activeCardProfile = isFeatured ? 'intro' : 'default';
      state.rot = (this.seed(index + 5) - 0.5) * 30;
      state.response = 0.07 + this.seed(index + 6) * 0.07;
      state.variance = this.seed(index + 7);
      this.items.push(state);
      mobilePrevTap?.addEventListener('click', handleMobilePagerClick(-1));
      mobileNextTap?.addEventListener('click', handleMobilePagerClick(1));
      mobilePrevHint?.addEventListener('click', handleMobilePagerClick(-1));
      mobileNextHint?.addEventListener('click', handleMobilePagerClick(1));
      this.setCardMobilePage(state, 0);
      scheduleCardTitleMarqueeSync(state.titleEl);
      cardSequenceIndex += 1;

      if (isFeatured) {
        item.classList.add('item--interactive');
        item.dataset.entryCardHost = 'true';
        card.classList.add('card--entry');
        card.dataset.entryCard = 'true';
        this.featuredItem = state;
      }
    }

    this.refreshCardItemsCache();
    this.world.append(fragment);
  }

  private createBaseItem(
    el: HTMLElement,
    fxEl: HTMLElement,
    type: ItemType,
    isFeatured: boolean,
    seedIndex: number
  ): ItemState {
    return {
      activeCardProfile: 'default',
      defaultCardContent: null,
      cardContentVersion: 0,
      cardTitle: '',
      expandedCardTitle: '',
      entryGridEl: null,
      gridOrder: -1,
      handoffEl: null,
      introCardContent: null,
      expandedHandoff: '',
      el,
      fxEl,
      pixelCanvasEl: null,
      titleEl: null,
      expandedPanelEl: null,
      mobilePrevNavEl: null,
      mobileNextNavEl: null,
      pendingTitleMarqueeSync: false,
      type,
      isFeatured,
      cardIndex: seedIndex,
      mobilePage: 0,
      sectionTitle: '',
      x: 0,
      y: 0,
      rot: 0,
      baseZ: -seedIndex * this.config.zGap,
      chroma: 0,
      audioChroma: 0,
      audioShift: 0,
      trail: 0,
      shift: 0,
      inertiaY: 0,
      inertiaZ: 0,
      inertiaRotX: 0,
      inertiaRotY: 0,
      inertiaRotZ: 0,
      response: 0.12,
      variance: 0,
      currentAlpha: 0,
      currentDepth: -Infinity,
      currentScreenX: 0,
      currentScreenY: 0,
      currentScreenWidth: 0,
      currentScreenHeight: 0,
      currentScreenQuad: [[0, 0], [0, 0], [0, 0], [0, 0]],
      hasCurrentScreenQuad: false,
      lastZIndex: '',
      lastOpacity: '',
      lastTransform: '',
      lastFxTransform: '',
      lastTextShadow: '',
      lastFilter: '',
      lastFaceMode: '',
      lastFaceTransform: '',
      lastInlineFxTransform: '',
      lastCardFx: '',
      lastCardLayout: '',
      lastCardScale: '',
      lastAccessibilityState: -1,
      lastSectionState: '',
      lastMobiusState: '',
      lastTransitionSnapshotState: '',
      lastTransitionSnapshotVersion: -1,
      lastBasePosKey: NaN,
      lastBaseRotKey: NaN,
      lastFxKey: NaN,
      lastCardScaleRounded: -1,
      lastTextScaleRounded: -1,
      lastLayoutState: '',
      lastCardWidth: '',
      lastCardHeight: '',
      lastLayoutFade: Number.NaN,
      lastShellFade: Number.NaN,
      lastSpectrumActive: false,
      lastSpectrumValues: new Float32Array(16).fill(0.01),
      lastX: Number.NaN,
      lastY: Number.NaN,
      lastZ: Number.NaN,
      lastRot: Number.NaN,
      lastTiltX: Number.NaN,
      lastTiltY: Number.NaN,
      currentCardScale: 1,
      contentRevealRafs: [],
      contentRevealTimeouts: [],
      contentRevealToken: 0,
      handoffScrambleRaf: 0,
      handoffScrambleTarget: '',
      titleScrambleRaf: 0,
      titleScrambleTarget: ''
    };
  }

  private layoutItems(): void {
    const viewport = this.runtime.getViewportSize();
    this.viewportWidth = viewport.width;
    this.viewportHeight = viewport.height;
    this.isMobileViewport = this.viewportWidth <= MANIFOLD_MOBILE_BREAKPOINT;
    const isCompactViewport = this.viewportWidth <= 1120;
    this.twoDController.invalidateGridMetrics();
    if (this.isStacked2DMobileLayout()) {
      this.twoDOffsetX = 0;
      this.twoDOffsetXTarget = 0;
    } else {
      // USER_REQUEST: RESIZE_ALIGNMENT - Ensure grid stays centered on resize
      this.twoDController.focusCardIn2D(this.twoDTargetCardIndex, true);
    }
    let cardIndex = 0;

    for (let index = 0; index < this.items.length; index += 1) {
      const item = this.items[index];

      if (item.type === 'card') {
        const lanePattern = this.isMobileViewport
          ? [0, -1, 1, 0, 1, -1]
          : isCompactViewport
            ? [0, -1, 1, 0, 1, -1]
            : [-1, 0, 1, -1, 1, 0];
        const lane = lanePattern[cardIndex % lanePattern.length] ?? 0;
        const band = Math.floor(cardIndex / lanePattern.length);
        const laneSpacing = this.viewportWidth * (
          this.isMobileViewport
            ? 0.135
            : isCompactViewport
              ? 0.165
              : 0.24
        );
        const verticalSpacing = this.viewportHeight * (
          this.isMobileViewport
            ? 0.108
            : isCompactViewport
              ? 0.118
              : 0.13
        );
        const bandOrigin = this.isMobileViewport ? 0.46 : isCompactViewport ? 0.58 : 1;
        const baseY = (band - bandOrigin) * verticalSpacing + Math.sin(cardIndex * 0.65) * 18;

        item.x = lane * laneSpacing + (lane === 0 ? Math.sin(cardIndex * 0.8) * 18 : 0);
        item.y = baseY;
        item.rot = lane * -4 + (band % 2 === 0 ? -1.8 : 1.8);
        item.gridOrder = cardIndex;
        cardIndex += 1;
        continue;
      }

      if (item.type === 'text') {
        const textIndex = Math.floor(index / 4);
        const textAngle = textIndex * 1.17;
        item.x = Math.cos(textAngle) * (this.viewportWidth * 0.08);
        item.y = Math.sin(textAngle * 1.4) * (this.viewportHeight * 0.06);
        item.rot = Math.sin(textAngle * 0.8) * 6;
        continue;
      }

    }

    this.refreshCardItemsCache();

    if (this.viewModeTarget > 0.5) {
      const focusCard = this.expandedCard ?? this.getEffectiveFocusCard() ?? this.featuredItem;
      if (focusCard) {
        this.focusCardIn2D(focusCard.cardIndex, true);
      }
    }
  }

  private refreshHintMeasurements(): void {
    this.hintController.refreshHintMeasurements();
  }

  private getItemScreenRect(item: ItemState | null): ItemScreenRect | null {
    if (!item) {
      return null;
    }

    if (item.hasCurrentScreenQuad) {
      const quad = item.currentScreenQuad;
      let left = quad[0][0];
      let right = quad[0][0];
      let top = quad[0][1];
      let bottom = quad[0][1];

      for (let index = 1; index < quad.length; index += 1) {
        const point = quad[index];
        left = Math.min(left, point[0]);
        right = Math.max(right, point[0]);
        top = Math.min(top, point[1]);
        bottom = Math.max(bottom, point[1]);
      }

      return {
        left,
        right,
        top,
        bottom,
        width: Math.max(0, right - left),
        height: Math.max(0, bottom - top)
      };
    }

    if (item.currentScreenWidth <= 0 || item.currentScreenHeight <= 0) {
      return null;
    }

    const centerX = this.viewportWidth * 0.5 + item.currentScreenX;
    const centerY = this.viewportHeight * 0.5 + item.currentScreenY;
    const halfWidth = item.currentScreenWidth * 0.5;
    const halfHeight = item.currentScreenHeight * 0.5;

    return {
      left: centerX - halfWidth,
      right: centerX + halfWidth,
      top: centerY - halfHeight,
      bottom: centerY + halfHeight,
      width: item.currentScreenWidth,
      height: item.currentScreenHeight
    };
  }

  private getFourDSceneScreenRect(scene: FourDSceneState | null): ItemScreenRect | null {
    if (!scene || scene.edgeStates.length === 0) {
      return null;
    }

    let left = Number.POSITIVE_INFINITY;
    let right = Number.NEGATIVE_INFINITY;
    let top = Number.POSITIVE_INFINITY;
    let bottom = Number.NEGATIVE_INFINITY;

    for (const edge of scene.edgeStates) {
      left = Math.min(left, edge.pointA.x, edge.pointB.x);
      right = Math.max(right, edge.pointA.x, edge.pointB.x);
      top = Math.min(top, edge.pointA.y, edge.pointB.y);
      bottom = Math.max(bottom, edge.pointA.y, edge.pointB.y);
    }

    if (!Number.isFinite(left) || !Number.isFinite(right) || !Number.isFinite(top) || !Number.isFinite(bottom)) {
      return null;
    }

    return {
      left,
      right,
      top,
      bottom,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top)
    };
  }

  private updateCardScreenQuad(
    item: ItemState,
    width: number,
    height: number,
    centerX: number,
    centerY: number,
    baseZ: number,
    shiftZ: number,
    tiltXDeg: number,
    tiltYDeg: number,
    tiltZDeg: number,
    scale: number
  ): void {
    const halfHeight = height * 0.5;
    const worldTiltX = (this.currentWorldTiltX * Math.PI) / 180;
    const worldTiltY = (this.currentWorldTiltY * Math.PI) / 180;
    const cardTiltX = (tiltXDeg * Math.PI) / 180;
    const cardTiltY = (tiltYDeg * Math.PI) / 180;
    const cardTiltZ = (tiltZDeg * Math.PI) / 180;
    const perspective = Math.max(1, this.currentPerspectiveDepth);

    const quad = item.currentScreenQuad;

    writeProjectedQuadPoint(
      quad[0],
      0,
      0,
      width * 0.5,
      height * 0.015,
      halfHeight,
      centerX,
      centerY,
      baseZ,
      shiftZ,
      cardTiltX,
      cardTiltY,
      cardTiltZ,
      worldTiltX,
      worldTiltY,
      scale,
      perspective,
      this.viewportWidth,
      this.viewportHeight
    );
    writeProjectedQuadPoint(
      quad[1],
      width,
      0,
      width * 0.5,
      height * 0.015,
      halfHeight,
      centerX,
      centerY,
      baseZ,
      shiftZ,
      cardTiltX,
      cardTiltY,
      cardTiltZ,
      worldTiltX,
      worldTiltY,
      scale,
      perspective,
      this.viewportWidth,
      this.viewportHeight
    );
    writeProjectedQuadPoint(
      quad[2],
      width,
      height,
      width * 0.5,
      height * 0.015,
      halfHeight,
      centerX,
      centerY,
      baseZ,
      shiftZ,
      cardTiltX,
      cardTiltY,
      cardTiltZ,
      worldTiltX,
      worldTiltY,
      scale,
      perspective,
      this.viewportWidth,
      this.viewportHeight
    );
    writeProjectedQuadPoint(
      quad[3],
      0,
      height,
      width * 0.5,
      height * 0.015,
      halfHeight,
      centerX,
      centerY,
      baseZ,
      shiftZ,
      cardTiltX,
      cardTiltY,
      cardTiltZ,
      worldTiltX,
      worldTiltY,
      scale,
      perspective,
      this.viewportWidth,
      this.viewportHeight
    );
    item.hasCurrentScreenQuad = true;
  }

  private setElementInert(element: HTMLElement, inert: boolean): void {
    const inertElement = element as HTMLElement & { inert?: boolean };

    if ('inert' in inertElement) {
      inertElement.inert = inert;
    }

    if (inert) {
      element.setAttribute('inert', '');
    } else {
      element.removeAttribute('inert');
    }
  }

  private updateCardAccessibility(
    item: ItemState,
    input: {
      allowCardFocus: boolean;
      allowExpandedPanel: boolean;
      allowExpandedControls: boolean;
      hiddenFromAccessibilityTree: boolean;
    }
  ): void {
    let stateMask = 0;

    if (input.allowCardFocus) {
      stateMask |= CARD_ACCESSIBILITY_ALLOW_FOCUS;
    }

    if (input.allowExpandedPanel) {
      stateMask |= CARD_ACCESSIBILITY_ALLOW_EXPANDED_PANEL;
    }

    if (input.allowExpandedControls) {
      stateMask |= CARD_ACCESSIBILITY_ALLOW_EXPANDED_CONTROLS;
    }

    if (input.hiddenFromAccessibilityTree) {
      stateMask |= CARD_ACCESSIBILITY_HIDDEN;
    }

    if (stateMask === item.lastAccessibilityState) {
      return;
    }

    const activeElement = document.activeElement;
    if (
      !input.allowCardFocus &&
      activeElement instanceof HTMLElement &&
      item.fxEl.contains(activeElement)
    ) {
      activeElement.blur();
    }

    item.fxEl.tabIndex = input.allowCardFocus ? 0 : -1;
    item.fxEl.setAttribute('aria-hidden', input.hiddenFromAccessibilityTree ? 'true' : 'false');
    this.setElementInert(item.fxEl, input.hiddenFromAccessibilityTree);

    const expandedPanel = item.expandedPanelEl;
    if (expandedPanel) {
      expandedPanel.setAttribute('aria-hidden', input.allowExpandedPanel ? 'false' : 'true');
    }

    const prevButton = item.mobilePrevNavEl;
    const nextButton = item.mobileNextNavEl;

    for (const button of [prevButton, nextButton]) {
      if (!button) {
        continue;
      }

      if (input.allowExpandedControls && !button.disabled) {
        button.removeAttribute('tabindex');
      } else {
        button.setAttribute('tabindex', '-1');
      }
    }

    item.lastAccessibilityState = stateMask;
  }

  private updateCardSectionState(item: ItemState, state: 'active' | 'outside' | 'neutral'): void {
    if (item.lastSectionState === state) {
      return;
    }

    item.fxEl.classList.toggle('is-outside-active-section', state === 'outside');
    item.fxEl.classList.toggle('is-active-section', state === 'active');
    item.lastSectionState = state;
  }

  private computeFeaturedPose(time: number, cameraZ: number): FeaturedPose {
    const featured = this.featuredItem;

    if (!featured) {
      return {
        x: 0,
        y: 0,
        z: -220,
        rotZ: -12,
        tiltX: 0,
        tiltY: 0,
        shiftZ: 0
      };
    }

    const featuredPose = computeFeaturedCardPose(featured, {
      cameraZ,
      introProgress: this.introProgress,
      loopSize: this.loopSize,
      mouseX: this.phaseState.mouseX,
      time,
      velocity: this.phaseState.velocity
    });

    if (!this.isMobileViewport) {
      return featuredPose;
    }

    let settledZ = ((featured.baseZ + cameraZ) % this.loopSize + this.loopSize) % this.loopSize;
    if (settledZ > 500) {
      settledZ -= this.loopSize;
    }

    const viewportTightness = clamp((this.viewportWidth - 360) / 360, 0, 1);
    const motionMix = this.introCompleted
      ? lerp(0.14, 0.28, viewportTightness)
      : lerp(0.3, 0.48, viewportTightness);
    const depthMix = Math.min(0.42, motionMix + 0.12);
    const shiftMix = this.introCompleted ? motionMix * 0.42 : motionMix * 0.78;

    return {
      x: lerp(featured.x, featuredPose.x, motionMix),
      y: lerp(featured.y, featuredPose.y, motionMix),
      z: lerp(settledZ, featuredPose.z, depthMix),
      rotZ: lerp(featured.rot, featuredPose.rotZ, motionMix),
      tiltX: featuredPose.tiltX * motionMix,
      tiltY: featuredPose.tiltY * motionMix,
      shiftZ: featuredPose.shiftZ * shiftMix
    };
  }

  private renderCardItem(
    item: ItemState,
    vizZ: number,
    time: number,
    featuredPose: FeaturedPose,
    sceneScroll: number,
    viewModeProgress: number,
    fourDProgress: number,
    active2DSectionTitle: string,
    twoDGridMetrics: TwoDGridMetrics | null,
    cardRenderLayout: CardRenderLayout,
    fourDScene: FourDSceneState | null,
    maintainScreenQuad: boolean,
    sharedSpectrum: number[]
  ): void {
    let tx: number;
    let ty: number;
    let tz: number;
    let tiltX: number;
    let tiltY: number;
    let tiltZ: number;
    let shiftZ: number;

    const isExpandedMorphing = this.expandedCard === item && (this.expandedTarget > 0.01 || this.expandedProgress > 0.01);

    const useFeaturedPose = item.isFeatured && (!this.introCompleted || this.introTarget < 1 || this.exitReturnActive);

    if (useFeaturedPose) {
      tx = featuredPose.x;
      ty = featuredPose.y;
      tz = featuredPose.z;
      tiltX = featuredPose.tiltX;
      tiltY = featuredPose.tiltY;
      tiltZ = featuredPose.rotZ;
      shiftZ = featuredPose.shiftZ;
    } else {
      tx = item.x;
      ty = item.y + item.inertiaY;
      tz = vizZ;
      tiltX = item.inertiaRotX;
      tiltY = item.inertiaRotY;
      tiltZ = item.inertiaRotZ;
      shiftZ = item.inertiaZ;
    }

    const twoDPose = twoDGridMetrics
      ? this.twoDController.compute2DCardPose(item, sceneScroll, time)
      : {
        alpha: item.currentAlpha,
        scale: 1,
        shiftZ: 0,
        tiltX: 0,
        tiltY: 0,
        tiltZ: item.rot,
        x: item.x,
        y: item.y,
        z: vizZ,
        textScale: 1
      };

    const fourDPose = {
      accentInverted: false,
      alpha: item.currentAlpha,
      scale: 1,
      shiftZ: 0,
      tiltX: 0,
      tiltY: 0,
      tiltZ: item.rot,
      x: item.x,
      y: item.y,
      z: vizZ,
      textScale: 1
    };

    ({ shiftZ, tiltX, tiltY, tiltZ, tx, ty, tz } = this.physicsRuntime.blendCardPose(
      { shiftZ, tiltX, tiltY, tiltZ, tx, ty, tz },
      twoDPose,
      fourDPose,
      viewModeProgress,
      fourDProgress
    ));

    const introCardMix = item.isFeatured ? 1 - this.introProgress : 0;
    const introCardScale = item.isFeatured && !this.introCompleted
      ? lerp(MANIFOLD_CONSTANTS.SPATIAL_TOPOLOGY.featuredIntroScale, 1, 1 - introCardMix)
      : 1;

    const twoDScale = lerp(1, twoDPose.scale, viewModeProgress);
    const twoDTextScale = lerp(1, twoDPose.textScale, viewModeProgress);
    const fourDScale = lerp(1, fourDPose.scale, fourDProgress);
    const cardScaleValueBase = introCardScale * twoDScale * fourDScale;
    const textScaleValueBase = introCardScale * twoDTextScale * fourDScale;

    const cardScaleValue = this.expandedCard === item
      ? lerp(cardScaleValueBase, 1.0, this.expandedProgress)
      : cardScaleValueBase;

    const textScaleValue = this.expandedCard === item
      ? lerp(textScaleValueBase, 1.0, this.expandedProgress)
      : textScaleValueBase;

    this.resetFourDCardFace(item);

    if (item.isFeatured && !this.introCompleted) {
      const introFloat = Math.sin(time * MANIFOLD_CONSTANTS.CARD_MOTION.introFloatTimeScalar) *
        MANIFOLD_CONSTANTS.CARD_MOTION.introFloatAmplitude *
        introCardMix;
      ty += introFloat;
      shiftZ += MANIFOLD_CONSTANTS.CARD_MOTION.introShiftZ * introCardMix;
    }

    if (this.expandedCard && this.expandedCard !== item && viewModeProgress > 0.01) {
      const expandedRepulsionRadius = 1280;
      const repelDistance = Math.max(80, Math.hypot(tx, ty));
      const repelEnvelope = clamp(1 - repelDistance / expandedRepulsionRadius, 0, 1);
      const repelStrength = this.expandedProgress * 96 * viewModeProgress * repelEnvelope;
      tx += (tx / repelDistance) * repelStrength;
      ty += (ty / repelDistance) * repelStrength * 0.78;
      tz -= repelStrength * 1.35 + this.expandedProgress * 180 * repelEnvelope;
    }

    this.domRenderer.setCardScale(item, cardScaleValue, textScaleValue);
    this.domRenderer.setEntryGridAlpha(item, item.isFeatured ? clamp(introCardMix * 1.08 + 0.12, 0, 1) : 0);

    if (this.expandedCard === item) {
      const expandMix = this.expandedProgress;
      const isClosingExpanded = this.expandedTarget < 0.5;
      const shellFade = isClosingExpanded
        ? easeInOutCubic(clamp(expandMix / 0.22, 0, 1))
        : 1 - Math.pow(1 - expandMix, 3);
      const layoutFade = isClosingExpanded
        ? clamp((expandMix - 0.06) / 0.26, 0, 1)
        : clamp((expandMix - 0.15) / 0.85, 0, 1);

      const startZ = Math.max(tz, -15);

      tx = lerp(tx, 0, expandMix);
      ty = lerp(ty, 0, expandMix);
      tz = lerp(startZ, -28, expandMix);
      tiltX = lerp(tiltX, -2.2 + this.phaseState.mouseY * 2.2, expandMix);
      tiltY = lerp(tiltY, this.phaseState.mouseX * 3.2, expandMix);
      tiltZ = lerp(tiltZ, 0, expandMix);
      shiftZ = lerp(shiftZ, 0, expandMix);

      this.domRenderer.updateCardLayout(item, true, cardRenderLayout, {
        layoutFade: Math.round(layoutFade * 60) / 60,
        shellFade: Math.round(shellFade * 100) / 100
      });

      const shouldShowExpandedClass = item.fxEl.classList.contains('is-expanded') ? expandMix > 0.08 : expandMix > 0.74;
      item.fxEl.classList.toggle('is-expanded', shouldShowExpandedClass);
    } else {
      this.domRenderer.updateCardLayout(item, false, cardRenderLayout);
      item.fxEl.classList.remove('is-expanded');
    }

    let computedOpacity = this.physicsRuntime.computeCardOpacity(
      item,
      active2DSectionTitle,
      viewModeProgress,
      fourDProgress,
      twoDPose.alpha,
      fourDPose.alpha,
      this.expandedCard !== null
    );

    if (fourDScene && fourDProgress > 0.001 && !isExpandedMorphing) {
      const sourceVisibility = this.fourDTarget > 0.5
        ? 1 - easeInOutCubic(clamp((fourDProgress - MANIFOLD_CONSTANTS.SPATIAL_TOPOLOGY.fourDSourceFadeOffset) / MANIFOLD_CONSTANTS.SPATIAL_TOPOLOGY.fourDSourceFadeSpan, 0, 1))
        : 1 - easeInOutCubic(clamp((fourDProgress - MANIFOLD_CONSTANTS.SPATIAL_TOPOLOGY.fourDSourceRestoreOffset) / MANIFOLD_CONSTANTS.SPATIAL_TOPOLOGY.fourDSourceRestoreSpan, 0, 1));
      computedOpacity *= sourceVisibility;
    }

    computedOpacity = Math.max(computedOpacity, this.getCollapsedExpandedHandoffOpacity(item));
    if (isExpandedMorphing) computedOpacity = Math.max(computedOpacity, this.expandedProgress);

    if (this.expandedCard && this.expandedCard !== item && viewModeProgress < 0.22) {
      computedOpacity *= lerp(1, 0.12, this.expandedProgress);
    }

    if (maintainScreenQuad) {
      const baseCardWidth = cardRenderLayout.compactWidthPx || 220;
      const baseCardHeight = cardRenderLayout.compactHeightPx || 220;
      this.updateCardScreenQuad(item, baseCardWidth, baseCardHeight, tx, ty, tz, shiftZ, tiltX, tiltY, tiltZ, cardScaleValue);
    } else {
      item.hasCurrentScreenQuad = false;
    }

    const isSectionFocused2D = viewModeProgress > 0.5 && active2DSectionTitle.length > 0;
    const isOutsideActiveSection = isSectionFocused2D && item.sectionTitle !== active2DSectionTitle;
    const useTransitionSnapshot = (this.transitionPerformanceMode || (this.lastFastTwoDScrollSnapshotState && isOutsideActiveSection && viewModeProgress > 0.7)) && !isExpandedMorphing && this.expandedCard !== item && fourDProgress < 0.01 && computedOpacity > 0.08;

    item.currentScreenWidth = (cardRenderLayout.compactWidthPx || 220) * cardScaleValue;
    item.currentScreenHeight = (cardRenderLayout.compactHeightPx || 220) * cardScaleValue;

    const targetVisible = this.domRenderer.renderCardVisibility(
      item,
      computedOpacity,
      isExpandedMorphing,
      !useTransitionSnapshot && !this.transitionPerformanceMode
    );
    if (!targetVisible) {
      this.updateCardTransitionSnapshot(item, false);
      return;
    }

    item.currentDepth = tz + shiftZ;
    item.currentScreenX = tx;
    item.currentScreenY = ty;
    this.updateCardSectionState(
      item,
      isSectionFocused2D
        ? (isOutsideActiveSection ? 'outside' : 'active')
        : 'neutral'
    );

    const mobiusState = fourDProgress > 0.35 && fourDPose.accentInverted ? 'inverted' : 'normal';
    if (item.lastMobiusState !== mobiusState) {
      item.fxEl.classList.toggle('is-mobius-inverted', mobiusState === 'inverted');
      item.lastMobiusState = mobiusState;
    }

    this.updateCardTransitionSnapshot(item, useTransitionSnapshot);

    if (!useTransitionSnapshot && item.currentAlpha > 0.01) {
      this.domRenderer.updateCardSpectrum(
        item,
        this.currentAudioSpectrum,
        this.currentAudioEnergy,
        item.currentAlpha,
        sharedSpectrum
      );
    }

    const allowCardFocus = isExpandedMorphing || (item.isFeatured && (!this.introCompleted || this.introTarget < 1 || this.exitReturnActive) && computedOpacity > 0.18) || (this.targetViewMode === '2d' && viewModeProgress > 0.5 && fourDProgress < 0.01 && computedOpacity > 0.12 && !isOutsideActiveSection);
    this.updateCardAccessibility(item, {
      allowCardFocus,
      allowExpandedPanel: isExpandedMorphing,
      allowExpandedControls: isExpandedMorphing && this.isMobileViewport,
      hiddenFromAccessibilityTree: computedOpacity <= 0.08
    });

    if (this.current2DFrameBounds && item.sectionTitle === this.current2DFrameSectionTitle && computedOpacity > 0.08) {
      const width = (cardRenderLayout.compactWidthPx || 220) * cardScaleValue;
      const height = (cardRenderLayout.compactHeightPx || 220) * cardScaleValue;
      const centerX = this.viewportWidth * 0.5 + tx;
      const centerY = this.viewportHeight * 0.5 + ty;
      this.current2DFrameBounds.visibleCount += 1;
      this.current2DFrameBounds.minX = Math.min(this.current2DFrameBounds.minX, centerX - width * 0.5);
      this.current2DFrameBounds.maxX = Math.max(this.current2DFrameBounds.maxX, centerX + width * 0.5);
      this.current2DFrameBounds.minY = Math.min(this.current2DFrameBounds.minY, centerY - height * 0.5);
      this.current2DFrameBounds.maxY = Math.max(this.current2DFrameBounds.maxY, centerY + height * 0.5);
    }

    this.collectCardChromeInstance(item, computedOpacity, fourDProgress, this.gpuCardChromeMix);
    this.domRenderer.updateCardFx(item, shiftZ, tiltX, tiltY, tiltZ);
    this.domRenderer.setTranslatedTransform(item, tx, ty, Math.min(tz, 750));
  }

  private getCollapsedExpandedHandoffOpacity(item: ItemState): number {
    if (item !== this.collapsedExpandedCard) {
      return 0;
    }

    return clamp(this.collapsedExpandedFade, 0, 1);
  }

  private readonly _itemAccentCache = new WeakMap<ItemState, [number, number, number]>();
  private readonly lastRenderTelemetry: ManifoldRenderTelemetry = {
    fourDMs: 0,
    hudCommitMs: 0,
    interactionMs: 0,
    itemsMs: 0,
    particlesMs: 0,
    preludeMs: 0,
    sectionFrameMs: 0,
    spectrumCards: 0,
    transitionActive: false,
    visibleCards: 0,
    visibleItems: 0,
    visibleTexts: 0
  };

  private collectCardChromeInstance(
    item: ItemState,
    computedOpacity: number,
    fourDProgress: number,
    chromeMix: number
  ): void {
    if (
      !(this.cardChromeRenderer?.isSupported() ?? false) ||
      !item.hasCurrentScreenQuad ||
      computedOpacity <= 0.035 ||
      chromeMix <= 0.025 ||
      this.expandedCard === item ||
      fourDProgress > 0.04
    ) {
      return;
    }

    const instance = this.chromeInstancesPool[this.chromeInstancesActiveCount];
    if (!instance) {
      return;
    }

    let accent = this._itemAccentCache.get(item);
    if (!accent) {
      accent = this.resolveSectionAccentRgb(item.sectionTitle);
      this._itemAccentCache.set(item, accent);
    }

    const emphasis =
      item === this.hoveredCard
        ? 1
        : item.isFeatured
          ? 0.72
          : item.sectionTitle === this.current2DFrameSectionTitle
            ? 0.46
            : 0.2;

    instance.accentRgb = accent;
    instance.depth = item.currentDepth;
    instance.emphasis = emphasis * chromeMix * 0.72;
    instance.opacity = computedOpacity * chromeMix * 0.48;
    instance.quad = item.currentScreenQuad;
    this.chromeInstancesActiveCount += 1;
  }

  private resolveSectionAccentRgb(sectionTitle: string): [number, number, number] {
    const cached = this.sectionAccentRgbCache.get(sectionTitle);
    if (cached) {
      return cached;
    }

    const tone = MANIFOLD_SECTION_TONES[sectionTitle as keyof typeof MANIFOLD_SECTION_TONES] ?? MANIFOLD_SECTION_TONES.PROFILE;
    const accent = hexToRgb01(tone.accent);
    this.sectionAccentRgbCache.set(sectionTitle, accent);
    return accent;
  }

  private _lastIntroHintProgress = -1;
  private _lastContextHintMotionKey = -1;

  private updateIntroHint(): void {
    this.hintController.updateIntroHint();
  }

  private getClosestVisibleCard(includeFeatured = false): ItemState | null {
    if (this.is2DMode()) {
      return this.lastCentered2DCard ?? this.getCentered2DCard();
    }

    let closestCard: ItemState | null = null;

    for (let index = 0; index < this.cardItemsCache.length; index += 1) {
      const item = this.cardItemsCache[index];
      if (!item || item.currentAlpha <= 0.04 || (!includeFeatured && item.isFeatured)) {
        continue;
      }

      if (!closestCard || item.currentDepth > closestCard.currentDepth) {
        closestCard = item;
      }
    }

    return closestCard;
  }

  private updateContextHint(time: number): void {
    this.hintController.updateContextHint(time);
  }

  private update2DSectionFrame(viewModeProgress: number, delta: number): void {
    this.twoDController.update2DSectionFrame(viewModeProgress, delta);
  }

  private updateTextFx(item: ItemState, velocityMagnitude: number, time: number): void {
    const signedVelocity = Math.sign(this.phaseState.velocity) || 1;
    const isScrollHeavy = velocityMagnitude > 0.95;
    const targetShift = velocityMagnitude > 1.15 ? clamp(velocityMagnitude * 1.2, 0, 12) * signedVelocity : 0;
    const targetTrail = velocityMagnitude > 1.25 ? clamp(velocityMagnitude * 0.18, 0, 2.2) : 0;
    const audioStrength = this.audioActive
      ? clamp((this.audioPulse * 2.2 + this.audioEnergy * 0.38) * (isScrollHeavy ? 0.58 : 1), 0, 1)
      : 0;
    const audioReactive = MANIFOLD_CONSTANTS.AUDIO_REACTIVE;
    const audioWave = Math.sin(
      time * audioReactive.waveFrequency + item.variance * audioReactive.waveVariancePhase
    );
    const audioOffsetTarget =
      audioStrength > 0.01
        ? audioWave *
        (isScrollHeavy
          ? audioReactive.scrollHeavyBaseOffset + audioStrength * audioReactive.scrollHeavyStrengthMultiplier
          : audioReactive.baseOffset + audioStrength * audioReactive.strengthMultiplier)
        : 0;

    item.shift = lerp(item.shift, targetShift, 0.24);
    item.trail = lerp(item.trail, targetTrail, 0.2);
    item.chroma = lerp(item.chroma, velocityMagnitude > 1 ? 1 : 0, 0.18);
    item.audioShift = lerp(
      item.audioShift,
      audioOffsetTarget,
      audioStrength > item.audioChroma ? audioReactive.shiftRiseLerp : audioReactive.shiftFallLerp
    );
    item.audioChroma = lerp(
      item.audioChroma,
      audioStrength,
      audioStrength > item.audioChroma ? audioReactive.chromaRiseLerp : audioReactive.chromaFallLerp
    );

    const brightAlpha = clamp(0.12 + item.chroma * 0.28, 0.12, 0.42);
    const musicBrightAlpha = clamp(0.08 + item.audioChroma * (isScrollHeavy ? 0.78 : 1.18), 0.08, isScrollHeavy ? 0.72 : 0.96);
    const musicSoftAlpha = clamp(0.03 + item.audioChroma * (isScrollHeavy ? 0.2 : 0.5), 0.03, isScrollHeavy ? 0.22 : 0.54);
    const musicBlur = isScrollHeavy ? 0 : 0.12 + item.audioChroma * 0.54;
    const quantizedAudioShift = Math.round(item.audioShift * 4) / 4;
    const quantizedMusicBrightAlpha = Math.round(musicBrightAlpha * 50) / 50;
    const quantizedMusicSoftAlpha = Math.round(musicSoftAlpha * 50) / 50;
    const quantizedMusicBlur = Math.round(musicBlur * 10) / 10;
    const shiftQ = Math.round(item.shift);
    const textShadow = item.chroma > 0.035 && Math.abs(shiftQ) > 0
      ? `${shiftQ}px 0 0 rgba(255, 255, 255, ${brightAlpha.toFixed(2)}), ` +
      `${-shiftQ}px 0 0 rgba(255, 255, 255, ${brightAlpha.toFixed(2)})`
      : 'none';

    const filter = 'none';
    const musicFx = `${quantizedAudioShift.toFixed(2)}|${quantizedMusicBrightAlpha.toFixed(2)}|${quantizedMusicSoftAlpha.toFixed(2)}|${quantizedMusicBlur.toFixed(1)}`;

    if (musicFx !== item.lastFxTransform) {
      StyleAdapter.setNumericProperty(item.fxEl, '--music-shift', quantizedAudioShift, 'px');
      StyleAdapter.setNumericProperty(item.fxEl, '--music-alpha', quantizedMusicBrightAlpha);
      StyleAdapter.setNumericProperty(item.fxEl, '--music-glow-alpha', quantizedMusicSoftAlpha);
      StyleAdapter.setNumericProperty(item.fxEl, '--music-blur', quantizedMusicBlur, 'px');
      item.lastFxTransform = musicFx;
    }

    // Keep the inline transform stable unless we truly need to clear a leftover face-mode override.
    const nextInlineFxTransform = item.lastFaceMode === 'stretched' ? 'none' : '';
    if (nextInlineFxTransform !== item.lastInlineFxTransform) {
      item.fxEl.style.transform = nextInlineFxTransform;
      item.lastInlineFxTransform = nextInlineFxTransform;
    }
    if (item.lastFaceMode === 'stretched') {
      item.lastFaceMode = '';
    }

    if (textShadow !== item.lastTextShadow) {
      item.fxEl.style.textShadow = textShadow;
      // Performance optimization: Removed will-change for shadows - WebKit handles text bitmapping poorly with it
      item.fxEl.style.willChange = 'auto';
      item.lastTextShadow = textShadow;
    }

    if (filter !== item.lastFilter) {
      item.fxEl.style.filter = filter;
      item.lastFilter = filter;
    }
  }

  private ensureFourDCanvasSize(): void {
    const ctx = this.fourDWireframeContext;

    if (!ctx) {
      return;
    }

    const nextDpr = clamp(window.devicePixelRatio || 1, 1, 1.4);
    const nextWidth = Math.max(1, Math.round(this.viewportWidth * nextDpr));
    const nextHeight = Math.max(1, Math.round(this.viewportHeight * nextDpr));

    if (
      nextWidth === this.fourDCanvasWidth &&
      nextHeight === this.fourDCanvasHeight &&
      nextDpr === this.fourDCanvasDpr
    ) {
      return;
    }

    this.fourDCanvasWidth = nextWidth;
    this.fourDCanvasHeight = nextHeight;
    this.fourDCanvasDpr = nextDpr;
    this.fourDWireframe.width = nextWidth;
    this.fourDWireframe.height = nextHeight;
    ctx.setTransform(nextDpr, 0, 0, nextDpr, 0, 0);
  }

  private getContextRevealForType(type: ItemType): number {
    const eased = easeInOutCubic(this.introProgress);

    if (type === 'card') {
      return clamp((eased - 0.78) / 0.22, 0, 1);
    }

    if (type === 'text') {
      return clamp((eased - 0.9) / 0.1, 0, 1);
    }

    return clamp((eased - 0.86) / 0.14, 0, 1);
  }

  private getHudFocus(): { section: string; card: string } {
    const focus = getHudFocus({
      effectiveFocusCard: this.getEffectiveFocusCard(),
      expandedCard: this.expandedCard,
      featuredItem: this.featuredItem
    });
    return {
      card: focus.card,
      section: this.getLocalizedSectionTitle(focus.section)
    };
  }

  private getScrollAnchorForItemIndex(itemIndex: number): number {
    return (itemIndex * this.config.zGap + this.loopSize) / this.config.camSpeed;
  }

  private getAnchorForCard(item: ItemState): number {
    return this.is2DMode()
      ? this.get2DScrollAnchorForCard(item)
      : this.getScrollAnchorForItemIndex(item.cardIndex);
  }

  private getEffectiveFocusCard(): ItemState | null {
    return getEffectiveFocusCard({
      centered2DCard: this.getCentered2DCard(),
      closestVisibleCard: this.getClosestVisibleCard(true),
      featuredItem: this.featuredItem,
      is2DMode: this.is2DMode(),
      lastCentered2DCard: this.lastCentered2DCard
    });
  }

  private getCentered2DCard(): ItemState | null {
    return getCentered2DCard(this.cardItemsCache);
  }

  private isStacked2DMobileLayout(): boolean {
    return this.isMobileViewport && this.viewportHeight > this.viewportWidth * 1.08;
  }

  private get2DGridMetrics(): TwoDGridMetrics {
    return this.twoDController.get2DGridMetrics();
  }

  private get2DScrollAnchorForCard(item: ItemState): number {
    const metrics = this.get2DGridMetrics();
    const row = Math.floor(item.gridOrder / metrics.columns);
    return this.introScrollAnchor + (row * metrics.spacingY) / metrics.scrollScale;
  }

  private computeFourDScene(_sceneScroll: number, time: number, fourDProgress: number): FourDSceneState {
    const loopLength = Math.max(1, this.loopSize / this.config.camSpeed);

    const projectionInput = {
      fourDProgress,
      scroll: this.phaseState.scroll,
      time,
      turns: this.continuousSceneScroll / loopLength,
      viewportSize: {
        width: this.viewportWidth,
        height: this.viewportHeight
      },
      velocity: Math.abs(this.phaseState.velocity)
    } as const;

    return ACTIVE_FOUR_D_VARIANT === 'inside'
      ? InsideTesseractProjector.computeScene(projectionInput)
      : TesseractProjector.computeScene(projectionInput);
  }

  private resetFourDCardFace(item: ItemState): void {
    if (item.lastFaceMode) {
      item.fxEl.classList.remove('is-four-d-face');
      // Restore transform-origin to default CSS values
      item.fxEl.style.transformOrigin = '';
      if (item.lastInlineFxTransform !== '') {
        item.fxEl.style.transform = '';
        item.lastInlineFxTransform = '';
      }
      item.lastFaceMode = '';
    }

    if (item.lastMobiusState === 'inverted') {
      item.fxEl.classList.remove('is-mobius-inverted');
    }
    item.lastMobiusState = '';

    if (item.lastFaceTransform) {
      item.fxEl.style.removeProperty('transform');
      item.lastFaceTransform = '';
    }
  }

  private createFourDFaceOverlay(sourceItem: ItemState): HTMLElement {
    const overlay = sourceItem.fxEl.cloneNode(true) as HTMLElement;
    this.configureFourDFaceOverlayElement(overlay);
    this.syncFourDFaceOverlayElement(overlay, sourceItem);
    this.elements.viewport.appendChild(overlay);
    return overlay;
  }

  private activateFourDFaceOverlay(overlay: HTMLElement, sourceItem: ItemState): void {
    if (!overlay.isConnected) {
      this.elements.viewport.appendChild(overlay);
    }

    this.syncFourDFaceOverlayElement(overlay, sourceItem);
    overlay.style.removeProperty('display');
    overlay.style.pointerEvents = 'none';
    overlay.style.willChange = 'transform, opacity';
  }

  private configureFourDFaceOverlayElement(overlay: HTMLElement): void {
    overlay.style.cssText = '';
    overlay.classList.add('four-d-face-overlay', 'is-four-d-face');
    overlay.style.position = 'absolute';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.transformOrigin = '0 0';
    overlay.style.width = `${MANIFOLD_FOUR_D_CARD_SIZE}px`;
    overlay.style.height = `${MANIFOLD_FOUR_D_CARD_SIZE}px`;
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
    overlay.style.willChange = 'auto';
    overlay.style.zIndex = '0';
    overlay.setAttribute('aria-hidden', 'true');
  }

  private syncFourDFaceOverlayElement(overlay: HTMLElement, sourceItem: ItemState): void {
    const sourceVersion = String(sourceItem.cardContentVersion);
    const sourceCardIndex = String(sourceItem.cardIndex);

    if (
      overlay.dataset.sourceCardIndex === sourceCardIndex &&
      overlay.dataset.sourceCardVersion === sourceVersion
    ) {
      return;
    }

    const clone = sourceItem.fxEl.cloneNode(true) as HTMLElement;
    overlay.className = clone.className;
    overlay.replaceChildren(...Array.from(clone.childNodes));
    this.sanitizeFourDFaceOverlayElement(overlay);
    overlay.dataset.sourceCardIndex = sourceCardIndex;
    overlay.dataset.sourceCardVersion = sourceVersion;
    this.configureFourDFaceOverlayElement(overlay);
  }

  private sanitizeFourDFaceOverlayElement(overlay: HTMLElement): void {
    const pixelCanvases = overlay.querySelectorAll('pixel-canvas');

    for (const pixelCanvas of pixelCanvases) {
      const placeholder = document.createElement('div');
      placeholder.className = pixelCanvas.className || 'card-pixel-canvas';
      placeholder.setAttribute('aria-hidden', 'true');
      pixelCanvas.replaceWith(placeholder);
    }

    const interactiveElements = overlay.querySelectorAll<HTMLElement>(
      'button, a, input, select, textarea, [tabindex], [data-card-page-nav]'
    );

    for (const element of interactiveElements) {
      element.setAttribute('tabindex', '-1');
      element.setAttribute('aria-hidden', 'true');
      if ('disabled' in element) {
        (element as HTMLButtonElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).disabled = true;
      }
    }
  }

  private refreshFourDFaceOverlayForCard(cardIndex: number): void {
    if (this.cardItemsCache.length === 0) {
      return;
    }

    const sourceItem = findCardItemByIndex(this.cardItemsCache, cardIndex);
    if (!sourceItem) {
      return;
    }

    for (let faceIdx = 0; faceIdx < this.fourDFaceOverlays.length; faceIdx += 1) {
      if ((faceIdx % this.cardItemsCache.length) !== cardIndex) {
        continue;
      }

      const overlay = this.fourDFaceOverlays[faceIdx];
      if (overlay) {
        this.syncFourDFaceOverlayElement(overlay, sourceItem);
      }
    }
  }

  private resetFourDFaceOverlayElement(overlay: HTMLElement): void {
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
    overlay.style.removeProperty('transform');
    overlay.style.zIndex = '0';
    overlay.style.willChange = 'auto';
    overlay.style.display = 'none';
  }

  private ensureFourDFaceOverlays(totalFaces: number): void {
    const totalCards = this.cardItemsCache.length;
    if (totalFaces <= 0 || totalCards === 0) {
      this.destroyFourDFaceOverlays();
      return;
    }

    while (this.fourDFaceOverlays.length > totalFaces) {
      this._overlayCornerCache.pop();
      const overlay = this.fourDFaceOverlays.pop();
      if (overlay) {
        this.fourDFaceOverlayPool.release(overlay);
      }
    }

    for (let faceIdx = 0; faceIdx < totalFaces; faceIdx += 1) {
      if (this.fourDFaceOverlays[faceIdx]) {
        continue;
      }

      const cardIdx = faceIdx % totalCards;
      const sourceItem = this.cardItemsCache[cardIdx];

      if (!sourceItem) {
        continue;
      }

      this.fourDFaceOverlays[faceIdx] = this.fourDFaceOverlayPool.acquire(sourceItem);
    }
  }

  private destroyFourDFaceOverlays(): void {
    for (const overlay of this.fourDFaceOverlays) {
      this.fourDFaceOverlayPool.release(overlay);
    }
    this.fourDFaceOverlays = [];
    this._overlayCornerCache = [];
    this.fourDFaceOverlaysActive = false;
  }

  private renderFourDFaceOverlays(scene: FourDSceneState, fourDProgress: number): void {
    this.ensureFourDFaceOverlays(scene.faceStates.length);

    // Four layers of transition logic:
    // 1. Overlay fades in smoothly
    // 2. Holds proximity to the 3D world briefly
    // 3. Deeper immersion into 4D geometry begins
    // 4. Symmetrical unwind during exit
    const overlayPresence = easeInOutCubic(clamp(
      (fourDProgress - MANIFOLD_CONSTANTS.SPATIAL_TOPOLOGY.overlayPresenceOffset) /
      MANIFOLD_CONSTANTS.SPATIAL_TOPOLOGY.overlayPresenceSpan,
      0,
      1
    ));
    const geometryEase = easeInOutCubic(clamp(
      (fourDProgress - MANIFOLD_CONSTANTS.SPATIAL_TOPOLOGY.overlayGeometryOffset) /
      MANIFOLD_CONSTANTS.SPATIAL_TOPOLOGY.overlayGeometrySpan,
      0,
      1
    ));

    for (let faceIdx = 0; faceIdx < scene.faceStates.length; faceIdx += 1) {
      const overlay = this.fourDFaceOverlays[faceIdx];
      const faceState = scene.faceStates[faceIdx];

      if (!overlay || !faceState) {
        continue;
      }

      if (!faceState.visible || !faceState.matrix) {
        overlay.style.opacity = '0';
        continue;
      }

      // Find source card for this face
      const totalCards = this.cardItemsCache.length;
      const cardIdx = faceIdx % totalCards;
      const sourceItem = this.cardItemsCache[cardIdx];

      if (fourDProgress >= 0.999) {
        // Full 4D mode — direct matrix3d assignment
        overlay.style.transform = faceState.matrix;
        overlay.style.zIndex = String(faceState.zIndex - 1000);
        overlay.style.opacity = clamp(faceState.alpha, 0, 1).toFixed(3);
        continue;
      }

      if (fourDProgress <= 0.001) {
        overlay.style.opacity = '0';
        continue;
      }

      // FLIP for 4D face overlays:
      // First  = the card's current world-space quad.
      // Last   = the tesseract face quad reconstructed from the cached matrix.
      // Invert = interpolate those four corners toward each other.
      // Play   = solve a fresh homography with computeCardProjectionMatrix().
      // This keeps the transition readable even though the destination is a fully projective warp.
      if (!sourceItem) {
        overlay.style.transform = faceState.matrix;
        overlay.style.opacity = clamp(faceState.alpha * overlayPresence, 0, 1).toFixed(3);
        continue;
      }

      // Card position in the world (screen space, relative to viewport)
      const worldX = this.viewportWidth * 0.5 + sourceItem.currentScreenX;
      const worldY = this.viewportHeight * 0.5 + sourceItem.currentScreenY;
      const worldW = MANIFOLD_FOUR_D_CARD_SIZE;
      const worldH = MANIFOLD_FOUR_D_CARD_SIZE;

      // Four corners of the card in the world (considering translate(-50%, -50%))
      const cardLeft = worldX - worldW * 0.5;
      const cardTop = worldY - worldH * 0.5;

      // World square corners (flat, without deformation)
      const worldTL: readonly [number, number] = [cardLeft, cardTop];
      const worldTR: readonly [number, number] = [cardLeft + worldW, cardTop];
      const worldBR: readonly [number, number] = [cardLeft + worldW, cardTop + worldH];
      const worldBL: readonly [number, number] = [cardLeft, cardTop + worldH];

      // 4D matrix corners (parsed from matrix3d or computed from projected vertices)
      // We use projectedVertices already present in faceState as screen points.
      // faceState.matrix already encodes these points.
      // z powrotem z computeFourDScene.
      // Prostsze: interpolujemy macierze przez lerp na rogach.

      // Extract tesseract corners for this face:
      // Since they are not directly available here, we derive them from matrix3d.
      // Trick: macierz CSS matrix3d(a,b,0,g, c,d,0,h, 0,0,1,0, e,f,0,1)
      // mapuje (0,0)→(e,f), (W,0)→(a*W+e, b*W+f) itd.
      // Parsujemy:
      const m = faceState.matrixParsed;

      if (!m || m.length !== 16) {
        overlay.style.transform = faceState.matrix;
        overlay.style.opacity = clamp(faceState.alpha * overlayPresence, 0, 1).toFixed(3);
        continue;
      }

      const W = MANIFOLD_FOUR_D_CARD_SIZE;
      const H = MANIFOLD_FOUR_D_CARD_SIZE;

      // Cache projected corners per-overlay — projectMatrix3dPoint is called
      // 4× per overlay per frame; skip when matrix string is unchanged.
      const overlayCache = this._overlayCornerCache[faceIdx];
      let faceTL: readonly [number, number];
      let faceTR: readonly [number, number];
      let faceBR: readonly [number, number];
      let faceBL: readonly [number, number];

      if (overlayCache && overlayCache.matrix === faceState.matrix) {
        faceTL = overlayCache.tl;
        faceTR = overlayCache.tr;
        faceBR = overlayCache.br;
        faceBL = overlayCache.bl;
      } else {
        faceTL = projectMatrix3dPoint(m, 0, 0);
        faceTR = projectMatrix3dPoint(m, W, 0);
        faceBR = projectMatrix3dPoint(m, W, H);
        faceBL = projectMatrix3dPoint(m, 0, H);
        this._overlayCornerCache[faceIdx] = {
          matrix: faceState.matrix,
          tl: faceTL, tr: faceTR, br: faceBR, bl: faceBL
        };
      }

      // Interpoluj rogi liniowo
      const t = geometryEase;
      const iTL: readonly [number, number] = [
        lerp(worldTL[0], faceTL[0], t),
        lerp(worldTL[1], faceTL[1], t)
      ];
      const iTR: readonly [number, number] = [
        lerp(worldTR[0], faceTR[0], t),
        lerp(worldTR[1], faceTR[1], t)
      ];
      const iBR: readonly [number, number] = [
        lerp(worldBR[0], faceBR[0], t),
        lerp(worldBR[1], faceBR[1], t)
      ];
      const iBL: readonly [number, number] = [
        lerp(worldBL[0], faceBL[0], t),
        lerp(worldBL[1], faceBL[1], t)
      ];

      const interpolatedMatrix = computeCardProjectionMatrix(
        MANIFOLD_FOUR_D_CARD_SIZE,
        MANIFOLD_FOUR_D_CARD_SIZE,
        iTL, iTR, iBR, iBL
      );

      if (!interpolatedMatrix) {
        overlay.style.opacity = '0';
        continue;
      }

      overlay.style.transform = interpolatedMatrix;
      overlay.style.zIndex = String(faceState.zIndex - 1000);
      overlay.style.opacity = clamp(
        faceState.alpha * overlayPresence * (sourceItem.currentAlpha > 0.01 ? 1 : overlayPresence),
        0,
        1
      ).toFixed(3);
    }
  }

  private renderFourDWireframe(scene: FourDSceneState | null, fourDProgress: number): void {
    const ctx = this.fourDWireframeContext;

    if (!ctx) {
      return;
    }

    if (!scene || fourDProgress <= 0.001) {
      ctx.clearRect(0, 0, this.fourDCanvasWidth || this.viewportWidth, this.fourDCanvasHeight || this.viewportHeight);
      return;
    }

    this.ensureFourDCanvasSize();
    ctx.clearRect(0, 0, this.viewportWidth, this.viewportHeight);
    const wireframePresence = easeInOutCubic(clamp(
      (fourDProgress - MANIFOLD_CONSTANTS.SPATIAL_TOPOLOGY.wireframePresenceOffset) /
      MANIFOLD_CONSTANTS.SPATIAL_TOPOLOGY.wireframePresenceSpan,
      0,
      1
    ));
    const edgeAlphaScale = clamp((1 - this.expandedProgress * 0.74) * wireframePresence, 0.08, 1);
    const isInsideVariant = scene.variant === 'inside';

    for (let index = 0; index < scene.edgeStates.length; index += 1) {
      const edge = scene.edgeStates[index];
      const depth = isInsideVariant
        ? clamp((edge.z - 0.36) / 1.6, 0, 1)
        : clamp((edge.z + 0.9) / 1.8, 0, 1);

      const alpha = isInsideVariant
        ? (0.1 + depth * 0.48) * edgeAlphaScale * (edge.wEdge ? 0.72 : 1)
        : (0.08 + depth * 0.34) * edgeAlphaScale * (edge.wEdge ? 0.6 : 1);

      ctx.strokeStyle = isInsideVariant
        ? edge.wEdge
          ? `rgba(96, 247, 255, ${alpha.toFixed(3)})`
          : `rgba(255, 166, 92, ${alpha.toFixed(3)})`
        : edge.wEdge
          ? `rgba(14, 165, 233, ${alpha.toFixed(3)})`
          : `rgba(255, 158, 99, ${alpha.toFixed(3)})`;
      ctx.lineWidth = isInsideVariant
        ? (edge.wEdge ? 0.95 : 1.3) + depth * 1.2
        : edge.wEdge
          ? 0.8
          : 1.2 + depth * 0.9;

      ctx.beginPath();
      ctx.moveTo(edge.pointA.x, edge.pointA.y);
      ctx.lineTo(edge.pointB.x, edge.pointB.y);
      ctx.stroke();
    }
  }

  private refreshCardItemsCache(): void {
    this.cardItemsCache = this.items
      .filter((item): item is ItemState => item.type === 'card')
      .sort((left, right) => left.cardIndex - right.cardIndex);
    this.lastCentered2DCard = null;
    this.cardItemsBySectionCache.clear();
    for (const item of this.cardItemsCache) {
      const sectionItems = this.cardItemsBySectionCache.get(item.sectionTitle) ?? [];
      sectionItems.push(item);
      this.cardItemsBySectionCache.set(item.sectionTitle, sectionItems);
    }
    this.twoDController.invalidateGridMetrics();
  }

  private normalizeLoopAnchor(
    anchor: number,
    reference: number,
    mode: 'nearest' | 'forward' | 'backward' | 'smart'
  ): number {
    return this.scrollSystem.normalizeLoopAnchor(anchor, reference, mode);
  }

  private captureTwoDTransitionGridOrder(): void {
    const visibleCards = this.cardItemsCache
      .filter((item) => item.currentAlpha > 0.04)
      .sort((left, right) => {
        const leftY = left.currentScreenY;
        const rightY = right.currentScreenY;
        if (Math.abs(leftY - rightY) > 48) {
          return leftY - rightY;
        }

        const leftX = left.currentScreenX;
        const rightX = right.currentScreenX;
        if (Math.abs(leftX - rightX) > 24) {
          return leftX - rightX;
        }

        return right.currentDepth - left.currentDepth;
      });

    if (visibleCards.length === 0) {
      this.twoDTransitionGridOrder.clear();
      this.twoDTransitionOrderMix = 1;
      return;
    }

    this.twoDTransitionGridOrder.clear();
    visibleCards.forEach((item, index) => {
      this.twoDTransitionGridOrder.set(item.cardIndex, index);
    });
    this.twoDTransitionOrderMix = 0;
  }

  private resetIncomingScrollContinuity(scroll = this.phaseState.scroll): void {
    this.scrollSystem.resetIncomingScrollContinuity(scroll);
  }

  private seed(value: number): number {
    const seeded = Math.sin(value * 12.9898) * 43758.5453;
    return seeded - Math.floor(seeded);
  }

  private triggerIntroEnter(): void {
    if (this.introTarget >= 1) {
      return;
    }

    if (this.introAutoEnterTimeout) {
      window.clearTimeout(this.introAutoEnterTimeout);
      this.introAutoEnterTimeout = 0;
    }

    this.setFeaturedCardProfile('default', true);
    this.pendingIntroExit = false;
    // Only force-reset to 3D when the initial mode was 3D.
    // When starting in 2D (mobile), preserve the 2D state to avoid wasted 3D layout work.
    if (this.initialViewMode === '3d') {
      this.transitionManager.forceResetTo3D();
      this.dom.removeBodyClass('is-2d-mode', 'is-4d-mode', 'has-4d-presence', 'is-frame-stressed', 'is-transition-snapshots');
      this.dom.removeRootClass('is-2d-mode', 'is-4d-mode', 'has-4d-presence');
    }
    this.exitingFourDTo2D = false;
    this.transitionPerformanceMode = false;
    this.lastParticleRenderAt = 0;
    this.lastTransitionSnapshotBodyState = false;
    this.lastFastTwoDScrollSnapshotState = false;
    this.worldScrollReference = this.phaseState.scroll;
    this.resetIncomingScrollContinuity(this.phaseState.scroll);
    this.stableSceneOffset = 0;
    this.lastRawSceneOffset = 0;
    this.introTarget = 1;
    this.dom.addBodyClass('is-entering-world');
  }

  private triggerIntroExit(): void {
    if (!this.introCompleted && this.introTarget <= 0) {
      return;
    }

    this.closeExpandedCard();
    this.setFeaturedCardProfile('intro', true);
    if (this.is2DMode() || this.is4DMode() || this.viewModeProgress > 0.01 || this.fourDProgress > 0.01) {
      this.setViewMode('3d');
      this.pendingIntroExit = true;
      return;
    }

    this.pendingIntroExit = false;
    this.exitReturnActive = true;
    this.exitSceneOffset = this.phaseState.scroll - this.worldScrollReference;
    this.setHoveredCard(null);
  }

  private isEntryTarget(target: EventTarget | null, x: number, y: number): boolean {
    if (target instanceof HTMLElement && target.closest('[data-entry-card="true"]')) {
      return true;
    }

    const rect = this.getItemScreenRect(this.featuredItem);
    if (!rect) {
      return false;
    }

    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  private setAccessibilityState(enabled: boolean): void {
    if (enabled) {
      this.elements.hud.root.removeAttribute('inert');
      this.elements.world.removeAttribute('inert');
      this.elements.twoDSectionFrame.root.removeAttribute('inert');
    } else {
      this.elements.hud.root.setAttribute('inert', '');
      this.elements.world.setAttribute('inert', '');
      this.elements.twoDSectionFrame.root.setAttribute('inert', '');
    }
  }

  private updateCardHover(): void {
    if (this.expandedCard) {
      this.setHoveredCard(null);
      return;
    }

    if (!this.inputService.isPointerActive()) {
      this.setHoveredCard(null);
      return;
    }

    if (this.hoveredCard && this.isPointerInsideCard(this.hoveredCard, 18)) {
      return;
    }

    const hitItem = this.findCardAtPoint(this.inputService.getPointerX(), this.inputService.getPointerY());
    if (hitItem) {
      this.setHoveredCard(hitItem);
      return;
    }

    const directItem = this.resolveDirectCardTarget(this.inputService.getPointerTarget());
    if (directItem && directItem.currentAlpha > 0.02) {
      this.setHoveredCard(directItem);
      return;
    }

    this.setHoveredCard(null);
  }

  private findCardAtPoint(x: number, y: number): ItemState | null {
    let bestMatch: ItemState | null = null;

    for (let index = 0; index < this.cardItemsCache.length; index += 1) {
      const item = this.cardItemsCache[index];
      if (!item || item.currentAlpha <= 0.001) {
        continue;
      }

      if (!this.isPointInsideItemHitArea(item, x, y)) {
        continue;
      }

      if (!bestMatch || item.currentDepth >= bestMatch.currentDepth) {
        bestMatch = item;
        // Early exit: card is clearly in front and fully opaque — no deeper card
        // can be a better hit (cards don't overlap in meaningful depth ranges).
        if (item.currentDepth >= -10 && item.currentAlpha >= 0.95) {
          break;
        }
      }
    }

    return bestMatch;
  }

  private resolveCardTarget(target: EventTarget | null, x: number, y: number): ItemState | null {
    const hitItem = this.findCardAtPoint(x, y);
    if (hitItem) {
      return hitItem;
    }

    const directItem = this.resolveDirectCardTarget(target);
    if (directItem && directItem.currentAlpha > 0.001) {
      return directItem;
    }

    if (this.hoveredCard && this.hoveredCard.currentAlpha > 0.001 && this.isPointerInsideCard(this.hoveredCard, 42)) {
      return this.hoveredCard;
    }

    return null;
  }

  private getCardItemByElement(cardElement: HTMLElement): ItemState | null {
    const cardIndex = Number.parseInt(cardElement.dataset.cardIndex ?? '-1', 10);

    if (Number.isNaN(cardIndex) || cardIndex < 0) {
      return null;
    }

    for (let index = 0; index < this.cardItemsCache.length; index += 1) {
      const item = this.cardItemsCache[index];

      if (item?.type === 'card' && item.cardIndex === cardIndex) {
        return item;
      }
    }

    return null;
  }

  private resolveDirectCardTarget(target: EventTarget | null): ItemState | null {
    if (!(target instanceof HTMLElement)) {
      return null;
    }

    const cardElement = target.closest<HTMLElement>('.card');
    if (!cardElement) {
      return null;
    }

    return this.getCardItemByElement(cardElement);
  }

  private isPointerInsideCard(item: ItemState, padding: number): boolean {
    const rect = this.getItemScreenRect(item);
    if (!rect) {
      return false;
    }

    return (
      this.inputService.getPointerX() >= rect.left - padding &&
      this.inputService.getPointerX() <= rect.right + padding &&
      this.inputService.getPointerY() >= rect.top - padding &&
      this.inputService.getPointerY() <= rect.bottom + padding
    );
  }

  private isPointInsideItemHitArea(item: ItemState, x: number, y: number): boolean {
    if (item.hasCurrentScreenQuad) {
      return isPointInsideQuad(item.currentScreenQuad, x, y);
    }

    const rect = this.getItemScreenRect(item);
    return rect !== null && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  private setHoveredCard(item: ItemState | null): void {
    if (this.hoveredCard === item) {
      return;
    }

    if (this.hoveredCard) {
      this.hoveredCard.fxEl.classList.remove('is-hovered');
      this.hoveredCard.fxEl.dispatchEvent(new CustomEvent('cardhoverend'));
    }

    this.hoveredCard = item;

    if (this.hoveredCard) {
      this.hoveredCard.fxEl.classList.add('is-hovered');
      this.hoveredCard.fxEl.dispatchEvent(new CustomEvent('cardhoverstart'));
    }
  }

  private setFeaturedCardProfile(profile: 'default' | 'intro', scramble: boolean): void {
    const item = this.featuredItem;
    if (!item || item.activeCardProfile === profile) {
      return;
    }

    const cardContent = profile === 'intro'
      ? item.introCardContent ?? item.defaultCardContent
      : item.defaultCardContent ?? item.introCardContent;

    if (!cardContent) {
      return;
    }

    item.activeCardProfile = profile;
    this.applyCardContent(item, cardContent, scramble);
  }

  private applyCardContent(item: ItemState, cardContent: CvCardContent, scramble: boolean): void {
    item.cardContentVersion += 1;
    item.cardTitle = cardContent.title;
    item.expandedCardTitle = cardContent.expandedTitle;
    item.expandedHandoff = cardContent.expandedHandoff;

    const titleEl = item.titleEl;
    if (titleEl) {
      titleEl.dataset.previewTitle = cardContent.title;
      titleEl.dataset.expandedTitle = cardContent.expandedTitle;
      const titleScale = clamp(1 - Math.max(0, cardContent.title.length - 5) * 0.06, 0.64, 1);
      titleEl.style.setProperty('--card-title-scale', titleScale.toFixed(3));
      this.textEffectManager.animateCardTitle(item, false);
    }

    const handoffEl = item.handoffEl;
    if (handoffEl) {
      handoffEl.dataset.previewHandoff = cardContent.handoff;
      handoffEl.dataset.expandedHandoff = cardContent.expandedHandoff;
      this.textEffectManager.animateCardHandoff(item, false);
    }

    this.textEffectManager.setTextContent(item.fxEl.querySelector<HTMLElement>('.card-signal'), cardContent.signal, scramble);
    this.textEffectManager.setTextContent(item.fxEl.querySelector<HTMLElement>('.card-mode'), cardContent.mode, scramble);
    this.textEffectManager.setTextContent(item.fxEl.querySelector<HTMLElement>('.card-core-chip'), cardContent.chip, scramble);
    this.textEffectManager.setTextContent(item.fxEl.querySelector<HTMLElement>('.card-id'), cardContent.id, scramble);
    this.textEffectManager.setTextContent(
      item.fxEl.querySelector<HTMLElement>('.card-footer span:first-child'),
      `${cardContent.previewLeftLabel}: ${cardContent.previewLeft}`,
      scramble
    );
    this.textEffectManager.setTextContent(
      item.fxEl.querySelector<HTMLElement>('.card-footer span:last-child'),
      `${cardContent.previewRightLabel}: ${cardContent.previewRight}`,
      scramble
    );

    const expandedMeta = item.fxEl.querySelector<HTMLElement>('.card-expanded-meta');
    if (expandedMeta) {
      expandedMeta.dataset.revealText = cardContent.eyebrow;
      expandedMeta.textContent = cardContent.eyebrow;
    }

    const expandedLead = item.fxEl.querySelector<HTMLElement>('.card-expanded-lead');
    if (expandedLead) {
      expandedLead.dataset.revealText = cardContent.lead;
      expandedLead.textContent = cardContent.lead;
    }

    const highlightsList = item.fxEl.querySelector<HTMLElement>('.card-expanded-block--highlights .card-expanded-list');
    if (highlightsList) {
      highlightsList.innerHTML = cardContent.highlights.map((point) => `<li data-reveal-text="${point}">${point}</li>`).join('');
    }

    const factsList = item.fxEl.querySelector<HTMLElement>('.card-expanded-list--facts');
    if (factsList) {
      factsList.innerHTML = cardContent.facts
        .map(
          (fact) => `
            <li>
              <strong class="card-expanded-term" data-reveal-text="${fact.label}">${fact.label}</strong>
              <span class="card-expanded-value" data-reveal-text="${fact.value}">${fact.value}</span>
            </li>
          `
        )
        .join('');
    }

    const surfaceNodes = item.fxEl.querySelectorAll<HTMLElement>('.card-expanded-surface > span, .card-expanded-surface > strong, .card-expanded-surface > p');
    const [surfaceKicker, surfaceValue, surfaceText] = surfaceNodes;
    if (surfaceKicker) {
      surfaceKicker.dataset.revealText = cardContent.surfaceKicker;
      surfaceKicker.textContent = cardContent.surfaceKicker;
    }
    if (surfaceValue) {
      surfaceValue.dataset.revealText = cardContent.surfaceValue;
      surfaceValue.textContent = cardContent.surfaceValue;
    }
    if (surfaceText) {
      surfaceText.dataset.revealText = cardContent.surfaceText;
      surfaceText.textContent = cardContent.surfaceText;
    }

    this.applyLocalizedCardChrome(item);
    this.resetExpandedContent(item);

    if (this.expandedCard === item && this.expandedTarget > 0) {
      this.primeExpandedContentForReveal(item);
      this.scheduleExpandedReveal(item);
    }

    this.syncCardTransitionSnapshot(item);
    this.refreshFourDFaceOverlayForCard(item.cardIndex);
  }

  private syncCardTransitionSnapshot(item: ItemState): void {
    const snapshot = item.fxEl.querySelector<HTMLElement>('.card-transition-snapshot');
    if (!snapshot || item.lastTransitionSnapshotVersion === item.cardContentVersion) {
      return;
    }

    const signal = item.fxEl.querySelector<HTMLElement>('.card-signal')?.textContent?.trim() ?? '';
    const mode = item.fxEl.querySelector<HTMLElement>('.card-mode')?.textContent?.trim() ?? '';
    const title = item.titleEl?.textContent?.trim() ?? item.cardTitle;
    const chip = item.fxEl.querySelector<HTMLElement>('.card-core-chip')?.textContent?.trim() ?? '';
    const id = item.fxEl.querySelector<HTMLElement>('.card-id')?.textContent?.trim() ?? '';

    const signalEl = snapshot.querySelector<HTMLElement>('.card-transition-snapshot__signal');
    const modeEl = snapshot.querySelector<HTMLElement>('.card-transition-snapshot__mode');
    const titleEl = snapshot.querySelector<HTMLElement>('.card-transition-snapshot__title');
    const chipEl = snapshot.querySelector<HTMLElement>('.card-transition-snapshot__chip');
    const idEl = snapshot.querySelector<HTMLElement>('.card-transition-snapshot__id');

    if (signalEl) signalEl.textContent = signal;
    if (modeEl) modeEl.textContent = mode;
    if (titleEl) titleEl.textContent = title;
    if (chipEl) chipEl.textContent = chip;
    if (idEl) idEl.textContent = id;

    item.lastTransitionSnapshotVersion = item.cardContentVersion;
  }

  private updateCardTransitionSnapshot(item: ItemState, active: boolean): void {
    const nextState = active ? 'active' : 'inactive';
    if (item.lastTransitionSnapshotState === nextState) {
      return;
    }

    if (active) {
      this.syncCardTransitionSnapshot(item);
    }

    item.fxEl.classList.toggle('is-transition-snapshot', active);
    item.lastTransitionSnapshotState = nextState;
  }

  private getLocalizedSectionTitle(sectionTitle: string): string {
    return localizeSectionTitle(sectionTitle, this.locale);
  }

  private applyLocalizedCardChrome(item: ItemState): void {
    const ui = getManifoldLocaleBundle(this.locale).ui;
    const expandedLabels = item.fxEl.querySelectorAll<HTMLElement>('.card-expanded-label');
    const highlightsLabel = expandedLabels[0];
    const snapshotLabel = expandedLabels[1];

    if (highlightsLabel) {
      highlightsLabel.dataset.revealText = ui.cardHighlights;
      highlightsLabel.textContent = ui.cardHighlights;
    }

    if (snapshotLabel) {
      snapshotLabel.dataset.revealText = ui.cardSnapshot;
      snapshotLabel.textContent = ui.cardSnapshot;
    }

    const mobilePrevButton = item.mobilePrevNavEl;
    const mobileNextButton = item.mobileNextNavEl;
    mobilePrevButton?.setAttribute('aria-label', ui.nextCardSectionAria);
    mobileNextButton?.setAttribute('aria-label', ui.nextCardSectionAria);
  }

  private refreshLocalizedPresentation(): void {
    const localizedCards = getLocalizedCvCards(this.locale);
    const localizedIntroCard = getLocalizedFeaturedIntroCard(this.locale);

    for (let index = 0; index < this.items.length; index += 1) {
      const item = this.items[index];
      if (!item) {
        continue;
      }

      if (item.type === 'text') {
        const localizedSectionTitle = this.getLocalizedSectionTitle(item.sectionTitle);
        item.fxEl.textContent = localizedSectionTitle;
        item.fxEl.dataset.text = localizedSectionTitle;
        continue;
      }

      const localizedCard = localizedCards[item.gridOrder % localizedCards.length] ?? localizedCards[0];
      if (localizedCard) {
        item.defaultCardContent = localizedCard;
      }
      if (item.isFeatured) {
        item.introCardContent = localizedIntroCard;
      }

      this.applyLocalizedCardChrome(item);
      const nextCardContent =
        item.activeCardProfile === 'intro'
          ? item.introCardContent ?? item.defaultCardContent
          : item.defaultCardContent ?? item.introCardContent;
      if (nextCardContent) {
        this.applyCardContent(item, nextCardContent, false);
      }
    }
  }

  private scheduleExpandedReveal(item: ItemState): void {
    this.cardExpandController.scheduleExpandedReveal(item);
  }

  private primeExpandedContentForReveal(item: ItemState): void {
    this.cardExpandController.primeExpandedContentForReveal(item);
  }

  private resetExpandedContent(item: ItemState): void {
    this.cardExpandController.resetExpandedContent(item);
  }

  private setCardMobilePage(item: ItemState, page: number): void {
    const nextPage = clamp(page, 0, 1);
    const indicator = item.fxEl.querySelector<HTMLElement>('.card-expanded-mobile-indicator');

    if (item.mobilePage !== nextPage) {
      item.mobilePage = nextPage;
      item.fxEl.dataset.mobilePage = String(nextPage);

      // Trigger hint animation restart
      item.fxEl.classList.remove('is-animating-pager-hint');
      void item.fxEl.offsetWidth; // Force reflow
      item.fxEl.classList.add('is-animating-pager-hint');

      if (indicator) {
        indicator.textContent = nextPage === 0 ? '01 / 02' : '02 / 02';
      }
    }
  }

  private findCardState(cardEl: HTMLElement): ItemState | null {
    for (let index = 0; index < this.items.length; index += 1) {
      const item = this.items[index];
      if (item?.type === 'card' && item.fxEl === cardEl) {
        return item;
      }
    }

    return null;
  }

  private toggleExpandedCard(item: ItemState): void {
    const previousCardId = this.getCardTelemetryId(this.expandedCard);
    this.cardExpandController.toggleExpandedCard(item);
    const nextCardId = this.getCardTelemetryId(this.expandedCard);
    if (nextCardId && nextCardId !== previousCardId) {
      this.observer.onCardExpanded?.(nextCardId);
    }
  }


  private closeExpandedCard(): void {
    this.cardExpandController.closeExpandedCard();
  }

  private getCardTelemetryId(item: ItemState | null): string | null {
    if (!item) {
      return null;
    }

    return item.defaultCardContent?.id ?? item.introCardContent?.id ?? null;
  }

  private formatHudFps(): string {
    const fps = Math.round(this.fpsDisplay);
    const cap = Math.round(this.estimatedRefreshCap);
    const isNearCap = cap >= 50 && Math.abs(fps - cap) <= Math.max(1, cap >= 120 ? 3 : 2);
    return isNearCap ? `${fps} CAP` : String(fps);
  }
}

function createMutableScreenQuad(): MutableScreenQuad {
  return [
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0]
  ];
}

function createCardChromeInstancePool(count: number): CardChromeInstance[] {
  return Array.from({ length: Math.max(1, count) }, () => ({
    accentRgb: [0, 0, 0],
    depth: 0,
    emphasis: 0,
    opacity: 0,
    quad: createMutableScreenQuad()
  }));
}

function writeProjectedQuadPoint(
  target: [number, number],
  localX: number,
  localY: number,
  originX: number,
  originY: number,
  halfHeight: number,
  centerX: number,
  centerY: number,
  baseZ: number,
  shiftZ: number,
  cardTiltX: number,
  cardTiltY: number,
  cardTiltZ: number,
  worldTiltX: number,
  worldTiltY: number,
  scale: number,
  perspective: number,
  viewportWidth: number,
  viewportHeight: number
): void {
  let x = (localX - originX) * scale;
  let y = (localY - originY) * scale;
  let z = 0;
  let cos = Math.cos(cardTiltY);
  let sin = Math.sin(cardTiltY);
  let nextX = x * cos - z * sin;
  let nextZ = x * sin + z * cos;
  x = nextX;
  z = nextZ;

  cos = Math.cos(-cardTiltX);
  sin = Math.sin(-cardTiltX);
  let nextY = y * cos - z * sin;
  nextZ = y * sin + z * cos;
  y = nextY;
  z = nextZ;

  cos = Math.cos(cardTiltZ);
  sin = Math.sin(cardTiltZ);
  nextX = x * cos - y * sin;
  nextY = x * sin + y * cos;
  x = nextX;
  y = nextY;

  z += shiftZ;
  x += centerX;
  y += centerY + originY - halfHeight;
  z += baseZ;

  cos = Math.cos(worldTiltY);
  sin = Math.sin(worldTiltY);
  nextX = x * cos - z * sin;
  nextZ = x * sin + z * cos;
  x = nextX;
  z = nextZ;

  cos = Math.cos(-worldTiltX);
  sin = Math.sin(-worldTiltX);
  nextY = y * cos - z * sin;
  nextZ = y * sin + z * cos;
  y = nextY;
  z = nextZ;

  const depthScale = perspective / Math.max(1, perspective - z);
  target[0] = viewportWidth * 0.5 + x * depthScale;
  target[1] = viewportHeight * 0.5 + y * depthScale;
}

function hexToRgb01(hex: string): [number, number, number] {
  const normalized = hex.trim().replace('#', '');
  const expanded = normalized.length === 3
    ? normalized.split('').map((char) => `${char}${char}`).join('')
    : normalized.padEnd(6, '0').slice(0, 6);
  const value = Number.parseInt(expanded, 16);

  return [
    ((value >> 16) & 0xff) / 255,
    ((value >> 8) & 0xff) / 255,
    (value & 0xff) / 255
  ];
}

function isPointInsideQuad(
  quad: readonly [readonly [number, number], readonly [number, number], readonly [number, number], readonly [number, number]],
  x: number,
  y: number
): boolean {
  const [a, b, c, d] = quad;
  return isPointInsideTriangle(a, b, c, x, y) || isPointInsideTriangle(a, c, d, x, y);
}

function isPointInsideTriangle(
  a: readonly [number, number],
  b: readonly [number, number],
  c: readonly [number, number],
  x: number,
  y: number
): boolean {
  const area = (p1: readonly [number, number], p2: readonly [number, number], p3: readonly [number, number]) =>
    (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);

  const point: readonly [number, number] = [x, y];
  const d1 = area(point, a, b);
  const d2 = area(point, b, c);
  const d3 = area(point, c, a);
  const hasNegative = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPositive = d1 > 0 || d2 > 0 || d3 > 0;

  return !(hasNegative && hasPositive);
}
