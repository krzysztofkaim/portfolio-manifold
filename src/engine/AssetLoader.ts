import { BufferGeometry, Mesh, Object3D } from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
  acceleratedRaycast,
  computeBoundsTree,
  disposeBoundsTree
} from 'three-mesh-bvh';
import { AssetCache } from './AssetCache';
import { disposeObject } from './dispose';

type RendererSupport = {
  capabilities?: unknown;
};

type GeometryWithBounds = BufferGeometry & {
  boundsTree?: unknown;
  computeBoundsTree?: typeof computeBoundsTree;
  disposeBoundsTree?: typeof disposeBoundsTree;
};

Mesh.prototype.raycast = acceleratedRaycast;

const geometryPrototype = BufferGeometry.prototype as GeometryWithBounds;
geometryPrototype.computeBoundsTree = computeBoundsTree;
geometryPrototype.disposeBoundsTree = disposeBoundsTree;

export class AssetLoader {
  private static instanceRef: AssetLoader | null = null;

  static getInstance(): AssetLoader {
    if (!AssetLoader.instanceRef) {
      AssetLoader.instanceRef = new AssetLoader();
    }

    return AssetLoader.instanceRef;
  }

  private readonly loader = new GLTFLoader();
  private readonly ktx2Loader = new KTX2Loader().setTranscoderPath('/basis/');
  private readonly cache = new AssetCache<GLTF>(6);

  private constructor() {
    this.loader.setMeshoptDecoder(MeshoptDecoder);
    this.loader.setKTX2Loader(this.ktx2Loader);
  }

  configure(renderer: RendererSupport): void {
    if ('capabilities' in renderer && renderer.capabilities) {
      this.ktx2Loader.detectSupport(renderer as never);
    }
  }

  async load(url: string): Promise<GLTF> {
    const cached = this.cache.get(url);

    if (cached) {
      return this.cloneGltf(cached);
    }

    const gltf = await this.loader.loadAsync(url);
    this.prepareScene(gltf.scene);
    this.cache.set(url, gltf, (asset) => disposeObject(asset.scene));
    return this.cloneGltf(gltf);
  }

  dispose(url: string): void {
    this.cache.delete(url);
  }

  clear(): void {
    this.cache.clear();
    this.ktx2Loader.dispose();
  }

  private cloneGltf(source: GLTF): GLTF {
    const scene = clone(source.scene) as GLTF['scene'];
    const scenes = source.scenes.map((item: GLTF['scene']) => clone(item) as GLTF['scene']);

    return {
      ...source,
      scene,
      scenes
    };
  }

  private prepareScene(root: Object3D): void {
    root.traverse((child: Object3D) => {
      const mesh = child as Mesh;

      if (!('isMesh' in mesh) || !mesh.isMesh) {
        return;
      }

      const geometry = mesh.geometry as GeometryWithBounds;
      geometry.computeBoundsTree?.();
      mesh.frustumCulled = true;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
    });
  }
}
