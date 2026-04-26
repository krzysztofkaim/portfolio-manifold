import type { ManifoldSceneRuntimeConfig } from '../../config/manifold/ManifoldSceneConfig';
import type { ItemState, TwoDGridMetrics, ViewMode } from './ManifoldTypes';

export interface ManifoldPhaseState {
  mouseX: number;
  mouseY: number;
  scroll: number;
  targetSpeed: number;
  velocity: number;
}

export type { ItemState, ManifoldSceneRuntimeConfig, TwoDGridMetrics, ViewMode };
