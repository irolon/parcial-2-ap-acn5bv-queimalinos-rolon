import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { resetAuthStore, seedSavedSession } from '../../helpers/auth/authStore';
import { calls, errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';
import { STUDENT, TRAINER, renderRoute, setSession } from '../../helpers/routes/renderRoute';
import { stubStudentHome } from '../../helpers/student/home';

const BLOCKED = { ...STUDENT, must_change_password: true };
const TEXT = 'Tu entrenador/a te dio una clave temporal. Elegí una nueva para seguir.';

beforeEach(() => resetAuthStore());

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('guard: cambio obligatorio de clave', () => {
  it.each(['/alumno/hoy', '/alumno/perfil', '/'])('con el flag, %s termina en /cambiar-clave sin pedir nada', async (path) => {
    setSession(BLOCKED);
    // `unread: null`: el contador de mensajes del sidebar también cuenta como pedido.
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: [] }), { unread: null });
    const { pathname } = renderRoute(path);
    expect(await screen.findByText(TEXT)).toBeInTheDocument();
    expect(pathname()).toBe('/cambiar-clave');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('al recargar con el flag, solo sale el refresh y va a /cambiar-clave', async () => {
    await seedSavedSession({ user: { ...STUDENT, must_change_password: false }, refreshToken: 'refresh-1' });
    const fetchMock = stubFetch(
      async () => jsonResponse(200, { token: 'access-9', expires_in: '1h', must_change_password: true }),
      { unread: null },
    );
    await useAuthStore.getState().restore();
    const { pathname } = renderRoute('/alumno/hoy');
    expect(await screen.findByText(TEXT)).toBeInTheDocument();
    expect(pathname()).toBe('/cambiar-clave');
    expect(calls(fetchMock).map(([p]) => p)).toEqual(['/auth/refresh']);
  });

  // Offline va antes que el flag: sin servidor no se sabe si la clave sigue blanqueada.
  it.each(['/alumno/hoy', '/cambiar-clave'])('blanqueado + servidor caído + recarga en %s: "Sin conexión", no /cambiar-clave', async (path) => {
    await seedSavedSession({ user: BLOCKED, refreshToken: 'refresh-1' });
    stubFetch(async () => errorResponse(503, 'HTTP_ERROR'), { unread: null });
    await useAuthStore.getState().restore();
    expect(useAuthStore.getState().status).toBe('offline');
    const { pathname } = renderRoute(path);
    expect(await screen.findByRole('heading', { name: 'Sin conexión con el servidor' })).toBeInTheDocument();
    expect(screen.queryByText(TEXT)).not.toBeInTheDocument();
    expect(pathname()).toBe(path);
  });

  it('sin el flag, /cambiar-clave manda a la home del rol', async () => {
    setSession(STUDENT);
    stubStudentHome();
    const { pathname } = renderRoute('/cambiar-clave');
    await vi.waitFor(() => expect(pathname()).toBe('/alumno/hoy'));
  });

  it('el PT sin flag tampoco se queda en /cambiar-clave', async () => {
    setSession(TRAINER);
    stubFetch(async () => jsonResponse(200, { data: [], meta: { total_pages: 1 } }));
    const { pathname } = renderRoute('/cambiar-clave');
    await vi.waitFor(() => expect(pathname()).toBe('/pt/dashboard'));
  });

  it('sin sesión, /cambiar-clave manda a /login', async () => {
    setSession(null);
    const { pathname } = renderRoute('/cambiar-clave');
    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeInTheDocument();
    expect(pathname()).toBe('/login');
  });

  it('mientras se verifica la sesión no decide nada', () => {
    setSession(BLOCKED, 'loading');
    renderRoute('/cambiar-clave');
    expect(screen.getByText('Verificando la sesión…')).toBeInTheDocument();
  });
});
