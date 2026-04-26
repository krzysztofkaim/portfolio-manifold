(() => {
  const target = document.documentElement.dataset.redirectTarget;
  if (!target) {
    return;
  }

  const nextUrl = new URL(target, window.location.href);
  nextUrl.search = window.location.search;
  nextUrl.hash = window.location.hash;

  if (window.location.href !== nextUrl.href) {
    window.location.replace(nextUrl.href);
  }
})();
