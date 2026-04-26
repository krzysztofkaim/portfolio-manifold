import { Material, Object3D, Texture } from 'three';

type DisposableGeometry = {
  dispose: () => void;
  boundsTree?: unknown;
  disposeBoundsTree?: () => void;
};

type RenderPrimitive = Object3D & {
  geometry?: DisposableGeometry;
  material?: Material | Material[];
};

export function disposeObject(object: Object3D): void {
  object.traverse((child: Object3D) => {
    const primitive = child as RenderPrimitive;
    const geometry = primitive.geometry;

    if (geometry) {
      if (geometry.boundsTree && typeof geometry.disposeBoundsTree === 'function') {
        geometry.disposeBoundsTree();
      }

      geometry.dispose();
    }

    const materials = primitive.material
      ? Array.isArray(primitive.material)
        ? primitive.material
        : [primitive.material]
      : [];

    for (const material of materials) {
      for (const value of Object.values(material as unknown as Record<string, unknown>)) {
        if (value instanceof Texture) {
          value.dispose();
        }
      }

      material.dispose();
    }
  });
}
