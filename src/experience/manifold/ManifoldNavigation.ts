import type { ItemState, SceneNavigationCard, SceneNavigationSection } from './ManifoldTypes';

export type NavigationAnchorMode = 'nearest' | 'forward' | 'backward' | 'smart';

export function findCardItemByIndex(
  cardItems: readonly ItemState[],
  cardIndex: number
): ItemState | null {
  return cardItems.find((candidate) => candidate.cardIndex === cardIndex) ?? null;
}

export function getCentered2DCard(cardItems: readonly ItemState[]): ItemState | null {
  let closestCard: ItemState | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < cardItems.length; index += 1) {
    const item = cardItems[index];
    if (!item || item.currentAlpha <= 0.04) {
      continue;
    }

    const distance = Math.hypot(item.currentScreenX, item.currentScreenY);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestCard = item;
    }
  }

  return closestCard;
}

export function getEffectiveFocusCard(input: {
  centered2DCard: ItemState | null;
  closestVisibleCard: ItemState | null;
  featuredItem: ItemState | null;
  is2DMode: boolean;
  lastCentered2DCard: ItemState | null;
}): ItemState | null {
  if (input.is2DMode) {
    return input.lastCentered2DCard ?? input.centered2DCard ?? input.featuredItem ?? null;
  }

  return input.closestVisibleCard ?? input.featuredItem ?? null;
}

export function getHudFocus(input: {
  effectiveFocusCard: ItemState | null;
  expandedCard: ItemState | null;
  featuredItem: ItemState | null;
}): { card: string; section: string } {
  if (input.expandedCard) {
    return {
      section: input.expandedCard.sectionTitle || 'PROFILE',
      card: input.expandedCard.expandedCardTitle || input.expandedCard.cardTitle || 'KAIM'
    };
  }

  const closestCard = input.effectiveFocusCard;
  if (!closestCard) {
    return {
      section: input.featuredItem?.sectionTitle || 'PROFILE',
      card: input.featuredItem?.cardTitle || 'KAIM'
    };
  }

  return {
    section: closestCard.sectionTitle || 'PROFILE',
    card: closestCard.cardTitle || 'KAIM'
  };
}

export function getCardNavigationAnchor(input: {
  cardIndex: number;
  cardItems: readonly ItemState[];
  getAnchorForCard: (item: ItemState) => number;
  mode?: NavigationAnchorMode;
  normalizeAnchor: (anchor: number, mode: NavigationAnchorMode) => number;
}): number | null {
  const item = findCardItemByIndex(input.cardItems, input.cardIndex);
  if (!item) {
    return null;
  }

  return input.normalizeAnchor(input.getAnchorForCard(item), input.mode ?? 'nearest');
}

export function getAdjacentCardNavigation(input: {
  cardItems: readonly ItemState[];
  currentCard: ItemState | null;
  direction: 1 | -1;
  featuredItem: ItemState | null;
  getAnchorForCard: (item: ItemState) => number;
  normalizeAnchor: (anchor: number, mode: NavigationAnchorMode) => number;
}): { anchor: number; cardIndex: number } | null {
  const cards = input.cardItems;
  if (cards.length === 0) {
    return null;
  }

  const current = input.currentCard ?? input.featuredItem ?? cards[0] ?? null;
  if (!current) {
    return null;
  }

  const currentIndex = cards.findIndex((item) => item.cardIndex === current.cardIndex);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = (safeIndex + input.direction + cards.length) % cards.length;
  const nextCard = cards[nextIndex] ?? null;

  if (!nextCard) {
    return null;
  }

  return {
    anchor: input.normalizeAnchor(input.getAnchorForCard(nextCard), input.direction > 0 ? 'forward' : 'backward'),
    cardIndex: nextCard.cardIndex
  };
}

export function getSectionNavigationTargets(input: {
  cardItems: readonly ItemState[];
  getAnchorForCard: (item: ItemState) => number;
  getAnchorForItemIndex: (itemIndex: number) => number;
  normalizeAnchor: (anchor: number, mode: NavigationAnchorMode) => number;
  sectionHeadings: readonly string[];
  is2DMode: boolean;
}): SceneNavigationSection[] {
  const sections: SceneNavigationSection[] = [];

  for (let sectionIndex = 0; sectionIndex < input.sectionHeadings.length; sectionIndex += 1) {
    const sectionTitle = input.sectionHeadings[sectionIndex] ?? 'PROFILE';
    const sectionItems = input.cardItems.filter(item => item.sectionTitle === sectionTitle);
    
    let bestAnchor: number;
    const firstCard = sectionItems.find(item => item.type === 'card') || sectionItems[0];
    
    if (firstCard) {
      bestAnchor = input.normalizeAnchor(input.getAnchorForCard(firstCard), 'nearest');
    } else {
      const initialAnchor = input.getAnchorForItemIndex(sectionIndex * 4);
      bestAnchor = input.normalizeAnchor(initialAnchor, 'nearest');
    }

    const cards: SceneNavigationCard[] = sectionItems.map(item => ({
      anchor: input.getAnchorForCard(item),
      card: item.cardTitle,
      cardIndex: item.cardIndex
    }));

    sections.push({
      anchor: bestAnchor,
      cards,
      section: sectionTitle
    });
  }

  return sections;
}
