import { describe, expect, it } from 'vitest';
import {
  findCardItemByIndex,
  getAdjacentCardNavigation,
  getCentered2DCard,
  getHudFocus,
  getSectionNavigationTargets
} from '../../../../src/experience/manifold/ManifoldNavigation';
import { createItemState } from '../../../helpers/itemStateFactory';

describe('ManifoldNavigation', () => {
  it('findCardItemByIndex returns matching card or null', () => {
    const items = [createItemState({ cardIndex: 1 }), createItemState({ cardIndex: 2 })];

    expect(findCardItemByIndex(items, 2)?.cardIndex).toBe(2);
    expect(findCardItemByIndex(items, 9)).toBeNull();
  });

  it('getCentered2DCard handles empty, single and many cards', () => {
    expect(getCentered2DCard([])).toBeNull();

    const single = createItemState({ cardIndex: 1, currentScreenX: 10, currentScreenY: 10 });
    expect(getCentered2DCard([single])).toBe(single);

    const far = createItemState({ cardIndex: 2, currentScreenX: 50, currentScreenY: 50 });
    const close = createItemState({ cardIndex: 3, currentScreenX: 5, currentScreenY: 5 });
    expect(getCentered2DCard([far, close])).toBe(close);
  });

  it('getHudFocus prioritizes expanded, then focused, then featured card', () => {
    const featured = createItemState({ cardTitle: 'Featured', sectionTitle: 'PROFILE' });
    const focused = createItemState({ cardTitle: 'Focused', sectionTitle: 'WORK' });
    const expanded = createItemState({ cardTitle: 'Preview', expandedCardTitle: 'Expanded', sectionTitle: 'DETAILS' });

    expect(getHudFocus({ effectiveFocusCard: focused, expandedCard: expanded, featuredItem: featured })).toEqual({
      card: 'Expanded',
      section: 'DETAILS'
    });
    expect(getHudFocus({ effectiveFocusCard: focused, expandedCard: null, featuredItem: featured })).toEqual({
      card: 'Focused',
      section: 'WORK'
    });
    expect(getHudFocus({ effectiveFocusCard: null, expandedCard: null, featuredItem: featured })).toEqual({
      card: 'Featured',
      section: 'PROFILE'
    });
  });

  it('getAdjacentCardNavigation wraps around card list', () => {
    const cards = [
      createItemState({ cardIndex: 1 }),
      createItemState({ cardIndex: 2 }),
      createItemState({ cardIndex: 3 })
    ];

    expect(
      getAdjacentCardNavigation({
        cardItems: cards,
        currentCard: cards[2],
        direction: 1,
        featuredItem: cards[0],
        getAnchorForCard: (item) => item.cardIndex * 100,
        normalizeAnchor: (anchor) => anchor
      })
    ).toEqual({
      anchor: 100,
      cardIndex: 1
    });
  });

  it('getSceneNavigationTargets keeps sections without cards', () => {
    const cards = [
      createItemState({ cardIndex: 1, cardTitle: 'A', sectionTitle: 'ONE' }),
      createItemState({ cardIndex: 2, cardTitle: 'B', sectionTitle: 'ONE' })
    ];

    const sections = getSectionNavigationTargets({
      cardItems: cards,
      getAnchorForCard: (item: any) => item.cardIndex * 10,
      getAnchorForItemIndex: (itemIndex: number) => itemIndex * 100,
      normalizeAnchor: (anchor: number) => anchor,
      sectionHeadings: ['ONE', 'TWO'],
      is2DMode: false
    });

    expect(sections[0]).toMatchObject({ section: 'ONE', cards: [{ cardIndex: 1 }, { cardIndex: 2 }] });
    expect(sections[1]).toMatchObject({ section: 'TWO', cards: [], anchor: 400 });
  });
});
