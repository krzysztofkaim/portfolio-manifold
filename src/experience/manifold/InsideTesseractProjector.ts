import { clamp, smoothstep as smoothStep } from '../../utils/math';
import { computeCardProjectionMatrix, parseMatrix3d } from './HyperMath';
import type {
  FourDSceneState,
  HyperVertex,
  ProjectedHyperVertex,
  TesseractEdgeProjection,
  TesseractFaceProjection,
  TesseractProjectionInput
} from './ManifoldTypes';
import { 
  TESSERACT_VERTICES, 
  TESSERACT_EDGES, 
  TESSERACT_FACES,
  rotateTesseractVertex 
} from './TesseractProjector';

const INSIDE_TESSERACT = {
  faceCardExtent: 220,
  insideTravelXAmplitude: 0.06,
  insideTravelYAmplitude: 0.04,
  insideTravelZAmplitude: 0.14,
  insideTravelWAmplitude: 0.36,
  outsideCameraW: -1.08,
  outsideCameraZ: -1.82,
  portalDepthBias: 0.62,
  portalScale: 0.88,
  scaleFactor: 0.54,
  surfaceCameraW: -0.12,
  surfaceCameraZ: -0.4,
  wLensFloor: 0.5,
  wLensOrigin: 2.5,
  xwSpinScalar: 1.92,
  xyScrollScalar: 0.04,
  yzSpinScalar: 0.18,
  zwSpinScalar: 0.12
} as const;

const INSIDE_TESSERACT_VERTICES = TESSERACT_VERTICES;
const INSIDE_TESSERACT_EDGES = TESSERACT_EDGES;
const INSIDE_TESSERACT_FACES = TESSERACT_FACES;

export class InsideTesseractProjector {
  private static lastSceneKey = 0;
  private static lastScene: FourDSceneState | null = null;

  static computeScene(input: TesseractProjectionInput): FourDSceneState {
    const cycle = normalizeCycle(input.turns);
    const approachBlend = smoothStep(0.16, 0.4, cycle);
    const insideTravel = clamp((cycle - 0.4) / 0.38, 0, 1);
    const exitBlend = smoothStep(0.82, 1, cycle);
    const insideBlend = clamp(approachBlend - exitBlend, 0, 1);
    const turnPhase = input.turns * Math.PI;
    const xwAngle = turnPhase * INSIDE_TESSERACT.xwSpinScalar;
    const yzAngle = turnPhase * INSIDE_TESSERACT.yzSpinScalar;
    const zwAngle = turnPhase * INSIDE_TESSERACT.zwSpinScalar;
    const xyAngle = turnPhase * INSIDE_TESSERACT.xyScrollScalar;
    const sceneKey =
      (((Math.round(xwAngle * 580) & 0x3FFF) << 18) |
       ((Math.round(yzAngle * 580) & 0x3FFF) << 4) |
       ((Math.round((zwAngle + insideBlend * 4 + insideTravel * 4) * 96) & 0xF)));

    if (sceneKey === InsideTesseractProjector.lastSceneKey && InsideTesseractProjector.lastScene) {
      return InsideTesseractProjector.lastScene;
    }

    InsideTesseractProjector.lastSceneKey = sceneKey;

    const centerX = input.viewportSize.width * 0.5;
    const centerY = input.viewportSize.height * 0.5;
    const scale = Math.min(input.viewportSize.width, input.viewportSize.height) *
      lerp(INSIDE_TESSERACT.scaleFactor, INSIDE_TESSERACT.scaleFactor * 1.08, insideBlend * 0.6);
    const camera = {
      x: Math.sin(insideTravel * Math.PI * 2) * INSIDE_TESSERACT.insideTravelXAmplitude * insideBlend,
      y: Math.sin(insideTravel * Math.PI) * INSIDE_TESSERACT.insideTravelYAmplitude * insideBlend,
      z:
        lerp(INSIDE_TESSERACT.outsideCameraZ, INSIDE_TESSERACT.surfaceCameraZ, approachBlend) +
        Math.sin(insideTravel * Math.PI * 2) * INSIDE_TESSERACT.insideTravelZAmplitude * insideBlend,
      w:
        lerp(INSIDE_TESSERACT.outsideCameraW, INSIDE_TESSERACT.surfaceCameraW, approachBlend) +
        (-0.12 + Math.sin(insideTravel * Math.PI) * INSIDE_TESSERACT.insideTravelWAmplitude) * insideBlend
    };

    const projectedVertices = INSIDE_TESSERACT_VERTICES.map((vertex) =>
      projectInsideVertex(
        rotateTesseractVertex(vertex, xwAngle, yzAngle, zwAngle, xyAngle),
        camera,
        centerX,
        centerY,
        scale,
        input.velocity || 0,
        input.time
      )
    );
    const rawFaceStates: TesseractFaceProjection[] = INSIDE_TESSERACT_FACES.map((face) => {
      const pointA = projectedVertices[face.verts[0]]!;
      const pointB = projectedVertices[face.verts[1]]!;
      const pointC = projectedVertices[face.verts[2]]!;
      const pointD = projectedVertices[face.verts[3]]!;

      const centerFaceX = (pointA.x + pointB.x + pointC.x + pointD.x) * 0.25;
      const centerFaceY = (pointA.y + pointB.y + pointC.y + pointD.y) * 0.25;
      const avgDepth = (pointA.portalDepth + pointB.portalDepth + pointC.portalDepth + pointD.portalDepth) * 0.25;
      const avgFacing = (pointA.facing + pointB.facing + pointC.facing + pointD.facing) * 0.25;
      const avgW = (pointA.w4 + pointB.w4 + pointC.w4 + pointD.w4) * 0.25;
      const diagonal = Math.hypot(pointC.x - pointA.x, pointC.y - pointA.y);
      const cross =
        (pointB.x - pointA.x) * (pointD.y - pointA.y) -
        (pointB.y - pointA.y) * (pointD.x - pointA.x);
      const matrix =
        Math.abs(cross) > 0.01 && diagonal >= 18
          ? computeCardProjectionMatrix(
              INSIDE_TESSERACT.faceCardExtent,
              INSIDE_TESSERACT.faceCardExtent,
              [pointA.x, pointA.y],
              [pointB.x, pointB.y],
              [pointC.x, pointC.y],
              [pointD.x, pointD.y]
            )
          : null;
      const alpha = clamp(
        (0.14 + avgDepth * 0.92) *
          (0.62 + avgFacing * 0.38) *
          (0.76 + (1 - Math.min(1, Math.abs(avgW) * 0.4)) * 0.24) *
          input.fourDProgress,
        0.08,
        0.98
      );

      return {
        accentInverted: avgW > 0.08 || avgFacing < 0.48,
        alpha,
        avgZ: avgDepth,
        centerX: centerFaceX - centerX,
        centerY: centerFaceY - centerY,
        diag: diagonal,
        matrix,
        matrixParsed: matrix ? parseMatrix3d(matrix) : null,
        visible: matrix !== null,
        zIndex: 0
      };
    });

    const sortedByDepth = rawFaceStates
      .map((state, index) => ({ index, depth: state.avgZ }))
      .sort((left, right) => left.depth - right.depth);

    for (let order = 0; order < sortedByDepth.length; order += 1) {
      rawFaceStates[sortedByDepth[order]!.index]!.zIndex = order + 20;
    }

    const edgeStates: TesseractEdgeProjection[] = INSIDE_TESSERACT_EDGES.map((edge) => {
      const pointA = projectedVertices[edge[0]]!;
      const pointB = projectedVertices[edge[1]]!;

      return {
        pointA,
        pointB,
        wEdge: INSIDE_TESSERACT_VERTICES[edge[0]]![3] !== INSIDE_TESSERACT_VERTICES[edge[1]]![3],
        z: (pointA.portalDepth + pointB.portalDepth) * 0.5
      };
    }).sort((left, right) => left.z - right.z);

    const scene: FourDSceneState = {
      edgeStates,
      faceStates: rawFaceStates,
      variant: 'inside'
    };

    InsideTesseractProjector.lastScene = scene;
    return scene;
  }
}

