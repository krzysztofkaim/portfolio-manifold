import { afterEach, describe, expect, it, vi } from 'vitest';

const mockBrowser = (platform: 'ios' | 'android' | 'android-low-end') => {
  vi.doMock('../../src/utils/browserDetection', () => ({
    IS_ANDROID: platform === 'android' || platform === 'android-low-end',
    IS_ANDROID_LOW_END: platform === 'android-low-end',
    IS_IOS: platform === 'ios',
    IS_SAFARI: platform === 'ios',
    SAFARI_VERSION: platform === 'ios' ? 18 : 0
  }));
};

describe('ManifoldModeController mobile stability', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.doUnmock('../../src/utils/browserDetection');
    document.body.innerHTML = '';
  });

  it.each(['ios', 'android-low-end'] as const)(
    'does not allocate decorative card chrome or card spectrum on %s',
    async (platform) => {
      vi.resetModules();
      mockBrowser(platform);
      const { createController } =
        await import('../helpers/manifoldControllerTestUtils');
      const { controller, elements } = createController();

      expect(elements.cardChromeLayer.style.display).toBe('none');
      expect(elements.world.querySelectorAll('.card-spectrum')).toHaveLength(0);
      expect(elements.world.querySelectorAll('pixel-canvas')).toHaveLength(0);

      controller.destroy();
    }
  );

  it('keeps spectrum markup but skips decorative card chrome on regular Android', async () => {
    vi.resetModules();
    mockBrowser('android');
    const { createController } =
      await import('../helpers/manifoldControllerTestUtils');
    const { controller, elements } = createController();

    expect(elements.cardChromeLayer.style.display).toBe('none');
    expect(elements.world.querySelectorAll('.card-spectrum').length).toBeGreaterThan(0);
    expect(elements.world.querySelectorAll('pixel-canvas')).toHaveLength(0);

    controller.destroy();
  });

  it('ignores Android browser-chrome height jitter', async () => {
    vi.resetModules();
    mockBrowser('android-low-end');
    const { createController } =
      await import('../helpers/manifoldControllerTestUtils');
    const { controller, runtime } = createController();
    const layoutItems = vi.spyOn(controller as never, 'layoutItems' as never);
    vi.spyOn(runtime, 'getViewportSize').mockReturnValue({
      width: 1280,
      height: 650
    });
    const requestFrame = vi.spyOn(window, 'requestAnimationFrame');

    (
      controller as unknown as { scheduleLayoutSync(): void }
    ).scheduleLayoutSync();

    expect(layoutItems).not.toHaveBeenCalled();
    expect(requestFrame).not.toHaveBeenCalled();
    controller.destroy();
  });

  it('keeps iOS transforms compositor-safe when switching to 3D and 4D', async () => {
    vi.resetModules();
    mockBrowser('ios');
    const { createController } =
      await import('../helpers/manifoldControllerTestUtils');
    const { controller, elements, runtime } = createController('2d');

    for (const mode of ['3d', '4d'] as const) {
      controller.setViewMode(mode);
      for (let frame = 0; frame < 8; frame += 1) {
        runtime.advanceNow(16);
        controller.render(runtime.now());
      }

      expect(elements.world.style.transform).not.toMatch(/rotate[XY]|translate3d/);
      for (const item of elements.world.querySelectorAll<HTMLElement>('.item, .card')) {
        expect(item.style.transform).not.toMatch(/rotate[XY]|translate3d/);
      }
    }

    controller.destroy();
  });
});
