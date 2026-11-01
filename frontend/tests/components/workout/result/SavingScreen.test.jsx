import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SavingScreen from '@/components/workout/result/SavingScreen';

const SPEC_MESSAGE = 'No pudimos guardar tu entrenamiento. Tus series siguen guardadas en este navegador.';
const OFFLINE = { status: 0, code: 'NETWORK_ERROR', message: 'No hay conexión con el servidor', retryable: true };
const REJECTED = {
  status: 409, code: 'SESSION_ID_CONFLICT', message: 'Esa sesión ya existe y es de otro alumno', retryable: false,
};

function mount(props = {}) {
  const handlers = { onRetry: vi.fn(), onDiscard: vi.fn() };
  render(<SavingScreen saving={false} error={null} {...handlers} {...props} />);
  return handlers;
}
const discardButton = () => screen.queryByRole('button', { name: 'Descartar entrenamiento' });

describe('SavingScreen: guardando', () => {
  it('dice "Guardando tu entrenamiento…" en una región que el lector de pantalla anuncia', () => {
    mount({ saving: true });
    expect(screen.getByRole('status')).toHaveTextContent('Guardando tu entrenamiento…');
  });

  it('no ofrece Descartar ni Reintentar mientras sube', () => {
    mount({ saving: true });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('SavingScreen: error que se puede reintentar', () => {
  it('dice que las series siguen guardadas en el navegador, con Reintentar', async () => {
    const { onRetry } = mount({ error: OFFLINE });
    expect(screen.getByRole('alert')).toHaveTextContent(SPEC_MESSAGE);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('solo Reintentar: no ofrece Descartar (podría dejar una sesión a medias en el servidor)', () => {
    mount({ error: OFFLINE });
    expect(discardButton()).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /descartar/i })).not.toBeInTheDocument();
  });

  it('sin error ni subida en curso (la sesión quedó lista para subir) pasa lo mismo', () => {
    mount();
    expect(screen.getByRole('alert')).toHaveTextContent(SPEC_MESSAGE);
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled();
    expect(discardButton()).not.toBeInTheDocument();
  });
});

describe('SavingScreen: error que reintentar no arregla', () => {
  it('muestra el mensaje del servidor y "No se pudo guardar este entrenamiento."', () => {
    mount({ error: REJECTED });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Esa sesión ya existe y es de otro alumno');
    expect(alert).toHaveTextContent('No se pudo guardar este entrenamiento.');
    expect(screen.queryByText(SPEC_MESSAGE)).not.toBeInTheDocument();
  });

  it('no ofrece Reintentar (daría lo mismo) sino Descartar entrenamiento', () => {
    mount({ error: REJECTED });
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
    expect(discardButton()).toBeEnabled();
  });

  it('Descartar entrenamiento pide confirmación: "¿Descartar el entrenamiento? No se va a guardar."', async () => {
    const { onDiscard } = mount({ error: REJECTED });
    await userEvent.setup().click(discardButton());
    expect(screen.getByRole('dialog', { name: '¿Descartar el entrenamiento? No se va a guardar.' })).toBeInTheDocument();
    expect(onDiscard).not.toHaveBeenCalled();
  });

  it('Cancelar (o Esc) no descarta nada', async () => {
    const { onDiscard } = mount({ error: REJECTED });
    const user = userEvent.setup();
    await user.click(discardButton());
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(discardButton());
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onDiscard).not.toHaveBeenCalled();
  });

  it('confirmar descarta el entrenamiento', async () => {
    const { onDiscard } = mount({ error: REJECTED });
    const user = userEvent.setup();
    await user.click(discardButton());
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Descartar' }));
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });
});
