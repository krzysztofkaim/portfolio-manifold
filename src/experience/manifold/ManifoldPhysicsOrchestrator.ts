import { clamp, lerp } from '../../utils/math';
import { computeCardMotionState, type CardMotionState } from './ManifoldPhysics';
import type { ItemState, ItemType, ViewMode } from './ManifoldTypes';

export interface PhysicsContext {
  activeFourDProgress: number;
  activeViewModeProgress: number;
  cameraZ: number;
  expandedCard: ItemState | null;
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
  getContextRevealForType: (type: ItemType) => number;
}

export interface ItemPhysicsResult {
  alpha: number;
  vizZ: number;
  isNearCamera: boolean;
  isExpandedMorphing: boolean;
  skipAlphaCheck: boolean;
}

export interface PhysicsItemSnapshot {
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

export interface PhysicsComputationResult extends ItemPhysicsResult {
  motion: CardMotionState;
}

/**
 * Orchestrates the physics calculations for Manifold items, including motion, opacity, and positioning.
 * Handles transitions between different view modes (2D, 3D, 4D).
 */
export class ManifoldPhysicsOrchestrator {
  /**
   * Computes the visual and motion state of an individual item based on current physics context.
   *
   * @param snapshot - The current physical state of the item
   * @param context - The global physics parameters
   * @returns The computed motion and rendering properties
   */
  computeItemState(
    snapshot: PhysicsItemSnapshot,
    context: PhysicsContext
  ): PhysicsComputationResult {
    const {
      cameraZ,
      loopSize,
      introCompleted,
      activeViewModeProgress,
      activeFourDProgress,
      expandedCard,
      expandedCardKey,
      expandedProgress,
      expandedTarget,
      reverseScrollActivationMode,
      contextRevealByType,
      now,
      velocityMagnitude,
      mouseX
    } = context;

    const relZ = snapshot.baseZ + cameraZ;
    let vizZ = ((relZ % loopSize) + loopSize) % loopSize;

    if (vizZ > 500) {
      vizZ -= loopSize;
    }

    let alpha = 1;
    if (vizZ < -3500) {
      alpha = 0;
    } else if (vizZ < -2000) {
      alpha = (vizZ + 3500) / 1500;
    }

    if (vizZ > 20 && snapshot.type !== 'star') {
      alpha = clamp(1 - (vizZ - 20) / 250, 0, 1);
    }

    if (snapshot.isFeatured && !introCompleted) {
      alpha = 1;
    }

    if (!snapshot.isFeatured || introCompleted) {
      alpha *= contextRevealByType[snapshot.type];
    }

    const isExpandedMorphing = expandedCard !== null && (expandedTarget > 0.01 || expandedProgress > 0.01);
    const isExpandedItem = expandedCardKey !== null && expandedCardKey === snapshot.itemKey;

    if (expandedCard && !isExpandedItem) {
      if (snapshot.type === 'card') {
        alpha *= Math.max(0, 1 - expandedProgress * 3.0);
      } else if (snapshot.type === 'text') {
        alpha *= Math.max(0, 1 - expandedProgress * 4.0);
      }
      if (vizZ > 10) alpha = 0;
    }

    if (isExpandedItem && expandedTarget > 0) {
      alpha = Math.max(alpha, Math.min(1, alpha + expandedProgress * 4.0));
    }

    if (snapshot.type === 'card' && activeViewModeProgress > 0.01) {
      alpha = Math.max(alpha, 0.18 * activeViewModeProgress);
    }

    if (snapshot.type !== 'card' && activeFourDProgress > 0.001) {
      alpha *= 1 - clamp(activeFourDProgress * 1.14, 0, 0.985);
    }

    alpha = clamp(alpha, 0, 1);

    const motion = computeCardMotionState(snapshot, {
      mouseX,
      time: now,
      velocity: velocityMagnitude
    });

    const skipAlphaCheck = activeFourDProgress > 0.001 && snapshot.type === 'card';
    const isCardNearCamera = vizZ > -4200 && (vizZ < 0 || (reverseScrollActivationMode && vizZ < 1500));

    return {
      alpha,
      motion,
      vizZ,
      isNearCamera: isCardNearCamera,
      isExpandedMorphing: isExpandedItem && isExpandedMorphing,
      skipAlphaCheck
    };
  }

  updateItemPhysics(item: ItemState, context: PhysicsContext): ItemPhysicsResult {
    const result = this.computeItemState({
      itemKey: item.cardIndex,
      baseZ: item.baseZ,
      currentAlpha: item.currentAlpha,
      gridOrder: item.gridOrder,
      inertiaRotX: item.inertiaRotX,
      inertiaRotY: item.inertiaRotY,
      inertiaRotZ: item.inertiaRotZ,
      inertiaY: item.inertiaY,
      inertiaZ: item.inertiaZ,
      isFeatured: item.isFeatured,
      response: item.response,
      rot: item.rot,
      sectionTitle: item.sectionTitle,
      type: item.type,
      variance: item.variance,
      x: item.x,
      y: item.y
    }, context);

    item.inertiaZ = result.motion.inertiaZ;
    item.inertiaY = result.motion.inertiaY;
    item.inertiaRotZ = result.motion.inertiaRotZ;
    item.inertiaRotY = result.motion.inertiaRotY;
    item.inertiaRotX = result.motion.inertiaRotX;

    return result;
  }

