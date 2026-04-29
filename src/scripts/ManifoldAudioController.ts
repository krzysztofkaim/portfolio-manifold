import { MANIFOLD_AUDIO_TARGET_VOLUME } from '../config/manifold/ManifoldBootConfig';
import type { ManifoldModeController } from '../experience/ManifoldModeController';
import type { ManifoldAudioLocaleStrings } from '../i18n/manifoldLocale';
import { pretextLayoutService } from '../ui/text/PretextLayoutService';
import { IS_IOS } from '../utils/browserDetection';

interface AudioElements {
  audioButton: HTMLButtonElement | null;
  audioLabel: HTMLElement | null;
}

interface ManifoldAudioControllerContext {
  getController(): ManifoldModeController | null;
  getTargetVelocity(): number;
  onAudioPlayed?(): void;
}

export class ManifoldAudioController {
  private elements: AudioElements | null = null;
  private soundtrack: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private audioAnalyser: AnalyserNode | null = null;
  private audioAnalyserData: Uint8Array<ArrayBuffer> | null = null;
  private aggregatedBuffer: Float32Array | null = null;
  private lastAggregatedEnergy = 0;
  private audioStreamSourceNode: MediaStreamAudioSourceNode | null = null;
  private audioReactiveEnergy = 0;
  private audioReactivePulse = 0;
  private audioReactiveTargetEnergy = 0;
  private audioReactiveTargetPulse = 0;
  private lastAudioAnalysisTime = 0;
  private lastAudioControllerSyncTime = 0;
  private audioIsPlaying = false;
  private lastSentAudioEnergy = 0;
  private lastSentAudioPulse = 0;
  private lastSentAudioActive = false;
  private audioBeatBaseline = 0;
  private audioPreviousLowBand = 0;
  private audioPlaybackGain = 0;
  private audioPlaybackTarget = 0;
  private audioScrollGain = 0.84;
  private audioAnalysisAttachTimeout = 0;
  private lastAudioVolume = -1;
  private lastAudioButtonWidthPx = 0;
  private audioButtonWidthRaf = 0;
  private localeStrings: ManifoldAudioLocaleStrings = {
    enterZenAria: 'Enter zen mode',
    exitZenAria: 'Exit zen mode',
    exitZenLabel: 'Exit zen',
    pauseAria: 'Pause musical background',
    pauseLabel: 'Pause',
    playAria: 'Play musical background',
    playLabel: 'Play',
    zenLabel: 'Zen'
  };

  constructor(private readonly context: ManifoldAudioControllerContext) {}

  setupAudioPlayback(elements: AudioElements): () => void {
    this.elements = elements;
    this.soundtrack = document.getElementById('background-audio') as HTMLAudioElement | null;

    if (elements.audioButton && elements.audioLabel) {
      this.syncAudioButtonWidths(true);
    }

    if (!this.soundtrack) {
      return () => {
        this.elements = null;
      };
    }

    this.soundtrack.preload = 'none';
    this.soundtrack.loop = true;
    this.soundtrack.volume = 0;

    const playAudio = async () => {
      if (!this.soundtrack) {
        return;
      }

      try {
        this.clearAudioAnalysisAttachTimer();
        if (!this.soundtrack.currentSrc) {
          const deferredSrc = this.soundtrack.dataset.src;
          if (deferredSrc) {
            this.soundtrack.src = deferredSrc;
            this.soundtrack.load();
          }
        }
        this.soundtrack.muted = false;
        this.audioPlaybackTarget = 1;
        this.audioPlaybackGain = Math.max(this.audioPlaybackGain, 0.24);
        this.syncAudioOutputVolume();

        if (this.soundtrack.paused || this.soundtrack.ended) {
          const playPromise = this.soundtrack.play();
          if (playPromise) {
            await playPromise;
          }
        }
      } catch (error) {
        this.audioPlaybackTarget = 0;
        this.setAudioButtonState(false);
        console.warn('Audio playback could not start.', error);
      }
    };

    const pauseAudio = () => {
      if (!this.soundtrack) {
        return;
      }

      this.clearAudioAnalysisAttachTimer();
      this.audioPlaybackTarget = 0;
      this.audioPlaybackGain = 0;
      this.soundtrack.volume = 0;
      this.lastAudioVolume = 0;
      if (!this.soundtrack.paused) {
        this.soundtrack.pause();
      }
      this.setAudioButtonState(false);
    };

    const toggleAudio = () => {
      if (!this.soundtrack) {
        return;
      }

      if (this.soundtrack.paused) {
        void playAudio();
        return;
      }

      pauseAudio();
    };

    const handleEnded = () => {
      this.clearAudioAnalysisAttachTimer();
      this.audioPlaybackTarget = 0;
      this.setAudioButtonState(false);
    };

    const handlePlaying = () => {
      this.setAudioButtonState(true);
      this.context.onAudioPlayed?.();
      if (this.soundtrack) {
        this.queueAudioAnalysisAttach(this.soundtrack);
      }
    };

    const handlePauseState = () => {
      if (this.audioPlaybackTarget > 0.001) {
        return;
      }

      this.setAudioButtonState(false);
    };

    elements.audioButton?.addEventListener('click', toggleAudio);
    this.soundtrack.addEventListener('playing', handlePlaying);
    this.soundtrack.addEventListener('pause', handlePauseState);
    this.soundtrack.addEventListener('ended', handleEnded);
    this.setAudioButtonState(false);

    return () => {
      if (this.audioButtonWidthRaf) {
        window.cancelAnimationFrame(this.audioButtonWidthRaf);
        this.audioButtonWidthRaf = 0;
      }

      elements.audioButton?.removeEventListener('click', toggleAudio);
      this.soundtrack?.removeEventListener('playing', handlePlaying);
      this.soundtrack?.removeEventListener('pause', handlePauseState);
      this.soundtrack?.removeEventListener('ended', handleEnded);
      this.clearAudioAnalysisAttachTimer();
      this.resetState();
      this.elements = null;
    };
  }

