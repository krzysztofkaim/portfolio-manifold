import type { DebugSnapshot } from '../engine/SceneManager';
import { EVENT_RECORD_PROFILE, type RecordProfileDetail } from '../config/manifold/ManifoldEvents';

export interface DebugOverlayMetric {
  label: string;
  value: string;
}

export interface DebugOverlaySource {
  getDebugSnapshot(): DebugSnapshot;
  getExtraDebugRows?(): readonly DebugOverlayMetric[];
}

export interface DebugOverlayOptions {
  enableRecording?: boolean;
  locale?: 'en' | 'pl';
}

const DEBUG_STYLES = `
  :host {
    --debug-bg: rgba(4, 10, 24, 0.84);
    --debug-fg: #dff7ff;
    --debug-border: rgba(148, 163, 184, 0.28);
    --debug-accent: #ff003c;
    --debug-accent-recording: #ff8a00;
    --debug-shadow: 0 20px 40px rgba(2, 8, 23, 0.35);
    --debug-font: 500 12px/1.5 "SF Mono", "Roboto Mono", monospace;

    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 30;
  }

  .debug-overlay {
    min-width: 220px;
    padding: 12px 14px;
    border: 1px solid var(--debug-border);
    border-radius: 16px;
    background: var(--debug-bg);
    backdrop-filter: blur(12px);
    color: var(--debug-fg);
    font: var(--debug-font);
    box-shadow: var(--debug-shadow);
  }

  .debug-overlay__title {
    display: block;
    margin-bottom: 6px;
  }

  .debug-overlay__row {
    display: block;
  }

  .debug-overlay__label {
    opacity: 0.8;
  }

  .debug-overlay__record-btn {
    margin-top: 10px;
    margin-bottom: 10px;
    width: 100%;
    padding: 8px;
    background: var(--debug-accent);
    color: #fff;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
    text-align: center;
    display: block;
    transition: background 0.2s ease;
  }

  .debug-overlay__record-btn--recording {
    background: var(--debug-accent-recording);
  }
`;

export class DebugOverlay {
  private readonly strings: {
    active: string;
    backend: string;
    drawCalls: string;
    dpr: string;
    fps: string;
    heap: string;
    ms: string;
    record: string;
    recording: string;
    renderDebug: string;
    scenes: string;
    triangles: string;
    visible: string;
  };
  
  private readonly host = document.createElement('div');
  private readonly shadow = this.host.attachShadow({ mode: 'open' });
  private readonly container = document.createElement('div');
  
  private readonly backendValue;
  private readonly fpsValue;
  private readonly scenesValue;
  private readonly drawCallsValue;
  private readonly trianglesValue;
  private readonly dprValue;
  private readonly heapValue;
  private readonly extraRows = new Map<string, { row: HTMLDivElement; value: HTMLSpanElement }>();
  private intervalId = 0;

