import type { CvCardContent, ItemState } from '../../src/experience/manifold/ManifoldTypes';

const defaultCardContent: CvCardContent = {
  chip: 'Chip',
  eyebrow: 'Eyebrow',
  expandedHandoff: 'Expanded',
  expandedTitle: 'Expanded Title',
  facts: [],
  handoff: 'Handoff',
  highlights: [],
  id: 'ID-1',
  lead: 'Lead',
  mode: 'Mode',
  previewLeft: 'Left',
  previewLeftLabel: 'L',
  previewRight: 'Right',
  previewRightLabel: 'R',
  signal: 'Signal',
  surfaceKicker: 'Kicker',
  surfaceText: 'Surface Text',
  surfaceValue: 'Value',
  title: 'Title'
};

export function createItemState(overrides: Partial<ItemState> = {}): ItemState {
  const host = createMockElement();
  const fxEl = createMockElement();
  const titleEl = createMockElement();
  const handoffEl = createMockElement();

  return {
    activeCardProfile: 'default',
    audioChroma: 0,
    audioShift: 0,
    baseZ: 0,
    cardContentVersion: 0,
    cardIndex: 0,
    cardTitle: 'Card',
    chroma: 0,
    contentRevealRafs: [],
    contentRevealTimeouts: [],
    contentRevealToken: 0,
    currentAlpha: 1,
    currentCardScale: 1,
    currentDepth: 0,
    currentScreenHeight: 100,
    currentScreenQuad: [[0, 0], [100, 0], [100, 100], [0, 100]],
    currentScreenWidth: 100,
    currentScreenX: 0,
    currentScreenY: 0,
    defaultCardContent,
    el: host,
    entryGridEl: null,
    expandedCardTitle: 'Expanded Card',
    expandedHandoff: 'Expanded Handoff',
    fxEl,
    gridOrder: 0,
    handoffEl,
    handoffScrambleRaf: 0,
    handoffScrambleTarget: '',
    hasCurrentScreenQuad: false,
    inertiaRotX: 0,
    inertiaRotY: 0,
    inertiaRotZ: 0,
    inertiaY: 0,
    inertiaZ: 0,
    introCardContent: null,
    isFeatured: false,
    lastAccessibilityState: 0,
    lastCardFx: '',
    lastCardLayout: '',
    lastCardScale: '',
    lastCardScaleRounded: 0,
    lastFaceMode: '',
    lastFaceTransform: '',
    lastFilter: '',
    lastFxTransform: '',
    lastMobiusState: '',
    lastOpacity: '',
    lastSectionState: '',
    lastTextShadow: '',
    lastTransform: '',
    lastZIndex: '',
    lastTransitionSnapshotState: '',
    lastTransitionSnapshotVersion: 0,
    lastLayoutState: '',
    lastLayoutFade: 0,
    lastShellFade: 0,
    lastBasePosKey: 0,
    lastBaseRotKey: 0,
    lastFxKey: 0,
    lastTextScaleRounded: 0,
    mobilePage: 0,
    response: 0.1,
    rot: 0,
    sectionTitle: 'PROFILE',
    shift: 0,
    titleEl,
    titleScrambleRaf: 0,
    titleScrambleTarget: '',
    trail: 0,
    type: 'card',
    variance: 0.5,
    x: 0,
    y: 0,
    ...overrides
  };
}

function createMockElement(): HTMLElement {
  return {
    addEventListener() {},
    append() {},
    classList: {
      add() {},
      contains() {
        return false;
      },
      remove() {},
      toggle() {
        return false;
      }
    },
    closest() {
      return null;
    },
    dataset: {},
    dispatchEvent() {
      return true;
    },
    innerHTML: '',
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    remove() {},
    removeEventListener() {},
    setAttribute() {},
    style: {
      setProperty() {}
    },
    tabIndex: 0,
    textContent: ''
  } as unknown as HTMLElement;
}
