import { clamp, lerp } from '../../utils/math';
import type { ItemState } from './ManifoldTypes';
import { StyleAdapter } from '../../utils/StyleAdapter';
import { scheduleCardTitleMarqueeSync } from './CardTitleMarquee';
import { IS_IOS, IS_SAFARI } from '../../utils/browserDetection';

const CARD_SPECTRUM_VARIABLES = Array.from({ length: 16 }, (_, index) => `--f-${index}`);

export interface RendererContext {
  viewportWidth: number;
  viewportHeight: number;
  activeViewModeProgress: number;
  time: number;
  velocityMagnitude: number;
}

export class ManifoldDomRenderer {
  private readonly visibilityCache = new WeakMap<ItemState, string>();

  private setPixelCanvasVisibility(item: ItemState, visible: boolean): void {
    item.pixelCanvasEl?.setHostVisibility?.(visible);
  }

  updateItemVisibility(item: ItemState, alpha: number, isVisible: boolean): boolean {
    item.currentAlpha = alpha;

    if (!isVisible) {
      if (item.lastOpacity !== '0.000') {
        item.el.style.opacity = '0.000';
        item.el.style.display = 'none';
        this.visibilityCache.set(item, 'hidden');
        item.lastOpacity = '0.000';

        this.setPixelCanvasVisibility(item, false);
      }
      return false;
    }

    if (this.visibilityCache.get(item) === 'hidden') {
      item.el.style.display = '';
      this.visibilityCache.set(item, '');

      this.setPixelCanvasVisibility(item, true);
    }

    return true;
  }

  renderTextItem(item: ItemState, alpha: number, context: RendererContext, vizZ: number): void {
    const { activeViewModeProgress } = context;
    const textOpacityValue = clamp(alpha * (1 - activeViewModeProgress * 0.92), 0, 1);
    const textOpacity = textOpacityValue.toFixed(3);

    if (textOpacity !== item.lastOpacity) {
      item.el.style.opacity = textOpacity;
      item.lastOpacity = textOpacity;
    }

    const textVisibility = textOpacityValue <= 0.001 ? 'none' : 'block';
    if (this.visibilityCache.get(item) !== textVisibility) {
      item.el.style.display = textVisibility;
      this.visibilityCache.set(item, textVisibility);
    }

    if (textVisibility === 'none') return;

    item.currentScreenX = item.x;
    item.currentScreenY = item.y;
    item.hasCurrentScreenQuad = false;
    item.currentDepth = lerp(vizZ, -1200 - Math.abs(item.y) * 0.04, activeViewModeProgress);
    
    // Transform application will be called from orchestrator to avoid passing setRotatedTransform multiple times
  }

  renderCardVisibility(item: ItemState, opacity: number, keepVisible: boolean, allowTitleMarqueeSync: boolean): boolean {
    const modeAwareOpacity = opacity.toFixed(3);
    const targetVisibility = opacity <= 0.001 && !keepVisible ? 'none' : 'block';
    const previousVisibility = this.visibilityCache.get(item);

    if (modeAwareOpacity !== item.lastOpacity) {
      item.el.style.opacity = modeAwareOpacity;
      item.lastOpacity = modeAwareOpacity;
    }

    if (previousVisibility !== targetVisibility) {
      item.el.style.display = targetVisibility;
      this.visibilityCache.set(item, targetVisibility);

      this.setPixelCanvasVisibility(item, targetVisibility === 'block');
    }

    if (targetVisibility === 'block') {
      if (allowTitleMarqueeSync) {
        if (previousVisibility !== targetVisibility || item.pendingTitleMarqueeSync) {
          scheduleCardTitleMarqueeSync(item.titleEl);
          item.pendingTitleMarqueeSync = false;
        }
      } else if (previousVisibility !== targetVisibility) {
        item.pendingTitleMarqueeSync = true;
      }
    }

    return targetVisibility !== 'none';
  }

