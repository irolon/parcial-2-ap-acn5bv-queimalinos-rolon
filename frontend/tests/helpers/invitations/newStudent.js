import { vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, errorResponse, jsonResponse, stubFetch } from '../shared/fetchMock';

export const PAGE_PATH = '/pt/alumnos/nuevo';
export const QR_PNG = 'data:image/png;base64,UVI=';

/** Respuesta de `POST /invitations` que vence en 48 h (menos un minuto). */
export function invitationResponse(overrides = {}) {
  return {
    invitation_id: 'inv-1',
    token: '7a2k9x',
    join_url: 'http://localhost:5173/join?token=7a2k9x',
    expires_at: new Date(Date.now() + 48 * 3600_000 - 60_000).toISOString(),
    whatsapp_share_url: 'https://wa.me/5491112345678?text=hola',
    ...overrides,
  };
}

/**
 * jsdom no tiene canvas: `getContext` devuelve null (qrcode.react no dibuja)
 * y `toDataURL` devuelve un PNG fijo.
 */
export function stubCanvas() {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(QR_PNG);
}

/** La página (sin el sidebar, que también tiene un botón "Generar QR"). */
export const page = () => within(screen.getByRole('main'));

/** Completa el formulario y toca "Generar QR". Los campos vacíos (`''`) se dejan como están. */
export async function fillAndSubmit(
  {
    name = 'Tomás Rivera',
    email = 'tomas@fit.com',
    phone = '9 11 1234 5678',
    goal = '',
    level = '',
  } = {},
  user = userEvent.setup(),
) {
  const main = within(await screen.findByRole('main'));
  if (name) await user.type(await main.findByLabelText('Nombre y apellido'), name);
  if (email) await user.type(main.getByLabelText('Email'), email);
  if (phone) await user.type(main.getByLabelText('Teléfono'), phone);
  if (goal) await user.selectOptions(main.getByLabelText('Objetivo (opcional)'), goal);
  if (level) await user.selectOptions(main.getByLabelText('Nivel (opcional)'), level);
  await user.click(main.getByRole('button', { name: 'Generar QR' }));
  return user;
}

/**
 * Stub de la página: `GET /routine-templates` responde `templates` (una lista, un status de error o `'never'`
 * para que quede cargando); el resto va a `handler`.
 */
export function stubInvitationApi(handler, { templates = [] } = {}) {
  return stubFetch(async (url, init = {}) => {
    if ((init.method ?? 'GET') !== 'GET' || !String(url).endsWith('/routine-templates')) return handler(url, init);
    if (templates === 'never') return new Promise(() => {});
    if (typeof templates === 'number') return errorResponse(templates, 'INTERNAL_ERROR', 'Falló');
    return jsonResponse(200, { data: templates });
  });
}

/** Los `POST /invitations` que salieron. */
export const invitationPosts = (fetchMock) =>
  calls(fetchMock).filter(([path, init]) => path === '/invitations' && init?.method === 'POST');
