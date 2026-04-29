import type { ManifoldModeController } from '../experience/ManifoldModeController';

type ViewMode = '2d' | '3d' | '4d';

interface ManifoldModeSelectorLocaleStrings {
  currentModeAriaPrefix: string;
  menuAriaLabel: string;
  mode2D: string;
  mode3D: string;
  mode4D: string;
}

interface ModeToggleElements {
  button: HTMLButtonElement;
  label: HTMLElement;
  menu: HTMLElement;
  option2D: HTMLButtonElement;
  option3D: HTMLButtonElement;
  option4D: HTMLButtonElement;
  picker: HTMLElement;
}

interface ManifoldModeSelectorContext {
  getController(): ManifoldModeController | null;
  getActiveMode(): ViewMode;
  setActiveMode(mode: ViewMode): void;
  updateLoopMetrics(loopScrollLength: number): void;
}

export class ManifoldModeSelector {
  private elements: ModeToggleElements | null = null;
  private readonly supportsHoverMenuInteractions =
    window.matchMedia('(hover: hover)').matches && window.matchMedia('(pointer: fine)').matches;
  private localeStrings: ManifoldModeSelectorLocaleStrings = {
    currentModeAriaPrefix: 'Current manifold mode',
    menuAriaLabel: 'Mode selection',
    mode2D: '2D MODE',
    mode3D: '3D MODE',
    mode4D: '4D MODE'
  };

  constructor(private readonly context: ManifoldModeSelectorContext) {}

  setLocaleStrings(strings: ManifoldModeSelectorLocaleStrings): void {
    this.localeStrings = strings;
    if (!this.elements) {
      return;
    }

    this.elements.menu.setAttribute('aria-label', strings.menuAriaLabel);
    const option2DLabel = this.elements.option2D.querySelector('span:last-child');
    const option3DLabel = this.elements.option3D.querySelector('span:last-child');
    const option4DLabel = this.elements.option4D.querySelector('span:last-child');
    if (option2DLabel) option2DLabel.textContent = strings.mode2D;
    if (option3DLabel) option3DLabel.textContent = strings.mode3D;
    if (option4DLabel) option4DLabel.textContent = strings.mode4D;
    this.syncModeToggleState();
  }

  setup(elements: ModeToggleElements): () => void {
    this.elements = elements;

    const setModeMenuExpanded = (expanded: boolean) => {
      elements.picker.dataset.expanded = expanded ? 'true' : 'false';
      elements.button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      elements.menu.setAttribute('aria-hidden', expanded ? 'false' : 'true');

      const menuWithInert = elements.menu as HTMLElement & { inert?: boolean };
      if ('inert' in menuWithInert) {
        menuWithInert.inert = !expanded;
      } else if (expanded) {
        elements.menu.removeAttribute('inert');
      } else {
        elements.menu.setAttribute('inert', '');
      }
    };

    const setModeMenuHoverLocked = (locked: boolean) => {
      elements.picker.dataset.hoverLocked = locked ? 'true' : 'false';
    };

    const focusModeToggle = () => {
      elements.button.focus({ preventScroll: true });
    };

    const closeModeMenu = (restoreFocus: boolean, keepHoverLocked = false) => {
      setModeMenuHoverLocked(keepHoverLocked);

      if (restoreFocus) {
        focusModeToggle();
      }

      setModeMenuExpanded(false);
      this.resetModeMenuDockEffect();
    };

    const handleModeOptionClick = (event: MouseEvent, mode: ViewMode) => {
      event.preventDefault();
      event.stopPropagation();
      this.applyModeSelection(mode);
      closeModeMenu(true, this.supportsHoverMenuInteractions);
    };

    const handleModeToggleClick = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (!this.context.getController()?.isIntroComplete()) {
        return;
      }

      const isExpanded = elements.picker.dataset.expanded === 'true';
      if (isExpanded) {
        closeModeMenu(true, false);
        return;
      }

      setModeMenuHoverLocked(!this.supportsHoverMenuInteractions);
      setModeMenuExpanded(true);
    };

