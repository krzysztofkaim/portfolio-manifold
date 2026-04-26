import { DebugOverlay, type DebugOverlayMetric, type DebugOverlaySource } from '../../debug/DebugOverlay';
import type { ManifoldModeController } from '../../experience/ManifoldModeController';
import type { ManifoldLocale } from '../../i18n/manifoldLocale';

export interface DiagnosticsElements {
  button: HTMLButtonElement;
  popover: HTMLElement;
  root: HTMLElement;
  perfMode: HTMLElement;
}

export interface LoopTelemetry {
  backgroundMs: number;
  controllerMs: number;
  controllerFourDMs: number;
  controllerHudCommitMs: number;
  controllerInteractionMs: number;
  controllerItemsMs: number;
  controllerParticlesMs: number;
  controllerPreludeMs: number;
  controllerSectionFrameMs: number;
  controllerSpectrumCards: number;
  controllerTransitionActive: boolean;
  controllerVisibleCards: number;
  controllerVisibleItems: number;
  controllerVisibleTexts: number;
  frameMs: number;
  lenisMs: number;
  logicalScroll: number;
  rebaseCount: number;
  rebaseDelta: number;
  rebaseMs: number;
  uiMs: number;
}

export class ManifoldAppDiagnostics {
  private debugOverlay: DebugOverlay | null = null;
  private diagnosticsOpen = false;

  public isDiagnosticsOpen(): boolean {
    return this.diagnosticsOpen;
  }
  private loopTelemetryPanel: HTMLElement | null = null;
  private lastLoopTelemetryRenderAt = 0;
  private teardown: (() => void) | null = null;

  constructor(
    private readonly elements: DiagnosticsElements,
    private readonly telemetry: LoopTelemetry,
    private readonly getController: () => ManifoldModeController | null,
    private readonly getLocale: () => ManifoldLocale,
    private readonly debugEnabled: boolean
  ) {}

  setup(): void {
    if (!this.elements.button || !this.elements.root) {
      console.warn("Diagnostics elements missing, skipping setup.");
      return;
    }
    if (!this.debugEnabled) {
      this.elements.root.hidden = true;
      this.elements.button.hidden = true;
      return;
    }

    const toggle = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      this.setDiagnosticsOpen(!this.diagnosticsOpen);
    };

