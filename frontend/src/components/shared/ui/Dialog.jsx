import { useLayoutEffect, useRef } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

/**
 * Modal accesible (Radix). Sin `description` no se asocia ningún aria-describedby.
 * Con `dismissible={false}` no se cierra (Esc, overlay ni X) y la X se ve deshabilitada.
 * `onCloseAutoFocus(event)` es opcional: se llama al terminar de cerrar, y con `event.preventDefault()` la página
 * puede mandar el foco a otro lado (por ejemplo, si el botón que abrió el diálogo ya no existe). Sin él, el foco
 * vuelve al elemento que lo tenía al abrir (hace falta porque estos diálogos no nacen de un Trigger de Radix); si ese
 * elemento ya no está en el DOM, queda el comportamiento de Radix.
 */
export default function Dialog({
  open, onOpenChange, title, description, children, footer, dismissible = true, onCloseAutoFocus,
}) {
  const contentProps = description ? {} : { 'aria-describedby': undefined };
  const opener = useRef(null);
  // Antes de que Radix mueva el foco adentro (sus efectos corren después de los de layout).
  useLayoutEffect(() => {
    if (open) opener.current = document.activeElement;
  }, [open]);
  const restoreFocus = (event) => {
    const element = opener.current;
    if (!element || element === document.body || !element.isConnected) return;
    event.preventDefault();
    element.focus();
  };
  return (
    <RadixDialog.Root open={open} onOpenChange={(next) => (dismissible || next) && onOpenChange(next)}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <RadixDialog.Content
          {...contentProps}
          onCloseAutoFocus={onCloseAutoFocus ?? restoreFocus}
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100vw-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-ink3 bg-ink1 shadow-xl"
        >
          <div className="flex items-start justify-between gap-4 px-6 pt-5">
            <div className="min-w-0">
              <RadixDialog.Title className="font-display text-lg font-semibold text-bone0">
                {title}
              </RadixDialog.Title>
              {description && (
                <RadixDialog.Description className="mt-1 font-body text-sm text-ink6">
                  {description}
                </RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close
              aria-label="Cerrar"
              disabled={!dismissible}
              className="shrink-0 cursor-pointer rounded-md p-1 text-ink6 hover:text-bone0 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-ink6 focus-visible:outline-2 focus-visible:outline-accentText"
            >
              <X size={18} aria-hidden="true" />
            </RadixDialog.Close>
          </div>
          <div className="overflow-y-auto px-6 py-4">{children}</div>
          {footer && <div className="flex justify-end gap-3 px-6 pb-5">{footer}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