  constructor(
    private readonly source: DebugOverlaySource,
    private readonly options: DebugOverlayOptions = {}
  ) {
    const locale = options.locale ?? (document.documentElement.lang.startsWith('pl') ? 'pl' : 'en');
    this.strings =
      locale === 'pl'
        ? {
            active: 'aktywne',
            backend: 'Backend',
            drawCalls: 'Wywołania draw',
            dpr: 'DPR',
            fps: 'FPS',
            heap: 'Pamięć',
            ms: 'ms',
            record: 'NAGRAJ PROFIL 5s',
            recording: 'NAGRYWANIE... (SCROLLUJ TERAZ!)',
            renderDebug: 'Debug renderu',
            scenes: 'Sceny',
            triangles: 'Trójkąty',
            visible: 'widoczne'
          }
        : {
            active: 'active',
            backend: 'Backend',
            drawCalls: 'Draw calls',
            dpr: 'DPR',
            fps: 'FPS',
            heap: 'Heap',
            ms: 'ms',
            record: 'RECORD 5s PROFILE',
            recording: 'RECORDING... (SCROLL NOW!)',
            renderDebug: 'Render Debug',
            scenes: 'Scenes',
            triangles: 'Triangles',
            visible: 'visible'
          };

    this.backendValue = this.createValueRow(this.strings.backend);
    this.fpsValue = this.createValueRow(this.strings.fps);
    this.scenesValue = this.createValueRow(this.strings.scenes);
    this.drawCallsValue = this.createValueRow(this.strings.drawCalls);
    this.trianglesValue = this.createValueRow(this.strings.triangles);
    this.dprValue = this.createValueRow(this.strings.dpr);
    this.heapValue = this.createValueRow(this.strings.heap);

    const style = document.createElement('style');
    style.textContent = DEBUG_STYLES;
    
    this.container.className = 'debug-overlay';
    this.container.setAttribute('aria-live', 'polite');
    
    this.shadow.append(style, this.container);
    
    const children: HTMLElement[] = [this.createTitle()];
    if (this.options.enableRecording) {
      const recordBtn = document.createElement('button');
      recordBtn.className = 'debug-overlay__record-btn';
      recordBtn.textContent = this.strings.record;
      recordBtn.onclick = () => {
        recordBtn.textContent = this.strings.recording;
        recordBtn.classList.add('debug-overlay__record-btn--recording');
        
        // Dispatch type-safe custom event
        window.dispatchEvent(
          new CustomEvent(EVENT_RECORD_PROFILE, {
            detail: { durationMs: 5000 } as RecordProfileDetail
          })
        );
        
        setTimeout(() => {
          recordBtn.textContent = this.strings.record;
          recordBtn.classList.remove('debug-overlay__record-btn--recording');
        }, 5500);
      };
      children.push(recordBtn);
    }

    children.push(
      this.backendValue.row,
      this.fpsValue.row,
      this.scenesValue.row,
      this.drawCallsValue.row,
      this.trianglesValue.row,
      this.dprValue.row,
      this.heapValue.row
    );

    this.container.append(...children);
    document.body.append(this.host);
    
    this.render();
    this.intervalId = window.setInterval(() => this.render(), 500);
  }

  destroy(): void {
    window.clearInterval(this.intervalId);
    this.host.remove();
    this.extraRows.clear();
  }

  private render(): void {
    const stats = this.source.getDebugSnapshot();
    const memory = 'memory' in performance
      ? `${Math.round((performance as Performance & { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize / 1048576)} MB`
      : 'n/a';

    this.backendValue.value.textContent = stats.backend;
    this.fpsValue.value.textContent = `${stats.fps.toFixed(1)} / ${stats.ms.toFixed(1)} ${this.strings.ms}`;
    this.scenesValue.value.textContent = `${stats.activeScenes} ${this.strings.active} / ${stats.visibleScenes} ${this.strings.visible}`;
    this.drawCallsValue.value.textContent = String(stats.drawCalls);
    this.trianglesValue.value.textContent = String(stats.triangles);
    this.dprValue.value.textContent = stats.dpr.toFixed(2);
    this.heapValue.value.textContent = memory;
    this.syncExtraRows(this.source.getExtraDebugRows?.() ?? []);
  }

  private createTitle(): HTMLElement {
    const title = document.createElement('strong');
    title.className = 'debug-overlay__title';
    title.textContent = this.strings.renderDebug;
    return title;
  }

  private createValueRow(label: string): { row: HTMLDivElement; value: HTMLSpanElement } {
    const row = document.createElement('div');
    row.className = 'debug-overlay__row';
    
    const prefix = document.createElement('span');
    prefix.className = 'debug-overlay__label';
    prefix.textContent = `${label}: `;
    
    const value = document.createElement('span');
    value.className = 'debug-overlay__value';
    
    row.append(prefix, value);
    return { row, value };
  }

  private syncExtraRows(rows: readonly DebugOverlayMetric[]): void {
    const activeLabels = new Set<string>();

    for (const metric of rows) {
      activeLabels.add(metric.label);
      let row = this.extraRows.get(metric.label);
      if (!row) {
        row = this.createValueRow(metric.label);
        this.extraRows.set(metric.label, row);
        this.container.append(row.row);
      }
      row.value.textContent = metric.value;
    }

    for (const [label, row] of this.extraRows) {
      if (activeLabels.has(label)) {
        continue;
      }
      row.row.remove();
      this.extraRows.delete(label);
    }
  }
}
