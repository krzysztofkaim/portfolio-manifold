/**
 * Light-weight browser detection for performance-critical path optimizations.
 * Focuses on identifying WebKit/Safari to apply rendering workarounds.
 */

function isSafari(): boolean {
  if (typeof window === 'undefined') return false;

  // Every browser on iOS is backed by WebKit, even when the UA brand is Chrome,
  // Arc, Firefox, or Edge. Route all iOS browsers through the Safari/WebKit
  // stability path so mobile fixes apply consistently.
  if (isIOS()) return true;

  const ua = window.navigator.userAgent.toLowerCase();
  const isChrome = ua.indexOf('chrome') > -1 || ua.indexOf('crios') > -1;
  const isSafari = ua.indexOf('safari') > -1 && !isChrome;

  return isSafari;
}

function isIOS(): boolean {
  if (typeof window === 'undefined') return false;

  const ua = window.navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes('Mac') && window.navigator.maxTouchPoints > 1)
  );
}

function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;

  return /android/i.test(window.navigator.userAgent);
}

function isAndroidLowEnd(): boolean {
  if (!isAndroid() || typeof navigator === 'undefined') {
    return false;
  }

  const deviceMemory =
    'deviceMemory' in navigator
      ? ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8)
      : 8;
  const hardwareThreads = navigator.hardwareConcurrency || 8;

  return deviceMemory <= 4 || hardwareThreads <= 4;
}

function getSafariVersion(): number {
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
export const IS_ANDROID = isAndroid();
export const IS_ANDROID_LOW_END = isAndroidLowEnd();
export const SAFARI_VERSION = getSafariVersion();
