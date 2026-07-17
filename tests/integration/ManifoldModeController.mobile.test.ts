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
});
