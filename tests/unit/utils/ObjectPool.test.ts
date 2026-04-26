import { describe, expect, it, vi } from 'vitest';
import { ObjectPool } from '../../../src/utils/ObjectPool';

describe('ObjectPool', () => {
  it('supports acquire and release lifecycle', () => {
    let nextId = 0;
    const pool = new ObjectPool({
      create: () => ({ id: ++nextId, active: false }),
      activate: (value) => {
        value.active = true;
      },
      reset: (value) => {
        value.active = false;
      }
    });

    const value = pool.acquire(undefined);
    expect(value.active).toBe(true);
    expect(pool.activeCount).toBe(1);

    pool.release(value);
    expect(value.active).toBe(false);
    expect(pool.availableCount).toBe(1);
  });

  it('supports releaseAll, trim and drain edge cases', () => {
    const destroy = vi.fn();
    const pool = new ObjectPool({
      create: (label: string) => ({ label }),
      destroy
    });

    pool.acquire('a');
    pool.acquire('b');
    pool.releaseAll();
    expect(pool.activeCount).toBe(0);
    expect(pool.availableCount).toBe(2);

    pool.trim(1);
    expect(destroy).toHaveBeenCalledTimes(1);

    pool.drain();
    expect(destroy).toHaveBeenCalledTimes(2);

    const c = pool.acquire('c');
    expect(c.label).toBe('c');
  });

  it('ignores release of object outside the pool', () => {
    const destroy = vi.fn();
    const pool = new ObjectPool({
      create: () => ({ id: 1 }),
      destroy
    });

    pool.release({ id: 999 });
    expect(pool.activeCount).toBe(0);
    expect(destroy).not.toHaveBeenCalled();
  });
});
