import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AssetLoader } from '../../../src/engine/AssetLoader';
import { Mesh, Object3D } from 'three';

// Mock Three.js loaders and utilities
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    setMeshoptDecoder = vi.fn();
    setKTX2Loader = vi.fn();
    loadAsync = vi.fn().mockResolvedValue({
      scene: new Object3D(),
      scenes: [],
      animations: [],
      cameras: [],
      asset: {}
    });
  }
}));

vi.mock('three/examples/jsm/loaders/KTX2Loader.js', () => ({
  KTX2Loader: class {
    setTranscoderPath = vi.fn().mockReturnThis();
    detectSupport = vi.fn();
    dispose = vi.fn();
  }
}));

vi.mock('three/examples/jsm/utils/SkeletonUtils.js', () => ({
  clone: vi.fn().mockImplementation((obj) => obj) // Simple mock clone
}));

vi.mock('three-mesh-bvh', () => ({
  acceleratedRaycast: vi.fn(),
  computeBoundsTree: vi.fn(),
  disposeBoundsTree: vi.fn()
}));

describe('AssetLoader', () => {
  let loader: AssetLoader;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton instance manually for isolation
    (AssetLoader as any).instanceRef = null;
    loader = AssetLoader.getInstance();
  });

  it('implements singleton pattern', () => {
    const anotherLoader = AssetLoader.getInstance();
    expect(loader).toBe(anotherLoader);
  });

  it('configures KTX2 support if renderer has capabilities', () => {
    const mockRenderer = { capabilities: {} };
    loader.configure(mockRenderer);
    
    // Accessing private ktx2Loader via any
    expect((loader as any).ktx2Loader.detectSupport).toHaveBeenCalledWith(mockRenderer);
  });

  it('skips KTX2 configuration if renderer lacks capabilities', () => {
    const mockRenderer = {};
    loader.configure(mockRenderer);
    expect((loader as any).ktx2Loader.detectSupport).not.toHaveBeenCalled();
  });

  it('loads and caches assets', async () => {
    const url = 'test.gltf';
    const firstLoad = await loader.load(url);
    expect(firstLoad).toBeDefined();

    // Second load should use cache
    const secondLoad = await loader.load(url);
    expect(secondLoad).toBeDefined();
    
    // Verify loadAsync was only called once
    expect((loader as any).loader.loadAsync).toHaveBeenCalledTimes(1);
  });

  it('prepares scene correctly (BVH, Matrices)', async () => {
    const mockMesh = new Mesh();
    mockMesh.isMesh = true;
    (mockMesh as any).geometry = {
      computeBoundsTree: vi.fn()
    };
    
    // Inject mesh into a root object
    const root = new Object3D();
    root.add(mockMesh);
    
    // We can test prepareScene directly via any
    (loader as any).prepareScene(root);
    
    expect((mockMesh.geometry as any).computeBoundsTree).toHaveBeenCalled();
    expect(mockMesh.frustumCulled).toBe(true);
    expect(mockMesh.matrixAutoUpdate).toBe(false);
  });

  it('disposes and clears assets', () => {
    loader.dispose('some-url');
    loader.clear();
    expect((loader as any).ktx2Loader.dispose).toHaveBeenCalled();
  });
});
