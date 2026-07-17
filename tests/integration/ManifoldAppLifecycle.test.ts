import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('ManifoldApp page lifecycle', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps one animation loop across pagehide and pageshow', async () => {
    const requestFrame = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockReturnValue(41);
    const cancelFrame = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => undefined);
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false
    });

    const { ManifoldApp } = await import('../../src/scripts/manifold-mode');
    const app = Object.create(ManifoldApp.prototype) as {
      animationFrameId: number;
      lastBackgroundRenderAt: number;
      lastControllerRenderAt: number;
      lastIosUiTickAt: number;
      running: boolean;
      setupPageLifecycle(): () => void;
      startLoop(): void;
    };
    app.animationFrameId = 0;
    app.lastBackgroundRenderAt = 0;
    app.lastControllerRenderAt = 0;
    app.lastIosUiTickAt = 0;
    app.running = false;

    const teardown = app.setupPageLifecycle();
    app.startLoop();
    app.startLoop();
    expect(requestFrame).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event('pagehide'));
    expect(cancelFrame).toHaveBeenCalledWith(41);
    expect(app.running).toBe(false);

    window.dispatchEvent(new Event('pageshow'));
    expect(requestFrame).toHaveBeenCalledTimes(2);
    expect(app.running).toBe(true);

    teardown();
  });
});
