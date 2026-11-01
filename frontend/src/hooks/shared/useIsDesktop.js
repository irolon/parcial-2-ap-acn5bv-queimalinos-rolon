import { useSyncExternalStore } from 'react';

const QUERY = '(min-width: 768px)';

const subscribe = (onChange) => {
  const media = window.matchMedia?.(QUERY);
  media?.addEventListener?.('change', onChange);
  return () => media?.removeEventListener?.('change', onChange);
};
const getSnapshot = () => window.matchMedia?.(QUERY).matches ?? true;

/** `true` desde 768 px de ancho (sin `matchMedia` se asume escritorio). */
export function useIsDesktop() {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
