import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  Group,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  Points,
  PointsMaterial,
  WireframeGeometry
} from 'three';
import { disposeObject } from '../engine/dispose';
import { lerp } from '../utils/math';
import type { SceneModule } from '../engine/types';

export default function createSkillsScene(): SceneModule {
  let root: Group | null = null;
  let coreGeometry: IcosahedronGeometry | null = null;
  let coreMaterial: MeshStandardMaterial | null = null;
  let wireframeGeometry: IcosahedronGeometry | null = null;
  let wireframeMaterial: LineBasicMaterial | null = null;
  let wireframeLines: WireframeGeometry | null = null;
  let wireframe: LineSegments | null = null;
  let orbitGeometry: BufferGeometry | null = null;
  let orbitMaterial: PointsMaterial | null = null;
  let orbit: Points | null = null;
  let ambient: AmbientLight | null = null;
  let directional: DirectionalLight | null = null;
  let point: PointLight | null = null;

  let currentScale = 1;

  return {
    budget: 'medium',
    renderMode: 'continuous',

    async setup(ctx) {
      const orbitCount = 200;
      const orbitPositions = new Float32Array(orbitCount * 3);
      for (let index = 0; index < orbitCount; index += 1) {
        const stride = index * 3;
        const angle = (index / orbitCount) * Math.PI * 2;
        const radius = 1.65 + Math.sin(index * 0.37) * 0.12;
        orbitPositions[stride] = Math.cos(angle) * radius;
        orbitPositions[stride + 1] = Math.sin(index * 0.52) * 0.18;
        orbitPositions[stride + 2] = Math.sin(angle) * radius;
      }

      root = new Group();
      
      coreGeometry = new IcosahedronGeometry(1, 1);
      coreMaterial = new MeshStandardMaterial({
        color: new Color('#3eb7ff'),
        emissive: new Color('#14f1ca'),
        emissiveIntensity: 0.25,
        metalness: 0.8,
        roughness: 0.2
      });
      const core = new Mesh(coreGeometry, coreMaterial);

      wireframeGeometry = new IcosahedronGeometry(1.18, 0);
      wireframeLines = new WireframeGeometry(wireframeGeometry);
      wireframeMaterial = new LineBasicMaterial({
        color: 0xbffaf0,
        transparent: true,
        opacity: 0.4
      });
      wireframe = new LineSegments(wireframeLines, wireframeMaterial);

      orbitGeometry = new BufferGeometry();
      orbitGeometry.setAttribute('position', new BufferAttribute(orbitPositions, 3));
      orbitMaterial = new PointsMaterial({
        color: 0xc7fff1,
        size: 0.05,
        transparent: true,
        opacity: 0.75
      });
      orbit = new Points(orbitGeometry, orbitMaterial);

      ambient = new AmbientLight(0x95d5ff, 0.55);
      directional = new DirectionalLight(0xe4fbff, 1.2);
      point = new PointLight(0x11d9ff, 1.4, 9);

      directional.position.set(2.5, 3, 4);
      point.position.set(-2.4, 1.4, 2.2);
      root.add(core, wireframe, orbit, ambient, directional, point);

      ctx.camera.position.set(0, 0, 4.5);
      ctx.camera.lookAt(0, 0, 0);
      ctx.scene.add(root);
    },

    update(ctx) {
      if (!root || !orbit || !point) return;

      const targetScale = ctx.pointer.inside ? 1.15 : 1;
      currentScale = lerp(currentScale, targetScale, 0.08);
      root.scale.setScalar(currentScale);
      root.rotation.y += ctx.delta * 0.3;
      root.rotation.x += ctx.delta * 0.1;
      orbit.rotation.y -= ctx.delta * 0.5;
      orbit.rotation.x += ctx.delta * 0.18;
      point.position.x = Math.sin(ctx.elapsed * 0.9) * 2.2;
      point.position.z = Math.cos(ctx.elapsed * 0.9) * 2.2;
    },

    dispose(ctx) {
      if (root) {
        ctx.scene.remove(root);
        disposeObject(root);
      }

      coreGeometry?.dispose();
      coreMaterial?.dispose();
      wireframeGeometry?.dispose();
      wireframeLines?.dispose();
      wireframeMaterial?.dispose();
      orbitGeometry?.dispose();
      orbitMaterial?.dispose();

      root = null;
      coreGeometry = null;
      coreMaterial = null;
      wireframeGeometry = null;
      wireframeLines = null;
      wireframeMaterial = null;
      wireframe = null;
      orbitGeometry = null;
      orbitMaterial = null;
      orbit = null;
      ambient = null;
      directional = null;
      point = null;
    }
  };
}
