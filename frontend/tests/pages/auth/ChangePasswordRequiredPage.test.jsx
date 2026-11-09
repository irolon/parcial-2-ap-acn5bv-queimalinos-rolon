import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { resetAuthStore } from '../../helpers/auth/authStore';
import { bodyOf, calls, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';
import { STUDENT, renderRoute, setSession } from '../../helpers/routes/renderRoute';
import { stubStudentHome } from '../../helpers/student/home';
import { setupUser } from '../../helpers/shared/user';
import { fillPasswordForm, wrongCurrentResponse } from '../../helpers/account/account';

const BLOCKED = { ...STUDENT, must_change_password: true };
const CHANGED_AT = '2026-11-09T15:00:00.000Z';

beforeEach(() => {
  resetAuthStore();
  setSession(BLOCKED);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('ChangePasswordRequiredPage', () => {
  it('sin shell: marca, texto, "Clave temporal", nueva y repetir', async () => {
    stubFetch(async () => jsonResponse(200, {}), { unread: null });
    renderRoute('/cambiar-clave');
    expect(await screen.findByRole('heading', { name: 'Elegí una contraseña nueva' })).toBeInTheDocument();
    expect(screen.getByLabelText('Clave temporal')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Nueva contraseña')).toBeInTheDocument();
    expect(screen.getByLabelText('Repetir nueva')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Navegación principal' })).toBeNull();
  });

  it('al guardar apaga el flag y va a /alumno/hoy', async () => {
    stubStudentHome();
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, { token: 'access-2', expires_in: '1h', password_changed_at: CHANGED_AT }),
    );
    const home = globalThis.fetch;
    vi.stubGlobal('fetch', (url, init) => (String(url).endsWith('/auth/password') ? fetchMock(url, init) : home(url, init)));
    const user = setupUser();
    const { pathname } = renderRoute('/cambiar-clave');
    await fillPasswordForm(user, { current: 'Ab3kP9mQx2' });
    await user.click(screen.getByRole('button', { name: 'Guardar y seguir' }));
    await vi.waitFor(() => expect(pathname()).toBe('/alumno/hoy'));
    expect(bodyOf(fetchMock.mock.calls[0][1])).toMatchObject({ current_password: 'Ab3kP9mQx2', refresh_token: 'refresh-1' });
    expect(useAuthStore.getState()).toMatchObject({ token: 'access-2', user: { must_change_password: false } });
  });

  it('con la temporal mal, el error queda en su campo y no navega', async () => {
    stubFetch(async () => wrongCurrentResponse(), { unread: null });
    const user = setupUser();
    const { pathname } = renderRoute('/cambiar-clave');
    await fillPasswordForm(user, { current: 'mal' });
    await user.click(screen.getByRole('button', { name: 'Guardar y seguir' }));
    expect(await screen.findByText('La contraseña actual es incorrecta')).toBeInTheDocument();
    expect(pathname()).toBe('/cambiar-clave');
  });

  it('Cerrar sesión deja status anonymous', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(204), { unread: null });
    const user = setupUser();
    const { pathname } = renderRoute('/cambiar-clave');
    await user.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));
    await vi.waitFor(() => expect(useAuthStore.getState().status).toBe('anonymous'));
    expect(calls(fetchMock).map(([p]) => p)).toEqual(['/auth/logout']);
    await vi.waitFor(() => expect(pathname()).toBe('/login'));
  });
});
