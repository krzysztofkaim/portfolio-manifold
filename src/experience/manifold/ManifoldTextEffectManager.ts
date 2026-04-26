import { TITLE_SCRAMBLE_CHARS } from '../../config/manifold/ManifoldSceneConfig';
import type { ItemState } from './ManifoldTypes';
import { scheduleCardTitleMarqueeSync, setCardTitleText } from './CardTitleMarquee';

export class ManifoldTextEffectManager {
  private readonly textScrambleRafs = new WeakMap<HTMLElement, number>();
  private readonly textScrambleTargets = new WeakMap<HTMLElement, string>();
  private readonly revealLayers = new WeakMap<
    HTMLElement,
    {
      front: HTMLSpanElement;
      ghost: HTMLSpanElement;
      staticText: HTMLSpanElement;
    }
  >();

  public setTextContent(element: HTMLElement | null, target: string, scramble: boolean, force = false): void {
    if (!element) {
      return;
    }

    if (scramble) {
      this.animateTextSwap(element, target, force);
      return;
    }

    const existingRaf = this.textScrambleRafs.get(element);
    if (existingRaf) {
      window.cancelAnimationFrame(existingRaf);
      this.textScrambleRafs.delete(element);
    }

    this.textScrambleTargets.set(element, target);
    element.classList.remove('is-title-scrambling');
    element.textContent = target;
  }

  private animateTextSwap(element: HTMLElement, target: string, force = false): void {
    if (!force && this.textScrambleTargets.get(element) === target) {
      return;
    }
    const existingRaf = this.textScrambleRafs.get(element);
    if (existingRaf) {
      window.cancelAnimationFrame(existingRaf);
      this.textScrambleRafs.delete(element);
    }

    this.textScrambleTargets.set(element, target);
    element.classList.add('is-title-scrambling');

    let frame = 0;
    const totalFrames = Math.max(10, Math.round(target.length * 0.75) + 8);

    const tick = () => {
      frame += 1;
      const progress = frame / totalFrames;
      const revealCount = Math.floor(progress * target.length);
      let next = '';

      for (let index = 0; index < target.length; index += 1) {
        const char = target[index] ?? '';

        if (char === ' ') {
          next += ' ';
          continue;
        }

        next +=
          index < revealCount
            ? char
            : TITLE_SCRAMBLE_CHARS[Math.floor(Math.random() * TITLE_SCRAMBLE_CHARS.length)] ?? char;
      }

      element.textContent = next;

      if (frame >= totalFrames) {
        element.textContent = target;
        element.classList.remove('is-title-scrambling');
        this.textScrambleRafs.delete(element);
        return;
      }

      const rafId = window.requestAnimationFrame(tick);
      this.textScrambleRafs.set(element, rafId);
    };

    const rafId = window.requestAnimationFrame(tick);
    this.textScrambleRafs.set(element, rafId);
  }

  public animateCardTitle(item: ItemState, expanded: boolean): void {
    const titleEl = item.titleEl;

    if (!titleEl) {
      return;
    }

    const target = expanded ? item.expandedCardTitle || item.cardTitle : item.cardTitle;
    setCardTitleText(titleEl, titleEl.textContent ?? target);

    if (item.titleScrambleTarget === target && titleEl.textContent === target) {
      scheduleCardTitleMarqueeSync(titleEl);
      return;
    }

    if (item.titleScrambleRaf) {
      window.cancelAnimationFrame(item.titleScrambleRaf);
      item.titleScrambleRaf = 0;
    }

    item.titleScrambleTarget = target;
    titleEl.classList.add('is-title-scrambling');

    let frame = 0;
    const totalFrames = Math.max(10, target.length + 8);

    const tick = () => {
      frame += 1;
      const progress = frame / totalFrames;
      const revealCount = Math.floor(progress * target.length);
      let next = '';

      for (let index = 0; index < target.length; index += 1) {
        const char = target[index] ?? '';

        if (char === ' ') {
          next += ' ';
          continue;
        }

        next +=
          index < revealCount
            ? char
            : TITLE_SCRAMBLE_CHARS[Math.floor(Math.random() * TITLE_SCRAMBLE_CHARS.length)] ?? char;
      }

      setCardTitleText(titleEl, next);

      if (frame >= totalFrames) {
        setCardTitleText(titleEl, target);
        titleEl.classList.remove('is-title-scrambling');
        item.titleScrambleRaf = 0;
        scheduleCardTitleMarqueeSync(titleEl);
        return;
      }

      item.titleScrambleRaf = window.requestAnimationFrame(tick);
    };

    item.titleScrambleRaf = window.requestAnimationFrame(tick);
  }