  setLocaleStrings(strings: ManifoldAudioLocaleStrings): void {
    this.localeStrings = strings;
    this.syncAudioPrimaryButton();
  }

  syncAudioButtonWidths(immediate = false): void {
    if (!this.elements) {
      return;
    }

    if (!this.elements.audioButton || !this.elements.audioLabel) {
      return;
    }

    if (this.audioButtonWidthRaf) {
      window.cancelAnimationFrame(this.audioButtonWidthRaf);
      this.audioButtonWidthRaf = 0;
    }

    const button = this.elements.audioButton;
    const isMobile = window.innerWidth <= 720;
    const targetWidth = pretextLayoutService.measureAudioButtonWidth({
      text: this.elements.audioLabel.textContent?.trim() || 'Play',
      mobile: isMobile
    });
    const currentWidth = this.lastAudioButtonWidthPx > 0 ? this.lastAudioButtonWidthPx : targetWidth;

    if (this.lastAudioButtonWidthPx === targetWidth) {
      return;
    }

    if (IS_IOS || immediate || currentWidth <= 0) {
      button.style.width = `${targetWidth}px`;
      this.lastAudioButtonWidthPx = targetWidth;
      return;
    }

    button.style.width = `${currentWidth}px`;
    this.audioButtonWidthRaf = window.requestAnimationFrame(() => {
      button.style.width = `${targetWidth}px`;
      this.lastAudioButtonWidthPx = targetWidth;
      this.audioButtonWidthRaf = 0;
    });
  }

