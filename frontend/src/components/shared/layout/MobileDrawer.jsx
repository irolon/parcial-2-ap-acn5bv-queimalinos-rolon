import { X } from 'lucide-react';
import { FOCUS_RING } from './compact';

/** Sidebar como panel lateral en < 768 px. Clic en el fondo o Escape lo cierran. */
export default function MobileDrawer({ open, onClose, initialFocusRef, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <div
        data-testid="drawer-backdrop"
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      <div
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Menú"
        className="absolute inset-y-0 left-0 flex w-[220px] max-w-[85vw]"
      >
        <button
          ref={initialFocusRef}
          type="button"
          onClick={onClose}
          aria-label="Cerrar menú"
          className={`absolute right-2.5 top-[18px] z-10 flex size-7 cursor-pointer items-center justify-center rounded-sm text-ink6 hover:bg-ink3 hover:text-bone0 ${FOCUS_RING}`}
        >
          <X size={16} aria-hidden="true" />
        </button>
        {children}
      </div>
    </div>
  );
}
