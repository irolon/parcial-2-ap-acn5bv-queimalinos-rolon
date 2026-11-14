import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import MyProfilePage from '@/pages/student/MyProfilePage';
import { bodyOf, calls, jsonResponse } from '../../../helpers/shared/fetchMock';
import { allowSlowScreens } from '../../../helpers/shared/patience';
import { setupUser } from '../../../helpers/shared/user';
import { renderOwn, selfDetail, selfPreferences, signInSelf, stubSelf } from '../../../helpers/students/self';

allowSlowScreens();

beforeEach(() => {
  signInSelf();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function show(options) {
  const fetchMock = stubSelf({ profile: selfDetail(), ...options });
  renderOwn(<MyProfilePage />);
  return fetchMock;
}

const accountCard = async () => (await screen.findByText('Cuenta')).closest('section');
const preferenceGets = (fetchMock) =>
  calls(fetchMock).filter(([path, init]) => path === '/notifications/preferences' && init.method === 'GET');

describe('MyProfilePage: notificaciones', () => {
  it('sin preferencias guardadas la fila dice "Todas activadas", entre Contraseña y Exportar', async () => {
    show();
    const card = await accountCard();
    expect(await within(card).findByText('Todas activadas')).toBeInTheDocument();
    const titles = ['Contraseña', 'Notificaciones', 'Exportar mis datos'].map((t) => within(card).getByText(t));
    expect(titles[0].compareDocumentPosition(titles[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(titles[1].compareDocumentPosition(titles[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(card).getByRole('button', { name: 'Editar' })).toBeEnabled();
  });

  it('con Comentarios apagado dice "4 de 5 activadas"', async () => {
    show({ preferences: selfPreferences({ comment: false }) });
    const card = await accountCard();
    expect(await within(card).findByText('4 de 5 activadas')).toBeInTheDocument();
  });

  it('mientras carga dice "Cargando…"', async () => {
    show({ preferences: () => new Promise(() => {}) });
    const card = await accountCard();
    expect(within(card).getByText('Cargando…')).toBeInTheDocument();
  });

  it('si el GET falla avisa y "Reintentar" vuelve a pedir y muestra el resumen', async () => {
    let fail = true;
    const fetchMock = show({ preferences: () => (fail ? 500 : selfPreferences({ pr: false, achievement: false })) });
    const card = await accountCard();
    expect(await within(card).findByText('No pudimos cargar tus preferencias')).toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: 'Editar' })).toBeNull();
    fail = false;
    await setupUser().click(within(card).getByRole('button', { name: 'Reintentar' }));
    expect(await within(card).findByText('3 de 5 activadas')).toBeInTheDocument();
    expect(preferenceGets(fetchMock)).toHaveLength(2);
  });

  it('"Editar" abre el diálogo y guardar actualiza el resumen sin recargar', async () => {
    const saved = selfPreferences({ comment: false, updated_at: '2026-11-09T15:00:00.000Z' });
    const savePreferences = vi.fn(async () => jsonResponse(200, { data: saved }));
    const fetchMock = show({ savePreferences });
    const user = setupUser();
    const card = await accountCard();
    await within(card).findByText('Todas activadas');
    await user.click(within(card).getByRole('button', { name: 'Editar' }));
    const dialog = screen.getByRole('dialog', { name: 'Avisos en tu celular' });
    await user.click(within(dialog).getByRole('switch', { name: 'Comentarios' }));
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(await within(card).findByText('4 de 5 activadas')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(bodyOf(savePreferences.mock.calls[0][0])).toEqual({
      message: true, comment: false, appointment: true, pr: true, achievement: true,
    });
    expect(preferenceGets(fetchMock)).toHaveLength(1);
  });
});
