import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import NotificationPrefsDialog from '@/components/account/NotificationPrefsDialog';
import { configureClient } from '@/api/shared/client';
import { setupUser } from '../../helpers/shared/user';
import { bodyOf, calls, errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

const INITIAL = { message: true, comment: true, appointment: false, pr: true, achievement: true, updated_at: null };
const onClose = vi.fn();

function renderDialog() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const ui = (open) => (
    <QueryClientProvider client={queryClient}>
      <NotificationPrefsDialog open={open} onClose={onClose} initial={INITIAL} />
    </QueryClientProvider>
  );
  const utils = render(ui(true));
  return { ...utils, reopen: () => (utils.rerender(ui(false)), utils.rerender(ui(true))) };
}

const dialog = () => screen.getByRole('dialog', { name: 'Avisos en tu celular' });
const toggle = (name) => within(dialog()).getByRole('switch', { name });
const saveButton = () => within(dialog()).getByRole('button', { name: 'Guardar' });

beforeEach(() => {
  configureClient({ getToken: () => 'access-1' });
  onClose.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('NotificationPrefsDialog', () => {
  it('muestra el título, la aclaración y los cinco interruptores con lo del servidor', () => {
    renderDialog();
    expect(
      within(dialog()).getByText('Elegí qué te avisamos con una notificación. Lo apagado igual queda en la app.'),
    ).toBeInTheDocument();
    const switches = within(dialog()).getAllByRole('switch');
    expect(switches.map((s) => s.getAttribute('aria-checked'))).toEqual(['true', 'true', 'false', 'true', 'true']);
    expect(toggle('Mensajes')).toHaveAccessibleDescription('Cuando tu entrenador/a te escribe');
    expect(toggle('Turnos')).toHaveAccessibleDescription('Cuando confirma, cancela o te agenda un turno');
    expect(toggle('Logros')).toHaveAccessibleDescription('Cuando desbloqueás un logro');
  });

  it('"Guardar" está deshabilitado sin cambios y vuelve a estarlo si se deshace el cambio', async () => {
    const user = setupUser();
    renderDialog();
    expect(saveButton()).toBeDisabled();
    await user.click(toggle('Comentarios'));
    expect(saveButton()).toBeEnabled();
    await user.click(toggle('Comentarios'));
    expect(saveButton()).toBeDisabled();
  });

  it('guardar manda PUT con los cinco (comment: false) y al terminar cierra', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: { ...INITIAL, comment: false } }));
    const user = setupUser();
    renderDialog();
    await user.click(toggle('Comentarios'));
    expect(toggle('Comentarios')).toHaveAttribute('aria-checked', 'false');
    await user.click(saveButton());
    await vi.waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/notifications/preferences');
    expect(init.method).toBe('PUT');
    expect(bodyOf(init)).toEqual({ message: true, comment: false, appointment: false, pr: true, achievement: true });
  });

  it('si guardar falla, avisa adentro del diálogo, no cierra y conserva el cambio', async () => {
    stubFetch(async () => errorResponse(500, 'INTERNAL'));
    const user = setupUser();
    renderDialog();
    await user.click(toggle('Comentarios'));
    await user.click(saveButton());
    expect(await within(dialog()).findByRole('alert')).toHaveTextContent('No pudimos guardar tus preferencias');
    expect(onClose).not.toHaveBeenCalled();
    expect(toggle('Comentarios')).toHaveAttribute('aria-checked', 'false');
    expect(saveButton()).toBeEnabled();
  });

  it('Cancelar cierra sin pedir nada; al reabrir vuelve a lo del servidor y sin el error', async () => {
    const fetchMock = stubFetch(async () => errorResponse(500, 'INTERNAL'));
    const user = setupUser();
    const { reopen } = renderDialog();
    await user.click(toggle('Comentarios'));
    await user.click(saveButton());
    await within(dialog()).findByRole('alert');
    await user.click(within(dialog()).getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    reopen();
    expect(toggle('Comentarios')).toHaveAttribute('aria-checked', 'true');
    expect(within(dialog()).queryByRole('alert')).toBeNull();
    expect(saveButton()).toBeDisabled();
  });
});
