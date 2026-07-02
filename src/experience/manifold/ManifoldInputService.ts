import { SCROLL_CLOSE_KEYS } from './ManifoldConstants';
import type { ItemState } from './ManifoldTypes';

export interface ManifoldInputServiceContext {
  advanceNext(): void;
  advancePrev(): void;
  closeExpandedCard(): void;
  findCardState(cardEl: HTMLElement): ItemState | null;
  getExpandedCard(): ItemState | null;
  getExpandedTarget(): number;
  getHoveredCard(): ItemState | null;
  getIntroCompleted(): boolean;
  getIntroTarget(): number;
  getViewportSize(): { height: number; width: number };
  get2DGridMetrics(): { spacingX: number; stackedMobile: boolean };
  is2DMode(): boolean;
  is4DMode(): boolean;
  isEntryTarget(target: EventTarget | null, x: number, y: number): boolean;
  isHudNavigationOpen(): boolean;
  markInteractionActivity(): void;
  pan2DBy(deltaX: number): void;
  resolveCardTarget(target: EventTarget | null, x: number, y: number): ItemState | null;
  setCardMobilePage(item: ItemState, page: number): void;
  setHoveredCard(item: ItemState | null): void;
  triggerIntroEnter(): void;
  triggerIntroExit(): void;
  toggleExpandedCard(item: ItemState): void;
  updatePhaseMouse(mouseX: number, mouseY: number): void;
}

export class ManifoldInputService {
  private pointerX = 0;
  private pointerY = 0;
  private pointerTarget: HTMLElement | null = null;
  private pointerActive = false;
  private pointerDirty = false;
  private pressedCard: ItemState | null = null;
  private pressedEntry = false;
  private consumeViewportClick = false;
  private pointerDownX = 0;
  private pointerDownY = 0;

  constructor(private readonly context: ManifoldInputServiceContext) {}

  getPointerX(): number {
    return this.pointerX;
  }

  getPointerY(): number {
    return this.pointerY;
  }

  getPointerTarget(): HTMLElement | null {
    return this.pointerTarget;
  }

  isPointerActive(): boolean {
    return this.pointerActive;
  }

  isPointerDirty(): boolean {
    return this.pointerDirty;
  }

  clearPointerDirty(): void {
    this.pointerDirty = false;
  }

  handlePointerMove(event: PointerEvent): void {
    const viewport = this.context.getViewportSize();
    this.context.updatePhaseMouse(
      (event.clientX / viewport.width - 0.5) * 2,
      (event.clientY / viewport.height - 0.5) * 2
    );
    this.pointerX = event.clientX;
    this.pointerY = event.clientY;
    this.pointerTarget = event.target instanceof HTMLElement ? event.target : null;
    this.pointerActive = true;
    this.pointerDirty = true;
    this.context.markInteractionActivity();
  }

  handlePointerLeave(): void {
    this.pointerActive = false;
    this.pointerTarget = null;
    this.pointerDirty = false;
    this.pressedCard = null;
    this.pressedEntry = false;
    this.context.setHoveredCard(null);
  }

  handleViewportPointerDown(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }

    this.pointerDownX = event.clientX;
    this.pointerDownY = event.clientY;

    if (!this.context.getIntroCompleted() || this.context.getIntroTarget() < 1) {
      this.pressedEntry = this.context.isEntryTarget(event.target, event.clientX, event.clientY);
      return;
    }

    if (event.target instanceof HTMLElement && event.target.closest('[data-card-page-nav]')) {
      this.pressedCard = null;
      return;
    }

