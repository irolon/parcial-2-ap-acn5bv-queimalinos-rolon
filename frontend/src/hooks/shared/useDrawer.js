import { useCallback, useEffect, useRef, useState } from 'react';

const DESKTOP_QUERY = '(min-width: 768px)';

/**
 * Estado del panel lateral en mobile.
 * - Al abrir, el foco pasa a `initialFocusRef`; al cerrar, vuelve a `triggerRef`.
 * - Escape lo cierra. Si la ventana pasa a ≥ 768 px también (ahí el sidebar es fijo).
 */
export function useDrawer() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const initialFocusRef = useRef(null);
  const wasOpen = useRef(false);

  const show = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) {
      if (wasOpen.current) triggerRef.current?.focus();
      wasOpen.current = false;
      return undefined;
    }
    wasOpen.current = true;
    initialFocusRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const media = window.matchMedia?.(DESKTOP_QUERY);
    const onMediaChange = (event) => {
      if (event.matches) setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    media?.addEventListener?.('change', onMediaChange);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      media?.removeEventListener?.('change', onMediaChange);
    };
  }, [open]);

  return { open, show, close, triggerRef, initialFocusRef };
}
