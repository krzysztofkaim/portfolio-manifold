import { TITLE_SCRAMBLE_CHARS } from '../../config/manifold/ManifoldSceneConfig';
import { MANIFOLD_CONSTANTS } from './ManifoldConstants';
import type { ItemState, ViewMode } from './ManifoldTypes';

export interface RevealLayers {
  front: HTMLSpanElement;
  ghost: HTMLSpanElement;
  staticText: HTMLSpanElement;
}

export interface ManifoldCardExpandControllerContext {
  animateCardHandoff(item: ItemState, expanded: boolean): void;
  animateCardTitle(item: ItemState, expanded: boolean): void;
  focusCardIn2D(cardIndex: number, immediate?: boolean): void;
  getExpandedState(): {
    card: ItemState | null;
    progress: number;
    quenchUntil: number;
    schedulerRaf: number;
    schedulerToken: number;
    target: number;
  };
  getRevealLayers(element: HTMLElement): RevealLayers;
  getRuntimeNow(): number;
  getViewMode(): ViewMode;
  isIntroCompleted(): boolean;
  isMobileViewport(): boolean;
  is2DMode(): boolean;
  requestAnimationFrame(callback: FrameRequestCallback): number;
  scheduleTimeout(callback: () => void, delay: number): number;
  setCardMobilePage(item: ItemState, page: number): void;
  setExpandedState(next: Partial<{
    card: ItemState | null;
    quenchUntil: number;
    schedulerRaf: number;
    schedulerToken: number;
    target: number;
  }>): void;
  setPhaseVelocityScale(scale: number): void;
  updateActivity(now: number): void;
}

export class ManifoldCardExpandController {
  constructor(private readonly context: ManifoldCardExpandControllerContext) {}

  private shouldAnimateReveal(element: HTMLElement): boolean {
    return !element.matches('.card-expanded-surface > span, .card-expanded-surface > strong, .card-expanded-surface > p');
  }

  toggleExpandedCard(item: ItemState): void {
    if (!this.context.isIntroCompleted()) {
      return;
    }

    if (this.context.is2DMode()) {
      this.context.focusCardIn2D(item.cardIndex, true);
    }

    const expandedState = this.context.getExpandedState();
    if (expandedState.card === item && expandedState.target > 0) {
      return;
    }

    this.clearExpandedRevealScheduler();

    if (expandedState.card && expandedState.card !== item) {
      this.context.animateCardTitle(expandedState.card, false);
      this.context.animateCardHandoff(expandedState.card, false);
      this.resetExpandedContent(expandedState.card);
      expandedState.card.el.style.zIndex = '';
      expandedState.card.lastZIndex = '';
    }

    const reverseOpen =
      this.context.getViewMode() === '3d' &&
      false;
    const now = this.context.getRuntimeNow();
    const immediateVelocityScale = reverseOpen
      ? MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.reverseExpandImmediateVelocityScale
      : MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.expandedOpenImmediateVelocityScale;
    const quenchDuration = reverseOpen
      ? MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.reverseExpandedMotionQuenchMs
      : MANIFOLD_CONSTANTS.ANIMATION_DYNAMICS.expandedMotionQuenchMs;

    this.context.setExpandedState({
      card: item,
      quenchUntil: now + quenchDuration,
      target: 1
    });
    item.el.style.zIndex = '1000';
    item.lastZIndex = '1000';
    this.context.setPhaseVelocityScale(immediateVelocityScale);
    this.context.updateActivity(now);

    this.context.scheduleTimeout(() => {
      if (this.context.getExpandedState().card !== item) {
        return;
      }

      this.context.setCardMobilePage(item, 0);
      this.primeExpandedContentForReveal(item);
      this.scheduleExpandedReveal(item);
    }, 10);
  }

  closeExpandedCard(): void {
    this.clearExpandedRevealScheduler();

    const expandedCard = this.context.getExpandedState().card;
    if (expandedCard) {
      this.context.animateCardTitle(expandedCard, false);
      this.context.animateCardHandoff(expandedCard, false);
      this.resetExpandedContent(expandedCard);
    }

    this.context.setExpandedState({
      quenchUntil: 0,
      target: 0
    });
  }

  scheduleExpandedReveal(item: ItemState): void {
    this.clearExpandedRevealScheduler();
    const expandedState = this.context.getExpandedState();
    const token = expandedState.schedulerToken;
    const startedAt = this.context.getRuntimeNow();

    const tick = () => {
      const current = this.context.getExpandedState();
      if (current.schedulerToken !== token || current.card !== item || current.target <= 0) {
        this.context.setExpandedState({ schedulerRaf: 0 });
        return;
      }

      const elapsed = this.context.getRuntimeNow() - startedAt;
      const ready = current.progress > 0.56 || elapsed > 140;

      if (!ready) {
        this.context.setExpandedState({
          schedulerRaf: this.context.requestAnimationFrame(tick)
        });
        return;
      }

      this.context.setExpandedState({ schedulerRaf: 0 });
      this.context.animateCardTitle(item, true);
      this.context.animateCardHandoff(item, true);
      this.animateExpandedContent(item);
    };

    this.context.setExpandedState({
      schedulerRaf: this.context.requestAnimationFrame(tick)
    });
  }

  primeExpandedContentForReveal(item: ItemState): void {
    this.clearExpandedContentReveal(item);
    const revealElements = item.fxEl.querySelectorAll<HTMLElement>('[data-reveal-text]');

    for (const element of revealElements) {
      const finalText = element.dataset.revealText ?? '';
      if (!this.shouldAnimateReveal(element)) {
        this.setRevealDisplay(element, finalText, finalText, false);
        continue;
      }
      this.setRevealDisplay(element, finalText, finalText, false);
    }
  }

