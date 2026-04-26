import { clamp } from '../../utils/math';
import { MANIFOLD_CONSTANTS } from './ManifoldConstants';
import { computeCardProjectionMatrix, parseMatrix3d } from './HyperMath';
import type {
  FourDSceneState,
  HyperFaceVertices,
  HyperVertex,
  ProjectedHyperVertex,
  TesseractFaceDefinition,
  TesseractFaceProjection,
  TesseractProjectionInput,
  TesseractEdgeProjection
} from './ManifoldTypes';

export const TESSERACT_VERTICES: readonly HyperVertex[] = createTesseractVertices();
export const TESSERACT_EDGES: readonly (readonly [number, number])[] = createTesseractEdges(TESSERACT_VERTICES);
export const TESSERACT_FACES: readonly TesseractFaceDefinition[] = createTesseractFaces(TESSERACT_VERTICES);

export class TesseractProjector {

  // Frame-level scene cache — key is built from quantized rotation angles.
  // Quantization slightly reduces geometric precision, but dramatically improves cache hit rate
  // when the tesseract is near-static. The buckets are chosen small enough that the visual error
  // is hard to spot while still skipping most repeated homography solves.
  private static _lastSceneKey = 0;
  private static _lastScene: FourDSceneState | null = null;

  /**
   * Projects the rotating tesseract into a 2D scene snapshot.
   *
   * `xwAngle` is the dominant hyper-rotation: it rotates the cube through the X/W plane,
   * which is what produces the "inside-out" fourth-dimensional read. `yzAngle` and `zwAngle`
   * are secondary rotations that keep the silhouette evolving instead of feeling mechanically
   * locked to one axis pair. `xyAngle` is a light screen-plane twist layered on top.
   */
  static computeScene(input: TesseractProjectionInput): FourDSceneState {
    const loopTurns = input.turns;
    const spin = loopTurns * Math.PI * MANIFOLD_CONSTANTS.TESSERACT_PHYSICS.hyperSpinScalar;
    
    
    const xwAngle = spin;
    const yzAngle = spin * MANIFOLD_CONSTANTS.TESSERACT_PHYSICS.yzSpinScalar + input.time * MANIFOLD_CONSTANTS.TESSERACT_PHYSICS.yzTimeScalar;
    const zwAngle = spin * MANIFOLD_CONSTANTS.TESSERACT_PHYSICS.zwSpinScalar + input.time * MANIFOLD_CONSTANTS.TESSERACT_PHYSICS.zwTimeScalar;
    const xyAngle = spin * MANIFOLD_CONSTANTS.TESSERACT_PHYSICS.xySpinScalar + input.time * MANIFOLD_CONSTANTS.TESSERACT_PHYSICS.xyTimeScalar;


    const centerX = input.viewportSize.width * 0.5;
    const centerY = input.viewportSize.height * 0.52;
    const worldOriginX = input.viewportSize.width * 0.5;
    const worldOriginY = input.viewportSize.height * 0.5;
    const scale = Math.min(input.viewportSize.width, input.viewportSize.height) * MANIFOLD_CONSTANTS.TESSERACT_PHYSICS.screenScaleFactor;

    // Quantize the main angles before looking in the frame cache.
    // Finer buckets mean lower quantization error but fewer cache hits; coarser buckets do the opposite.
    // The chosen split keeps XW/YZ responsive, while ZW is intentionally coarser because its visual impact is subtler.
    const sceneKey =
      (((Math.round(xwAngle * 730) & 0x3FFF) << 18) |
       ((Math.round(yzAngle * 730) & 0x3FFF) << 4)  |
       ((Math.round(zwAngle * 64)  & 0xF)));
    if (sceneKey === TesseractProjector._lastSceneKey && TesseractProjector._lastScene) {
      return TesseractProjector._lastScene;
    }
    TesseractProjector._lastSceneKey = sceneKey;

    
    
    const projectedVertices = TESSERACT_VERTICES.map((vertex) =>
      projectHyperVertex(rotateTesseractVertex(vertex, xwAngle, yzAngle, zwAngle, xyAngle), centerX, centerY, scale)
    );



    const rawFaceStates: TesseractFaceProjection[] = TESSERACT_FACES.map((face) => {
      const points = face.verts.map((vertexIndex) => projectedVertices[vertexIndex]);
      const pointA = points[0]!;
      const pointB = points[1]!;
      const pointC = points[2]!;
      const pointD = points[3]!;
      const localPointA: readonly [number, number] = [pointA.x - worldOriginX, pointA.y - worldOriginY];
      const localPointB: readonly [number, number] = [pointB.x - worldOriginX, pointB.y - worldOriginY];
      const localPointC: readonly [number, number] = [pointC.x - worldOriginX, pointC.y - worldOriginY];
      const localPointD: readonly [number, number] = [pointD.x - worldOriginX, pointD.y - worldOriginY];
      const cross =
        (localPointB[0] - localPointA[0]) * (localPointD[1] - localPointA[1]) -
        (localPointB[1] - localPointA[1]) * (localPointD[0] - localPointA[0]);
      const diagonal = Math.hypot(localPointC[0] - localPointA[0], localPointC[1] - localPointA[1]);
      const avgZ = (pointA.z3 + pointB.z3 + pointC.z3 + pointD.z3) * 0.25;
      const avgW = (pointA.w4 + pointB.w4 + pointC.w4 + pointD.w4) * 0.25;
      const centerFaceX = (localPointA[0] + localPointB[0] + localPointC[0] + localPointD[0]) * 0.25;
      const centerFaceY = (localPointA[1] + localPointB[1] + localPointC[1] + localPointD[1]) * 0.25;
      const depthWeight = clamp(
        (avgZ - MANIFOLD_CONSTANTS.TESSERACT_PHYSICS.depthNear) / MANIFOLD_CONSTANTS.TESSERACT_PHYSICS.depthSpan,
        0,
        1
      );
      const edgeWeight = clamp(1 - Math.abs(avgW) * 0.26, 0.48, 1);
      const alpha = clamp((0.12 + depthWeight * 0.88) * edgeWeight * input.fourDProgress, 0.06, 0.98);
      const matrix = Math.abs(cross) > 0.01 && diagonal >= MANIFOLD_CONSTANTS.TESSERACT_PHYSICS.diagonalCullFloor
        ? computeCardProjectionMatrix(
            MANIFOLD_CONSTANTS.TESSERACT_PHYSICS.faceCardExtent,
            MANIFOLD_CONSTANTS.TESSERACT_PHYSICS.faceCardExtent,
            [pointA.x, pointA.y],
            [pointB.x, pointB.y],
            [pointC.x, pointC.y],
            [pointD.x, pointD.y]
          )
        : null;

      return {
        accentInverted: avgW > 0.18,
        alpha,
        avgZ,
        centerX: centerFaceX,
        centerY: centerFaceY,
        diag: diagonal,
        matrix,
        matrixParsed: matrix ? parseMatrix3d(matrix) : null,
        visible: matrix !== null,
        zIndex: 0
      };
    });

    const sortedByDepth = rawFaceStates
      .map((state, index) => ({ index, avgZ: state.avgZ }))
      .sort((left, right) => left.avgZ - right.avgZ);

    for (let order = 0; order < sortedByDepth.length; order += 1) {
      rawFaceStates[sortedByDepth[order]!.index]!.zIndex = order + MANIFOLD_CONSTANTS.TESSERACT_PHYSICS.faceZIndexBase;
    }

    const edgeStates: TesseractEdgeProjection[] = TESSERACT_EDGES.map((edge) => {
      const pointA = projectedVertices[edge[0]]!;
      const pointB = projectedVertices[edge[1]]!;

      return {
        pointA,
        pointB,
        wEdge: TESSERACT_VERTICES[edge[0]]![3] !== TESSERACT_VERTICES[edge[1]]![3],
        z: (pointA.z3 + pointB.z3) * 0.5
      };
    }).sort((left, right) => left.z - right.z);

    const scene: FourDSceneState = Object.freeze({
      edgeStates,
      faceStates: rawFaceStates,
      variant: 'classic'
    });
    TesseractProjector._lastScene = scene;
    return scene;
  }
}

