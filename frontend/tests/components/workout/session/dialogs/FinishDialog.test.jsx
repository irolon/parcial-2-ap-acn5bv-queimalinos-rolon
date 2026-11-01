import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FinishDialog from '@/components/workout/session/dialogs/FinishDialog';

const mount = (props = {}) => {
  const handlers = { onKeep: vi.fn(), onFinish: vi.fn(), onDiscard: vi.fn() };
  render(<FinishDialog open hasSets missing={5} {...handlers} {...props} />);
  return handlers;
};
const dialog = () => screen.getByRole('dialog');

describe('FinishDialog: con series faltantes', () => {
  it('pregunta "Te faltan N series, ¿terminar igual?"', () => {
    mount({ missing: 5 });
    expect(within(dialog()).getByText('Te faltan 5 series, ¿terminar igual?')).toBeInTheDocument();
  });

  it('con una sola serie faltante concuerda en singular', () => {
    mount({ missing: 1 });
    expect(within(dialog()).getByText('Te falta 1 serie, ¿terminar igual?')).toBeInTheDocument();
  });

  it('"Terminar igual" termina y "Seguir entrenando" vuelve a la sesión', async () => {
    const handlers = mount();
    const user = userEvent.setup();
    await user.click(within(dialog()).getByRole('button', { name: 'Seguir entrenando' }));
    expect(handlers.onKeep).toHaveBeenCalledTimes(1);
    expect(handlers.onFinish).not.toHaveBeenCalled();
    await user.click(within(dialog()).getByRole('button', { name: 'Terminar igual' }));
    expect(handlers.onFinish).toHaveBeenCalledTimes(1);
  });

  it('Esc también es seguir entrenando', async () => {
    const handlers = mount();
    await userEvent.setup().keyboard('{Escape}');
    expect(handlers.onKeep).toHaveBeenCalledTimes(1);
    expect(handlers.onFinish).not.toHaveBeenCalled();
  });

  it('no ofrece descartar', () => {
    mount();
    expect(screen.queryByRole('button', { name: 'Descartar' })).not.toBeInTheDocument();
  });
});

describe('FinishDialog: sin ninguna serie', () => {
  it('pregunta "No registraste ninguna serie. ¿Descartar el entrenamiento?"', () => {
    mount({ hasSets: false, missing: 7 });
    expect(within(dialog()).getByText('No registraste ninguna serie. ¿Descartar el entrenamiento?')).toBeInTheDocument();
  });

  it('"Descartar" descarta y "Seguir entrenando" vuelve a la sesión', async () => {
    const handlers = mount({ hasSets: false, missing: 7 });
    const user = userEvent.setup();
    await user.click(within(dialog()).getByRole('button', { name: 'Seguir entrenando' }));
    expect(handlers.onKeep).toHaveBeenCalledTimes(1);
    await user.click(within(dialog()).getByRole('button', { name: 'Descartar' }));
    expect(handlers.onDiscard).toHaveBeenCalledTimes(1);
    expect(handlers.onFinish).not.toHaveBeenCalled();
  });

  it('no ofrece terminar: no hay nada para guardar', () => {
    mount({ hasSets: false });
    expect(screen.queryByRole('button', { name: 'Terminar igual' })).not.toBeInTheDocument();
  });
});

describe('FinishDialog: cerrado', () => {
  it('no se ve', () => {
    mount({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