  public animateCardHandoff(item: ItemState, expanded: boolean): void {
    const handoffEl = item.handoffEl;

    if (!handoffEl) {
      return;
    }

    const preview = handoffEl.dataset.previewHandoff ?? handoffEl.textContent ?? '';
    const target = expanded ? item.expandedHandoff || preview : preview;

    if (item.handoffScrambleTarget === target && handoffEl.textContent === target) {
      return;
    }

    if (item.handoffScrambleRaf) {
      window.cancelAnimationFrame(item.handoffScrambleRaf);
      item.handoffScrambleRaf = 0;
    }

    item.handoffScrambleTarget = target;
    handoffEl.classList.add('is-title-scrambling');

    let frame = 0;
    const totalFrames = Math.max(12, Math.round(target.length * 0.8) + 10);

    const tick = () => {
      frame += 1;
      const progress = frame / totalFrames;
      const revealCount = Math.floor(progress * target.length);
      let next = '';

      for (let index = 0; index < target.length; index += 1) {
        const char = target[index] ?? '';

        if (char === ' ') {
          next += ' ';
          continue;
        }

        next +=
          index < revealCount
            ? char
            : TITLE_SCRAMBLE_CHARS[Math.floor(Math.random() * TITLE_SCRAMBLE_CHARS.length)] ?? char;
      }

      handoffEl.textContent = next;

      if (frame >= totalFrames) {
        handoffEl.textContent = target;
        handoffEl.classList.remove('is-title-scrambling');
        item.handoffScrambleRaf = 0;
        return;
      }

      item.handoffScrambleRaf = window.requestAnimationFrame(tick);
    };

    item.handoffScrambleRaf = window.requestAnimationFrame(tick);
  }

  public getRevealLayers(element: HTMLElement): {
    front: HTMLSpanElement;
    ghost: HTMLSpanElement;
    staticText: HTMLSpanElement;
  } {
    const cached = this.revealLayers.get(element);
    if (
      cached &&
      cached.staticText.isConnected &&
      cached.staticText.parentElement === element &&
      cached.ghost.isConnected &&
      cached.front.isConnected
    ) {
      return cached;
    }

    const staticText = document.createElement('span');
    staticText.className = 'card-reveal-static';
    const ghost = document.createElement('span');
    ghost.className = 'card-reveal-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    const front = document.createElement('span');
    front.className = 'card-reveal-front';
    front.setAttribute('aria-hidden', 'true');

    staticText.textContent = element.textContent ?? '';
    element.replaceChildren(staticText, ghost, front);

    const layers = { staticText, ghost, front };
    this.revealLayers.set(element, layers);
    return layers;
  }

  /**
   * Disposes of all active text scramble animations and clears internal caches.
   *
   * @param items - The list of items to clean up
   */
  public destroy(items: ItemState[]): void {
    for (const item of items) {
      if (item.titleScrambleRaf) {
        window.cancelAnimationFrame(item.titleScrambleRaf);
        item.titleScrambleRaf = 0;
      }
      if (item.handoffScrambleRaf) {
        window.cancelAnimationFrame(item.handoffScrambleRaf);
        item.handoffScrambleRaf = 0;
      }

      if (item.titleEl) {
        const raf = this.textScrambleRafs.get(item.titleEl);
        if (raf) {
          window.cancelAnimationFrame(raf);
          this.textScrambleRafs.delete(item.titleEl);
        }
      }

      if (item.handoffEl) {
        const raf = this.textScrambleRafs.get(item.handoffEl);
        if (raf) {
          window.cancelAnimationFrame(raf);
          this.textScrambleRafs.delete(item.handoffEl);
        }
      }
    }
  }
}
