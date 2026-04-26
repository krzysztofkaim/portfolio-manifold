export interface ObjectPoolOptions<TValue, TContext = void> {
  activate?: (value: TValue, context: TContext) => void;
  create: (context: TContext) => TValue;
  destroy?: (value: TValue) => void;
  reset?: (value: TValue) => void;
}

export class ObjectPool<TValue, TContext = void> {
  private readonly active = new Set<TValue>();
  private readonly available: TValue[] = [];

  constructor(private readonly options: ObjectPoolOptions<TValue, TContext>) {}

  get activeCount(): number {
    return this.active.size;
  }

  get availableCount(): number {
    return this.available.length;
  }

  acquire(context: TContext): TValue {
    const value = this.available.pop() ?? this.options.create(context);
    this.active.add(value);
    this.options.activate?.(value, context);
    return value;
  }

  release(value: TValue): void {
    if (!this.active.delete(value)) {
      return;
    }

    this.options.reset?.(value);
    this.available.push(value);
  }

  releaseAll(): void {
    const activeValues = [...this.active];
    for (const value of activeValues) {
      this.release(value);
    }
  }

  trim(maxAvailable: number): void {
    while (this.available.length > maxAvailable) {
      const value = this.available.pop();
      if (value) {
        this.options.destroy?.(value);
      }
    }
  }

  drain(): void {
    const activeValues = [...this.active];
    for (const value of activeValues) {
      this.active.delete(value);
      this.options.destroy?.(value);
    }

    while (this.available.length > 0) {
      const value = this.available.pop();
      if (value) {
        this.options.destroy?.(value);
      }
    }
  }
}