    const handleGlobalKeydown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'd' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        this.setDiagnosticsOpen(!this.diagnosticsOpen);
      }
    };

    const handleOutsideClick = (event: MouseEvent) => {
      if (!this.diagnosticsOpen) return;
      const target = event.target as HTMLElement;
      if (!this.elements.root.contains(target)) {
        this.setDiagnosticsOpen(false);
      }
    };

    this.elements.button.addEventListener('click', toggle);
    window.addEventListener('keydown', handleGlobalKeydown);
    window.addEventListener('click', handleOutsideClick);

    this.teardown = () => {
      this.setDiagnosticsOpen(false);
      this.elements.button.removeEventListener('click', toggle);
      window.removeEventListener('keydown', handleGlobalKeydown);
      window.removeEventListener('click', handleOutsideClick);
      this.loopTelemetryPanel?.remove();
    };
  }

  setDiagnosticsOpen(nextOpen: boolean): void {
    this.diagnosticsOpen = nextOpen;
    this.lastLoopTelemetryRenderAt = 0;

    this.elements.root.dataset.open = nextOpen ? 'true' : 'false';
    this.elements.button.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
    this.elements.popover.setAttribute('aria-hidden', nextOpen ? 'false' : 'true');

    if (nextOpen) {
      this.debugOverlay?.destroy();
      this.debugOverlay = new DebugOverlay(this.createDebugSource(), {
        enableRecording: this.debugEnabled,
        locale: this.getLocale()
      });
      this.renderLoopTelemetry(performance.now());
      return;
    }

    this.debugOverlay?.destroy();
    this.debugOverlay = null;
  }

  update(now: number): void {
    if (this.diagnosticsOpen) {
      this.renderLoopTelemetry(now);
    }
  }

  destroy(): void {
    this.teardown?.();
    this.teardown = null;
  }

  private renderLoopTelemetry(now: number): void {
    if (!this.diagnosticsOpen || now - this.lastLoopTelemetryRenderAt < 160) {
      return;
    }

    const panel = this.ensureLoopTelemetryPanel();
    const t = this.telemetry;
    panel.textContent =
      `loop r:${t.rebaseMs.toFixed(2)} le:${t.lenisMs.toFixed(2)} ` +
      `bg:${t.backgroundMs.toFixed(2)} cr:${t.controllerMs.toFixed(2)}\n` +
      `ui:${t.uiMs.toFixed(2)} f:${t.frameMs.toFixed(2)} ` +
      `hits:${t.rebaseCount} d:${t.rebaseDelta.toFixed(0)} ls:${t.logicalScroll.toFixed(0)}\n` +
      `ctrl p:${t.controllerPreludeMs.toFixed(2)} pa:${t.controllerParticlesMs.toFixed(2)} ` +
      `4d:${t.controllerFourDMs.toFixed(2)} it:${t.controllerItemsMs.toFixed(2)}\n` +
      `2d:${t.controllerSectionFrameMs.toFixed(2)} ix:${t.controllerInteractionMs.toFixed(2)} ` +
      `hd:${t.controllerHudCommitMs.toFixed(2)} vis:${t.controllerVisibleItems}/${t.controllerVisibleCards}/${t.controllerVisibleTexts} ` +
      `sp:${t.controllerSpectrumCards} tr:${t.controllerTransitionActive ? 1 : 0}`;
    this.lastLoopTelemetryRenderAt = now;
  }

  private ensureLoopTelemetryPanel(): HTMLElement {
    if (this.loopTelemetryPanel?.isConnected) {
      return this.loopTelemetryPanel;
    }

    const panel = document.createElement('div');
    panel.className = 'hud-diag-popover-panel';
    panel.setAttribute('aria-hidden', 'true');
    this.elements.popover.append(panel);
    this.loopTelemetryPanel = panel;
    return panel;
  }

  private createDebugSource(): DebugOverlaySource {
    return {
      getDebugSnapshot: () => {
        const controller = this.getController();
        const ms = this.telemetry.frameMs > 0 ? this.telemetry.frameMs : 16.7;

        return {
          activeScenes: controller ? 1 : 0,
          backend: 'gpu' in navigator ? 'WebGPU' : 'WebGL2',
          dpr: window.devicePixelRatio || 1,
          drawCalls: 0,
          fps: ms > 0 ? 1000 / ms : 60,
          ms,
          triangles: 0,
          visibleScenes: controller && !document.hidden ? 1 : 0
        };
      },
      getExtraDebugRows: () => {
        const locale = this.getLocale();
        const t = this.telemetry;
        
        const getLabel = (key: string) => {
          if (locale !== 'pl') {
            return {
              logical: 'Logical',
              loopCtrl: 'Loop ctrl',
              loopFourD: 'Loop 4D',
              loopFrame: 'Loop frame',
              loopItems: 'Loop cards',
              loopUi: 'Loop UI',
              mode: 'Mode',
              rebase: 'Rebase'
            }[key] || key;
          }
          return {
            logical: 'Logika',
            loopCtrl: 'Pętla ctrl',
            loopFourD: 'Pętla 4D',
            loopFrame: 'Klatka pętli',
            loopItems: 'Pętla kart',
            loopUi: 'Pętla UI',
            mode: 'Tryb',
            rebase: 'Rebase'
          }[key] || key;
        };

        const metrics: DebugOverlayMetric[] = [
          { label: getLabel('loopFrame'), value: `${t.frameMs.toFixed(2)} ms` },
          { label: getLabel('loopCtrl'), value: `${t.controllerMs.toFixed(2)} ms` },
          { label: getLabel('loopItems'), value: `${t.controllerItemsMs.toFixed(2)} ms` },
          { label: getLabel('loopFourD'), value: `${t.controllerFourDMs.toFixed(2)} ms` },
          { label: getLabel('loopUi'), value: `${t.uiMs.toFixed(2)} ms` },
          { label: getLabel('rebase'), value: `${t.rebaseCount} / ${t.rebaseMs.toFixed(2)} ms` },
          { label: getLabel('logical'), value: t.logicalScroll.toFixed(0) }
        ];

        const perfLabel = this.elements.perfMode.textContent?.trim();
        if (perfLabel) {
          metrics.push({ label: getLabel('mode'), value: perfLabel });
        }

        return metrics;
      }
    };
  }
}
