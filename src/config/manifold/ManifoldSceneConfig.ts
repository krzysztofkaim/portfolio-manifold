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

export const MANIFOLD_SECTION_HEADINGS = ['PROFILE', 'DEPLOYMENTS', 'OPERATIONS', 'CAPABILITIES', 'CREDENTIALS'] as const;

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

export const CARD_ICON_PATHS = [
  'M216,42H40A14,14,0,0,0,26,56V200a14,14,0,0,0,14,14H216a14,14,0,0,0,14-14V56A14,14,0,0,0,216,42ZM40,54H216a2,2,0,0,1,2,2V98H38V56A2,2,0,0,1,40,54ZM38,200V110H98v92H40A2,2,0,0,1,38,200Zm178,2H110V110H218v90A2,2,0,0,1,216,202Z',
  'M67.84,92.61,25.37,128l42.47,35.39a6,6,0,1,1-7.68,9.22l-48-40a6,6,0,0,1,0-9.22l48-40a6,6,0,0,1,7.68,9.22Zm176,30.78-48-40a6,6,0,1,0-7.68,9.22L230.63,128l-42.47,35.39a6,6,0,1,0,7.68,9.22l48-40a6,6,0,0,0,0-9.22Zm-81.79-89A6,6,0,0,0,154.36,38l-64,176A6,6,0,0,0,94,221.64a6.15,6.15,0,0,0,2,.36,6,6,0,0,0,5.64-3.95l64-176A6,6,0,0,0,162.05,34.36Z',
  'M180,146H158V110h22a34,34,0,1,0-34-34V98H110V76a34,34,0,1,0-34,34H98v36H76a34,34,0,1,0,34,34V158h36v22a34,34,0,1,0,34-34ZM158,76a22,22,0,1,1,22,22H158ZM54,76a22,22,0,0,1,44,0V98H76A22,22,0,0,1,54,76ZM98,180a22,22,0,1,1-22-22H98Zm12-70h36v36H110Zm70,92a22,22,0,0,1-22-22V158h22a22,22,0,0,1,0,44Z',
  'M222,67.34a33.81,33.81,0,0,0-10.64-24.25C198.12,30.56,176.68,31,163.54,44.18L142.82,65l-.63-.63a22,22,0,0,0-31.11,0l-9,9a14,14,0,0,0,0,19.81l3.47,3.47L53.14,149.1a37.81,37.81,0,0,0-9.84,36.73l-8.31,19a11.68,11.68,0,0,0,2.46,13A13.91,13.91,0,0,0,47.32,222,14.15,14.15,0,0,0,53,220.82L71,212.92a37.92,37.92,0,0,0,35.84-10.07l52.44-52.46,3.47,3.48a14,14,0,0,0,19.8,0l9-9a22.06,22.06,0,0,0,0-31.13l-.66-.65L212,91.85A33.76,33.76,0,0,0,222,67.34Zm-123.61,127a26,26,0,0,1-26,6.47,6,6,0,0,0-4.17.24l-20,8.75a2,2,0,0,1-2.09-.31l9.12-20.9a5.94,5.94,0,0,0,.19-4.31A25.91,25.91,0,0,1,56,166h70.78ZM138.78,154H65.24l48.83-48.84,36.76,36.78Zm64.77-70.59L178.17,108.9a6,6,0,0,0,0,8.47l4.88,4.89a10,10,0,0,1,0,14.15l-9,9a2,2,0,0,1-2.82,0l-60.69-60.7a2,2,0,0,1,0-2.83l9-9a10,10,0,0,1,14.14,0l4.89,4.89a6,6,0,0,0,4.24,1.75h0a6,6,0,0,0,4.25-1.77L172,52.66c8.57-8.58,22.51-9,31.07-.85a22,22,0,0,1,.44,31.57Z'
] as const;

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

export function createManifoldSceneRuntimeConfig(input: ManifoldSceneRuntimeConfigInput): ManifoldSceneRuntimeConfig {
  return {
    itemCount: MANIFOLD_SCENE_CONFIG.itemCount,
    starCount: input.prefersReducedMotion
      ? 18
      : input.deviceMemory <= 4 || input.hardwareThreads <= 4
        ? 36
        : input.isMobileViewport
          ? 56
          : MANIFOLD_SCENE_CONFIG.starCount,
    zGap: MANIFOLD_SCENE_CONFIG.zGap,
    camSpeed: MANIFOLD_SCENE_CONFIG.camSpeed,
    featuredIndex: MANIFOLD_SCENE_CONFIG.featuredIndex
  };
}
