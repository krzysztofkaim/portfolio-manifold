import {
  getManifoldLocaleBundle,
  getNextManifoldLocale,
  MANIFOLD_LOCALE_STORAGE_KEY,
  resolveManifoldLocaleFromEnvironment,
  type ManifoldAudioLocaleStrings
} from '../../i18n/manifoldLocale';
import { getLocalePath, resolveLocaleFromPathname } from '../../i18n/localeRouting';
import type { ManifoldLocale } from '../../i18n/manifoldLocale';

// Import from the ManifoldModeSelector file
interface ManifoldModeSelectorLocaleStrings {
  currentModeAriaPrefix: string;
  menuAriaLabel: string;
  mode2D: string;
  mode3D: string;
  mode4D: string;
}

export interface LocaleElements {
  topbarLoaderKicker: HTMLElement;
  topbarRole: HTMLElement;
  downloadCv: HTMLAnchorElement;
  downloadCvLabel: HTMLElement;
  contactButton: HTMLButtonElement;
  contactLabel: HTMLElement;
  audioButton: HTMLButtonElement | null;
  audioLabel: HTMLElement | null;
  localeButton: HTMLButtonElement;
  localeLabel: HTMLElement;
  modeToggle: {
    button: HTMLButtonElement;
    label: HTMLElement;
    menu: HTMLElement;
    option2D: HTMLButtonElement;
    option3D: HTMLButtonElement;
    option4D: HTMLButtonElement;
    picker: HTMLElement;
  };
  advanceButtons: {
    next: HTMLButtonElement;
    prev: HTMLButtonElement;
  };
  hud: {
    perfLabel: HTMLElement;
    perfSidebarLabel: HTMLElement;
    fpsLabel: HTMLElement;
    coordPrefix: HTMLElement;
    velocityLabel: HTMLElement;
  };
  hudNav: {
    kicker: HTMLElement;
    title: HTMLElement;
    backdrop: HTMLButtonElement;
    orbitToggleButton: HTMLButtonElement;
    orbitToggleLabel: HTMLElement;
    additionalLabel: HTMLElement;
    privacyTrigger: HTMLButtonElement;
    privacyLabel: HTMLElement;
    aboutTrigger: HTMLButtonElement;
    aboutLabel: HTMLElement;
    policyTrigger: HTMLButtonElement;
    policyLabel: HTMLElement;
    aboutStack: HTMLElement;
    aboutTrivia: HTMLElement;
    aboutVisitor: HTMLElement;
    policyIntro: HTMLElement;
    policyProcessingTitle: HTMLElement;
    policyProcessingBody: HTMLElement;
    policyStorageTitle: HTMLElement;
    policyStorageBody: HTMLElement;
    policyAudioTitle: HTMLElement;
    policyAudioBody: HTMLElement;
    policyTelemetryTitle: HTMLElement;
    policyTelemetryBody: HTMLElement;
    policyPerformanceTitle: HTMLElement;
    policyPerformanceBody: HTMLElement;
    policyContactTitle: HTMLElement;
    policyContactBody: HTMLElement;
    policyRightsTitle: HTMLElement;
    policyRightsBody: HTMLElement;
  };
  exitButton: HTMLButtonElement;
  exitButtonLabel: HTMLElement;
  twoDSectionFrameKicker: HTMLElement;
  introHintKicker: HTMLElement;
  introHintTitle: HTMLElement;
  contextHintKicker: HTMLElement;
  contextHintTitle: HTMLElement;
  footerPrivacyLink: HTMLAnchorElement | null;
}

export interface LocaleController {
  setLocale(locale: ManifoldLocale): void;
}

export interface AudioLocaleController {
  setLocaleStrings(strings: ManifoldAudioLocaleStrings): void;
}

export interface ModeSelectorLocaleController {
  setLocaleStrings(strings: ManifoldModeSelectorLocaleStrings): void;
}

export interface ManifoldAppSync {
  syncHudNavigationMode(): void;
  syncHudSubviewPagers(): void;
  syncOrbitToggleLabel(): void;
  syncToggledButtonLabels(): void;
}

