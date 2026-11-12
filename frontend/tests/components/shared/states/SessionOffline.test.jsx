import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import SessionOffline from '@/components/shared/states/SessionOffline';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { USER, resetAuthStore } from '../../../helpers/auth/authStore';
import { calls, errorResponse, jsonResponse, stubFetch } from '../../../helpers/shared/fetchMock';
import { renderRoute } from '../../../helpers/routes/renderRoute';
import { user } from '../../../helpers/shared/user';

const OFFLINE = { user: USER, token: null, refreshToken: 'refresh-1', status: 'offline' };
const paths = (fetchMock) => calls(fetchMock).map(([path]) => path);

beforeEach(() => {
  resetAuthStore();
  useAuthStore.setState(OFFLINE);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('SessionOffline', () => {
  it('muestra el título y la cuenta atrás en una región que se anuncia', async () => {
    vi.useFakeTimers();
    stubFetch(async () => errorResponse(502, 'HTTP_ERROR'));
    render(<SessionOffline />);
    expect(screen.getByRole('heading', { level: 1, name: 'Sin conexión con el servidor' })).toBeInTheDocument();
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Tu sesión sigue guardada. Reintentando en 2 s…');
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(status).toHaveTextContent('Reintentando en 1 s…');
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(status).toHaveTextContent('Reintentando en 4 s…');
  });

  it('mientras pide muestra "Reintentando…"', async () => {
    stubFetch(() => new Promise(() => {}));
    render(<SessionOffline />);
    await user.click(screen.getByRole('button', { name: 'Reintentar ahora' }));
    expect(screen.getByRole('status')).toHaveTextContent('Tu sesión sigue guardada. Reintentando…');
  });

  it('"Reintentar ahora" pide el refresh enseguida', async () => {
    const fetchMock = stubFetch(async () => errorResponse(503, 'HTTP_ERROR'));
    render(<SessionOffline />);
    await user.click(screen.getByRole('button', { name: 'Reintentar ahora' }));
    await waitFor(() => expect(paths(fetchMock)).toEqual(['/auth/refresh']));
    expect(useAuthStore.getState().status).toBe('offline');
  });

  it('"Cerrar sesión" limpia la sesión y lleva al login aunque el backend no conteste', async () => {
    stubFetch(async (url) => {
      if (String(url).endsWith('/auth/logout')) throw new TypeError('Failed to fetch');
      return jsonResponse(200, {});
    });
    const { pathname } = renderRoute('/pt/alumnos');
    await user.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));
    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeInTheDocument();
    expect(pathname()).toBe('/login');
    expect(useAuthStore.getState()).toMatchObject({ user: null, refreshToken: null, status: 'anonymous' });
  });
});
