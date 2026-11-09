import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { downloadText } from '@/utils/download';
import { resetAuthStore } from '../../helpers/auth/authStore';
import { TRAINER, renderRoute, setSession } from '../../helpers/routes/renderRoute';
import { calls, errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';
import { allowSlowScreens } from '../../helpers/shared/patience';
import { setupUser } from '../../helpers/shared/user';
import { csvResponse } from '../../helpers/account/account';

vi.mock('@/utils/download', () => ({ downloadText: vi.fn() }));

allowSlowScreens();

const ME = { id: TRAINER.id, name: TRAINER.name, email: TRAINER.email, professional_title: null };
const CSV = '﻿Alumno;Email\r\n';
let fetchMock;

beforeEach(() => {
  resetAuthStore();
  setSession(TRAINER);
  vi.mocked(downloadText).mockReset();
  fetchMock = stubFetch(async (url) => {
    if (url.endsWith('/students/export')) return csvResponse(CSV);
    if (url.endsWith('/auth/me')) return jsonResponse(200, { data: ME });
    return errorResponse(500, 'INTERNAL', `Sin handler: ${url}`);
  });
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
    expect(within(card).queryByText('Notificaciones')).toBeNull();
    expect(calls(fetchMock).map(([path]) => path)).toEqual(['/auth/me']);
  });

  it('arriba de la tarjeta Cuenta está "Tu perfil" con el nombre y el título', async () => {
    renderRoute('/pt/cuenta');
    const profile = await screen.findByRole('region', { name: 'Tu perfil' });
    expect(await within(profile).findByLabelText('Nombre')).toHaveValue(TRAINER.name);
    expect(within(profile).getByLabelText('Título profesional')).toHaveValue('');
    const account = screen.getByRole('region', { name: 'Cuenta' });
    expect(profile.compareDocumentPosition(account) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('Descargar pide GET /students/export y baja fittrainer-alumnos-<fecha de la descarga>.csv', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 8, 23, 59));
    renderRoute('/pt/cuenta');
    const button = await screen.findByRole('button', { name: 'Descargar' });
    vi.setSystemTime(new Date(2026, 10, 9, 0, 1));
    await setupUser().click(button);
    await vi.waitFor(() =>
      expect(downloadText).toHaveBeenCalledWith(CSV, 'fittrainer-alumnos-2026-11-09.csv', 'text/csv'),
    );
    expect(calls(fetchMock).map(([path]) => path)).toContain('/students/export');
  });

  it('el alumno no entra: vuelve a su home', async () => {
    setSession({ id: 's-1', email: 'tomas@fit.com', name: 'Tomás Ruiz', role: 'student' });
    const { pathname } = renderRoute('/pt/cuenta');
    await vi.waitFor(() => expect(pathname()).toBe('/alumno/hoy'));
  });
});
