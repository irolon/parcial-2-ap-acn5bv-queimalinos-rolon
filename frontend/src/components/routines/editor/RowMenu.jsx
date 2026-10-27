import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

const ITEM =
  'block w-full cursor-pointer px-3 py-2 text-left font-body text-sm text-bone0 hover:bg-ink3 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent';
const MENU_WIDTH = 128;
const MENU_HEIGHT = 120;

/** Posición fija bajo el botón (o encima si abajo no entra), para no quedar recortado por el scroll de la tabla. */
function positionFor(trigger) {
  const rect = trigger.getBoundingClientRect();
  const up = rect.bottom + MENU_HEIGHT > window.innerHeight && rect.top > MENU_HEIGHT;
  return {
    position: 'fixed',
    left: Math.max(8, rect.right - MENU_WIDTH),
    ...(up ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
  };
}

/** Menú ⋯ de la fila: Subir, Bajar (deshabilitados en los bordes) y Quitar. Se cierra al hacer clic afuera o con Escape. */
export default function RowMenu({ name, isFirst, isLast, onMove, onRemove }) {
  const [style, setStyle] = useState(null);
  const trigger = useRef(null);
  const menu = useRef(null);
  const open = style !== null;

  useEffect(() => {
    if (!open) return undefined;
    const close = () => setStyle(null);
    const onPointer = (event) => {
      if (!menu.current?.contains(event.target) && !trigger.current?.contains(event.target)) close();
    };
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      close();
      trigger.current?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  const run = (action) => () => {
    setStyle(null);
    action();
  };
  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={`Opciones de ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setStyle(open ? null : positionFor(trigger.current))}
        className="cursor-pointer rounded-md p-1.5 text-ink6 hover:text-bone0 focus-visible:outline-2 focus-visible:outline-accentText"
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <div ref={menu} role="menu" style={style} className="z-50 w-32 overflow-hidden rounded-md border border-ink3 bg-ink2 shadow-xl">
            <button type="button" role="menuitem" disabled={isFirst} onClick={run(() => onMove(-1))} className={ITEM}>Subir</button>
            <button type="button" role="menuitem" disabled={isLast} onClick={run(() => onMove(1))} className={ITEM}>Bajar</button>
            <button type="button" role="menuitem" onClick={run(onRemove)} className={`${ITEM} text-hot`}>Quitar</button>
          </div>,
          document.body,
        )}
    </>
  );
}