  setRotatedTransform(
    item: ItemState,
    x: number,
    y: number,
    z: number,
    rot: number,
    tiltX = 0,
    tiltY = 0,
    shiftZ = 0
  ): void {
    // Separate keys for position and rotation to avoid integer overflow
    const xr = Math.round(x * 100);
    const yr = Math.round(y * 100);
    const zr = Math.round((z + shiftZ) * 100);
    const rr = Math.round(rot * 100);
    const txr = Math.round(tiltX * 100);
    const tyr = Math.round(tiltY * 100);

    const posKey = xr + yr * 10000 + zr * 100000000;
    const rotKey = rr + txr * 10000 + tyr * 100000000;
    
    if (item.lastBasePosKey !== posKey || item.lastBaseRotKey !== rotKey) {
      if (IS_SAFARI && item.lastBasePosKey !== undefined) {
        const dx = Math.abs(x - (item.lastX || 0));
        const dy = Math.abs(y - (item.lastY || 0));
        const dz = Math.abs(z + shiftZ - (item.lastZ || 0));
        const dr = Math.abs(rot - (item.lastRot || 0));
        
        // Coarse threshold for Safari: don't update if it's less than 0.1px or 0.05deg change
        // We MUST check DZ because section titles primarily move in depth during 3D scrolling.
        if (dx < 0.1 && dy < 0.1 && dz < 0.1 && dr < 0.05) {
          return;
        }
      }

      const precision = IS_SAFARI ? 1 : 2;
      const flatTransform = IS_IOS && Math.abs(z + shiftZ) < 0.05 && Math.abs(tiltX) < 0.05 && Math.abs(tiltY) < 0.05;
      const transform = flatTransform
        ? `translate(${x.toFixed(precision)}px, ${y.toFixed(precision)}px) rotate(${rot.toFixed(precision)}deg)`
        : `translate3d(${x.toFixed(precision)}px, ${y.toFixed(precision)}px, ${(z + shiftZ).toFixed(precision)}px) rotateZ(${rot.toFixed(precision)}deg)`;
      item.el.style.transform = transform;
      
      // Also update rotation vars for the child .card if they changed significantly
      if (Math.abs(tiltX - (item.lastTiltX || 0)) > 0.1 || Math.abs(tiltY - (item.lastTiltY || 0)) > 0.1) {
        StyleAdapter.setNumericProperty(item.el, '--card-rot-x', tiltX, 'deg');
        StyleAdapter.setNumericProperty(item.el, '--card-rot-y', tiltY, 'deg');
        item.lastTiltX = tiltX;
        item.lastTiltY = tiltY;
      }
      
      item.lastBasePosKey = posKey;
      item.lastBaseRotKey = rotKey;
      item.lastX = x;
      item.lastY = y;
      item.lastZ = z + shiftZ;
      item.lastRot = rot;
    }
  }

  updateZIndex(item: ItemState, priority: 'base' | 'expanded'): void {
    const nextZIndex = priority === 'expanded' ? '1000' : '';

    if (item.lastZIndex === nextZIndex) {
      return;
    }

    item.el.style.zIndex = nextZIndex;
    item.lastZIndex = nextZIndex;
  }

  setCardScale(item: ItemState, scale: number, textScale: number): void {
    item.currentCardScale = scale;
    const rounded = Math.round(scale * 1000);
    const textRounded = Math.round(textScale * 1000);
    
    if (rounded !== item.lastCardScaleRounded || textRounded !== item.lastTextScaleRounded) {
      StyleAdapter.setNumericProperty(item.fxEl, '--card-scale', scale);
      StyleAdapter.setNumericProperty(item.fxEl, '--card-text-scale', textScale);
      StyleAdapter.setProperty(item.fxEl, '--card-rail-dot-display', scale < 0.72 ? 'none' : 'block');
      item.lastCardScaleRounded = rounded;
      item.lastTextScaleRounded = textRounded;
    }
  }

  setEntryGridAlpha(item: ItemState, alpha: number): void {
    if (item.entryGridEl) {
      StyleAdapter.setNumericProperty(item.entryGridEl, '--entry-grid-alpha', alpha);
    }
  }

  updateCardLayout(
    item: ItemState,
    expanded: boolean,
    layout: { compactWidth: string; compactHeight: string; expandedWidth: string; expandedHeight: string },
    fades?: { layoutFade: number; shellFade: number }
  ): void {
    const nextState = expanded ? 'expanded' : 'compact';
    const nextWidth = expanded ? layout.expandedWidth : layout.compactWidth;
    const nextHeight = expanded ? layout.expandedHeight : layout.compactHeight;

    if (item.lastLayoutState !== nextState || item.lastCardWidth !== nextWidth || item.lastCardHeight !== nextHeight) {
      StyleAdapter.setProperty(item.fxEl, '--card-width', nextWidth);
      StyleAdapter.setProperty(item.fxEl, '--card-height', nextHeight);
      item.lastLayoutState = nextState;
      item.lastCardWidth = nextWidth;
      item.lastCardHeight = nextHeight;
      scheduleCardTitleMarqueeSync(item.titleEl);
    }

    if (expanded && fades) {
      const { layoutFade, shellFade } = fades;
      if (layoutFade !== item.lastLayoutFade) {
        StyleAdapter.setNumericProperty(item.fxEl, '--card-expand-layout', layoutFade);
        item.lastLayoutFade = layoutFade;
      }
      if (shellFade !== item.lastShellFade) {
        StyleAdapter.setNumericProperty(item.fxEl, '--card-expand-shell', shellFade);
        item.lastShellFade = shellFade;
      }
    } else if (!expanded) {
      if (item.lastLayoutFade !== 0) {
        StyleAdapter.setNumericProperty(item.fxEl, '--card-expand-layout', 0);
        item.lastLayoutFade = 0;
      }
      if (item.lastShellFade !== 0) {
        StyleAdapter.setNumericProperty(item.fxEl, '--card-expand-shell', 0);
        item.lastShellFade = 0;
      }
    }
  }