  updateAudioReactiveState(time: number): void {
    const scrollLoad = Math.abs(this.context.getTargetVelocity());

    if (this.soundtrack && this.audioAnalyser && this.audioAnalyserData && this.audioIsPlaying && !this.soundtrack.paused) {
      const analysisInterval = scrollLoad > 1.35 ? 1000 / 8 : scrollLoad > 0.8 ? 1000 / 12 : 1000 / 18;

      if (this.lastAudioAnalysisTime === 0 || time - this.lastAudioAnalysisTime >= analysisInterval) {
        this.lastAudioAnalysisTime = time;
        this.audioAnalyser.getByteFrequencyData(this.audioAnalyserData);

        let lowTotal = 0;
        let midTotal = 0;
        let lowCount = 0;
        let midCount = 0;
        let peak = 0;

        for (let index = 0; index < this.audioAnalyserData.length; index += 1) {
          const value = this.audioAnalyserData[index] ?? 0;
          peak = Math.max(peak, value);

          if (index < 5) {
            lowTotal += value;
            lowCount += 1;
          } else if (index < 12) {
            midTotal += value;
            midCount += 1;
          }
        }

        const lowAverage = lowCount > 0 ? lowTotal / lowCount : 0;
        const midAverage = midCount > 0 ? midTotal / midCount : 0;
        const weightedEnergy = lowAverage * 0.68 + midAverage * 0.32;
        const nextEnergy = clamp((weightedEnergy - 28) / 96, 0, 1);
        const normalizedLow = lowAverage / 255;
        this.audioBeatBaseline +=
          (normalizedLow - this.audioBeatBaseline) * (normalizedLow > this.audioBeatBaseline ? 0.05 : 0.18);
        const attack = Math.max(0, normalizedLow - this.audioBeatBaseline - 0.035);
        const deltaLow = Math.max(0, normalizedLow - this.audioPreviousLowBand);
        const peakFactor = Math.max(0, peak / 255 - 0.22);
        const nextPulse = clamp(attack * 3.8 + deltaLow * 4.2 + peakFactor * 0.35, 0, 1);
        this.audioPreviousLowBand = normalizedLow;
        this.audioReactiveTargetEnergy = nextEnergy;
        this.audioReactiveTargetPulse = nextPulse;
      }

      this.audioReactiveEnergy +=
        (this.audioReactiveTargetEnergy - this.audioReactiveEnergy) *
        (this.audioReactiveTargetEnergy > this.audioReactiveEnergy ? 0.2 : 0.1);
      this.audioReactivePulse = Math.max(this.audioReactiveTargetPulse, this.audioReactivePulse * 0.86);
    } else {
      this.audioReactiveEnergy += (0 - this.audioReactiveEnergy) * 0.12;
      this.audioReactivePulse += (0 - this.audioReactivePulse) * 0.18;
      this.audioBeatBaseline += (0 - this.audioBeatBaseline) * 0.08;
      this.audioPreviousLowBand += (0 - this.audioPreviousLowBand) * 0.12;
      this.audioReactiveTargetEnergy += (0 - this.audioReactiveTargetEnergy) * 0.12;
      this.audioReactiveTargetPulse += (0 - this.audioReactiveTargetPulse) * 0.18;
      this.lastAudioAnalysisTime = 0;
    }

    const energyDelta = Math.abs(this.audioReactiveEnergy - this.lastSentAudioEnergy);
    const pulseDelta = Math.abs(this.audioReactivePulse - this.lastSentAudioPulse);
    const controllerSyncInterval = scrollLoad > 1.35 ? 1000 / 10 : scrollLoad > 0.8 ? 1000 / 16 : 1000 / 24;
    const shouldSyncController =
      energyDelta > 0.012 ||
      pulseDelta > 0.018 ||
      this.audioIsPlaying !== this.lastSentAudioActive ||
      this.lastAudioControllerSyncTime === 0 ||
      time - this.lastAudioControllerSyncTime >= controllerSyncInterval;
    if (shouldSyncController) {
      this.context.getController()?.setAudioReactiveState(
        this.audioReactiveEnergy,
        this.audioReactivePulse,
        this.audioIsPlaying
      );
      this.lastAudioControllerSyncTime = time;
      this.lastSentAudioEnergy = this.audioReactiveEnergy;
      this.lastSentAudioPulse = this.audioReactivePulse;
      this.lastSentAudioActive = this.audioIsPlaying;
    }
  }

  getFrequencyData(): Uint8Array | null {
    if (!this.audioIsPlaying || !this.audioAnalyser || !this.audioAnalyserData) {
      return null;
    }
    this.audioAnalyser.getByteFrequencyData(this.audioAnalyserData);
    return this.audioAnalyserData;
  }

  getAggregatedFrequencies(): Float32Array | null {
    const raw = this.getFrequencyData();
    if (!raw) return null;

    if (!this.aggregatedBuffer) {
      this.aggregatedBuffer = new Float32Array(16);
    }

    let sum = 0;
    for (let i = 0; i < 16; i++) {
      // Average 2 bins for each aggregated bin
      const v0 = (raw[i * 2] ?? 0) / 255;
      const v1 = (raw[i * 2 + 1] ?? 0) / 255;
      const val = (v0 + v1) * 0.5;
      this.aggregatedBuffer[i] = val;
      sum += val;
    }

    this.lastAggregatedEnergy = sum / 16;
    return this.aggregatedBuffer;
  }

  getAggregatedEnergy(): number {
    return this.lastAggregatedEnergy;
  }

  getAudioActiveState(): boolean {
    return this.audioIsPlaying && this.audioPlaybackGain > 0.01;
  }

  syncAudioOutputVolume(): void {
    if (!this.soundtrack) {
      return;
    }

    if (!this.audioIsPlaying && this.audioPlaybackGain < 0.005 && this.audioPlaybackTarget < 0.005) {
      return;
    }

    const motionTarget = clamp(Math.abs(this.context.getTargetVelocity()) / 1.8, 0, 1);
    const targetScrollGain = 0.84 + motionTarget * 0.16;
    this.audioScrollGain +=
      (targetScrollGain - this.audioScrollGain) * (targetScrollGain > this.audioScrollGain ? 0.065 : 0.025);
    this.audioPlaybackGain +=
      (this.audioPlaybackTarget - this.audioPlaybackGain) * (this.audioPlaybackTarget > this.audioPlaybackGain ? 0.08 : 0.06);
    const nextVolume = MANIFOLD_AUDIO_TARGET_VOLUME * this.audioPlaybackGain * this.audioScrollGain;

    if (Math.abs(nextVolume - this.lastAudioVolume) > 0.0025) {
      this.soundtrack.volume = nextVolume;
      this.lastAudioVolume = nextVolume;
    }

    if (this.audioPlaybackTarget <= 0.001 && this.audioPlaybackGain <= 0.01 && !this.soundtrack.paused) {
      this.soundtrack.pause();
    }
  }

