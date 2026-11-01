import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dialog from '@/components/shared/ui/Dialog';

function setup(props = {}) {
  const onOpenChange = vi.fn();
  render(
    <Dialog open onOpenChange={onOpenChange} title="Nuevo ejercicio" {...props}>
      <p>Contenido</p>
    </Dialog>,
  );
  return onOpenChange;
}

describe('Dialog', () => {
  it('abierto muestra un dialog con el título como nombre', () => {
    setup();
    expect(screen.getByRole('dialog', { name: 'Nuevo ejercicio' })).toBeVisible();
    expect(screen.getByText('Contenido')).toBeVisible();
  });

  it('cerrado no renderiza nada', () => {
    setup({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Escape pide cerrar', async () => {
    const onOpenChange = setup();
    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('el botón Cerrar pide cerrar', async () => {
    const onOpenChange = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('muestra la descripción y el footer cuando vienen', () => {
    setup({ description: 'Detalle', footer: <button>Guardar</button> });
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription('Detalle');
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeVisible();
  });
});

// Un diálogo que no nace de un Trigger de Radix no sabe a dónde devolver el foco: `onCloseAutoFocus` deja dirigirlo.
function Closeable({ onCloseAutoFocus }) {
  const [open, setOpen] = useState(true);
  const outside = useRef(null);
  return (
    <>
      <button type="button" ref={outside}>Afuera</button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Borrar"
        onCloseAutoFocus={onCloseAutoFocus && ((event) => onCloseAutoFocus(event, outside.current))}
        footer={<button type="button" onClick={() => setOpen(false)}>Listo</button>}
      >
        <p>¿Seguro?</p>
      </Dialog>
    </>
  );
}

describe('Dialog: foco al cerrar', () => {
  it('onCloseAutoFocus se llama al cerrar y puede mandar el foco a otro lado', async () => {
    const onCloseAutoFocus = vi.fn((event, target) => {
      event.preventDefault();
      target.focus();
    });
    render(<Closeable onCloseAutoFocus={onCloseAutoFocus} />);
    await userEvent.click(screen.getByRole('button', { name: 'Listo' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Afuera' })).toHaveFocus());
    expect(onCloseAutoFocus).toHaveBeenCalledTimes(1);
  });

  it('sin onCloseAutoFocus cerrar anda como siempre', async () => {
    render(<Closeable />);
    await userEvent.click(screen.getByRole('button', { name: 'Listo' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Afuera' })).toBeVisible();
  });
});