    this.pressedCard = this.context.resolveCardTarget(event.target, event.clientX, event.clientY);
  }

  handleViewportPointerUp(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }

    const moved = Math.hypot(event.clientX - this.pointerDownX, event.clientY - this.pointerDownY);
    if (moved > 14) {
      this.pressedCard = null;
      return;
    }

    const target = event.target;
    if (target instanceof HTMLElement && target.closest('[data-card-close]')) {
      this.pressedCard = null;
      return;
    }

    if (target instanceof HTMLElement && target.closest('[data-card-page-nav]')) {
      this.pressedCard = null;
      return;
    }

    if (!this.context.getIntroCompleted() || this.context.getIntroTarget() < 1) {
      const shouldEnter = this.pressedEntry || this.context.isEntryTarget(target, event.clientX, event.clientY);
      this.pressedEntry = false;

      if (shouldEnter) {
        this.consumeViewportClick = true;
        this.context.triggerIntroEnter();
      }

      return;
    }

    const releasedCard = this.pressedCard ?? this.context.resolveCardTarget(target, event.clientX, event.clientY);

    if (!releasedCard) {
      this.pressedCard = null;
      return;
    }

    this.consumeViewportClick = true;
    this.pressedCard = null;
    this.context.toggleExpandedCard(releasedCard);
  }

  handleViewportClick(event: MouseEvent): void {
    if (this.consumeViewportClick) {
      this.consumeViewportClick = false;
      return;
    }

    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      this.pressedCard = null;
      return;
    }

    if (target.closest('[data-card-close]')) {
      this.pressedCard = null;
      this.context.closeExpandedCard();
      return;
    }

    const pageNavButton = target.closest<HTMLElement>('[data-card-page-nav]');
    if (pageNavButton) {
      const card = pageNavButton.closest<HTMLElement>('.card');

      if (card) {
        const item = this.context.findCardState(card);

        if (item) {
          const direction = pageNavButton.dataset.cardPageNav === 'prev' ? -1 : 1;
          this.context.setCardMobilePage(item, item.mobilePage + direction);
        }
      }

      this.pressedCard = null;
      return;
    }

    if (!this.context.getIntroCompleted() || this.context.getIntroTarget() < 1) {
      if (this.context.isEntryTarget(target, event.clientX, event.clientY)) {
        this.context.triggerIntroEnter();
      }

      this.pressedCard = null;
      return;
    }

    const clickedCard = this.pressedCard ?? this.context.resolveCardTarget(target, event.clientX, event.clientY);
    this.pressedCard = null;

    if (clickedCard) {
      this.context.toggleExpandedCard(clickedCard);
      return;
    }

    if (this.context.getExpandedCard()) {
      this.context.closeExpandedCard();
    }
  }

  handleFeaturedClick(): void {
    this.context.triggerIntroEnter();
  }

  handleFeaturedKeydown(event: KeyboardEvent): void {
    if ((event.key === 'Enter' || event.key === ' ') && this.context.getIntroTarget() < 1) {
      event.preventDefault();
      this.context.triggerIntroEnter();
    }
  }

  handleExitClick(): void {
    this.context.triggerIntroExit();
  }

  handleGlobalKeydown(event: KeyboardEvent): void {
    const introCompleted = this.context.getIntroCompleted();
    const is2DMode = this.context.is2DMode();
    const expandedCard = this.context.getExpandedCard();
    const expandedTarget = this.context.getExpandedTarget();
    const hudNavigationOpen = this.context.isHudNavigationOpen();

    if (
      introCompleted &&
      is2DMode &&
      !hudNavigationOpen &&
      ['a', 'd', 'w', 's', 'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(event.key)
    ) {
      event.preventDefault();
      return;
    }

    if (is2DMode && expandedCard && expandedTarget > 0 && SCROLL_CLOSE_KEYS.has(event.key)) {
      event.preventDefault();
      return;
    }

    if (introCompleted && is2DMode && !hudNavigationOpen && !expandedCard && (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w' || event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a')) {
      event.preventDefault();
      this.context.advancePrev();
      return;
    }

    if (introCompleted && is2DMode && !hudNavigationOpen && !expandedCard && (event.key === 'ArrowDown' || event.key.toLowerCase() === 's' || event.key === 'ArrowRight' || event.key.toLowerCase() === 'd')) {
      event.preventDefault();
      this.context.advanceNext();
      return;
    }

    if (
      introCompleted &&
      !hudNavigationOpen &&
      !is2DMode &&
      !expandedCard &&
      (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w' || event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a')
    ) {
      event.preventDefault();
      this.context.advancePrev();
      return;
    }

    if (
      introCompleted &&
      !hudNavigationOpen &&
      !is2DMode &&
      !expandedCard &&
      (event.key === 'ArrowDown' || event.key.toLowerCase() === 's' || event.key === 'ArrowRight' || event.key.toLowerCase() === 'd')
    ) {
      event.preventDefault();
      this.context.advanceNext();
      return;
    }

    if (event.key === 'Escape') {
      this.context.closeExpandedCard();
      return;
    }

    if (!this.context.is2DMode() && expandedCard && expandedTarget > 0 && SCROLL_CLOSE_KEYS.has(event.key)) {
      this.context.closeExpandedCard();
    }
  }

  handleWheel(event: WheelEvent): void {
    if (
      this.context.getIntroCompleted() &&
      this.context.is2DMode() &&
      !this.context.isHudNavigationOpen() &&
      !this.context.getExpandedCard()
    ) {
      const metrics = this.context.get2DGridMetrics();
      const horizontalDelta =
        Math.abs(event.deltaX) > 0.01 ? event.deltaX : event.shiftKey && Math.abs(event.deltaY) > 0.01 ? event.deltaY : 0;

      if (metrics.stackedMobile && Math.abs(horizontalDelta) > 10) {
        return;
      }

      const horizontalIntent =
        Math.abs(horizontalDelta) > 10 && Math.abs(horizontalDelta) > Math.abs(event.deltaY) * 0.55;

      if (horizontalIntent) {
        this.context.pan2DBy(horizontalDelta);
        return;
      }
    }

    if (this.context.getExpandedCard() && this.context.getExpandedTarget() > 0) {
      this.context.closeExpandedCard();
    }
  }
}
