declare module 'three' {
  export type ColorRepresentation = number | string;

  export type Vector3Like = {
    copy(source: Vector3Like): void;
    set(x: number, y: number, z: number): void;
    x: number;
    y: number;
    z: number;
  };

  export type EulerLike = {
    copy(source: EulerLike): void;
    x: number;
    y: number;
    z: number;
  };

  export class Object3D {
    position: Vector3Like;
    rotation: EulerLike;
    scale: { setScalar(value: number): void };
    matrix: unknown;
    matrixAutoUpdate: boolean;
    frustumCulled: boolean;
    add(...objects: Object3D[]): void;
    remove(...objects: Object3D[]): void;
    traverse(callback: (object: Object3D) => void): void;
    updateMatrix(): void;
  }

  export class Scene extends Object3D {}
  export class Group extends Object3D {}
  export class Camera extends Object3D {
    lookAt(x: number, y: number, z: number): void;
  }
  export class PerspectiveCamera extends Camera {
    aspect: number;
    constructor(fov?: number, aspect?: number, near?: number, far?: number);
    updateProjectionMatrix(): void;
  }

  export class Clock {
    elapsedTime: number;
    stop(): void;
    start(): void;
    getDelta(): number;
    getElapsedTime(): number;
  }

  export class Color {
    constructor(value?: ColorRepresentation);
    clone(): Color;
    lerp(color: Color, alpha: number): Color;
  }

  export class BufferGeometry {
    setAttribute(name: string, attribute: BufferAttribute): void;
    dispose(): void;
    boundsTree?: unknown;
    computeBoundsTree?: () => void;
    disposeBoundsTree?: () => void;
  }

  export class BufferAttribute {
    constructor(array: ArrayLike<number>, itemSize: number);
  }

  export class Material {
    dispose(): void;
  }

  export class Texture {
    dispose(): void;
  }

  export class Mesh<TGeometry = BufferGeometry, TMaterial = Material | Material[]> extends Object3D {
    static prototype: Mesh;
    geometry: TGeometry;
    material: TMaterial;
    isMesh?: boolean;
    raycast?: unknown;
    constructor(geometry?: TGeometry, material?: TMaterial);
  }

  export class InstancedMesh<TGeometry = BufferGeometry, TMaterial = Material | Material[]> extends Mesh<TGeometry, TMaterial> {
    instanceMatrix: { needsUpdate: boolean; setUsage(usage: unknown): void };
    instanceColor: { needsUpdate: boolean } | null;
    constructor(geometry?: TGeometry, material?: TMaterial, count?: number);
    setMatrixAt(index: number, matrix: unknown): void;
    setColorAt(index: number, color: Color): void;
  }

  export class Points<TGeometry = BufferGeometry, TMaterial = Material> extends Object3D {
    constructor(geometry?: TGeometry, material?: TMaterial);
  }

  export class LineSegments<TGeometry = BufferGeometry, TMaterial = Material> extends Object3D {
    constructor(geometry?: TGeometry, material?: TMaterial);
  }

  export class AmbientLight extends Object3D {
    constructor(color?: ColorRepresentation, intensity?: number);
  }
  export class DirectionalLight extends Object3D {
    constructor(color?: ColorRepresentation, intensity?: number);
  }
  export class PointLight extends Object3D {
    constructor(color?: ColorRepresentation, intensity?: number, distance?: number);
  }
  export class HemisphereLight extends Object3D {
    constructor(skyColor?: ColorRepresentation, groundColor?: ColorRepresentation, intensity?: number);
  }

  export class MeshPhysicalMaterial extends Material {
    opacity: number;
    constructor(parameters?: Record<string, unknown>);
  }
  export class MeshStandardMaterial extends Material {
    opacity: number;
    constructor(parameters?: Record<string, unknown>);
  }
  export class PointsMaterial extends Material {
    opacity: number;
    constructor(parameters?: Record<string, unknown>);
  }
  export class ShaderMaterial extends Material {
    opacity: number;
    constructor(parameters?: Record<string, unknown>);
  }
  export class LineBasicMaterial extends Material {
    opacity: number;
    constructor(parameters?: Record<string, unknown>);
  }

