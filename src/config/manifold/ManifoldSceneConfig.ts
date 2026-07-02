export const MANIFOLD_MOBILE_BREAKPOINT = 720;
export const MANIFOLD_ADAPTIVE_COOLDOWN_MS = 2200;

export const MANIFOLD_SCENE_CONFIG = {
  itemCount: 20,
  starCount: 96,
  zGap: 800,
  camSpeed: 2.5,
  featuredIndex: 1,
  colors: ['#ff9a4d', '#ff8a3d', '#ffb36b', '#ffd2a3']
} as const;

export const MANIFOLD_SECTION_HEADINGS = [
  'PROFILE',
  'DEPLOYMENTS',
  'OPERATIONS',
  'CAPABILITIES',
  'CREDENTIALS'
] as const;

export const MANIFOLD_SECTION_TONES: Record<
  (typeof MANIFOLD_SECTION_HEADINGS)[number],
  { accent: string; accentSoft: string; railEnd: string }
> = {
  PROFILE: {
    accent: '#ff9e63',
    accentSoft: 'rgba(255, 158, 99, 0.22)',
    railEnd: '#ff8450'
  },
  DEPLOYMENTS: {
    accent: '#ff7446',
    accentSoft: 'rgba(255, 116, 70, 0.24)',
    railEnd: '#ff5a32'
  },
  OPERATIONS: {
    accent: '#ff8d53',
    accentSoft: 'rgba(255, 141, 83, 0.22)',
    railEnd: '#ff7240'
  },
  CAPABILITIES: {
    accent: '#ffb55c',
    accentSoft: 'rgba(255, 181, 92, 0.22)',
    railEnd: '#ff9740'
  },
  CREDENTIALS: {
    accent: '#ffd08a',
    accentSoft: 'rgba(255, 208, 138, 0.24)',
    railEnd: '#ffb768'
  }
};

export const TITLE_SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export const CARD_PIXEL_PRESETS = [
  { gap: 12, speed: 24, colors: '#ffd8b4,#ffb36b,#ff8a3d' },
  { gap: 12, speed: 22, colors: '#e0f2fe,#7dd3fc,#0ea5e9' },
  { gap: 12, speed: 18, colors: '#fef08a,#fde047,#eab308' },
  { gap: 12, speed: 32, colors: '#fecdd3,#fda4af,#e11d48' },
  { gap: 12, speed: 20, colors: '#dbeafe,#93c5fd,#3b82f6' },
  { gap: 12, speed: 26, colors: '#fed7aa,#fb923c,#ea580c' }
] as const;

export interface ManifoldSceneRuntimeConfig {
  camSpeed: number;
  featuredIndex: number;
  itemCount: number;
  starCount: number;
  zGap: number;
}

export interface ManifoldSceneRuntimeConfigInput {
  deviceMemory: number;
  hardwareThreads: number;
  isMobileViewport: boolean;
  prefersReducedMotion: boolean;
}

export function createManifoldSceneRuntimeConfig(
  input: ManifoldSceneRuntimeConfigInput
): ManifoldSceneRuntimeConfig {
  return {
    itemCount: MANIFOLD_SCENE_CONFIG.itemCount,
    starCount: input.prefersReducedMotion
      ? 18
      : input.deviceMemory <= 4 || input.hardwareThreads <= 4
        ? 24
        : input.isMobileViewport
          ? 32
          : MANIFOLD_SCENE_CONFIG.starCount,
    zGap: MANIFOLD_SCENE_CONFIG.zGap,
    camSpeed: MANIFOLD_SCENE_CONFIG.camSpeed,
    featuredIndex: MANIFOLD_SCENE_CONFIG.featuredIndex
  };
}