    const handleModePickerPointerEnter = () => {
      if (!this.context.getController()?.isIntroComplete()) {
        return;
      }

      if (elements.picker.dataset.hoverLocked === 'true') {
        return;
      }

      setModeMenuExpanded(true);
    };

    const handleModeTogglePointerEnter = () => {
      if (!this.context.getController()?.isIntroComplete()) {
        return;
      }

      if (elements.picker.dataset.hoverLocked !== 'true') {
        return;
      }

      setModeMenuHoverLocked(false);
      setModeMenuExpanded(true);
    };

    const handleModePickerPointerLeave = (event: PointerEvent) => {
      const relatedTarget = event.relatedTarget;

      if (relatedTarget instanceof Node && elements.picker.contains(relatedTarget)) {
        return;
      }

      closeModeMenu(document.activeElement instanceof HTMLElement && elements.picker.contains(document.activeElement));
    };

    const handleModePickerPointerMove = (event: PointerEvent) => {
      if (elements.picker.dataset.expanded !== 'true') {
        return;
      }

      this.updateModeMenuDockEffect(event.clientX);
    };

    const handleModePickerFocusIn = () => {
      if (!this.context.getController()?.isIntroComplete()) {
        return;
      }

      if (!this.supportsHoverMenuInteractions) {
        return;
      }

      if (elements.picker.dataset.hoverLocked === 'true') {
        return;
      }

      setModeMenuExpanded(true);
    };

    const handleModePickerFocusOut = () => {
      window.setTimeout(() => {
        const activeElement = document.activeElement;
        if (activeElement instanceof Node && elements.picker.contains(activeElement)) {
          return;
        }
        closeModeMenu(activeElement instanceof HTMLElement && elements.picker.contains(activeElement));
      }, 0);
    };

