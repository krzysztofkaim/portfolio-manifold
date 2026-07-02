import {
  AdditiveBlending,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  DirectionalLight,
  Group,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshPhysicalMaterial,
  Points,
  ShaderMaterial,
  Vector2,
  WireframeGeometry
} from 'three';
import { disposeObject } from '../engine/dispose';
import { smoothstep } from '../utils/math';
import type { SceneModule } from '../engine/types';

export default function createHeroScene(): SceneModule {
  let root: Group | null = null;
  let particleGeometry: BufferGeometry | null = null;
  let particleMaterial: ShaderMaterial | null = null;
  let shellGeometry: IcosahedronGeometry | null = null;
  let shellMaterial: MeshPhysicalMaterial | null = null;
  let wireframeGeometry: WireframeGeometry | null = null;
  let wireframeMaterial: LineBasicMaterial | null = null;
  let shell: Mesh | null = null;
  let wireframe: LineSegments | null = null;
  let ambient: AmbientLight | null = null;
  let directional: DirectionalLight | null = null;

  const uniforms = {
    uMouse: { value: new Vector2() },
    uOpacity: { value: 1 },
    uTime: { value: 0 }
  };

  const cameraTarget = { x: 0, y: 0 };

  return {
    budget: 'high',
    renderMode: 'continuous',

    async setup(ctx) {
      const particleCount = 4200;
      const positions = new Float32Array(particleCount * 3);
      const scales = new Float32Array(particleCount);
      const phases = new Float32Array(particleCount);

      for (let index = 0; index < particleCount; index += 1) {
        const stride = index * 3;
        const radius = 2.2 + Math.random() * 5.4;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[stride] = radius * Math.sin(phi) * Math.cos(theta);
        positions[stride + 1] = radius * Math.cos(phi);
        positions[stride + 2] = radius * Math.sin(phi) * Math.sin(theta);
        scales[index] = 5 + Math.random() * 10;
        phases[index] = Math.random();
      }

      particleGeometry = new BufferGeometry();
      particleGeometry.setAttribute('position', new BufferAttribute(positions, 3));
      particleGeometry.setAttribute('aScale', new BufferAttribute(scales, 1));
      particleGeometry.setAttribute('aPhase', new BufferAttribute(phases, 1));

      particleMaterial = new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms,
        vertexShader: `
          uniform float uTime;
          uniform vec2 uMouse;
          uniform float uOpacity;

          attribute float aScale;
          attribute float aPhase;

          varying float vAlpha;
          varying vec3 vColor;

          void main() {
            vec3 transformed = position;
            float orbit = (uTime * 0.18) + (aPhase * 6.2831853);
            transformed.x += sin(orbit + position.y * 0.4) * 0.32;
            transformed.y += cos(orbit * 1.2 + position.z * 0.35) * 0.28;
            transformed.z += sin(orbit * 0.7 + position.x * 0.42) * 0.34;

            vec2 mouseField = uMouse * 4.2;
            vec2 delta = transformed.xy - mouseField;
            float distanceToMouse = max(length(delta), 0.001);
            float influence = smoothstep(3.6, 0.0, distanceToMouse);
            transformed.xy += normalize(delta) * influence * 1.2;

            vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            gl_PointSize = (aScale + sin(uTime * 1.3 + aPhase * 11.0) * 1.5) * (220.0 / -mvPosition.z);

            float gradient = clamp((position.y + 6.0) / 12.0, 0.0, 1.0);
            vColor = mix(vec3(0.0, 0.40, 1.0), vec3(0.0, 1.0, 0.8), gradient);
            vAlpha = uOpacity * mix(0.38, 1.0, gradient);
          }
        `,
        fragmentShader: `
          varying float vAlpha;
          varying vec3 vColor;

          void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            float falloff = smoothstep(0.5, 0.0, length(coord));
            gl_FragColor = vec4(vColor, falloff * vAlpha);
          }
        `
      });

      root = new Group();
      const particleCloud = new Points(particleGeometry, particleMaterial);
      shellGeometry = new IcosahedronGeometry(2.15, 2);
      shellMaterial = new MeshPhysicalMaterial({
        color: 0x0f5eff,
        emissive: 0x00d8c8,
        emissiveIntensity: 0.35,
        metalness: 0.7,
        roughness: 0.18,
        transparent: true,
        opacity: 0.28,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
        transmission: 0.06
      });
      shell = new Mesh(shellGeometry, shellMaterial);
      
      wireframeGeometry = new WireframeGeometry(shellGeometry);
      wireframeMaterial = new LineBasicMaterial({
        color: 0x8efdf1,
        transparent: true,
        opacity: 0.4
      });
      wireframe = new LineSegments(wireframeGeometry, wireframeMaterial);

      ambient = new AmbientLight(0x80caff, 0.55);
      directional = new DirectionalLight(0x9ef3ff, 1.45);

      directional.position.set(3.5, 4.2, 5.8);
      shell.position.z = -1.2;
      wireframe.position.copy(shell.position);
      root.add(particleCloud, shell, wireframe, ambient, directional);

      ctx.camera.position.set(0, 0, 12);
      ctx.camera.lookAt(0, 0, 0);
      ctx.scene.add(root);
    },

    update(ctx) {
      if (!root || !shell || !wireframe || !shellMaterial || !particleMaterial) return;

      const fade = 1 - smoothstep(0.04, 0.86, ctx.sectionScroll);

      uniforms.uTime.value = ctx.elapsed;
      uniforms.uOpacity.value = fade;
      uniforms.uMouse.value.set(ctx.mouse.x, ctx.mouse.y);

      root.rotation.y = ctx.elapsed * 0.08;
      root.rotation.x = Math.sin(ctx.elapsed * 0.14) * 0.08;
      shell.rotation.y = ctx.elapsed * 0.24;
      shell.rotation.x = ctx.elapsed * 0.19;
      wireframe.rotation.copy(shell.rotation);

      cameraTarget.x += (ctx.mouse.x * 1.8 - cameraTarget.x) * 0.04;
      cameraTarget.y += (ctx.mouse.y * 1.2 - cameraTarget.y) * 0.04;
      ctx.camera.position.x = cameraTarget.x;
      ctx.camera.position.y = cameraTarget.y;
      ctx.camera.lookAt(0, 0, 0);

      particleMaterial.opacity = fade;
      shellMaterial.opacity = 0.12 + fade * 0.22;
    },

    dispose(ctx) {
      if (root) {
        ctx.scene.remove(root);
        disposeObject(root);
      }
      
      particleGeometry?.dispose();
      particleMaterial?.dispose();
      shellGeometry?.dispose();
      shellMaterial?.dispose();
      wireframeGeometry?.dispose();
      wireframeMaterial?.dispose();

      root = null;
      particleGeometry = null;
      particleMaterial = null;
      shellGeometry = null;
      shellMaterial = null;
      wireframeGeometry = null;
      wireframeMaterial = null;
      shell = null;
      wireframe = null;
      ambient = null;
      directional = null;
    }
  };
}
