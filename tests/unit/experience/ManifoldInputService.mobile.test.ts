/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from 'vitest';
import { ManifoldInputService, type ManifoldInputServiceContext } from '../../../src/experience/manifold/ManifoldInputService';
import type { ItemState } from '../../../src/experience/manifold/ManifoldTypes';

function createContext() {
  const expandedCard = {} as ItemState;
  const closeExpandedCard = vi.fn();
  const context: ManifoldInputServiceContext = {
    advanceNext: vi.fn(),
    advancePrev: vi.fn(),
    closeExpandedCard,
    findCardState: vi.fn(() => null),
    get2DGridMetrics: vi.fn(() => ({ spacingX: 320, stackedMobile: true })),
    getExpandedCard: vi.fn(() => expandedCard),
    getExpandedTarget: vi.fn(() => 1),
    getHoveredCard: vi.fn(() => null),
    getIntroCompleted: vi.fn(() => true),
    getIntroTarget: vi.fn(() => 1),
    getViewportSize: vi.fn(() => ({ width: 390, height: 844 })),
    is2DMode: vi.fn(() => true),
    is4DMode: vi.fn(() => false),
    isEntryTarget: vi.fn(() => false),
    isHudNavigationOpen: vi.fn(() => false),
    markInteractionActivity: vi.fn(),
    pan2DBy: vi.fn(),
    resolveCardTarget: vi.fn(() => expandedCard),
    setCardMobilePage: vi.fn(),
    setHoveredCard: vi.fn(),
    toggleExpandedCard: vi.fn(),
    triggerIntroEnter: vi.fn(),
    triggerIntroExit: vi.fn(),
    updatePhaseMouse: vi.fn()
  };

  return { closeExpandedCard, context };
}

function pointerEvent(clientX: number, clientY: number): PointerEvent {
  return { button: 0, clientX, clientY, target: document.body } as unknown as PointerEvent;
}

describe('ManifoldInputService mobile card gestures', () => {
  it('closes an expanded card after a vertical swipe', () => {
    const { closeExpandedCard, context } = createContext();
    const service = new ManifoldInputService(context);

    service.handleViewportPointerDown(pointerEvent(180, 180));
    service.handleViewportPointerUp(pointerEvent(184, 245));

    expect(closeExpandedCard).toHaveBeenCalledOnce();
  });

  it('does not close an expanded card after a horizontal swipe', () => {
    const { closeExpandedCard, context } = createContext();
    const service = new ManifoldInputService(context);

    service.handleViewportPointerDown(pointerEvent(180, 180));
    service.handleViewportPointerUp(pointerEvent(250, 184));

    expect(closeExpandedCard).not.toHaveBeenCalled();
  });
});
