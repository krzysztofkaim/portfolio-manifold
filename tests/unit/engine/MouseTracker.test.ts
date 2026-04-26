/** @vitest-environment happy-dom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MouseTracker } from '../../../src/engine/MouseTracker';

describe('MouseTracker', () => {
  let tracker: MouseTracker;

  beforeEach(() => {
    // Mock window dimensions
    (window as any).innerWidth = 1000;
    (window as any).innerHeight = 1000;
    tracker = new MouseTracker();
  });

  it('initializes with center position', () => {
    expect(tracker.client.x).toBe(500);
    expect(tracker.client.y).toBe(500);
  });

  it('updates position on pointermove', () => {
    const event = new PointerEvent('pointermove', { clientX: 250, clientY: 750 });
    window.dispatchEvent(event);

    expect(tracker.client.x).toBe(250);
    expect(tracker.client.y).toBe(750);
    expect(tracker.raw.x).toBe(-0.5); // (250/1000)*2 - 1
    expect(tracker.raw.y).toBe(-0.5); // -((750/1000)*2 - 1)
  });

  it('updates position on touch events', () => {
    const touch = { clientX: 100, clientY: 100 };
    const event = new CustomEvent('touchstart', {
      bubbles: true,
      cancelable: true
    }) as any;
    event.touches = [touch];
    
    window.dispatchEvent(event);

    expect(tracker.client.x).toBe(100);
    expect(tracker.client.y).toBe(100);
  });

  it('ignores empty touch events', () => {
    const event = new CustomEvent('touchstart') as any;
    event.touches = [];
    
    // Should not crash or update
    const oldX = tracker.client.x;
    window.dispatchEvent(event);
    expect(tracker.client.x).toBe(oldX);
  });

  it('smooths values on tick', () => {
    tracker.raw.x = 1.0;
    tracker.normalized.x = 0;
    
    tracker.tick();
    expect(tracker.normalized.x).toBeCloseTo(0.12, 5);
  });

  it('removes event listeners on dispose', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    tracker.dispose();
    
    expect(removeSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('touchmove', expect.any(Function));
  });
});
