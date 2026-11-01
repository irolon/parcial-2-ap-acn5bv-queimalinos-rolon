import { useSyncExternalStore } from 'react';

const DESKTOP_QUERY = '(min-width: 768px)';

const subscribe = (callback) => {
  const media = window.matchMedia?.(DESKTOP_QUERY);
  media?.addEventListener?.('change', callback);
  return () => media?.removeEventListener?.('change', callback);
};

// Sin matchMedia (tests, entornos viejos) se asume escritorio.
const getSnapshot = () => window.matchMedia?.(DESKTOP_QUERY).matches ?? true;

/** `true` desde 768 px (breakpoint `md` de Tailwind). Se actualiza al redimensionar. */
export function useIsDesktop() {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
