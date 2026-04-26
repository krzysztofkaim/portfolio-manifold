import { describe, expect, it } from 'vitest';
import { createController } from '../helpers/manifoldControllerTestUtils';

const testIfGc = typeof globalThis.gc === 'function' ? it : it.skip;

describe('ManifoldModeController render allocations', () => {
  testIfGc('does not allocate significantly in steady state', () => {
    const { controller } = createController();

    controller.setScroll(0, 0);
    controller.render(16);
    globalThis.gc?.();
    const before = process.memoryUsage().heapUsed;

    for (let index = 1; index <= 100; index += 1) {
      controller.render(16 + index * 16);
    }

    globalThis.gc?.();
    const after = process.memoryUsage().heapUsed;

    expect(after - before).toBeLessThan(50 * 1024);
  });
});
