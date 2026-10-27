import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';

const ITEM =
  'block w-full cursor-pointer px-3 py-2 text-left font-body text-sm text-bone0 hover:bg-ink3 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent';

/** Menú ⋯ de la fila: Subir, Bajar (deshabilitados en los bordes) y Quitar. */
export default function RowMenu({ name, isFirst, isLast, onMove, onRemove }) {
  const [open, setOpen] = useState(false);
  const run = (action) => () => {
    setOpen(false);
    action();
  };
  return (
    <div className="relative" onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}>
      <button
        type="button"
        aria-label={`Opciones de ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="cursor-pointer rounded-md p-1.5 text-ink6 hover:text-bone0 focus-visible:outline-2 focus-visible:outline-accentText"
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-20 mt-1 w-32 overflow-hidden rounded-md border border-ink3 bg-ink2 shadow-xl">
          <button type="button" role="menuitem" disabled={isFirst} onClick={run(() => onMove(-1))} className={ITEM}>Subir</button>
          <button type="button" role="menuitem" disabled={isLast} onClick={run(() => onMove(1))} className={ITEM}>Bajar</button>
          <button type="button" role="menuitem" onClick={run(onRemove)} className={`${ITEM} text-hot`}>Quitar</button>
        </div>
      )}
    </div>
  );
}
