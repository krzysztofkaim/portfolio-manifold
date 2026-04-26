import {
  AmbientLight,
  Color,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  MeshPhysicalMaterial,
  Object3D,
  PointLight,
  SphereGeometry
} from 'three';
import { disposeObject } from '../engine/dispose';
import type { SceneModule } from '../engine/types';

const basePositions = [
  [-1.8, 0.6, -0.5, 0.36],
  [-0.9, -0.7, 0.2, 0.28],
  [0, 0.2, -0.8, 0.48],
  [1.1, -0.4, 0.4, 0.32],
  [1.8, 0.7, -0.2, 0.22],
  [2.3, -0.9, 0.3, 0.18],
  [-2.4, -1, 0.4, 0.2]
] as const;

export default function createContactScene(): SceneModule {
  let root: Group | null = null;
  let sphereGeometry: SphereGeometry | null = null;
  let sphereMaterial: MeshPhysicalMaterial | null = null;
  let spheres: InstancedMesh | null = null;
  let ambient: AmbientLight | null = null;
  let point: PointLight | null = null;
  let sphereAnchor: Object3D | null = null;

  return {
    budget: 'low',
    renderMode: 'continuous',

    async setup(ctx) {
      root = new Group();
      sphereAnchor = new Object3D();
      const baseColor = new Color(0x9fe8ff);
      const highlightColor = new Color(0xe7fbff);

      sphereGeometry = new SphereGeometry(1, 24, 24);
      sphereMaterial = new MeshPhysicalMaterial({
        color: baseColor,
        transparent: true,
        opacity: 0.26,
        roughness: 0.1,
        metalness: 0.12,
        transmission: 0.35,
        thickness: 0.5,
        vertexColors: true
      });
      spheres = new InstancedMesh(sphereGeometry, sphereMaterial, basePositions.length);
      spheres.instanceMatrix.setUsage(DynamicDrawUsage);

      for (let index = 0; index < basePositions.length; index += 1) {
        const [x, y, z, radius] = basePositions[index];
        sphereAnchor.position.set(x, y, z);
        sphereAnchor.scale.setScalar(radius);
        sphereAnchor.updateMatrix();
        spheres.setMatrixAt(index, sphereAnchor.matrix);

        const intensity = basePositions.length <= 1 ? 0 : index / (basePositions.length - 1);
        const tint = baseColor.clone().lerp(highlightColor, intensity * 0.32);
        spheres.setColorAt(index, tint);
      }

      spheres.instanceMatrix.needsUpdate = true;
      if (spheres.instanceColor) {
        spheres.instanceColor.needsUpdate = true;
      }

      ambient = new AmbientLight(0xbedcff, 0.5);
      point = new PointLight(0x58e9ff, 1.2, 10);
      point.position.set(0, 2.2, 3.4);

      root.add(spheres, ambient, point);

      ctx.camera.position.set(0, 0, 5.4);
      ctx.camera.lookAt(0, 0, 0);
      ctx.scene.add(root);
    },

    update(ctx) {
      if (!root || !spheres || !sphereAnchor) return;

      for (let index = 0; index < basePositions.length; index += 1) {
        const [x, baseY, baseZ, radius] = basePositions[index];
        sphereAnchor.position.set(
          x,
          baseY + Math.sin(ctx.elapsed * 0.9 + index * 0.7) * 0.18,
          baseZ + Math.cos(ctx.elapsed * 0.7 + index) * 0.16
        );
        sphereAnchor.scale.setScalar(radius);
        sphereAnchor.updateMatrix();
        spheres.setMatrixAt(index, sphereAnchor.matrix);
      }

      spheres.instanceMatrix.needsUpdate = true;
      root.rotation.y = Math.sin(ctx.elapsed * 0.25) * 0.16;
    },

    dispose(ctx) {
      if (root) {
        ctx.scene.remove(root);
        disposeObject(root);
      }

      sphereGeometry?.dispose();
      sphereMaterial?.dispose();
      if (spheres) {
        spheres.instanceMatrix = null as any;
        spheres.instanceColor = null as any;
      }

      root = null;
      sphereGeometry = null;
      sphereMaterial = null;
      spheres = null;
      ambient = null;
      point = null;
      sphereAnchor = null;
    }
  };
}
