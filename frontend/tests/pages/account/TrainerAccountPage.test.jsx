import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { downloadText } from '@/utils/download';
import { resetAuthStore } from '../../helpers/auth/authStore';
import { TRAINER, renderRoute, setSession } from '../../helpers/routes/renderRoute';
import { calls, errorResponse, stubFetch } from '../../helpers/shared/fetchMock';
import { allowSlowScreens } from '../../helpers/shared/patience';
import { setupUser } from '../../helpers/shared/user';
import { csvResponse } from '../../helpers/account/account';

vi.mock('@/utils/download', () => ({ downloadText: vi.fn() }));

allowSlowScreens();

const CSV = '﻿Alumno;Email\r\n';
let fetchMock;

beforeEach(() => {
  resetAuthStore();
  setSession(TRAINER);
  vi.mocked(downloadText).mockReset();
  fetchMock = stubFetch(async (url) =>
    url.endsWith('/students/export') ? csvResponse(CSV) : errorResponse(500, 'INTERNAL', `Sin handler: ${url}`),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('TrainerAccountPage (/pt/cuenta)', () => {
  it('muestra "Tu cuenta" en la topbar y las dos filas', async () => {
    renderRoute('/pt/cuenta');
    expect(await screen.findByRole('heading', { level: 1, name: 'Tu cuenta' })).toBeInTheDocument();
    expect(screen.getByText('CONTRASEÑA Y DATOS')).toBeInTheDocument();
    const card = screen.getByRole('region', { name: 'Cuenta' });
    expect(within(card).getByText('Contraseña')).toBeInTheDocument();
    expect(within(card).getByText('Nunca la cambiaste')).toBeInTheDocument();
    expect(within(card).getByText('Exportar los datos de tus alumnos')).toBeInTheDocument();
    expect(within(card).getByText('Todas sus sesiones en CSV')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Descargar pide GET /students/export y baja fittrainer-alumnos-<fecha>.csv', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 9, 12, 0));
    renderRoute('/pt/cuenta');
    await setupUser().click(await screen.findByRole('button', { name: 'Descargar' }));
    await vi.waitFor(() =>
      expect(downloadText).toHaveBeenCalledWith(CSV, 'fittrainer-alumnos-2026-11-09.csv', 'text/csv'),
    );
    expect(calls(fetchMock).map(([path]) => path)).toEqual(['/students/export']);
  });

  it('el alumno no entra: vuelve a su home', async () => {
    setSession({ id: 's-1', email: 'tomas@fit.com', name: 'Tomás Ruiz', role: 'student' });
    const { pathname } = renderRoute('/pt/cuenta');
    await vi.waitFor(() => expect(pathname()).toBe('/alumno/hoy'));
  });
});
