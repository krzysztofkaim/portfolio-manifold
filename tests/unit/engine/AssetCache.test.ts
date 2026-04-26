import { describe, expect, it, vi } from 'vitest';
import { AssetCache } from '../../../src/engine/AssetCache';

describe('AssetCache', () => {
  it('returns values after set/get and refreshes LRU order', () => {
    const dispose = vi.fn();
    const cache = new AssetCache<number>(2);

    cache.set('a', 1, dispose);
    cache.set('b', 2, dispose);
    expect(cache.get('a')).toBe(1);

    cache.set('c', 3, dispose);
    expect(dispose).toHaveBeenCalledWith(2);
    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeNull();
  });

  it('calls dispose when deleting or replacing entries', () => {
    const dispose = vi.fn();
    const cache = new AssetCache<number>(2);

    cache.set('a', 1, dispose);
    cache.set('a', 2, dispose);
    cache.delete('a');

    expect(dispose).toHaveBeenNthCalledWith(1, 1);
    expect(dispose).toHaveBeenNthCalledWith(2, 2);
  });

  it('clear() disposes and removes all entries', () => {
    const dispose = vi.fn();
    const cache = new AssetCache<number>(2);

    cache.set('a', 1, dispose);
    cache.set('b', 2, dispose);
    cache.clear();

    expect(dispose).toHaveBeenCalledWith(1);
    expect(dispose).toHaveBeenCalledWith(2);
    expect(cache.get('a')).toBeNull();
    expect(cache.get('b')).toBeNull();
  });

  it('handles deleting non-existent key', () => {
    const cache = new AssetCache<number>(5);
    expect(() => cache.delete('non-existent')).not.toThrow();
  });
});
