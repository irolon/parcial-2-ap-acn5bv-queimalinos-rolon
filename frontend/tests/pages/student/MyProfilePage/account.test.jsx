import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import MyProfilePage from '@/pages/student/MyProfilePage';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { downloadText } from '@/utils/download';
import { calls, errorResponse, jsonResponse } from '../../../helpers/shared/fetchMock';
import { allowSlowScreens } from '../../../helpers/shared/patience';
import { setupUser } from '../../../helpers/shared/user';
import { csvResponse, fillPasswordForm } from '../../../helpers/account/account';
import { SELF, renderOwn, selfDetail, signInSelf, stubSelf } from '../../../helpers/students/self';

vi.mock('@/utils/download', () => ({ downloadText: vi.fn() }));

allowSlowScreens();

const CSV = '﻿Fecha;Hora\r\n';

beforeEach(() => {
  signInSelf();
  vi.mocked(downloadText).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

/** Lo de `stubSelf` más el export y el cambio de clave. */
function show({ exportReply = () => csvResponse(CSV), passwordReply } = {}) {
  const fetchMock = stubSelf({ profile: selfDetail() });
  const base = fetchMock.getMockImplementation();
  fetchMock.mockImplementation(async (url, init = {}) => {
    if (url.endsWith(`/students/${SELF.id}/export`)) return exportReply();
    if (url.endsWith('/auth/password') && passwordReply) return passwordReply();
    return base(url, init);
  });
  renderOwn(<MyProfilePage />);
  return fetchMock;
}

const accountCard = async () => (await screen.findByText('Cuenta')).closest('section');

describe('MyProfilePage: cuenta', () => {
  it('muestra las filas Contraseña y Exportar mis datos', async () => {
    show();
    const card = await accountCard();
    expect(within(card).getByText('Contraseña')).toBeInTheDocument();
    expect(within(card).getByText('Nunca la cambiaste')).toBeInTheDocument();
    expect(within(card).getByText('Exportar mis datos')).toBeInTheDocument();
    expect(within(card).getByText('Historial completo en formato CSV')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Cambiar' })).toBeEnabled();
    expect(within(card).getByRole('button', { name: 'Descargar' })).toBeEnabled();
  });

  it('con password_changed_at dice hace cuántos días', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-09T15:00:00Z'));
    useAuthStore.setState({ user: { ...SELF, password_changed_at: '2026-11-06T12:00:00Z' } });
    show();
    expect(await screen.findByText('Modificada hace 3 días')).toBeInTheDocument();
  });

  it('Descargar pide GET /students/s-1/export y baja el archivo con el nombre del día', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 9, 12, 0));
    const fetchMock = show();
    const card = await accountCard();
    await setupUser().click(within(card).getByRole('button', { name: 'Descargar' }));
    await vi.waitFor(() =>
      expect(downloadText).toHaveBeenCalledWith(CSV, 'fittrainer-mis-sesiones-2026-11-09.csv', 'text/csv'),
    );
    expect(calls(fetchMock).some(([path, init]) => path === `/students/${SELF.id}/export` && init.method === 'GET')).toBe(
      true,
    );
  });

  it('si la descarga falla lo avisa', async () => {
    show({ exportReply: () => errorResponse(500, 'INTERNAL_ERROR') });
    const card = await accountCard();
    await setupUser().click(within(card).getByRole('button', { name: 'Descargar' }));
    expect(await within(card).findByText('No pudimos descargar el archivo')).toBeInTheDocument();
    expect(downloadText).not.toHaveBeenCalled();
  });

  it('Cambiar abre el diálogo y, al guardar, avisa que cerró las otras sesiones', async () => {
    show({
      passwordReply: () =>
        jsonResponse(200, { token: 'access-2', expires_in: '1h', password_changed_at: new Date().toISOString() }),
    });
    const user = setupUser();
    const card = await accountCard();
    await user.click(within(card).getByRole('button', { name: 'Cambiar' }));
    expect(screen.getByRole('dialog', { name: 'Cambiar contraseña' })).toBeInTheDocument();
    await fillPasswordForm(user);
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await within(card).findByRole('status')).toHaveTextContent(
      'Listo. Cerramos tu sesión en los otros dispositivos.',
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(within(card).getByText('Modificada hoy')).toBeInTheDocument();
  });
});
