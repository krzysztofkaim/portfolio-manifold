import { MANIFOLD_SECTION_HEADINGS } from '../config/manifold/ManifoldSceneConfig';
import type { CvCardContent } from '../experience/manifold/ManifoldTypes';
import { EN_BUNDLE, EN_CV_CARDS, EN_FEATURED_INTRO_CARD } from './locales/en';
import { PL_BUNDLE, PL_CV_CARDS, PL_FEATURED_INTRO_CARD } from './locales/pl';

export type ManifoldLocale = 'en' | 'pl';
export type ManifoldSectionKey = (typeof MANIFOLD_SECTION_HEADINGS)[number];
export const MANIFOLD_LOCALE_STORAGE_KEY = 'manifold-locale';

export interface ManifoldAudioLocaleStrings {
  enterZenAria: string;
  exitZenAria: string;
  exitZenLabel: string;
  pauseAria: string;
  pauseLabel: string;
  playAria: string;
  playLabel: string;
  zenLabel: string;
}

export interface ManifoldUiLocaleStrings {
  additionalOptions: string;
  additionalOptionsHint: string;
  aboutLabel: string;
  aboutCloseLabel: string;
  aboutContent: {
    stack: string;
    trivia: string;
    build: string;
    runtime: string;
    authorTime: string;
    visitor: string;
    authorStatus: {
      sleeping: string;
      breakfast: string;
      working: string;
      chillingPostWork: string;
      walking: string;
      chilling: string;
    };
  };
  cardHighlights: string;
  cardSnapshot: string;
  clickCardForDetails: string;
  closeNavigationAria: string;
  coord: string;
  cvDownloadAria: string;
  cvLabel: string;
  contactLabel: string;
  contactAria: string;
  contactEmail: string;
  enteringAutomatically: string;
  entryPoint: string;
  fps: string;
  fullRate: string;
  fullRateBoost: string;
  focusLock: string;
  hudHintLineOne: string;
  hudHintLineTwo: string;
  hudTravelLineOne: string;
  jumpAcrossCards: string;
  jumpAcrossSections: string;
  localeLabel: string;
  localeSwitchToEnglish: string;
  localeSwitchToPolish: string;
  menuAriaLabel: string;
  mode2D: string;
  mode3D: string;
  mode4D: string;
  currentModeAriaPrefix: string;
  nextCardAria: string;
  nextCardSectionAria: string;
  nextPageAria: string;
  orbitToggle: string;
  orbitToggleActive: string;
  orbitToggleInactive: string;
  orbitToggleAria: string;
  previousPageAria: string;
  previousCardAria: string;
  powerSave: string;
  perf: string;
  policyLabel: string;
  policyCloseLabel: string;
  policyContent: {
    intro: string;
    processingTitle: string;
    processingBody: string;
    storageTitle: string;
    storageBody: string;
    audioTitle: string;
    audioBody: string;
    telemetryTitle: string;
    telemetryBody: string;
    performanceTitle: string;
    performanceBody: string;
    contactTitle: string;
    contactBody: string;
    rightsTitle: string;
    rightsBody: string;
  };
  privacyLabel: string;
  privacyCloseLabel: string;
  privacyContent: string;
  return: string;
  sceneNavigation: string;
  returnToEntryAria: string;
  scrollArrowsToExit: string;
  scrollArrowsWsToMove: string;
  scrollToExit: string;
  scrollVelocity: string;
  scrollToBrowse: string;
  scrollToExitCard: string;
  scrollPrompt: string;
  sectionKicker: string;
  systemLoader: string;
  topbarRole: string;
  twoDSection: string;
  systemOverlayToggleAria: string;
  systemOverlayToggleActive: string;
  systemOverlayToggleInactive: string;
  systemOverlayOn: string;
  systemOverlayOff: string;
  zenLock: string;
}

export interface ManifoldDocumentLocaleStrings {
  cvDownloadFileName: string;
  cvDownloadHref: string;
  description: string;
  lang: string;
  title: string;
}

export interface ManifoldLocaleBundle {
  audio: ManifoldAudioLocaleStrings;
  document: ManifoldDocumentLocaleStrings;
  sectionLabels: Record<ManifoldSectionKey, string>;
  ui: ManifoldUiLocaleStrings;
}

const BUNDLES: Record<ManifoldLocale, ManifoldLocaleBundle> = {
  en: EN_BUNDLE,
  pl: PL_BUNDLE
};

const FEATURED_INTRO_CARD_BUNDLES: Record<ManifoldLocale, CvCardContent> = {
  en: EN_FEATURED_INTRO_CARD,
  pl: PL_FEATURED_INTRO_CARD
};

export function getManifoldLocaleBundle(locale: ManifoldLocale): ManifoldLocaleBundle {
  return BUNDLES[locale];
}

export function getLocalePerfModeLabel(locale: ManifoldLocale, modeLabel: string): string {
  const ui = getManifoldLocaleBundle(locale).ui;
  switch (modeLabel) {
    case 'BALANCED':
      return locale === 'pl' ? 'ZBALANSOWANY' : 'BALANCED';
    case 'FOCUS LOCK':
      return ui.focusLock;
    case 'FULL RATE':
      return ui.fullRate;
    case 'FULL RATE+':
      return ui.fullRateBoost;
    case 'POWER SAVE':
      return ui.powerSave;
    case 'ZEN LOCK':
      return ui.zenLock;
    default:
      return modeLabel;
  }
}

export function getLocalizedFeaturedIntroCard(locale: ManifoldLocale): CvCardContent {
  return FEATURED_INTRO_CARD_BUNDLES[locale];
}

export function getNextManifoldLocale(locale: ManifoldLocale): ManifoldLocale {
  return locale === 'en' ? 'pl' : 'en';
}

export function localizeSectionTitle(sectionTitle: string, locale: ManifoldLocale): string {
  const bundle = getManifoldLocaleBundle(locale);
  return bundle.sectionLabels[sectionTitle as ManifoldSectionKey] ?? sectionTitle;
}

export function getLocalizedCvCards(locale: ManifoldLocale): readonly CvCardContent[] {
  return locale === 'pl' ? PL_CV_CARDS : EN_CV_CARDS;
}

export function resolveManifoldLocaleFromEnvironment(): ManifoldLocale {
  const browserLanguages = navigator.languages ?? [navigator.language];

  for (const language of browserLanguages) {
    const normalizedLanguage = language.toLowerCase();
    if (normalizedLanguage.startsWith('pl')) {
      return 'pl';
    }
  }

  for (const language of browserLanguages) {
    try {
      const locale = new Intl.Locale(language);
      const region = locale.region ?? locale.maximize().region;
      if (region === 'PL') {
        return 'pl';
      }
    } catch {
      continue;
    }
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone?.toLowerCase() ?? '';
  if (timezone === 'europe/warsaw') {
    return 'pl';
  }

  return 'en';
}
