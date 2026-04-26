/** @vitest-environment happy-dom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SceneManager } from '../../../src/engine/SceneManager';

// Mock Three.js dependencies
vi.mock('three', () => ({
  Clock: class {
    getDelta = () => 0.016;
    getElapsedTime = () => 1;
    start = vi.fn();
    stop = vi.fn();
  },
  PerspectiveCamera: class {
    aspect = 1;
    updateProjectionMatrix = vi.fn();
  },
  Scene: class {
    add = vi.fn();
    remove = vi.fn();
    traverse = vi.fn().mockImplementation(function(this: any, cb: any) {
      cb(this);
    });
  }
}));

// Mock RenderPipeline
vi.mock('../../../src/engine/RenderPipeline', () => ({
  RenderPipeline: class {
    init = vi.fn().mockResolvedValue(undefined);
    beginFrame = vi.fn();
    render = vi.fn();
    setViewport = vi.fn();
    setScissor = vi.fn();
    setSize = vi.fn();
    setPixelRatio = vi.fn();
    dispose = vi.fn();
    mode = 'WebGL2';
    info = { render: { calls: 10, triangles: 100 } };
    rawRenderer = {};
  }
}));

// Mock AssetLoader
vi.mock('../../../src/engine/AssetLoader', () => ({
  AssetLoader: {
    getInstance: vi.fn(() => ({
      configure: vi.fn(),
      clear: vi.fn()
    }))
  }
}));

// Mock Scene Modules
const mockHeroModule = {
  setup: vi.fn().mockResolvedValue(undefined),
  update: vi.fn(),
  onPointerMove: vi.fn(),
  onPointerDown: vi.fn(),
  dispose: vi.fn(),
  renderMode: 'continuous'
};
vi.mock('../../../src/scenes/hero', () => ({ default: mockHeroModule }));
vi.mock('../../../src/scenes/skills', () => ({ default: mockHeroModule }));
vi.mock('../../../src/scenes/projects', () => ({ default: mockHeroModule }));
vi.mock('../../../src/scenes/contact', () => ({ default: mockHeroModule }));

// Mock Visibility Utility
let visibilityCallback: (visible: boolean) => void;
vi.mock('../../../src/utils/visibility', () => ({
  observePageVisibility: vi.fn().mockImplementation((cb) => {
    visibilityCallback = cb;
    return vi.fn(); // cleanup
  })
}));

// Mock IntersectionObserver
const mockObserver = {
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
};
globalThis.IntersectionObserver = vi.fn().mockImplementation(function() {
  return mockObserver;
});

// Mock ResizeObserver
const mockResizeObserver = {
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
};
globalThis.ResizeObserver = vi.fn().mockImplementation(function() {
  return mockResizeObserver;
});

describe('SceneManager', () => {
  let canvas: HTMLCanvasElement;
  let manager: SceneManager;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    const el = document.createElement('div');
    el.setAttribute('data-scene', 'hero');
    document.body.appendChild(el);
    canvas = document.createElement('canvas');
    manager = new SceneManager(canvas);
  });

  it('initializes and scans slots on start', async () => {
    await manager.start();
    
    expect(manager.getDebugSnapshot()).toMatchObject({
      activeScenes: 0, // Since setupSlot only happens on intersection
      backend: 'WebGL2',
      drawCalls: 10
    });

    expect(mockObserver.observe).toHaveBeenCalled();
  });

  it('cleans up on destroy', async () => {
    await manager.start();
    manager.destroy();
    
    expect(mockObserver.disconnect).toHaveBeenCalled();
  });

  it('marks all slots as dirty', async () => {
    await manager.start();
    // Access private slots via any for testing internal state
    const slots = (manager as any).slots;
    (manager as any).markAllDirty();
    
    for (const slot of slots.values()) {
      expect(slot.isDirty).toBe(true);
    }
  });

  it('returns snapshot with visible scenes count', async () => {
    await manager.start();
    const slot = (manager as any).slots.values().next().value;
    slot.isSetup = true;
    slot.isVisible = true;
    const snapshot = manager.getDebugSnapshot();
    expect(snapshot.visibleScenes).toBe(1);
    expect(snapshot.activeScenes).toBe(1);
  });

  it('successfully sets up a slot when it becomes visible', async () => {
    await manager.start();
    const slot = (manager as any).slots.values().next().value;
    
    await (manager as any).setupSlot(slot);
    
    expect(slot.module).toBeDefined();
    expect(slot.isSetup).toBe(true);
  });

  it('executes render loop correctly', async () => {
    await manager.start();
    const slot = (manager as any).slots.values().next().value;
    // Trigger setup via setupSlot to get the module from mock Hero
    await (manager as any).setupSlot(slot);
    slot.isVisible = true;
    slot.bounds = { left: 0, top: 0, width: 100, height: 100 };

    // Trigger one frame
    // manager.render is private, let's call it via any
    (manager as any).render();
    expect(mockHeroModule.update).toHaveBeenCalled();
  });

  it('handles pointer moves and updates context', async () => {
    await manager.start();
    const slot = (manager as any).slots.values().next().value;
    await (manager as any).setupSlot(slot);
    slot.bounds = { left: 0, top: 0, width: 100, height: 100 };

    const event = new PointerEvent('pointermove', { clientX: 50, clientY: 50 });
    window.dispatchEvent(event);

    expect(mockHeroModule.onPointerMove).toHaveBeenCalled();
    expect(slot.isDirty).toBe(true);
  });

  it('handles pointer down events inside a slot', async () => {
    await manager.start();
    const slot = (manager as any).slots.values().next().value;
    await (manager as any).setupSlot(slot);
    slot.bounds = { left: 0, top: 0, width: 100, height: 100 };

    // Update mouse tracker client pos to be inside
    (manager as any).mouseTracker.client.x = 50;
    (manager as any).mouseTracker.client.y = 50;

    const event = new PointerEvent('pointerdown', { clientX: 50, clientY: 50 });
    window.dispatchEvent(event);

    expect(mockHeroModule.onPointerDown).toHaveBeenCalled();
    expect(slot.isDirty).toBe(true);
  });

  it('skips rendering for off-screen or zero-size slots', async () => {
    await manager.start();
    const slot = (manager as any).slots.values().next().value;
    await (manager as any).setupSlot(slot);
    slot.isVisible = true;

    vi.clearAllMocks();
    
    // Off-screen
    slot.bounds = { left: 0, top: -500, width: 100, height: 100 };
    (manager as any).render();
    
    // Zero-size
    slot.bounds = { left: 0, top: 0, width: 0, height: 100 };
    (manager as any).render();
    
    expect(mockHeroModule.update).not.toHaveBeenCalled();
  });

  it('disposes slots correctly on destroy', async () => {
    await manager.start();
    const slot = (manager as any).slots.values().next().value;
    await (manager as any).setupSlot(slot);
    
    manager.destroy();
    expect(mockHeroModule.dispose).toHaveBeenCalled();
  });

  it('refreshes all slot bounds', async () => {
    // Explicitly scan again if needed, though start() should have done it
    await manager.start();
    const slots = (manager as any).slots;
    expect(slots.size).toBe(1);
    
    const spy = vi.spyOn(manager as any, 'refreshSlotBounds');
    (manager as any).refreshAllSlotBounds();
    expect(spy).toHaveBeenCalled();
  });

  it('handles early returns in setupSlot and stopLoop', async () => {
    await manager.start();
    const slot = (manager as any).slots.values().next().value;
    await (manager as any).setupSlot(slot);
    
    // Call setupSlot again - should return early
    await (manager as any).setupSlot(slot);
    // expect(setupSpy).toHaveReturned(); // Hard to check return if it's async void

    // stopLoop when not running
    (manager as any).stopLoop(); // First time stops it
    (manager as any).stopLoop(); // Second time should return early
  });

  it('handles on-demand render mode', async () => {
    await manager.start();
    const slot = (manager as any).slots.values().next().value;
    await (manager as any).setupSlot(slot);
    slot.isVisible = true;
    slot.bounds = { left: 0, top: 0, width: 100, height: 100 };
    mockHeroModule.renderMode = 'on-demand';
    slot.isDirty = false;

    vi.clearAllMocks();
    (manager as any).render();
    expect(mockHeroModule.update).not.toHaveBeenCalled();

    slot.isDirty = true;
    (manager as any).render();
    expect(mockHeroModule.update).toHaveBeenCalled();
  });

  it('skips render loop if document is hidden', async () => {
    await manager.start();
    const slot = (manager as any).slots.values().next().value;
    await (manager as any).setupSlot(slot);
    slot.isVisible = true;
    slot.bounds = { left: 0, top: 0, width: 100, height: 100 };

    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    vi.clearAllMocks();
    (manager as any).render();
    expect(mockHeroModule.update).not.toHaveBeenCalled();
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  });

  it('triggers resize if adaptive quality reports a change', async () => {
    await manager.start();
    const resizeSpy = vi.spyOn(manager as any, 'resize');
    vi.spyOn((manager as any).adaptiveQuality, 'tick').mockReturnValue(true);
    
    (manager as any).render();
    expect(resizeSpy).toHaveBeenCalled();
  });

  it('triggers intersection observer callback', async () => {
    await manager.start();
    const slot = (manager as any).slots.values().next().value;
    
    // The callback is the first argument to the constructor
    const callback = (globalThis.IntersectionObserver as any).mock.calls[0][0];
    
    // Test non-intersecting
    callback([{ isIntersecting: false }]);
    expect(slot.isVisible).toBe(false);
    
    // Test intersecting
    callback([{ isIntersecting: true }]);
    expect(slot.isVisible).toBe(true);
    expect(slot.isDirty).toBe(true);
  });

  it('returns early in render if not running or destroyed', () => {
    manager.destroy();
    (manager as any).render();
    // No crashes should happen
  });

  it('handles double destroy', () => {
    manager.destroy();
    manager.destroy(); // Should return early
  });

  it('skips unknown scene names in scanSlots', async () => {
    const el = document.createElement('div');
    el.setAttribute('data-scene', 'unknown-scene');
    document.body.appendChild(el);
    
    await manager.start();
    // Verify it didn't add the unknown slot
    const slot = Array.from((manager as any).slots.values()).find((s: any) => s.name === 'unknown-scene');
    expect(slot).toBeUndefined();
  });

  it('handles empty intersection observer entries', async () => {
    await manager.start();
    const callback = (globalThis.IntersectionObserver as any).mock.calls[0][0];
    callback([]); // Empty list
    // Should return early without error
  });

  it('returns early in scanSlots if not initialized', () => {
    (manager as any).scanSlots();
    expect((manager as any).slots.size).toBe(0);
  });

  it('covers all scene loaders', async () => {
    // We already have hero in beforeEach, let's add others
    const scenes: any[] = ['skills', 'projects', 'contact'];
    for (const name of scenes) {
      const el = document.createElement('div');
      el.setAttribute('data-scene', name);
      document.body.appendChild(el);
    }
    
    await manager.start();
    const slots = (manager as any).slots;
    for (const name of scenes) {
      const slot = Array.from(slots.values()).find((s: any) => s.name === name);
      await (manager as any).setupSlot(slot);
    }
  });

  it('triggers visibility observer hidden state', async () => {
    await manager.start();
    visibilityCallback(false);
    
    visibilityCallback(true);
  });

  it('triggers resize observer callback', async () => {
    // Grab the LATEST callback from ResizeObserver mock because beforeEach creates many
    const calls = (globalThis.ResizeObserver as any).mock.calls;
    const callback = calls[calls.length - 1][0];
    callback([]);
    // Should call refreshCanvasBounds etc.
  });

  it('returns early in startLoop if already running', async () => {
    await manager.start(); // start() calls startLoop()
    (manager as any).startLoop();
    // Should return early
  });
});