  computeItemStates(
    snapshots: readonly PhysicsItemSnapshot[],
    context: Omit<PhysicsContext, 'expandedCard' | 'getContextRevealForType'>
  ): PhysicsComputationResult[] {
    return snapshots.map((snapshot) =>
      this.computeItemState(snapshot, {
        ...context,
        expandedCard: null,
        getContextRevealForType: (type) => context.contextRevealByType[type]
      })
    );
  }

  computeCardOpacity(
    item: ItemState,
    active2DSectionTitle: string,
    viewModeProgress: number,
    fourDProgress: number,
    twoDAlpha: number,
    fourDAlpha: number,
    isExpandedCard: boolean
  ): number {
    let finalOpacity = clamp(lerp(item.currentAlpha, twoDAlpha, viewModeProgress), 0, 1);
    finalOpacity = clamp(lerp(finalOpacity, fourDAlpha, fourDProgress), 0, 1);

    if (active2DSectionTitle.length > 0 && viewModeProgress > 0.01) {
      const p = clamp((viewModeProgress - 0.02) / 0.7, 0, 1);
      const sectionFade = p * p * (3 - 2 * p);

      if (item.sectionTitle !== active2DSectionTitle) {
        finalOpacity = lerp(finalOpacity, finalOpacity * 0.2, sectionFade);
      } else if (isExpandedCard && item.type === 'card') {
        finalOpacity = lerp(finalOpacity, finalOpacity * 0.4, sectionFade);
      }
    }

    return finalOpacity;
  }

  blendCardPose(
    threeDPose: { shiftZ: number; tiltX: number; tiltY: number; tiltZ: number; tx: number; ty: number; tz: number },
    twoDPose: { scale: number; shiftZ: number; tiltX: number; tiltY: number; tiltZ: number; x: number; y: number; z: number },
    fourDPose: { shiftZ: number; tiltX: number; tiltY: number; tiltZ: number; x: number; y: number; z: number },
    viewModeProgress: number,
    fourDProgress: number
  ): { shiftZ: number; tiltX: number; tiltY: number; tiltZ: number; tx: number; ty: number; tz: number } {
    const mixedTwoD = {
      shiftZ: lerp(threeDPose.shiftZ, twoDPose.shiftZ, viewModeProgress),
      tiltX: lerp(threeDPose.tiltX, twoDPose.tiltX, viewModeProgress),
      tiltY: lerp(threeDPose.tiltY, twoDPose.tiltY, viewModeProgress),
      tiltZ: lerp(threeDPose.tiltZ, twoDPose.tiltZ, viewModeProgress),
      tx: lerp(threeDPose.tx, twoDPose.x, viewModeProgress),
      ty: lerp(threeDPose.ty, twoDPose.y, viewModeProgress),
      tz: lerp(threeDPose.tz, twoDPose.z, viewModeProgress)
    };

    return {
      shiftZ: lerp(mixedTwoD.shiftZ, fourDPose.shiftZ, fourDProgress),
      tiltX: lerp(mixedTwoD.tiltX, fourDPose.tiltX, fourDProgress),
      tiltY: lerp(mixedTwoD.tiltY, fourDPose.tiltY, fourDProgress),
      tiltZ: lerp(mixedTwoD.tiltZ, fourDPose.tiltZ, fourDProgress),
      tx: lerp(mixedTwoD.tx, fourDPose.x, fourDProgress),
      ty: lerp(mixedTwoD.ty, fourDPose.y, fourDProgress),
      tz: lerp(mixedTwoD.tz, fourDPose.z, fourDProgress)
    };
  }

  compute2DCardPose(
    item: ItemState,
    sceneScroll: number,
    _time: number,
    metrics: {
      cardSize: number;
      columns: number;
      spacingX: number;
      spacingY: number;
      scrollScale: number;
      twoDOffsetX: number;
      introScrollAnchor: number;
    }
  ): {
    alpha: number;
    scale: number;
    shiftZ: number;
    tiltX: number;
    tiltY: number;
    tiltZ: number;
    x: number;
    y: number;
    z: number;
    textScale: number;
  } {
    const column = ((item.gridOrder % metrics.columns) + metrics.columns) % metrics.columns;
    const row = Math.floor(item.gridOrder / metrics.columns);

    const scrollWorldY = (sceneScroll - metrics.introScrollAnchor) * metrics.scrollScale;
    const targetX = column * metrics.spacingX - metrics.twoDOffsetX;
    const targetY = row * metrics.spacingY - scrollWorldY;

    const dx = targetX - item.x;
    const dy = targetY - item.y;
    const distSq = dx * dx + dy * dy;

    // Performance optimization: Approximate distance factor for fast layout
    const proximity = clamp(1 - distSq / 1440000, 0, 1);
    const scale = lerp(0.82, 1, proximity * proximity);
    const alpha = lerp(0.24, 1, proximity);

    return {
      alpha,
      scale,
      shiftZ: 0,
      tiltX: 0,
      tiltY: 0,
      tiltZ: item.rot,
      x: targetX,
      y: targetY,
      z: -1200 - Math.abs(targetY) * 0.04, // Perspective compression
      textScale: 1
    };
  }
}
