import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
