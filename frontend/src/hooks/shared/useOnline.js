import { useSyncExternalStore } from 'react';

const subscribe = (callback) => {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
};

// Sin `navigator.onLine` (entornos viejos) se asume que hay conexión.
const getSnapshot = () => navigator.onLine ?? true;

/** `navigator.onLine`, al día con los eventos `online` y `offline` del navegador. */
export function useOnline() {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
