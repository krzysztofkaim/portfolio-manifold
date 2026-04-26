import { ManifoldModeController } from '../../src/experience/ManifoldModeController';
import type { ControllerElements } from '../../src/experience/manifold/ManifoldTypes';
import type { IDomAdapter, IRuntimeAdapter } from '../../src/ui/ports';

export class MockDomAdapter implements IDomAdapter {
  addBodyClass(...tokens: string[]): void {
    document.body.classList.add(...tokens);
  }

  bodyHasClass(token: string): boolean {
    return document.body.classList.contains(token);
  }

  createResizeObserver(callback: ResizeObserverCallback): ResizeObserver {
    return new ResizeObserver(callback);
  }

  disconnectResizeObserver(observer: ResizeObserver): void {
    observer.disconnect();
  }

  observeResize(observer: ResizeObserver, element: Element): void {
    observer.observe(element);
  }

  querySelector<T extends Element>(selector: string): T | null {
    return document.querySelector<T>(selector);
  }

  querySelectorAll<T extends Element>(selector: string): NodeListOf<T> {
    return document.querySelectorAll<T>(selector);
  }

  removeBodyClass(...tokens: string[]): void {
    document.body.classList.remove(...tokens);
  }

  removeRootClass(...tokens: string[]): void {
    document.documentElement.classList.remove(...tokens);
  }

  toggleBodyClass(token: string, force?: boolean): void {
    document.body.classList.toggle(token, force);
  }

  toggleRootClass(token: string, force?: boolean): void {
    document.documentElement.classList.toggle(token, force);
  }
}

export class MockRuntimeAdapter implements IRuntimeAdapter {
  private nowValue = 1000;
  private readonly listeners = new Map<string, EventListener[]>();

  addWindowEventListener<K extends keyof WindowEventMap>(
    type: K,
    listener: (this: Window, event: WindowEventMap[K]) => void
  ): void {
    const existing = this.listeners.get(type) ?? [];
    existing.push(listener as EventListener);
    this.listeners.set(type, existing);
  }

  getViewportSize(): { height: number; width: number } {
    return { width: 1280, height: 720 };
  }

  now(): number {
    return this.nowValue;
  }

  removeWindowEventListener<K extends keyof WindowEventMap>(
    type: K,
    listener: (this: Window, event: WindowEventMap[K]) => void
  ): void {
    const existing = this.listeners.get(type) ?? [];
    this.listeners.set(type, existing.filter((candidate) => candidate !== listener));
  }

  advanceNow(delta = 16): void {
    this.nowValue += delta;
  }
}

function createHintElement(idPrefix: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = `
    <div id="${idPrefix}-copy">
      <span class="intro-hint-kicker">Kicker</span>
      <strong>Title</strong>
    </div>
    <svg>
      <path id="${idPrefix}-path"></path>
      <circle id="${idPrefix}-dot"></circle>
    </svg>
  `;

  return root;
}

export function createControllerElements(): ControllerElements {
  const viewport = document.createElement('div');
  const world = document.createElement('div');
  const ambientParticleLayer = document.createElement('canvas');
  const cardChromeLayer = document.createElement('canvas');
  const fourDWireframe = document.createElement('canvas');
  const exitButton = document.createElement('button');
  const introHint = createHintElement('intro-hint');
  const contextHint = createHintElement('context-hint');
  const topbar = document.createElement('div');
  topbar.className = 'topbar';
  document.body.append(topbar);
  viewport.append(world);
  document.body.append(viewport, introHint, contextHint);

  return {
    advanceButtons: {
      next: document.createElement('button'),
      prev: document.createElement('button')
    },
    ambientParticleLayer,
    cardChromeLayer,
    contextHint,
    exitButton,
    fourDWireframe,
    hud: {
      root: document.createElement('div'),
      card: document.createElement('div'),
      coord: document.createElement('div'),
      fps: document.createElement('div'),
      perfMode: document.createElement('div'),
      perfModeSidebar: document.createElement('div'),
      section: document.createElement('div'),
      velocity: document.createElement('div')
    },
    introHint,
    twoDSectionFrame: {
      label: document.createElement('div'),
      root: document.createElement('div')
    },
    viewport,
    world
  };
}

export function createController(): {
  controller: ManifoldModeController;
  dom: MockDomAdapter;
  elements: ControllerElements;
  runtime: MockRuntimeAdapter;
} {
  document.body.innerHTML = '';
  document.documentElement.className = '';
  const elements = createControllerElements();
  const dom = new MockDomAdapter();
  const runtime = new MockRuntimeAdapter();
  const controller = new ManifoldModeController(elements, dom, runtime);

  return { controller, dom, elements, runtime };
}
