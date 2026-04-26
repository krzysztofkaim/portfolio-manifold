import { afterEach, describe, expect, it } from 'vitest';
import { createController } from '../helpers/manifoldControllerTestUtils';

describe('ManifoldModeController', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('setScroll updates internal phase state', () => {
    const { controller } = createController();

    controller.setScroll(120, 4);

    expect((controller as any).phaseState.scroll).toBe(120);
    expect((controller as any).phaseState.targetSpeed).toBe(4);
  });

  it('triggerIntroEnter sets introTarget to 1', () => {
    const { controller } = createController();

    (controller as any).triggerIntroEnter();

    expect((controller as any).introTarget).toBe(1);
  });

  it("setViewMode('2d') is a no-op before intro completes", () => {
    const { controller } = createController();

    controller.setViewMode('2d');

    expect(controller.getViewMode()).toBe('3d');
  });
});
