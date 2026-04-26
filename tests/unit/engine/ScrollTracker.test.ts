/** @vitest-environment happy-dom */
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { ScrollTracker } from '../../../src/engine/ScrollTracker';

describe('ScrollTracker', () => {
  let tracker: ScrollTracker;
  let mockResizeObserver: any;

  beforeEach(() => {
    mockResizeObserver = {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    };
    globalThis.ResizeObserver = vi.fn().mockImplementation(function() {
      return mockResizeObserver;
    });

    // Mock window and document properties
    (window as any).scrollY = 0;
    (window as any).innerHeight = 1000;
    
    // Ensure document body exists for Happy DOM
    if (!document.body) {
      document.documentElement.innerHTML = '<body></body>';
    }
    
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 2000, configurable: true });

    tracker = new ScrollTracker();
  });

  afterEach(() => {
    if (tracker) {
      tracker.dispose();
    }
    vi.restoreAllMocks();
  });

  it('initializes and observes document elements', () => {
    expect(globalThis.ResizeObserver).toHaveBeenCalled();
    expect(mockResizeObserver.observe).toHaveBeenCalledWith(document.documentElement);
    expect(mockResizeObserver.observe).toHaveBeenCalledWith(document.body);
  });

  it('registers and unregisters elements', () => {
    const el = document.createElement('div');
    tracker.register(el);
    expect(mockResizeObserver.observe).toHaveBeenCalledWith(el);

    tracker.unregister(el);
    expect(mockResizeObserver.unobserve).toHaveBeenCalledWith(el);
  });

  it('calculates page progress on tick', () => {
    (window as any).scrollY = 500;
    tracker.tick(performance.now());
    
    // smoothScrollY starts at 0, goes towards 500. lerp(0, 500, 0.14) = 70
    // pageProgress = 70 / (2000 - 1000) = 0.07
    expect(tracker.pageProgress).toBeCloseTo(0.07, 2);
  });

  it('refreshes RectCache periodically on tick', () => {
    const el = document.createElement('div');
    const getRectSpy = vi.spyOn(el, 'getBoundingClientRect');
    tracker.register(el);
    
    // Simulate time passing > 500ms
    tracker.tick(performance.now() + 600);
    expect(getRectSpy).toHaveBeenCalled();
  });

  it('calculates section progress (normal range)', () => {
    const el = document.createElement('div');
    // Mock getBoundingClientRect for the element
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      top: 2000,
      height: 500, // height !== window.innerHeight
    } as any);
    
    tracker.register(el);
    
    // absoluteTop = 2000, absoluteBottom = 2500
    // innerHeight = 1000
    // start = 2500 - 1000 = 1500
    // end = 2000
    // abs(end - start) = 500 >= 1
    
    (tracker as any).smoothScrollY = 1750; // Midpoint
    
    const progress = tracker.sectionProgress(el);
    expect(progress).toBeCloseTo(0.5);
  });

  it('handles section progress for small ranges (height = innerHeight)', () => {
    const el = document.createElement('div');
    const h = (window as any).innerHeight;
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      height: h, 
    } as any);
    tracker.register(el);
    
    // absoluteTop = 100, absoluteBottom = 1100
    // start = 1100 - 1000 = 100
    // end = 100
    // abs(end - start) = 0 < 1
    // branch hits: start = 100, end = 1100
    
    (tracker as any).smoothScrollY = 600; // Midpoint
    
    const progress = tracker.sectionProgress(el);
    expect(progress).toBeCloseTo(0.5);
  });

  it('returns 0 for unregistered elements in sectionProgress', () => {
    const el = document.createElement('div');
    expect(tracker.sectionProgress(el)).toBe(0);
  });

  it('triggers refresh on ResizeObserver callback', () => {
    const callback = (globalThis.ResizeObserver as any).mock.calls[0][0];
    const el = document.createElement('div');
    tracker.register(el);
    const getRectSpy = vi.spyOn(el, 'getBoundingClientRect');
    
    callback();
    expect(getRectSpy).toHaveBeenCalled();
  });
});