    const handleWindowPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!elements.picker.contains(target) && !elements.menu.contains(target)) {
        const restoreFocus = document.activeElement instanceof HTMLElement && elements.picker.contains(document.activeElement);
        closeModeMenu(restoreFocus);
      }
    };

    const handleModeOption2DClick = (event: MouseEvent) => handleModeOptionClick(event, '2d');
    const handleModeOption3DClick = (event: MouseEvent) => handleModeOptionClick(event, '3d');
    const handleModeOption4DClick = (event: MouseEvent) => handleModeOptionClick(event, '4d');

    elements.button.addEventListener('click', handleModeToggleClick);
    elements.option2D.addEventListener('click', handleModeOption2DClick);
    elements.option3D.addEventListener('click', handleModeOption3DClick);
    elements.option4D.addEventListener('click', handleModeOption4DClick);
    elements.picker.addEventListener('focusin', handleModePickerFocusIn);
    elements.picker.addEventListener('focusout', handleModePickerFocusOut);
    elements.menu.style.paddingBottom = '0.6rem';

    if (this.supportsHoverMenuInteractions) {
      elements.button.addEventListener('pointerenter', handleModeTogglePointerEnter);
      elements.picker.addEventListener('pointerenter', handleModePickerPointerEnter);
      elements.picker.addEventListener('pointerleave', handleModePickerPointerLeave);
      elements.picker.addEventListener('pointermove', handleModePickerPointerMove);
    }

    window.addEventListener('pointerdown', handleWindowPointerDown, { passive: true });
    this.syncModeToggleState();
    this.resetModeMenuDockEffect();
    setModeMenuHoverLocked(false);
    setModeMenuExpanded(false);

    return () => {
      elements.button.removeEventListener('click', handleModeToggleClick);
      elements.option2D.removeEventListener('click', handleModeOption2DClick);
      elements.option3D.removeEventListener('click', handleModeOption3DClick);
      elements.option4D.removeEventListener('click', handleModeOption4DClick);
      elements.picker.removeEventListener('focusin', handleModePickerFocusIn);
      elements.picker.removeEventListener('focusout', handleModePickerFocusOut);

      if (this.supportsHoverMenuInteractions) {
        elements.button.removeEventListener('pointerenter', handleModeTogglePointerEnter);
        elements.picker.removeEventListener('pointerenter', handleModePickerPointerEnter);
        elements.picker.removeEventListener('pointerleave', handleModePickerPointerLeave);
        elements.picker.removeEventListener('pointermove', handleModePickerPointerMove);
      }

      window.removeEventListener('pointerdown', handleWindowPointerDown);
      this.elements = null;
    };
  }

  getActiveMode(): ViewMode {
    return this.context.getActiveMode();
  }

  syncModeToggleState(): void {
    if (!this.elements) {
      return;
    }

    const activeMode = this.context.getController()?.getViewMode() ?? this.context.getActiveMode();
    this.context.setActiveMode(activeMode);
    const label =
      activeMode === '2d'
        ? this.localeStrings.mode2D
        : activeMode === '4d'
          ? this.localeStrings.mode4D
          : this.localeStrings.mode3D;
    this.elements.button.setAttribute('aria-label', `${this.localeStrings.currentModeAriaPrefix}: ${label.toLowerCase()}`);
    this.elements.button.dataset.manifoldMode = activeMode;
    this.elements.label.dataset.text = label;
    this.elements.label.textContent = label;
    this.elements.option2D.setAttribute('aria-pressed', activeMode === '2d' ? 'true' : 'false');
    this.elements.option3D.setAttribute('aria-pressed', activeMode === '3d' ? 'true' : 'false');
    this.elements.option4D.setAttribute('aria-pressed', activeMode === '4d' ? 'true' : 'false');
  }

  // Cache for menu option bounding rects to prevent layout thrashing
  private optionRectsCache: { left: number; width: number }[] | null = null;
  private lastUpdateFrame = 0;

  private cacheOptionRects(): void {
    if (!this.elements || this.optionRectsCache) return;
    const options = [this.elements.option2D, this.elements.option3D, this.elements.option4D];
    this.optionRectsCache = options.map(opt => {
      const rect = opt.getBoundingClientRect();
      return { left: rect.left, width: rect.width };
    });
  }

  private updateModeMenuDockEffect(clientX: number): void {
    if (!this.elements) {
      return;
    }

    // Ensure cache exists (created on first hover/open)
    this.cacheOptionRects();
    if (!this.optionRectsCache) return;

    const options = [this.elements.option2D, this.elements.option3D, this.elements.option4D];
    const rects = this.optionRectsCache;

    // Use requestAnimationFrame to throttle CSS writes to display sync
    if (this.lastUpdateFrame) {
      cancelAnimationFrame(this.lastUpdateFrame);
    }

    this.lastUpdateFrame = requestAnimationFrame(() => {
      // WRITE Phase - entirely decoupled from layout reads!
      for (let i = 0; i < options.length; i++) {
        const rect = rects[i];
        const centerX = rect.left + rect.width * 0.5;
        const distance = Math.abs(clientX - centerX);
        const normalized = Math.max(0, 1 - distance / 156);
        const scale = 1 + normalized * 0.095;
        const lift = normalized * 0.05;

        options[i].style.setProperty('--mode-dock-scale', scale.toFixed(3));
        options[i].style.setProperty('--mode-dock-lift', `${lift.toFixed(3)}rem`);
      }
      this.lastUpdateFrame = 0;
    });
  }

  private resetModeMenuDockEffect(): void {
    this.optionRectsCache = null;
    
    if (!this.elements) {
      return;
    }

    this.elements.option2D.style.removeProperty('--mode-dock-scale');
    this.elements.option3D.style.removeProperty('--mode-dock-scale');
    this.elements.option4D.style.removeProperty('--mode-dock-scale');
    this.elements.option2D.style.removeProperty('--mode-dock-lift');
    this.elements.option3D.style.removeProperty('--mode-dock-lift');
    this.elements.option4D.style.removeProperty('--mode-dock-lift');
  }

  private applyModeSelection(nextMode: ViewMode): void {
    const controller = this.context.getController();
    if (!controller?.isIntroComplete()) {
      return;
    }

    controller.setViewMode(nextMode);
    this.context.setActiveMode(nextMode);
    this.context.updateLoopMetrics(controller.getLoopScrollLength());
    this.syncModeToggleState();

    if (!this.elements) {
      return;
    }

    this.elements.picker.dataset.hoverLocked = 'true';
  }
}
