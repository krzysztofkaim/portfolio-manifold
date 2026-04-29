(() => {
  const root = document.documentElement;
  const locale = root.dataset.locale;

  try {
    const raw = window.sessionStorage.getItem('manifold-locale-transition');
    if (raw && locale) {
      const payload = JSON.parse(raw);
      if (payload && payload.locale === locale) {
        root.classList.add('locale-transition-active');
      }
    }
  } catch {
    // Ignore storage access failures and malformed payloads.
  }

  try {
    const ua = window.navigator.userAgent.toLowerCase();
    const vendor = (window.navigator.vendor || '').toLowerCase();
    const isSafari =
      vendor.includes('apple') &&
      ua.includes('safari') &&
      !ua.includes('chrome') &&
      !ua.includes('crios') &&
      !ua.includes('fxios') &&
      !ua.includes('android');
    const isIOS =
      /iphone|ipad|ipod/.test(ua) ||
      (ua.includes('mac') && 'ontouchend' in document);

    if (isSafari) {
      root.classList.add('is-safari');
    }

    if (isIOS) {
      root.classList.add('is-ios');
    }
  } catch {
    // Ignore UA parsing failures and keep the default styling path.
  }
})();
