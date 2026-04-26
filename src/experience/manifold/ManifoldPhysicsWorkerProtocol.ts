import type { CardMotionState } from './ManifoldPhysics';
import type { ItemType, ViewMode } from './ManifoldTypes';

export interface PhysicsWorkerContext {
  activeFourDProgress: number;
  activeViewModeProgress: number;
  cameraZ: number;
  expandedCardKey: number | null;
  expandedProgress: number;
  expandedTarget: number;
  introCompleted: boolean;
  is2DMode: boolean;
  loopSize: number;
  mouseX: number;
  now: number;
  reverseScrollActivationMode: boolean;
  targetViewMode: ViewMode;
  velocityMagnitude: number;
  visualFourDProgress: number;
  contextRevealByType: Record<ItemType, number>;
}

export interface PhysicsWorkerItemSnapshot {
  itemKey: number;
  baseZ: number;
  currentAlpha: number;
  gridOrder: number;
  inertiaRotX: number;
  inertiaRotY: number;
  inertiaRotZ: number;
  inertiaY: number;
  inertiaZ: number;
  isFeatured: boolean;
  response: number;
  rot: number;
  sectionTitle: string;
  type: ItemType;
  variance: number;
  x: number;
  y: number;
}

export interface PhysicsWorkerItemResult {
  itemKey: number;
  alpha: number;
  vizZ: number;
  isNearCamera: boolean;
  isExpandedMorphing: boolean;
  skipAlphaCheck: boolean;
  motion: CardMotionState;
}

export type PhysicsWorkerRequest =
  | {
      type: 'compute';
      frameId: number;
      context: PhysicsWorkerContext;
      items: PhysicsWorkerItemSnapshot[];
    }
  | {
      type: 'destroy';
    };

export type PhysicsWorkerResponse = {
  type: 'result';
  frameId: number;
  items: PhysicsWorkerItemResult[];
};

