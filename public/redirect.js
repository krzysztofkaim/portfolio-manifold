(() => {
  const nextUrl = new URL('/en/', window.location.href);
  nextUrl.search = window.location.search;
  nextUrl.hash = window.location.hash;

  if (window.location.href !== nextUrl.href) {
    window.location.replace(nextUrl.href);
  }
})();
