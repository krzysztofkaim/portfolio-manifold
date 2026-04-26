export interface CardFact {
  label: string;
  value: string;
}

export interface CvCardContent {
  chip: string;
  eyebrow: string;
  expandedHandoff: string;
  facts: readonly CardFact[];
  handoff: string;
  highlights: readonly string[];
  id: string;
  lead: string;
  mode: string;
  previewLeft: string;
  previewLeftLabel: string;
  previewRight: string;
  previewRightLabel: string;
  signal: string;
  surfaceKicker: string;
  surfaceText: string;
  surfaceValue: string;
  title: string;
  expandedTitle: string;
}

export interface HudElements {
  root: HTMLElement;
  card: HTMLElement;
  coord: HTMLElement;
  fps: HTMLElement;
  perfMode: HTMLElement;
  section: HTMLElement;
  velocity: HTMLElement;
}

export interface SceneNavigationCard {
  anchor: number;
  card: string;
  cardIndex: number;
}

export interface SceneNavigationSection {
  anchor: number;
  cards: SceneNavigationCard[];
  section: string;
}

export interface ControllerElements {
  ambientParticleLayer: HTMLCanvasElement;
  cardChromeLayer: HTMLCanvasElement;
  contextHint: HTMLElement;
  advanceButtons: {
    next: HTMLButtonElement;
    prev: HTMLButtonElement;
  };
  exitButton: HTMLButtonElement;
  fourDWireframe: HTMLCanvasElement;
  hud: HudElements;
  introHint: HTMLElement;
  twoDSectionFrame: {
    label: HTMLElement;
    root: HTMLElement;
  };
  viewport: HTMLElement;
  world: HTMLElement;
}

export interface PixelCanvasHost extends HTMLElement {
  setHostVisibility?: (visible: boolean) => void;
}

export type ItemType = 'text' | 'card' | 'star';
export type ViewMode = '2d' | '3d' | '4d';
export type HyperVertex = readonly [number, number, number, number];
export type HyperFaceVertices = readonly [number, number, number, number];
export type ScreenQuadPoint = readonly [number, number];
export type MutableScreenQuadPoint = [number, number];
export type MutableScreenQuad = [
  MutableScreenQuadPoint,
  MutableScreenQuadPoint,
  MutableScreenQuadPoint,
  MutableScreenQuadPoint
];

export interface ItemState {
  activeCardProfile: 'default' | 'intro';
  defaultCardContent: CvCardContent | null;
  cardContentVersion: number;
  cardTitle: string;
  expandedCardTitle: string;
  entryGridEl: HTMLElement | null;
  gridOrder: number;
  handoffEl: HTMLElement | null;
  introCardContent: CvCardContent | null;
  expandedHandoff: string;
  el: HTMLElement;
  fxEl: HTMLElement;
  pixelCanvasEl: PixelCanvasHost | null;
  titleEl: HTMLElement | null;
  expandedPanelEl: HTMLElement | null;
  mobilePrevNavEl: HTMLElement | null;
  mobileNextNavEl: HTMLElement | null;
  pendingTitleMarqueeSync: boolean;
  type: ItemType;
  isFeatured: boolean;
  cardIndex: number;
  mobilePage: number;
  sectionTitle: string;
  x: number;
  y: number;
  rot: number;
  baseZ: number;
  chroma: number;
  audioChroma: number;
  audioShift: number;
  trail: number;
  shift: number;
  inertiaY: number;
  inertiaZ: number;
  inertiaRotX: number;
  inertiaRotY: number;
  inertiaRotZ: number;
  response: number;
  variance: number;
  currentAlpha: number;
  currentDepth: number;
  currentScreenX: number;
  currentScreenY: number;
  currentScreenWidth: number;
  currentScreenHeight: number;
  currentScreenQuad: MutableScreenQuad;
  hasCurrentScreenQuad: boolean;
  lastZIndex: string;
  lastOpacity: string;
  lastTransform: string;
  lastFxTransform: string;
  lastTextShadow: string;
  lastFilter: string;
  lastFaceMode: string;
  lastFaceTransform: string;
  lastInlineFxTransform: string;
  lastCardFx: string;
  lastCardLayout: string;
  lastCardScale: string;
  lastAccessibilityState: number;
  lastSectionState: string;
  lastMobiusState: string;
  lastTransitionSnapshotState: string;
  lastTransitionSnapshotVersion: number;
  lastBasePosKey: number;
  lastBaseRotKey: number;
  lastFxKey: number;
  lastCardScaleRounded: number;
  lastTextScaleRounded: number;
  lastLayoutState: string;
  lastCardWidth: string;
  lastCardHeight: string;
  lastLayoutFade: number;
  lastShellFade: number;
  lastMusicAlpha?: number;
  lastMusicPresence?: number;
  lastSpectrumActive: boolean;
  lastSpectrumValues: Float32Array;
  lastX: number;
  lastY: number;
  lastZ: number;
  lastRot: number;
  lastTiltX: number;
  lastTiltY: number;
  currentCardScale: number;
  contentRevealRafs: number[];
  contentRevealTimeouts: number[];
  contentRevealToken: number;
  handoffScrambleRaf: number;
  handoffScrambleTarget: string;
  titleScrambleRaf: number;
  titleScrambleTarget: string;
}

