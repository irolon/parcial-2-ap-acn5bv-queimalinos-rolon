import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteSetDialog from '@/components/workout/session/dialogs/DeleteSetDialog';

const SET = { id: 'set-2', setNumber: 2, kg: 62.5, reps: 10 };
const mount = (set = SET) => {
  const handlers = { onCancel: vi.fn(), onConfirm: vi.fn() };
  render(<DeleteSetDialog set={set} {...handlers} />);
  return handlers;
};

describe('DeleteSetDialog', () => {
  it('pregunta "¿Borrar la serie N?" y recuerda de qué serie se trata', () => {
    mount();
    const dialog = screen.getByRole('dialog', { name: '¿Borrar la serie 2?' });
    expect(within(dialog).getByText('62,5 kg × 10 reps')).toBeInTheDocument();
  });

  it('una serie de peso corporal lo dice', () => {
    mount({ ...SET, kg: null, reps: 12 });
    expect(screen.getByText('Peso corporal × 12 reps')).toBeInTheDocument();
  });

  it('Borrar confirma y Cancelar no borra nada', async () => {
    const handlers = mount();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(handlers.onCancel).toHaveBeenCalledTimes(1);
    expect(handlers.onConfirm).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Borrar' }));
    expect(handlers.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('Esc cancela', async () => {
    const handlers = mount();
    await userEvent.setup().keyboard('{Escape}');
    expect(handlers.onCancel).toHaveBeenCalledTimes(1);
    expect(handlers.onConfirm).not.toHaveBeenCalled();
  });

  it('le pasa onCloseAutoFocus al diálogo para que la página decida adónde va el foco', async () => {
    const onCloseAutoFocus = vi.fn((event) => event.preventDefault());
    const { rerender } = render(<DeleteSetDialog set={SET} onCancel={vi.fn()} onConfirm={vi.fn()} onCloseAutoFocus={onCloseAutoFocus} />);
    rerender(<DeleteSetDialog set={null} onCancel={vi.fn()} onConfirm={vi.fn()} onCloseAutoFocus={onCloseAutoFocus} />);
    await waitFor(() => expect(onCloseAutoFocus).toHaveBeenCalledTimes(1));
  });

  it('sin serie elegida no se ve', () => {
    mount(null);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
