import { describe, expect, it } from 'vitest';
import { applyCardMotion, computeFeaturedCardPose } from '../../../../src/experience/manifold/ManifoldPhysics';
import { createItemState } from '../../../helpers/itemStateFactory';

describe('ManifoldPhysics', () => {
  it('applyCardMotion stabilizes inertia and clamps large velocity response', () => {
    const item = createItemState({ response: 0.12, variance: 0.5 });

    for (let index = 0; index < 200; index += 1) {
      applyCardMotion(item, { mouseX: 0.25, time: index * 16, velocity: 10000 });
    }

    expect(Number.isFinite(item.inertiaZ)).toBe(true);
    expect(Math.abs(item.inertiaZ)).toBeLessThanOrEqual(200);
    expect(Math.abs(item.inertiaRotX)).toBeLessThan(20);
  });

  it('computeFeaturedCardPose interpolates between intro and final pose', () => {
    const featured = createItemState({
      x: 50,
      y: 80,
      baseZ: -120
    });

    const introPose = computeFeaturedCardPose(featured, {
      cameraZ: 10,
      introProgress: 0,
      loopSize: 1000,
      mouseX: 0,
      time: 0,
      velocity: 0
    });
    const finalPose = computeFeaturedCardPose(featured, {
      cameraZ: 10,
      introProgress: 1,
      loopSize: 1000,
      mouseX: 0,
      time: 0,
      velocity: 0
    });

    expect(introPose.x).not.toBe(finalPose.x);
    expect(finalPose.x).toBeCloseTo(featured.x, 6);
    expect(Math.abs(finalPose.y - featured.y)).toBeLessThan(1);
  });
});
