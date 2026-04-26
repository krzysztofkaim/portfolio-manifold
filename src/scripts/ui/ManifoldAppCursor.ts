export interface CursorElements {
  root: HTMLElement;
  core: HTMLElement;
  ring: HTMLElement;
}

export class ManifoldAppCursor {
  private enabled = false;
  private targetX = window.innerWidth * 0.5;
  private targetY = window.innerHeight * 0.5;
  private ringX = Number.NaN;
  private ringY = Number.NaN;
  private intent = 0;
  private interactive = false;
  private overUiControl = false;
  private idle = true;
  private teardown: (() => void) | null = null;

  constructor(private readonly elements: CursorElements) {
    this.ringX = this.targetX;
    this.ringY = this.targetY;
  }

  setup(): void {
    this.enabled = window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(hover: none)').matches;

    if (!this.enabled) {
      if (this.elements.root) this.elements.root.hidden = true;
      document.body.classList.remove('has-custom-cursor');
      return;
    }

    document.body.classList.add('has-custom-cursor');
    if (this.elements.root) this.elements.root.hidden = false;

    const updateTarget = (event: PointerEvent) => {
      this.targetX = event.clientX;
      this.targetY = event.clientY;
      this.ringX = Number.isFinite(this.ringX) ? this.ringX : this.targetX;
      this.ringY = Number.isFinite(this.ringY) ? this.ringY : this.targetY;
      this.setIdle(false);

      if (this.elements.core) this.elements.core.style.transform = `translate3d(${this.targetX.toFixed(2)}px, ${this.targetY.toFixed(2)}px, 0) translate(-50%, -50%)`;

      const target = event.target;
      if (target instanceof Element) {
        this.setOverUiControl(
          Boolean(target.closest('.topbar-chip, .hud-nav-return, .hud-mode-toggle, .hud-mode-option'))
        );
        this.setInteractive(
          Boolean(target.closest('button, a, [role="button"], .card, [data-entry-card="true"], .topbar-chip'))
        );
      } else {
        this.setOverUiControl(false);
        this.setInteractive(false);
      }
    };

    const handleLeave = () => {
      this.setIdle(true);
      this.setOverUiControl(false);
      this.setInteractive(false);
    };

    const handleDown = () => {
      this.elements.root?.classList.add('is-pressed');
    };

    const handleUp = () => {
      this.elements.root?.classList.remove('is-pressed');
    };

    window.addEventListener('pointermove', updateTarget, { passive: true });
    window.addEventListener('pointerleave', handleLeave);
    window.addEventListener('pointerdown', handleDown, { passive: true });
    window.addEventListener('pointerup', handleUp, { passive: true });

    this.teardown = () => {
      window.removeEventListener('pointermove', updateTarget);
      window.removeEventListener('pointerleave', handleLeave);
      window.removeEventListener('pointerdown', handleDown);
      window.removeEventListener('pointerup', handleUp);
      document.body.classList.remove('has-custom-cursor');
      this.elements.root?.classList.remove('is-interactive', 'is-over-ui-control', 'is-pressed', 'is-idle');
    };
  }

  update(): void {
    if (!this.enabled) {
      return;
    }

    const ringLerp = this.interactive ? 0.18 : 0.14;
    this.ringX += (this.targetX - this.ringX) * ringLerp;
    this.ringY += (this.targetY - this.ringY) * ringLerp;
    this.intent = Math.abs(this.targetX - this.ringX) + Math.abs(this.targetY - this.ringY);

    if (this.intent > 0.04) {
      if (this.elements.ring) this.elements.ring.style.transform = `translate3d(${this.ringX.toFixed(2)}px, ${this.ringY.toFixed(2)}px, 0) translate(-50%, -50%)`;
    }
  }

  destroy(): void {
    this.teardown?.();
    this.teardown = null;
  }

  private setInteractive(next: boolean): void {
    if (this.interactive === next) return;
    this.interactive = next;
    this.elements.root?.classList.toggle('is-interactive', next);
  }

  private setOverUiControl(next: boolean): void {
    if (this.overUiControl === next) return;
    this.overUiControl = next;
    this.elements.root?.classList.toggle('is-over-ui-control', next);
  }

  private setIdle(next: boolean): void {
    if (this.idle === next) return;
    this.idle = next;
    this.elements.root?.classList.toggle('is-idle', next);
  }
}
