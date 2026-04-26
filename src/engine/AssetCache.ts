export interface CacheEntry<T> {
  value: T;
  dispose: (value: T) => void;
}

export class AssetCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();

  constructor(private readonly maxSize: number) {}

  get(key: string): T | null {
    const entry = this.entries.get(key);

    if (!entry) {
      return null;
    }

    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, dispose: (value: T) => void): void {
    if (this.entries.has(key)) {
      this.delete(key);
    }

    this.entries.set(key, { value, dispose });

    if (this.entries.size > this.maxSize) {
      const oldestKey = this.entries.keys().next().value as string | undefined;

      if (oldestKey) {
        this.delete(oldestKey);
      }
    }
  }

  delete(key: string): void {
    const entry = this.entries.get(key);

    if (!entry) {
      return;
    }

    entry.dispose(entry.value);
    this.entries.delete(key);
  }

  clear(): void {
    for (const [key] of this.entries) {
      this.delete(key);
    }
  }
}
