import type { ManifoldLocale } from './manifoldLocale';

export const SUPPORTED_MANIFOLD_LOCALES: readonly ManifoldLocale[] = ['en', 'pl'];

export function isSupportedManifoldLocale(value: string): value is ManifoldLocale {
  return SUPPORTED_MANIFOLD_LOCALES.includes(value as ManifoldLocale);
}

export function resolveLocaleFromPathname(pathname: string): ManifoldLocale | null {
  const segments = pathname.split('/').filter(Boolean);
  const candidate = segments[0]?.toLowerCase() ?? '';
  return isSupportedManifoldLocale(candidate) ? candidate : null;
}

export function getLocalePath(locale: ManifoldLocale): string {
  return `/${locale}/`;
}