  private ensureAudioAnalysis(audio: HTMLAudioElement): void {
    if (this.audioContext && this.audioAnalyser && this.audioStreamSourceNode) {
      return;
    }

    const AudioContextCtor =
      window.AudioContext ||
      (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) {
      return;
    }

    const captureAudio = audio as HTMLAudioElement & {
      captureStream?: () => MediaStream;
      mozCaptureStream?: () => MediaStream;
    };

    const streamFactory = captureAudio.captureStream ?? captureAudio.mozCaptureStream;
    if (!streamFactory) {
      return;
    }

    this.audioContext = this.audioContext ?? new AudioContextCtor();
    const stream = streamFactory.call(captureAudio);
    this.audioStreamSourceNode = this.audioStreamSourceNode ?? this.audioContext.createMediaStreamSource(stream);
    this.audioAnalyser = this.audioAnalyser ?? this.audioContext.createAnalyser();
    this.audioAnalyser.fftSize = 64;
    this.audioAnalyser.smoothingTimeConstant = 0.8;
    this.audioAnalyserData = this.audioAnalyserData ?? new Uint8Array(this.audioAnalyser.frequencyBinCount);
    this.audioStreamSourceNode.connect(this.audioAnalyser);
  }

  private clearAudioAnalysisAttachTimer(): void {
    if (this.audioAnalysisAttachTimeout) {
      window.clearTimeout(this.audioAnalysisAttachTimeout);
      this.audioAnalysisAttachTimeout = 0;
    }
  }

  private queueAudioAnalysisAttach(audio: HTMLAudioElement): void {
    this.clearAudioAnalysisAttachTimer();
    this.audioAnalysisAttachTimeout = window.setTimeout(() => {
      this.audioAnalysisAttachTimeout = 0;

      if (!this.audioIsPlaying || audio.paused || this.soundtrack !== audio) {
        return;
      }

      try {
        this.ensureAudioAnalysis(audio);
        void this.audioContext?.resume();
      } catch (error) {
        console.warn('Audio analysis could not attach.', error);
      }
    }, 1400);
  }

  private setAudioButtonLabel(text: string): void {
    if (!this.elements) {
      return;
    }

    if (!this.elements.audioLabel) {
      return;
    }

    this.elements.audioLabel.textContent = text;
    this.syncAudioButtonWidths();
  }

  private syncAudioPrimaryButton(): void {
    if (!this.elements?.audioButton) {
      return;
    }

    this.elements.audioButton.classList.toggle('is-playing', this.audioIsPlaying);
    this.elements.audioButton.setAttribute(
      'aria-label',
      this.audioIsPlaying ? this.localeStrings.pauseAria : this.localeStrings.playAria
    );
    this.setAudioButtonLabel(this.audioIsPlaying ? this.localeStrings.pauseLabel : this.localeStrings.playLabel);
  }

  private setAudioButtonState(playing: boolean): void {
    this.audioIsPlaying = playing;
    this.syncAudioPrimaryButton();
  }

  private resetState(): void {
    this.audioReactiveEnergy = 0;
    this.audioReactivePulse = 0;
    this.audioReactiveTargetEnergy = 0;
    this.audioReactiveTargetPulse = 0;
    this.lastAudioAnalysisTime = 0;
    this.lastAudioControllerSyncTime = 0;
    this.audioIsPlaying = false;
    this.lastSentAudioEnergy = 0;
    this.lastSentAudioPulse = 0;
    this.lastSentAudioActive = false;
    this.audioBeatBaseline = 0;
    this.audioPreviousLowBand = 0;
    this.audioPlaybackGain = 0;
    this.audioPlaybackTarget = 0;
    this.audioScrollGain = 0.84;
    this.lastAudioVolume = -1;
    this.lastAudioButtonWidthPx = 0;
    this.audioStreamSourceNode?.disconnect();
    this.audioAnalyser?.disconnect();
    this.audioStreamSourceNode = null;
    this.audioAnalyser = null;
    this.audioAnalyserData = null;
    if (this.soundtrack) {
      this.soundtrack.pause();
      this.soundtrack.removeAttribute('src');
      this.soundtrack.load();
      this.soundtrack = null;
    }
    void this.audioContext?.close();
    this.audioContext = null;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
