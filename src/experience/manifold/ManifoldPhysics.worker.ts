import { ManifoldPhysicsOrchestrator } from './ManifoldPhysicsOrchestrator';
import type {
  PhysicsWorkerItemResult,
  PhysicsWorkerRequest,
  PhysicsWorkerResponse
} from './ManifoldPhysicsWorkerProtocol';

const orchestrator = new ManifoldPhysicsOrchestrator();

self.onmessage = (event: MessageEvent<PhysicsWorkerRequest>) => {
  const message = event.data;

  switch (message.type) {
    case 'compute': {
      const computed = orchestrator.computeItemStates(message.items, message.context);
      const items: PhysicsWorkerItemResult[] = computed.map((result, index) => ({
        itemKey: message.items[index]?.itemKey ?? -1,
        alpha: result.alpha,
        vizZ: result.vizZ,
        isNearCamera: result.isNearCamera,
        isExpandedMorphing: result.isExpandedMorphing,
        skipAlphaCheck: result.skipAlphaCheck,
        motion: result.motion
      }));
      const response: PhysicsWorkerResponse = {
        type: 'result',
        frameId: message.frameId,
        items
      };
      self.postMessage(response);
      return;
    }
    case 'destroy': {
      self.close();
      return;
    }
  }
};