type InsideCamera = {
  x: number;
  y: number;
  z: number;
  w: number;
};

type InsideProjectedVertex = ProjectedHyperVertex & {
  facing: number;
  portalDepth: number;
};

function projectInsideVertex(
  vertex: HyperVertex,
  camera: InsideCamera,
  centerX: number,
  centerY: number,
  scale: number,
  velocity: number,
  time: number
): InsideProjectedVertex {
  let x = vertex[0] - camera.x;
  let y = vertex[1] - camera.y;
  const z = vertex[2] - camera.z;
  const w = vertex[3] - camera.w;

  const warpPower = velocity * 0.8;
  const spatialTwist = Math.sin(w * 2.2 + time * 0.002) * warpPower;

  const xWarped = x * Math.cos(spatialTwist) - y * Math.sin(spatialTwist);
  const yWarped = x * Math.sin(spatialTwist) + y * Math.cos(spatialTwist);
  x = xWarped;
  y = yWarped;

  const dynamicOrigin = INSIDE_TESSERACT.wLensOrigin - Math.min(1.0, warpPower * 0.5);
  const wLens = 1 / Math.max(0.2, dynamicOrigin - w);

  const x3 = x * wLens;
  const y3 = y * wLens;
  const z3 = z * wLens;

  const portalDepth = 1 / (0.4 + Math.abs(z3));
  const screenScale = portalDepth * scale * 1.45;
  const facing = z3 >= 0 ? 1 : clamp(1 - Math.abs(z3) * 0.5, 0.15, 0.92);

  return {
    facing,
    portalDepth,
    w4: w,
    x: centerX + x3 * screenScale,
    y: centerY + y3 * screenScale,
    z3
  };
}

function lerp(from: number, to: number, alpha: number): number {
  return from + (to - from) * alpha;
}

function normalizeCycle(value: number): number {
  const cycle = value - Math.floor(value);
  return cycle < 0 ? cycle + 1 : cycle;
}