export function rotateTesseractVertex(
  vertex: HyperVertex,
  xwAngle: number,
  yzAngle: number,
  zwAngle: number,
  xyAngle: number
): HyperVertex {
  let [x, y, z, w] = vertex;
  const xwCos = Math.cos(xwAngle);
  const xwSin = Math.sin(xwAngle);
  const yzCos = Math.cos(yzAngle);
  const yzSin = Math.sin(yzAngle);
  const zwCos = Math.cos(zwAngle);
  const zwSin = Math.sin(zwAngle);
  const xyCos = Math.cos(xyAngle);
  const xySin = Math.sin(xyAngle);

  [x, w] = [x * xwCos - w * xwSin, x * xwSin + w * xwCos];
  [y, z] = [y * yzCos - z * yzSin, y * yzSin + z * yzCos];
  [z, w] = [z * zwCos - w * zwSin, z * zwSin + w * zwCos];
  [x, y] = [x * xyCos - y * xySin, x * xySin + y * xyCos];

  return [x, y, z, w];
}

export function projectHyperVertex(
  vertex: HyperVertex,
  centerX: number,
  centerY: number,
  scale: number
): ProjectedHyperVertex {
  const [x, y, z, w] = vertex;
  // Perspective in 4D follows the same intuition as 3D perspective: divide by distance from the lens.
  // The lens sits on the W axis at wLensOrigin, so the scale factor is 1 / (origin - w).
  // The floor prevents singularities when a point approaches or crosses the lens plane.
  const wLens = 1 / Math.max(MANIFOLD_CONSTANTS.TESSERACT_PHYSICS.wLensFloor, MANIFOLD_CONSTANTS.TESSERACT_PHYSICS.wLensOrigin - w);
  const x3 = x * wLens;
  const y3 = y * wLens;
  const z3 = z * wLens;
  const zLens = 1 / Math.max(MANIFOLD_CONSTANTS.TESSERACT_PHYSICS.zLensFloor, MANIFOLD_CONSTANTS.TESSERACT_PHYSICS.zLensOrigin - z3);

  return {
    w4: w,
    x: x3 * zLens * scale + centerX,
    y: y3 * zLens * scale + centerY,
    z3
  };
}

