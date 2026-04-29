import type { ItemState } from './ManifoldTypes';
import { IS_IOS } from '../../utils/browserDetection';
import {
  ManifoldPhysicsOrchestrator,
  type ItemPhysicsResult,
  type PhysicsContext,
  type PhysicsItemSnapshot
} from './ManifoldPhysicsOrchestrator';
import type {
  PhysicsWorkerContext,
  PhysicsWorkerItemResult,
  PhysicsWorkerRequest,
  PhysicsWorkerResponse
} from './ManifoldPhysicsWorkerProtocol';

/**
 * Sync runtime adapter around the pure physics core.
 * This keeps the controller talking to a runtime boundary that can later be
 * backed by a WebWorker without changing the render orchestration contract.
 */
export class ManifoldPhysicsRuntime {
  private worker: Worker | null = null;
  private workerBusy = false;
  private nextFrameId = 1;
  private latestResults = new Map<number, PhysicsWorkerItemResult>();

  constructor(private readonly orchestrator: ManifoldPhysicsOrchestrator = new ManifoldPhysicsOrchestrator()) {}

  prepareFrame(items: readonly ItemState[], context: PhysicsContext): void {
    const worker = this.ensureWorker();
    if (!worker || this.workerBusy) {
      return;
    }

    const request: PhysicsWorkerRequest = {
      type: 'compute',
      frameId: this.nextFrameId,
      context: this.serializeContext(context),
      items: items.map((item) => this.serializeItem(item))
    };

    this.workerBusy = true;
    this.nextFrameId += 1;
    worker.postMessage(request);
  }

  computeItem(item: ItemState, context: PhysicsContext): ItemPhysicsResult {
    const workerResult = this.latestResults.get(item.cardIndex);
    if (workerResult) {
      item.inertiaZ = workerResult.motion.inertiaZ;
      item.inertiaY = workerResult.motion.inertiaY;
      item.inertiaRotZ = workerResult.motion.inertiaRotZ;
      item.inertiaRotY = workerResult.motion.inertiaRotY;
      item.inertiaRotX = workerResult.motion.inertiaRotX;

      return {
        alpha: workerResult.alpha,
        vizZ: workerResult.vizZ,
        isNearCamera: workerResult.isNearCamera,
        isExpandedMorphing: workerResult.isExpandedMorphing,
        skipAlphaCheck: workerResult.skipAlphaCheck
      };
    }

    return this.orchestrator.updateItemPhysics(item, context);
  }

  computeCardOpacity(...args: Parameters<ManifoldPhysicsOrchestrator['computeCardOpacity']>): number {
    return this.orchestrator.computeCardOpacity(...args);
  }

  blendCardPose(...args: Parameters<ManifoldPhysicsOrchestrator['blendCardPose']>) {
    return this.orchestrator.blendCardPose(...args);
  }

  destroy(): void {
    this.worker?.postMessage({ type: 'destroy' } satisfies PhysicsWorkerRequest);
    this.worker?.terminate();
    this.worker = null;
    this.workerBusy = false;
    this.latestResults.clear();
  }

  private ensureWorker(): Worker | null {
    if (IS_IOS) {
      return null;
    }

    if (this.worker || typeof Worker !== 'function') {
      return this.worker;
    }

    try {
      const worker = new Worker(new URL('./ManifoldPhysics.worker.ts', import.meta.url), {
        type: 'module'
      });
      worker.onmessage = (event: MessageEvent<PhysicsWorkerResponse>) => {
        const message = event.data;
        this.latestResults.clear();
        for (let index = 0; index < message.items.length; index += 1) {
          const item = message.items[index];
          this.latestResults.set(item.itemKey, item);
        }
        this.workerBusy = false;
      };
      worker.onerror = () => {
        this.workerBusy = false;
      };
      this.worker = worker;
      return worker;
    } catch (error) {
      console.warn('Manifold physics worker unavailable. Falling back to main thread.', error);
      return null;
    }
  }

  private serializeContext(context: PhysicsContext): PhysicsWorkerContext {
    return {
      activeFourDProgress: context.activeFourDProgress,
      activeViewModeProgress: context.activeViewModeProgress,
      cameraZ: context.cameraZ,
      expandedCardKey: context.expandedCardKey,
      expandedProgress: context.expandedProgress,
      expandedTarget: context.expandedTarget,
      introCompleted: context.introCompleted,
      is2DMode: context.is2DMode,
      loopSize: context.loopSize,
      mouseX: context.mouseX,
      now: context.now,
      reverseScrollActivationMode: context.reverseScrollActivationMode,
      targetViewMode: context.targetViewMode,
      velocityMagnitude: context.velocityMagnitude,
      visualFourDProgress: context.visualFourDProgress,
      contextRevealByType: context.contextRevealByType
    };
  }

  private serializeItem(item: ItemState): PhysicsItemSnapshot {
    return {
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
    };
  }
}
