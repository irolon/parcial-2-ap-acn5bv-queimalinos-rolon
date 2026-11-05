import { describe, expect, it } from '@jest/globals';
import { createApp } from '../../../src/app.js';
import { listRoutes } from '../../helpers/app/routes.js';

// Todo POST/PUT/PATCH tiene que validar el body con validate(...) (que marca su middleware con
// `validates = 'body'`). Las excepciones son endpoints sin body, cada una con su motivo.
const WITHOUT_BODY = {
  'PATCH /api/notifications/read-all': 'marca todas como leídas; no lee el body',
  'PATCH /api/notifications/:id/read': 'marca una como leída; solo valida el :id',
  'POST /api/messages/:studentId/read': 'marca la conversación como leída; solo valida el :studentId',
};

const WITH_BODY = ['POST', 'PUT', 'PATCH'];
const routes = listRoutes(createApp());
// Las capas de rate limiting que la app monta antes de los routers no son endpoints.
const endpoints = routes.filter((r) => !r.handlers.every((h) => h.isRateLimit));
const withBody = endpoints.filter((r) => WITH_BODY.includes(r.method));
const key = (r) => `${r.method} ${r.path}`;
const validatesBody = (r) => r.handlers.some((h) => h.validates === 'body');

describe('validación de entrada en todas las rutas con body', () => {
  it('el barrido encuentra las rutas (sanity check)', () => {
    expect(withBody.length).toBeGreaterThan(30);
    expect(withBody.map(key)).toEqual(
      expect.arrayContaining(['POST /api/auth/login', 'POST /api/students/:id/metrics', 'PUT /api/availability'])
    );
  });

  it('cada POST/PUT/PATCH valida el body, salvo las excepciones justificadas', () => {
    const missing = withBody.filter((r) => !validatesBody(r) && !WITHOUT_BODY[key(r)]).map(key);
    expect(missing).toEqual([]);
  });

  it('las excepciones existen y de verdad no validan body (si no, sobran)', () => {
    for (const exception of Object.keys(WITHOUT_BODY)) {
      const route = withBody.find((r) => key(r) === exception);
      expect(route).toBeDefined();
      expect(validatesBody(route)).toBe(false);
    }
  });

  it('los limitadores van montados antes que los routers', () => {
    const limited = routes.filter((r) => r.handlers.every((h) => h.isRateLimit)).map(key);
    expect(limited).toEqual([
      'POST /api/auth/login',
      'POST /api/auth/register',
      'POST /api/auth/refresh',
      'GET /api/invitations/:token',
      'POST /api/students',
    ]);
  });
});
