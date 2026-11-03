import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App.jsx';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { assignment, gamificationResponse } from './helpers/achievements/gamification';
import { resetAuthStore } from './helpers/auth/authStore';
import { challenge } from './helpers/challenges/challenges';
import { EMPTY_BODY } from './helpers/progress/progress';
import { setSession } from './helpers/routes/renderRoute';
import { API_URL, jsonResponse, stubFetch } from './helpers/shared/fetchMock';

beforeEach(() => resetAuthStore());
afterEach(() => {
  window.history.replaceState(null, '', '/');
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('App', () => {
  it('al iniciar corre restore() y, sin sesión guardada, muestra el login', async () => {
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeInTheDocument();
    expect(useAuthStore.getState().status).toBe('anonymous');
    expect(window.location.pathname).toBe('/login');
  });
});

// Cambio de cuenta A → B sin recargar: la respuesta de B queda en espera para ver que mientras tanto no se muestra
// nada de A (sin vaciar la caché, la misma clave mostraría lo de A hasta que llegue lo de B).
describe('App: cambio de cuenta sin recargar', () => {
  let releaseB;

  // `answer(path, who)` contesta según el usuario de la sesión (A o B); lo de B espera a `releaseB()`.
  function stubByUser(answer) {
    const gateB = new Promise((resolve) => {
      releaseB = resolve;
    });
    stubFetch(async (url) => {
      const who = (useAuthStore.getState().user?.id ?? 'a').endsWith('a') ? 'A' : 'B';
      if (who === 'B') await gateB;
      return answer(url.replace(API_URL, ''), who) ?? jsonResponse(200, { data: [] });
    });
  }

  // A cierra sesión, B entra en la misma pestaña y va por el menú a la misma pantalla.
  async function switchAccount(from, to, path, menuItem, textOf) {
    setSession(from);
    window.history.pushState(null, '', path);
    render(<App />);
    expect(await screen.findByText(textOf('A'))).toBeVisible();
    await act(() => useAuthStore.getState().logout());
    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeInTheDocument();
    act(() => setSession(to));
    await userEvent.click(within(await screen.findByTestId('sidebar-fixed')).getByRole('link', { name: menuItem }));
    expect(await screen.findByRole('heading', { level: 1, name: menuItem })).toBeVisible();
    expect(screen.queryByText(textOf('A'))).not.toBeInTheDocument();
    act(() => releaseB());
    expect(await screen.findByText(textOf('B'))).toBeVisible();
    expect(screen.queryByText(textOf('A'))).not.toBeInTheDocument();
  }

  it('Desafíos del PT: el PT B no ve los desafíos del PT A', async () => {
    stubByUser((path, who) =>
      (path === '/challenges' ? jsonResponse(200, { data: [challenge({ id: `c-${who}`, name: `Reto de ${who}` })] }) : null));
    await switchAccount(
      { id: 't-a', name: 'PT A', role: 'trainer' },
      { id: 't-b', name: 'PT B', role: 'trainer' },
      '/pt/desafios',
      'Desafíos',
      (who) => `Reto de ${who}`,
    );
  });

  it('Mi progreso: el alumno B no ve los desafíos del alumno A', async () => {
    stubByUser((path, who) => {
      if (path.startsWith('/progress/overview')) return jsonResponse(200, { data: { exercises: [], weekly_volume: [] } });
      if (path.startsWith('/progress/body/')) return jsonResponse(200, { data: EMPTY_BODY });
      return gamificationResponse(path, { challenges: [assignment(`as-${who}`, `Desafío de ${who}`, 'active')] });
    });
    await switchAccount(
      { id: 's-a', name: 'Alumno A', role: 'student' },
      { id: 's-b', name: 'Alumno B', role: 'student' },
      '/alumno/progreso',
      'Mi progreso',
      (who) => `Desafío de ${who}`,
    );
  });
});
