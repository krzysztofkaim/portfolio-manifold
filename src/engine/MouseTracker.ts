import { lerp } from '../utils/math';

export class MouseTracker {
  normalized = { x: 0, y: 0 };
  raw = { x: 0, y: 0 };
  client = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };

  private readonly handlePointerMove = (event: PointerEvent) => {
    this.updateFromClient(event.clientX, event.clientY);
  };

  private readonly handleTouch = (event: TouchEvent) => {
    const touch = event.touches[0];

    if (!touch) {
      return;
    }

    this.updateFromClient(touch.clientX, touch.clientY);
  };

  constructor() {
    window.addEventListener('pointermove', this.handlePointerMove, { passive: true });
    window.addEventListener('touchstart', this.handleTouch, { passive: true });
    window.addEventListener('touchmove', this.handleTouch, { passive: true });
  }

  tick(): void {
    this.normalized.x = lerp(this.normalized.x, this.raw.x, 0.12);
    this.normalized.y = lerp(this.normalized.y, this.raw.y, 0.12);
  }

  dispose(): void {
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('touchstart', this.handleTouch);
    window.removeEventListener('touchmove', this.handleTouch);
  }

  private updateFromClient(clientX: number, clientY: number): void {
    this.client.x = clientX;
    this.client.y = clientY;
    this.raw.x = (clientX / window.innerWidth) * 2 - 1;
    this.raw.y = -((clientY / window.innerHeight) * 2 - 1);
  }
}
