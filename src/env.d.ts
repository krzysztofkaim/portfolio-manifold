/// <reference types="astro/client" />

import type { SceneManager } from './engine/SceneManager';

declare global {
  interface Window {
    __sceneManager?: SceneManager;
  }

  interface WindowEventMap {
    'manifold:record-profile': CustomEvent<import('./config/manifold/ManifoldEvents').RecordProfileDetail>;
  }

  interface Performance {
    memory?: {
      usedJSHeapSize: number;
    };
  }
}

declare module 'three' {
  interface BufferGeometry {
    boundsTree?: unknown;
    computeBoundsTree?: () => void;
    disposeBoundsTree?: () => void;
  }
}