  export class Vector2 {
    x: number;
    y: number;
    constructor(x?: number, y?: number);
    set(x: number, y: number): void;
  }

  export class IcosahedronGeometry extends BufferGeometry {
    constructor(radius?: number, detail?: number);
  }
  export class SphereGeometry extends BufferGeometry {
    constructor(radius?: number, widthSegments?: number, heightSegments?: number);
  }
  export class TorusKnotGeometry extends BufferGeometry {
    constructor(radius?: number, tube?: number, tubularSegments?: number, radialSegments?: number);
  }
  export class WireframeGeometry extends BufferGeometry {
    constructor(geometry?: BufferGeometry);
  }

  export class WebGLRenderer {
    autoClear: boolean;
    domElement: HTMLCanvasElement;
    info: {
      autoReset?: boolean;
      reset?: () => void;
      render?: {
        calls?: number;
        triangles?: number;
      };
    };
    outputColorSpace: string;
    toneMapping: number;
    capabilities?: unknown;
    constructor(parameters?: Record<string, unknown>);
    setPixelRatio(value: number): void;
    setSize(width: number, height: number, updateStyle?: boolean): void;
    setScissorTest(enabled: boolean): void;
    setClearColor(color: ColorRepresentation, alpha?: number): void;
    clear(color?: boolean, depth?: boolean, stencil?: boolean): void;
    setViewport(x: number, y: number, width: number, height: number): void;
    setScissor(x: number, y: number, width: number, height: number): void;
    render(scene: Scene, camera: Camera): void;
    dispose(): void;
  }

  export const AdditiveBlending: number;
  export const ACESFilmicToneMapping: number;
  export const DynamicDrawUsage: number;
  export const SRGBColorSpace: string;
}

declare module 'three/webgpu' {
  export class WebGPURenderer {
    autoClear: boolean;
    domElement: HTMLCanvasElement;
    info: {
      autoReset?: boolean;
      reset?: () => void;
      render?: {
        calls?: number;
        triangles?: number;
      };
    };
    outputColorSpace: string;
    toneMapping: number;
    capabilities?: unknown;
    constructor(parameters?: Record<string, unknown>);
    init?(): Promise<void>;
    setPixelRatio(value: number): void;
    setSize(width: number, height: number, updateStyle?: boolean): void;
    setScissorTest(enabled: boolean): void;
    setClearColor(color: number | string, alpha?: number): void;
    clear(color?: boolean, depth?: boolean, stencil?: boolean): void;
    setViewport(x: number, y: number, width: number, height: number): void;
    setScissor(x: number, y: number, width: number, height: number): void;
    render(scene: import('three').Scene, camera: import('three').Camera): void;
    dispose(): void;
  }

  export default WebGPURenderer;
}

declare module 'three/examples/jsm/loaders/GLTFLoader.js' {
  import type { Object3D } from 'three';

  export interface GLTF {
    scene: Object3D;
    scenes: Object3D[];
  }

  export class GLTFLoader {
    setMeshoptDecoder(decoder: unknown): this;
    setKTX2Loader(loader: unknown): this;
    loadAsync(url: string): Promise<GLTF>;
  }
}

declare module 'three/examples/jsm/loaders/KTX2Loader.js' {
  export class KTX2Loader {
    setTranscoderPath(path: string): this;
    detectSupport(renderer: unknown): this;
    dispose(): void;
  }
}

declare module 'three/examples/jsm/libs/meshopt_decoder.module.js' {
  export const MeshoptDecoder: unknown;
}

declare module 'three/examples/jsm/utils/SkeletonUtils.js' {
  export function clone<T>(source: T): T;
}