export interface FeaturedPose {
  x: number;
  y: number;
  z: number;
  rotZ: number;
  tiltX: number;
  tiltY: number;
  shiftZ: number;
}

export interface TwoDCardPose {
  alpha: number;
  scale: number;
  shiftZ: number;
  tiltX: number;
  tiltY: number;
  tiltZ: number;
  x: number;
  y: number;
  z: number;
  textScale: number;
}

export interface TesseractFaceDefinition {
  axes: readonly [number, number];
  fixedAxes: readonly [number, number];
  fixedVals: readonly [-1 | 1, -1 | 1];
  verts: HyperFaceVertices;
}

export interface ProjectedHyperVertex {
  w4: number;
  x: number;
  y: number;
  z3: number;
}

export interface TesseractFaceProjection {
  accentInverted: boolean;
  alpha: number;
  avgZ: number;
  centerX: number;
  centerY: number;
  diag: number;
  matrix: string | null;
  matrixParsed: Float32Array | null;
  visible: boolean;
  zIndex: number;
}

export interface TesseractEdgeProjection {
  pointA: ProjectedHyperVertex;
  pointB: ProjectedHyperVertex;
  wEdge: boolean;
  z: number;
}

export interface FourDSceneState {
  edgeStates: readonly TesseractEdgeProjection[];
  faceStates: readonly TesseractFaceProjection[];
  variant?: 'classic' | 'inside';
}

export interface TwoDGridMetrics {
  cardHeight: number;
  cardWidth: number;
  cardSize: number;
  columns: number;
  gapX: number;
  gapY: number;
  rows: number;
  stackedMobile: boolean;
  scrollLoop: number;
  scrollScale: number;
  spacingX: number;
  spacingY: number;
  tileHeight: number;
  tileWidth: number;
}

export interface HudCoordinateSample {
  axis: 'X' | 'Y' | 'Z' | 'W';
  value: number;
}

export interface CardRenderLayout {
  compactHeight: string;
  compactWidth: string;
  compactHeightPx: number;
  compactWidthPx: number;
  expandedHeight: string;
  expandedWidth: string;
}

export interface SectionFrameBounds {
  maxX: number;
  maxY: number;
  minX: number;
  minY: number;
  visibleCount: number;
}

export interface ViewportSize {
  readonly width: number;
  readonly height: number;
}


export function createMutableScreenQuad(): MutableScreenQuad {
  return [
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0]
  ];
}

export interface TesseractProjectionInput {
  readonly fourDProgress: number;
  readonly scroll: number;
  readonly time: number;
  readonly turns: number;
  readonly viewportSize: ViewportSize;
  readonly velocity?: number;
}