  updateCardFx(
    item: ItemState,
    shiftZ: number,
    tiltX: number,
    tiltY: number,
    tiltZ: number
  ): void {
    const shiftZR = Math.round(shiftZ * 100);
    const tiltXR = Math.round(tiltX * 100);
    const tiltYR = Math.round(tiltY * 100);
    const tiltZR = Math.round(tiltZ * 100);
    
    // Integer key avoids string allocation on every frame
    const key = (shiftZR & 0xFFFF) * 0x1_0000_0000
      + (tiltXR & 0xFFFF) * 0x1_0000
      + (tiltYR & 0xFF)   * 0x100
      + (tiltZR & 0xFF);

    if (key !== item.lastFxKey) {
      const precision = IS_SAFARI ? 1 : 2;
      const cardScale = item.currentCardScale || 1;
      const flatTransform = IS_IOS && Math.abs(shiftZ) < 0.05 && Math.abs(tiltX) < 0.05 && Math.abs(tiltY) < 0.05;
      
      // We must include translate(-50%, -50%) because the card is absolutely positioned and centered
      item.fxEl.style.transform = flatTransform
        ? `translate(-50%, -50%) rotate(${tiltZ.toFixed(precision)}deg) scale(${cardScale.toFixed(precision + 1)})`
        : `translate3d(0, 0, ${shiftZ.toFixed(precision)}px) translate(-50%, -50%) rotateX(${tiltX.toFixed(precision)}deg) rotateY(${tiltY.toFixed(precision)}deg) rotateZ(${tiltZ.toFixed(precision)}deg) scale(${cardScale.toFixed(precision + 1)})`;
      item.lastFxKey = key;
    }
  }

  setTranslatedTransform(item: ItemState, tx: number, ty: number, tz: number): void {
    const txr = Math.round(tx * 100);
    const tyr = Math.round(ty * 100);
    const tzr = Math.round(tz * 100);
    const key = txr + tyr * 10000 + tzr * 100000000;

    if (item.lastBasePosKey !== key) {
      const precision = IS_SAFARI ? 1 : 2;
      item.el.style.transform = IS_IOS && Math.abs(tz) < 0.05
        ? `translate(${tx.toFixed(precision)}px, ${ty.toFixed(precision)}px)`
        : `translate3d(${tx.toFixed(precision)}px, ${ty.toFixed(precision)}px, ${tz.toFixed(precision)}px)`;
      item.lastBasePosKey = key;
    }
  }

  updateCardSpectrum(
    item: ItemState,
    spectrum: Float32Array | null,
    energy: number,
    alpha: number,
    sharedSpectrum: ArrayLike<number>
  ): void {
    const cardAlpha = alpha * (item.currentAlpha || 1.0);
    if (cardAlpha < 0.005) return;

    const targetPresence = (spectrum && energy > 0.001) ? 1 : 0;
    const currentPresence = item.lastMusicPresence ?? 0;
    
    // Simple lerp for smooth entry/exit
    const nextPresence = currentPresence + (targetPresence - currentPresence) * (targetPresence > currentPresence ? 0.12 : 0.08);
    item.lastMusicPresence = nextPresence;

    if (nextPresence < 0.01) {
      if (item.lastMusicAlpha !== 0) {
        StyleAdapter.setNumericProperty(item.fxEl, '--music-alpha', 0);
        item.lastMusicAlpha = 0;
      }
      item.lastSpectrumActive = false;
      return;
    }

    // Use energy for the overall spectrum visibility inside the card, modulated by presence
    const musicAlpha = Math.max(0.12, energy * 2.5) * nextPresence;
    const quantizedMusicAlpha = Math.round(musicAlpha * 50) / 50;

    const alphaDelta = Math.abs(quantizedMusicAlpha - (item.lastMusicAlpha ?? -1));
    const shouldUpdateAlpha = alphaDelta > 0.019;
    const shouldSyncSpectrum = targetPresence > 0 && (!item.lastSpectrumActive || this.syncSpectrumValues(item, sharedSpectrum));

    if (shouldUpdateAlpha) {
      StyleAdapter.setNumericProperty(item.fxEl, '--music-alpha', quantizedMusicAlpha);
      item.lastMusicAlpha = quantizedMusicAlpha;
    }

    if (shouldSyncSpectrum) {
      for (let i = 0; i < 16; i += 1) {
        StyleAdapter.setNumericProperty(item.fxEl, CARD_SPECTRUM_VARIABLES[i]!, item.lastSpectrumValues[i] ?? 0.01);
      }
      item.lastSpectrumActive = true;
    }
  }

  private syncSpectrumValues(item: ItemState, sharedSpectrum: ArrayLike<number>): boolean {
    let hasDelta = false;

    for (let i = 0; i < 16; i += 1) {
      const nextValue = sharedSpectrum[i] ?? 0.01;
      if (item.lastSpectrumValues[i] !== nextValue) {
        item.lastSpectrumValues[i] = nextValue;
        hasDelta = true;
      }
    }

    return hasDelta;
  }
}