export class ManifoldAppLocale {
  private activeLocale: ManifoldLocale = 'en';
  private controllerRef: LocaleController | null;
  private manifoldAppRef: ManifoldAppSync | null = null;
  private static readonly TRANSITION_STORAGE_KEY = 'manifold-locale-transition';
  private static readonly TRANSITION_NAV_DELAY_MS = 120;

  constructor(
    private readonly elements: LocaleElements,
    controller: LocaleController | null,
    private readonly audioController: AudioLocaleController,
    private readonly modeSelector: ModeSelectorLocaleController
  ) {
    this.controllerRef = controller;
  }

  attachManifoldApp(app: ManifoldAppSync): void {
    this.manifoldAppRef = app;
  }

  attachController(controller: LocaleController): void {
    this.controllerRef = controller;
  }

  resolveInitialLocale(): ManifoldLocale {
    const localeFromPath = resolveLocaleFromPathname(window.location.pathname);
    if (localeFromPath) {
      this.activeLocale = localeFromPath;
      return localeFromPath;
    }

    const storedLocale = this.readStoredLocale();
    if (storedLocale) {
      this.activeLocale = storedLocale;
      return storedLocale;
    }

    this.activeLocale = resolveManifoldLocaleFromEnvironment();
    return this.activeLocale;
  }

  getActiveLocale(): ManifoldLocale {
    return this.activeLocale;
  }

  getActiveLocaleBundle(): ReturnType<typeof getManifoldLocaleBundle> {
    return getManifoldLocaleBundle(this.activeLocale);
  }

  setup(): (() => void) {
    this.applyLocale(this.activeLocale);
    
    const handleClick = () => {
      this.navigateToLocale(getNextManifoldLocale(this.activeLocale));
    };

    this.elements.localeButton.addEventListener('click', handleClick);
    
    return () => {
      this.elements.localeButton.removeEventListener('click', handleClick);
    };
  }

  applyLocale(locale: ManifoldLocale): void {
    this.activeLocale = locale;
    this.persistLocale(locale);
    this.applyToUi(locale);
    this.controllerRef?.setLocale(locale);
    this.audioController.setLocaleStrings(getManifoldLocaleBundle(locale).audio);
    this.manifoldAppRef?.syncHudNavigationMode();
    this.manifoldAppRef?.syncOrbitToggleLabel();
    this.manifoldAppRef?.syncToggledButtonLabels();
    this.manifoldAppRef?.syncHudSubviewPagers();
  }

  private navigateToLocale(locale: ManifoldLocale): void {
    this.persistLocale(locale);
    this.persistLocaleTransition(locale);
    document.body.classList.add('locale-transitioning');
    const targetPath = getLocalePath(locale);
    const nextUrl = `${targetPath}${window.location.search}${window.location.hash}`;

    if (window.location.pathname === targetPath) {
      this.applyLocale(locale);
      return;
    }

    window.setTimeout(() => {
      window.location.assign(nextUrl);
    }, ManifoldAppLocale.TRANSITION_NAV_DELAY_MS);
  }

  private persistLocaleTransition(locale: ManifoldLocale): void {
    try {
      window.sessionStorage.setItem(
        ManifoldAppLocale.TRANSITION_STORAGE_KEY,
        JSON.stringify({
          locale,
          startedAt: Date.now()
        })
      );
    } catch {
      return;
    }
  }

