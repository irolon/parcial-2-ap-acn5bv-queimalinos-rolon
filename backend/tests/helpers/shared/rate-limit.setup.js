import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Supabase falso: toda consulta vuelve vacía (la invitación no existe → 404), sin red.
// Se importa antes que la app: el mock tiene que estar registrado cuando se carga src/.
const src = (p) => fileURLToPath(new URL(`../../../src/${p}`, import.meta.url));
const empty = () =>
  new Proxy({}, {
    get: (_t, m) => (m === 'then' ? (res) => res({ data: null, error: null }) : () => empty()),
  });
jest.unstable_mockModule(src('config/supabase.js'), () => ({
  supabase: { from: () => empty(), rpc: () => empty() },
}));

export const { startServer, listen } = await import('../app/http.setup.js');
export const { createApp } = await import('../../../src/app.js');

/** Cuerpo del 429, con el formato de error del contrato. */
export const LIMITED = {
  error: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Demasiados intentos. Probá de nuevo en unos minutos.',
    details: [],
  },
};

/** POST de login con el email dado; `ip` va por X-Forwarded-For (la app tiene que confiar en el proxy). */
export const login = (http, email, ip, path = '/api/auth/login') =>
  http.send('post', path, {
    json: { email },
    headers: ip ? { 'x-forwarded-for': ip } : {},
  });
