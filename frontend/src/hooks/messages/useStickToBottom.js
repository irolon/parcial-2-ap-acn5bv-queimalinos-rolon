import { useCallback, useLayoutEffect, useRef } from 'react';

const NEAR_BOTTOM_PX = 120;

/**
 * Scroll de la lista de mensajes: abajo de todo al abrir y al enviar; si el usuario lee más arriba
 * (a más de 120 px del fondo) los mensajes nuevos no lo mueven. `lastId` cambia al llegar un mensaje al final.
 * Devuelve `attach` (ref callback) y `onScroll` para el contenedor, `onImageLoad` (una foto que carga empuja el fondo)
 * y `stickNext()` para pedir ir al fondo en el próximo cambio (al enviar).
 */
export function useStickToBottom(lastId) {
  const elRef = useRef(null);
  const stick = useRef(true);
  const attach = useCallback((el) => {
    elRef.current = el;
  }, []);

  const toBottom = useCallback(() => {
    const el = elRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, []);

  const onScroll = useCallback(() => {
    const el = elRef.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_PX;
  }, []);

  useLayoutEffect(toBottom, [lastId, toBottom]);

  const stickNext = useCallback(() => {
    stick.current = true;
  }, []);

  return { attach, onScroll, onImageLoad: toBottom, stickNext };
}