  private applyToUi(locale: ManifoldLocale): void {
    const bundle = getManifoldLocaleBundle(locale);
    const { audio, document: documentStrings, ui } = bundle;
    const nextLocale = getNextManifoldLocale(locale);

    this.applyToDocument(locale);

    const el = this.elements;
    if (el.topbarLoaderKicker) el.topbarLoaderKicker.textContent = ui.systemLoader;
    if (el.topbarRole) el.topbarRole.textContent = ui.topbarRole;
    if (el.downloadCv) if (el.downloadCv) el.downloadCv.href = documentStrings.cvDownloadHref;
    if (el.downloadCv) if (el.downloadCv) el.downloadCv.download = documentStrings.cvDownloadFileName;
    el.downloadCv?.setAttribute('aria-label', ui.cvDownloadAria);
    if (el.downloadCvLabel) el.downloadCvLabel.textContent = ui.cvLabel;
    if (el.downloadCvLabel) el.downloadCvLabel.dataset.text = ui.cvLabel;
    el.contactButton?.setAttribute('aria-label', ui.contactAria);
    if (el.contactButton) el.contactButton.dataset.u = locale === 'pl' ? 'kontakt' : 'contact';
    const contactUserEl = el.contactLabel.querySelector('.contact-u');
    if (contactUserEl) contactUserEl.textContent = ui.contactLabel;
    el.audioButton?.setAttribute('aria-label', audio.playAria);
    if (el.audioLabel) el.audioLabel.textContent = audio.playLabel;
    if (el.localeLabel) el.localeLabel.textContent = ui.localeLabel;
    el.localeButton?.setAttribute(
      'aria-label',
      nextLocale === 'pl' ? ui.localeSwitchToPolish : ui.localeSwitchToEnglish
    );
    el.localeButton?.setAttribute('aria-pressed', locale === 'pl' ? 'true' : 'false');
    if (el.localeButton) el.localeButton.dataset.locale = locale;
    el.modeToggle.menu?.setAttribute('aria-label', ui.menuAriaLabel);
    el.modeToggle.option2D.querySelector('span:last-child')!.textContent = ui.mode2D;
    el.modeToggle.option3D.querySelector('span:last-child')!.textContent = ui.mode3D;
    el.modeToggle.option4D.querySelector('span:last-child')!.textContent = ui.mode4D;
    el.advanceButtons.prev?.setAttribute('aria-label', ui.previousCardAria);
    el.advanceButtons.next?.setAttribute('aria-label', ui.nextCardAria);

    // Note: modeSelector update logic depends on current active mode which might not be known here easily
    // We pass it through a setter in the modeSelector
    this.modeSelector.setLocaleStrings({
      currentModeAriaPrefix: ui.currentModeAriaPrefix,
      menuAriaLabel: ui.menuAriaLabel,
      mode2D: ui.mode2D,
      mode3D: ui.mode3D,
      mode4D: ui.mode4D
    });

    if (el.hud.perfLabel) el.hud.perfLabel.textContent = ui.perf;
    if (el.hud.perfSidebarLabel) el.hud.perfSidebarLabel.textContent = ui.perf;
    if (el.hud.fpsLabel) el.hud.fpsLabel.textContent = ui.fps;
    if (el.hud.coordPrefix) el.hud.coordPrefix.textContent = ui.coord;
    if (el.hud.velocityLabel) el.hud.velocityLabel.textContent = ui.scrollVelocity;
    if (el.hudNav.kicker) el.hudNav.kicker.textContent = ui.sceneNavigation;
    if (el.hudNav.title) el.hudNav.title.textContent = ui.jumpAcrossSections;
    el.hudNav.backdrop?.setAttribute('aria-label', ui.closeNavigationAria);
    el.hudNav.orbitToggleButton?.setAttribute('aria-label', ui.orbitToggleAria);
    if (el.hudNav.orbitToggleLabel) el.hudNav.orbitToggleLabel.textContent = ui.orbitToggle;
    if (el.hudNav.additionalLabel) el.hudNav.additionalLabel.textContent = ui.additionalOptions;
    el.hudNav.privacyTrigger?.setAttribute('aria-label', ui.privacyLabel);
    if (el.hudNav.privacyLabel) el.hudNav.privacyLabel.textContent = ui.privacyLabel;
    el.hudNav.aboutTrigger?.setAttribute('aria-label', ui.aboutLabel);
    if (el.hudNav.aboutLabel) el.hudNav.aboutLabel.textContent = ui.aboutLabel;
    el.hudNav.policyTrigger?.setAttribute('aria-label', ui.policyLabel);
    if (el.hudNav.policyLabel) el.hudNav.policyLabel.textContent = ui.policyLabel;
    el.hudNav.debugForceButton?.setAttribute('aria-label', ui.systemOverlayToggleAria);
    if (el.hudNav.aboutStack) el.hudNav.aboutStack.textContent = ui.aboutContent.stack;
    if (el.hudNav.aboutTrivia) el.hudNav.aboutTrivia.textContent = ui.aboutContent.trivia;
    if (el.hudNav.aboutVisitor) el.hudNav.aboutVisitor.textContent = ui.aboutContent.visitor;
    if (el.hudNav.policyIntro) el.hudNav.policyIntro.textContent = ui.policyContent.intro;
    if (el.hudNav.policyProcessingTitle) el.hudNav.policyProcessingTitle.textContent = ui.policyContent.processingTitle;
    if (el.hudNav.policyProcessingBody) el.hudNav.policyProcessingBody.textContent = ui.policyContent.processingBody;
    if (el.hudNav.policyStorageTitle) el.hudNav.policyStorageTitle.textContent = ui.policyContent.storageTitle;
    if (el.hudNav.policyStorageBody) el.hudNav.policyStorageBody.textContent = ui.policyContent.storageBody;
    if (el.hudNav.policyAudioTitle) el.hudNav.policyAudioTitle.textContent = ui.policyContent.audioTitle;
    if (el.hudNav.policyAudioBody) el.hudNav.policyAudioBody.textContent = ui.policyContent.audioBody;
    if (el.hudNav.policyTelemetryTitle) el.hudNav.policyTelemetryTitle.textContent = ui.policyContent.telemetryTitle;
    if (el.hudNav.policyTelemetryBody) el.hudNav.policyTelemetryBody.textContent = ui.policyContent.telemetryBody;
    if (el.hudNav.policyPerformanceTitle) el.hudNav.policyPerformanceTitle.textContent = ui.policyContent.performanceTitle;
    if (el.hudNav.policyPerformanceBody) el.hudNav.policyPerformanceBody.textContent = ui.policyContent.performanceBody;
    if (el.hudNav.policyContactTitle) el.hudNav.policyContactTitle.textContent = ui.policyContent.contactTitle;
    if (el.hudNav.policyContactBody) el.hudNav.policyContactBody.textContent = ui.policyContent.contactBody;
    if (el.hudNav.policyRightsTitle) el.hudNav.policyRightsTitle.textContent = ui.policyContent.rightsTitle;
    if (el.hudNav.policyRightsBody) el.hudNav.policyRightsBody.textContent = ui.policyContent.rightsBody;
    el.exitButton?.setAttribute('aria-label', ui.returnToEntryAria);
    if (el.exitButtonLabel) el.exitButtonLabel.textContent = ui.return;
    if (el.twoDSectionFrameKicker) el.twoDSectionFrameKicker.textContent = ui.twoDSection;
    if (el.introHintKicker) el.introHintKicker.textContent = ui.entryPoint;
    if (el.introHintTitle) el.introHintTitle.textContent = ui.enteringAutomatically;
    if (el.contextHintKicker) el.contextHintKicker.textContent = ui.scrollToBrowse;
    if (el.contextHintTitle) el.contextHintTitle.textContent = ui.clickCardForDetails;
  }

