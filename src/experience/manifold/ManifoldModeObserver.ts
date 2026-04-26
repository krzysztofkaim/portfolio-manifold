import type { ViewMode } from './ManifoldTypes';

export interface ManifoldModeObserver {
  onIntroEntered?(): void;
  onCardExpanded?(cardId: string): void;
  onModeSwitched?(from: ViewMode, to: ViewMode): void;
  onFourDModeEntered?(): void;
}
