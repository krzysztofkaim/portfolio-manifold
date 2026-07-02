import type { IRuntimeAdapter } from '../../ui/ports';

export interface ManifoldInputBindings {
  exitButton: HTMLButtonElement;
  featuredInteractiveEl: HTMLElement | null;
  viewport: HTMLElement;
}

export interface ManifoldInputHandlers {
  handleExitClick: () => void;
  handleFeaturedClick: () => void;
  handleFeaturedKeydown: (event: KeyboardEvent) => void;
  handleGlobalKeydown: (event: KeyboardEvent) => void;
  handlePointerLeave: () => void;
  handlePointerMove: (event: PointerEvent) => void;
  handleViewportClick: (event: MouseEvent) => void;
  handleViewportPointerDown: (event: PointerEvent) => void;
  handleViewportPointerUp: (event: PointerEvent) => void;
  handleWheel: (event: WheelEvent) => void;
}

export class ManifoldInputController {
  constructor(
    private readonly runtime: IRuntimeAdapter,
    private readonly bindings: ManifoldInputBindings,
    private readonly handlers: ManifoldInputHandlers
  ) {}

  attach(): void {
    this.runtime.addWindowEventListener('pointermove', this.handlers.handlePointerMove, { passive: true });
    this.runtime.addWindowEventListener('pointerleave', this.handlers.handlePointerLeave);
    this.runtime.addWindowEventListener('keydown', this.handlers.handleGlobalKeydown);
    this.runtime.addWindowEventListener('wheel', this.handlers.handleWheel, { passive: true });
    this.bindings.viewport.addEventListener('pointerdown', this.handlers.handleViewportPointerDown, { passive: true });
    this.bindings.viewport.addEventListener('pointerup', this.handlers.handleViewportPointerUp, { passive: true });
    this.bindings.viewport.addEventListener('click', this.handlers.handleViewportClick);
    this.bindings.featuredInteractiveEl?.addEventListener('click', this.handlers.handleFeaturedClick);
    this.bindings.featuredInteractiveEl?.addEventListener('keydown', this.handlers.handleFeaturedKeydown);
    this.bindings.exitButton.addEventListener('click', this.handlers.handleExitClick);
  }

  detach(): void {
    this.runtime.removeWindowEventListener('pointermove', this.handlers.handlePointerMove);
    this.runtime.removeWindowEventListener('pointerleave', this.handlers.handlePointerLeave);
    this.runtime.removeWindowEventListener('keydown', this.handlers.handleGlobalKeydown);
    this.runtime.removeWindowEventListener('wheel', this.handlers.handleWheel);
    this.bindings.viewport.removeEventListener('pointerdown', this.handlers.handleViewportPointerDown);
    this.bindings.viewport.removeEventListener('pointerup', this.handlers.handleViewportPointerUp);
    this.bindings.viewport.removeEventListener('click', this.handlers.handleViewportClick);
    this.bindings.featuredInteractiveEl?.removeEventListener('click', this.handlers.handleFeaturedClick);
    this.bindings.featuredInteractiveEl?.removeEventListener('keydown', this.handlers.handleFeaturedKeydown);
    this.bindings.exitButton.removeEventListener('click', this.handlers.handleExitClick);
  }
}
