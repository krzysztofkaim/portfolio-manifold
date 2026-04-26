/**
 * Light-weight browser detection for performance-critical path optimizations.
 * Focuses on identifying WebKit/Safari to apply rendering workarounds.
 */

export function isSafari(): boolean {
  if (typeof window === 'undefined') return false;
  
  const ua = window.navigator.userAgent.toLowerCase();
  const isChrome = ua.indexOf('chrome') > -1 || ua.indexOf('crios') > -1;
  const isSafari = ua.indexOf('safari') > -1 && !isChrome;
  
  return isSafari;
}

export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    ['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(
      window.navigator.platform
    ) ||
    // iPad on iOS 13 detection
    (window.navigator.userAgent.includes('Mac') && 'ontouchend' in document)
  );
}

export function getSafariVersion(): number {
  if (typeof window === 'undefined') return 0;
  const ua = window.navigator.userAgent;
  const match = ua.match(/Version\/(\d+)\./);
  if (match && match[1]) {
    return Number.parseInt(match[1], 10);
  }
  return 0;
}

// Performance: Cached constants to avoid regex/UA parsing in hot loops
export const IS_SAFARI = isSafari();
export const IS_IOS = isIOS();
export const SAFARI_VERSION = getSafariVersion();

export function getBrowserContext() {
  return {
    safari: IS_SAFARI,
    ios: IS_IOS,
    version: SAFARI_VERSION
  };
}