function createTesseractVertices(): readonly HyperVertex[] {
  const vertices: HyperVertex[] = [];

  for (let index = 0; index < 16; index += 1) {
    vertices.push([index & 1 ? 1 : -1, index & 2 ? 1 : -1, index & 4 ? 1 : -1, index & 8 ? 1 : -1]);
  }

  return vertices;
}

function createTesseractEdges(vertices: readonly HyperVertex[]): readonly (readonly [number, number])[] {
  const edges: Array<readonly [number, number]> = [];

  for (let left = 0; left < vertices.length; left += 1) {
    for (let right = left + 1; right < vertices.length; right += 1) {
      let diff = 0;

      for (let axis = 0; axis < 4; axis += 1) {
        if (vertices[left]![axis] !== vertices[right]![axis]) {
          diff += 1;
        }
      }

      if (diff === 1) {
        edges.push([left, right]);
      }
    }
  }

  return edges;
}

function createTesseractFaces(vertices: readonly HyperVertex[]): readonly TesseractFaceDefinition[] {
  const faces: TesseractFaceDefinition[] = [];
  const axes = [0, 1, 2, 3] as const;

  for (let axisA = 0; axisA < 4; axisA += 1) {
    for (let axisB = axisA + 1; axisB < 4; axisB += 1) {
      const fixedAxes = axes.filter((axis) => axis !== axisA && axis !== axisB) as [number, number];

      for (const fixedValueA of [-1, 1] as const) {
        for (const fixedValueB of [-1, 1] as const) {
          const quad: number[] = [];

          for (let vertexIndex = 0; vertexIndex < vertices.length; vertexIndex += 1) {
            const vertex = vertices[vertexIndex]!;

            if (vertex[fixedAxes[0]] === fixedValueA && vertex[fixedAxes[1]] === fixedValueB) {
              quad.push(vertexIndex);
            }
          }

          if (quad.length !== 4) {
            continue;
          }

          const centerA = quad.reduce((sum, vertexIndex) => sum + vertices[vertexIndex]![axisA], 0) / 4;
          const centerB = quad.reduce((sum, vertexIndex) => sum + vertices[vertexIndex]![axisB], 0) / 4;
          quad.sort((left, right) => {
            const leftVertex = vertices[left]!;
            const rightVertex = vertices[right]!;
            const leftAngle = Math.atan2(leftVertex[axisB] - centerB, leftVertex[axisA] - centerA);
            const rightAngle = Math.atan2(rightVertex[axisB] - centerB, rightVertex[axisA] - centerA);
            return leftAngle - rightAngle;
          });

          faces.push({
            axes: [axisA, axisB],
            fixedAxes,
            fixedVals: [fixedValueA, fixedValueB],
            verts: [quad[0]!, quad[1]!, quad[2]!, quad[3]!] as HyperFaceVertices
          });
        }
      }
    }
  }

  return faces;
}
