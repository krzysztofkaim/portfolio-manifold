export function observePageVisibility(
  onChange: (visible: boolean) => void
): () => void {
  const handler = () => {
    onChange(!document.hidden);
  };

  document.addEventListener('visibilitychange', handler, { passive: true });
  handler();

  return () => {
    document.removeEventListener('visibilitychange', handler);
  };
}
