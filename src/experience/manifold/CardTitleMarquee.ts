const pendingSyncs = new Set<HTMLElement>();
let syncRafId = 0;

function ensureCardTitleTrack(titleEl: HTMLElement): HTMLSpanElement {
  const existingTrack = titleEl.querySelector<HTMLSpanElement>('.card-title-track');
  if (existingTrack) {
    return existingTrack;
  }

  const track = document.createElement('span');
  track.className = 'card-title-track';
  track.textContent = titleEl.textContent ?? '';
  titleEl.replaceChildren(track);
  return track;
}

export function setCardTitleText(titleEl: HTMLElement, nextText: string): void {
  const track = ensureCardTitleTrack(titleEl);
  if (track.textContent !== nextText) {
    track.textContent = nextText;
  }
}

/**
 * PHASE 2: Apply styles and classes based on pre-measured data.
 * This is the 'write' phase, decoupled from DOM reads to prevent layout thrashing.
 */
function applyMarqueeSync(titleEl: HTMLElement, availableWidth: number, scrollWidth: number): void {
  if (!titleEl.isConnected || availableWidth <= 0) {
    return;
  }

  const overflow = Math.ceil(scrollWidth - availableWidth);
  if (overflow <= 6) {
    titleEl.classList.remove('is-title-overflowing');
    titleEl.style.removeProperty('--card-title-marquee-shift');
    titleEl.style.removeProperty('--card-title-marquee-duration');
    return;
  }

  const durationSeconds = Math.min(14, Math.max(5.2, overflow / 42 + 3.1));
  titleEl.classList.add('is-title-overflowing');
  titleEl.style.setProperty('--card-title-marquee-shift', `${overflow}px`);
  titleEl.style.setProperty('--card-title-marquee-duration', `${durationSeconds.toFixed(2)}s`);
}

/**
 * BATCHED FLUSH:
 * Decouples DOM reads from DOM writes across all active marquees to prevent repeated reflows.
 */
function flushMarqueeSyncs(): void {
  syncRafId = 0;
  
  const measurements = new Map<HTMLElement, { available: number; scrollW: number }>();

  // Phase 1: All Reads (Batch)
  for (const el of pendingSyncs) {
    const track = el.querySelector<HTMLElement>('.card-title-track');
    measurements.set(el, {
      available: Math.round(el.clientWidth),
      scrollW: track?.scrollWidth ?? 0
    });
  }

  // Phase 2: All Writes (Batch)
  for (const [el, m] of measurements) {
    applyMarqueeSync(el, m.available, m.scrollW);
  }

  pendingSyncs.clear();
}

/**
 * PUBLIC API:
 * Schedules a marquee sync operation. Multiple calls within the same frame are batched.
 */
export function scheduleCardTitleMarqueeSync(titleEl: HTMLElement | null): void {
  if (!titleEl) return;

  pendingSyncs.add(titleEl);

  if (syncRafId) return;

  // We use dual rAF to ensure any late-frame layout changes from higher-level
  // components have settled before we measure for marquee alignment.
  syncRafId = window.requestAnimationFrame(() => {
    syncRafId = window.requestAnimationFrame(() => {
      flushMarqueeSyncs();
    });
  });
}