  private applyToDocument(locale: ManifoldLocale): void {
    const documentStrings = getManifoldLocaleBundle(locale).document;
    document.documentElement.lang = documentStrings.lang;
    document.title = documentStrings.title;

    const descriptionMeta = document.getElementById('meta-description');
    if (descriptionMeta instanceof HTMLMetaElement) {
      descriptionMeta.content = documentStrings.description;
    }

    const ogTitleMeta = document.getElementById('meta-og-title');
    if (ogTitleMeta instanceof HTMLMetaElement) {
      ogTitleMeta.content = documentStrings.title;
    }

    const ogDescriptionMeta = document.getElementById('meta-og-description');
    if (ogDescriptionMeta instanceof HTMLMetaElement) {
      ogDescriptionMeta.content = documentStrings.description;
    }
  }

  private readStoredLocale(): ManifoldLocale | null {
    try {
      const value = window.localStorage.getItem(MANIFOLD_LOCALE_STORAGE_KEY);
      return value === 'pl' || value === 'en' ? value : null;
    } catch {
      return null;
    }
  }

  private persistLocale(locale: ManifoldLocale): void {
    try {
      window.localStorage.setItem(MANIFOLD_LOCALE_STORAGE_KEY, locale);
    } catch {
      return;
    }
  }
}
