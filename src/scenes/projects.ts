import {
  AmbientLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshPhysicalMaterial,
  TorusKnotGeometry
} from 'three';
import { disposeObject } from '../engine/dispose';
import type { SceneModule } from '../engine/types';

export default function createProjectsScene(): SceneModule {
  let root: Group | null = null;
  let knotGeometry: TorusKnotGeometry | null = null;
  let knotMaterial: MeshPhysicalMaterial | null = null;
  let knot: Mesh | null = null;
  let hemi: HemisphereLight | null = null;
  let ambient: AmbientLight | null = null;

  return {
    budget: 'low',
    renderMode: 'continuous',

    async setup(ctx) {
      root = new Group();
      
      knotGeometry = new TorusKnotGeometry(0.78, 0.22, 40, 6);
      knotMaterial = new MeshPhysicalMaterial({
        color: 0xf8fbff,
        emissive: 0xff8c42,
        emissiveIntensity: 0.16,
        roughness: 0.22,
        metalness: 0.42,
        clearcoat: 1,
        clearcoatRoughness: 0.18,
        iridescence: 0.85,
        iridescenceIOR: 1.3
      });
      knot = new Mesh(knotGeometry, knotMaterial);

      hemi = new HemisphereLight(0xfff4d8, 0x081226, 1.25);
      ambient = new AmbientLight(0x9dc3ff, 0.4);

      root.add(knot, hemi, ambient);

      ctx.camera.position.set(0, 0, 3.4);
      ctx.camera.lookAt(0, 0, 0);
      ctx.scene.add(root);
    },

    update(ctx) {
      if (!knot) return;
      knot.rotation.x += ctx.delta * 0.22;
      knot.rotation.y = ctx.sectionScroll * Math.PI * 2;
      knot.rotation.z = Math.sin(ctx.elapsed * 0.6) * 0.3;
    },

    dispose(ctx) {
      if (root) {
        ctx.scene.remove(root);
        disposeObject(root);
      }
      
      knotGeometry?.dispose();
      knotMaterial?.dispose();

      root = null;
      knotGeometry = null;
      knotMaterial = null;
      knot = null;
      hemi = null;
      ambient = null;
    }
  };
}
