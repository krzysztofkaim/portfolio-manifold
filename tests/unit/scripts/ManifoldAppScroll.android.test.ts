/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/utils/browserDetection', () => ({
  IS_IOS: false,
  IS_SAFARI: false,
  IS_ANDROID: true,
  IS_ANDROID_LOW_END: false,
  SAFARI_VERSION: 0
}));

import { ManifoldAppScroll, type ScrollController } from '../../../src/scripts/ui/ManifoldAppScroll';
import type { LoopTelemetry } from '../../../src/scripts/ui/ManifoldAppDiagnostics';

function createTelemetry(): LoopTelemetry {
  return {
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
}

describe('ManifoldAppScroll Android behavior', () => {
  let scrollProxy: HTMLElement;
  let telemetry: LoopTelemetry;
  let controller: ScrollController;
  let lastScroll = 0;

  beforeEach(() => {
    document.body.innerHTML = '<div id="proxy"></div>';
    scrollProxy = document.getElementById('proxy')!;
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 40000
    });
    Object.defineProperty(document.documentElement, 'clientHeight', {
      configurable: true,
      value: 800
    });
    document.documentElement.scrollTop = 0;
    window.scrollTo = vi.fn((x: number | ScrollToOptions, y?: number) => {
      const top = typeof x === 'number' ? y ?? 0 : x.top ?? 0;
      document.documentElement.scrollTop = top;
    }) as typeof window.scrollTo;

    telemetry = createTelemetry();
    lastScroll = 0;
    controller = {
      getInitialScrollAnchor: () => 16000,
      setScroll: (scroll: number) => {
        lastScroll = scroll;
      }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses direct native scroll on Android without smoothing lag', () => {
    const appScroll = new ManifoldAppScroll(
      telemetry,
      () => controller,
      () => null
    );

    appScroll.setup();
    appScroll.attachScrollProxy(scrollProxy);
    appScroll.setLoopScrollLength(1000);
    appScroll.initialize(16000);

    document.documentElement.scrollTop = 5200;
    document.dispatchEvent(new Event('scroll'));
    appScroll.update(16);

    expect(lastScroll).toBeCloseTo(5200, 0);
  });

  it('defers Android rebase while touch scrolling is active', () => {
    const appScroll = new ManifoldAppScroll(
      telemetry,
      () => controller,
      () => null
    );

    appScroll.setup();
    appScroll.attachScrollProxy(scrollProxy);
    appScroll.setLoopScrollLength(1000);
    appScroll.initialize(16000);

    const totalSpan = 1000 * 32;
    const edge = 1000 * 4;
    document.documentElement.scrollTop = totalSpan - edge + 10;

    document.dispatchEvent(new TouchEvent('touchstart', {
      touches: [new Touch({ identifier: 1, target: document.body, clientX: 0, clientY: 0 })]
    }));
    document.dispatchEvent(new Event('scroll'));
    appScroll.update(16);

    expect(telemetry.rebaseCount).toBe(0);
    expect(document.documentElement.scrollTop).toBeGreaterThan(totalSpan - edge);
  });

  it('flushes Android pending rebase after native scroll settles', () => {
    const appScroll = new ManifoldAppScroll(
      telemetry,
      () => controller,
      () => null
    );

    appScroll.setup();
    appScroll.attachScrollProxy(scrollProxy);
    appScroll.setLoopScrollLength(1000);
    appScroll.initialize(16000);

    const totalSpan = 1000 * 32;
    const edge = 1000 * 4;

    document.dispatchEvent(new TouchEvent('touchstart', {
      touches: [new Touch({ identifier: 1, target: document.body, clientX: 0, clientY: 0 })]
    }));
    document.documentElement.scrollTop = totalSpan - edge + 5;
    document.dispatchEvent(new Event('scroll'));

    appScroll.update(16);
    expect(telemetry.rebaseCount).toBe(0);

    document.dispatchEvent(new TouchEvent('touchend', { changedTouches: [] }));
    window.dispatchEvent(new Event('scrollend'));

    expect(telemetry.rebaseCount).toBeGreaterThan(0);
  });
});