  resetExpandedContent(item: ItemState): void {
    this.clearExpandedContentReveal(item);
    const revealElements = item.fxEl.querySelectorAll<HTMLElement>('[data-reveal-text]');

    for (const element of revealElements) {
      const finalText = element.dataset.revealText ?? '';
      this.setRevealDisplay(element, finalText, finalText, false);
    }
  }

  animateExpandedContent(item: ItemState): void {
    this.clearExpandedContentReveal(item);
    const revealElements = Array.from(item.fxEl.querySelectorAll<HTMLElement>('[data-reveal-text]'));

    if (revealElements.length === 0) {
      return;
    }

    const token = item.contentRevealToken;

    const scheduleReveal = (element: HTMLElement, delay: number) => {
      const timeoutId = window.setTimeout(() => {
        const expandedState = this.context.getExpandedState();
        if (item.contentRevealToken !== token || expandedState.card !== item || expandedState.target <= 0) {
          return;
        }

        const finalText = element.dataset.revealText ?? '';
        if (!finalText) {
          this.setRevealDisplay(element, finalText, finalText, false);
          return;
        }

        let frame = 0;
        const isLeadLine = element.classList.contains('card-expanded-lead');
        const totalFrames = isLeadLine
          ? Math.max(22, Math.round(finalText.length * 1.25) + 12)
          : Math.max(12, Math.round(finalText.length * 1.05) + 10);

        const tick = () => {
          const current = this.context.getExpandedState();
          if (item.contentRevealToken !== token || current.card !== item || current.target <= 0) {
            this.setRevealDisplay(element, finalText, finalText, false);
            return;
          }

          frame += 1;
          const progress = frame / totalFrames;
          const revealCount = Math.floor(progress * finalText.length);
          const scrambleWindow = isLeadLine
            ? progress < 0.4
              ? 8
              : progress < 0.74
                ? 5
                : 3
            : progress < 0.55
              ? 4
              : progress < 0.82
                ? 2
                : 1;
          let next = '';
          let scrambled = 0;

          for (let index = 0; index < finalText.length; index += 1) {
            const char = finalText[index] ?? '';
            if (char === ' ') {
              next += ' ';
              continue;
            }

            if (index < revealCount) {
              next += char;
              continue;
            }

            if (scrambled < scrambleWindow) {
              next += TITLE_SCRAMBLE_CHARS[Math.floor(Math.random() * TITLE_SCRAMBLE_CHARS.length)] ?? char;
              scrambled += 1;
              continue;
            }

            break;
          }

          this.setRevealDisplay(element, finalText, next, false);

          if (frame >= totalFrames) {
            this.setRevealDisplay(element, finalText, finalText, false);
            return;
          }

          const rafId = this.context.requestAnimationFrame(tick);
          item.contentRevealRafs.push(rafId);
        };

        // Switch into reveal mode only when we can immediately paint the first scramble frame.
        this.setRevealDisplay(element, finalText, '', true);
        tick();
      }, delay);

      item.contentRevealTimeouts.push(timeoutId);
    };

    revealElements.forEach((element, index) => {
      const finalText = element.dataset.revealText ?? element.textContent ?? '';
      if (!this.shouldAnimateReveal(element)) {
        this.setRevealDisplay(element, finalText, finalText, false);
        element.dataset.revealText = finalText;
        return;
      }
      this.setRevealDisplay(element, finalText, finalText, false);
      const isLeadLine = element.classList.contains('card-expanded-lead');
      scheduleReveal(element, (isLeadLine ? 36 : 64) + index * 72);
      element.dataset.revealText = finalText;
    });
  }

  private clearExpandedContentReveal(item: ItemState): void {
    item.contentRevealToken += 1;

    while (item.contentRevealRafs.length > 0) {
      const rafId = item.contentRevealRafs.pop();
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    }

    while (item.contentRevealTimeouts.length > 0) {
      const timeoutId = item.contentRevealTimeouts.pop();
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    }
  }

  private clearExpandedRevealScheduler(): void {
    const expandedState = this.context.getExpandedState();
    this.context.setExpandedState({
      schedulerToken: expandedState.schedulerToken + 1
    });

    if (expandedState.schedulerRaf) {
      window.cancelAnimationFrame(expandedState.schedulerRaf);
      this.context.setExpandedState({ schedulerRaf: 0 });
    }
  }

  private setRevealDisplay(
    element: HTMLElement,
    finalText: string,
    visibleText: string,
    revealing: boolean,
    showCursor = true
  ): void {
    const layers = this.context.getRevealLayers(element);
    layers.staticText.textContent = finalText;

    if (!revealing) {
      element.classList.remove('is-revealing');
      element.classList.remove('is-reveal-primed');
      layers.ghost.textContent = '';
      layers.front.textContent = '';
      return;
    }

    if (!element.style.getPropertyValue('--reveal-color')) {
      // Avoid getComputedStyle reflow by defaulting to currentColor or an inherited variable
      element.style.setProperty('--reveal-color', 'currentColor');
    }

    element.classList.add('is-revealing');
    element.classList.toggle('is-reveal-primed', !showCursor);
    layers.ghost.textContent = finalText;
    layers.front.textContent = visibleText;
  }

  /**
   * Disposes of the controller and all pending reveal animations.
   *
   * @param items - The list of items to clean up
   */
  public destroy(items: ItemState[]): void {
    this.clearExpandedRevealScheduler();
    for (const item of items) {
      this.clearExpandedContentReveal(item);
    }
  }
}
