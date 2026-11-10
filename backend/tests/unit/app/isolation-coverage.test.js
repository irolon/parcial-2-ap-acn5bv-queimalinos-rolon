import { describe, expect, it } from '@jest/globals';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createApp } from '../../../src/app.js';
import { listRoutes } from '../../helpers/app/routes.js';

// Toda ruta con un parámetro de recurso (`:id`, `:studentId`, …) tiene que estar en alguna tabla de aislamiento de
// `tests/integration/isolation/` (trainer-cross, student-cross, wrong-role, lists y agenda): ahí se prueba que el otro
// PT o el otro alumno recibe 403/404 y no los datos. Las excepciones van con su motivo.
const NOT_OWNED = {
  'GET /api/invitations/:token': 'pública por diseño: el token es el secreto y no hay dueño logueado (tiene limitador)',
};

const ISOLATION_DIR = fileURLToPath(new URL('../../integration/isolation/', import.meta.url));

// Las tablas escriben el pedido como 'PATCH /routines/:rtA' y los tests sueltos como .patch(`/appointments/${id}`).
const AS_ROW = /['`](GET|POST|PUT|PATCH|DELETE) (\/[^'`\s?]*)/g;
const AS_CALL = /\.(get|post|put|patch|delete)\(\s*['`](\/[^'`?]*)/g;

/** Cada segmento que es un parámetro (`:stA`, `${A.appointmentId}`, `:id`) pasa a ser `:`. */
const shape = (path) =>
  path
    .split('/')
    .map((segment) => (segment.startsWith(':') || segment.startsWith('${') ? ':' : segment))
    .join('/');

function testedRequests() {
  const tested = new Set();
  for (const file of readdirSync(ISOLATION_DIR)) {
    const source = readFileSync(ISOLATION_DIR + file, 'utf8');
    for (const [, method, path] of source.matchAll(AS_ROW)) tested.add(`${method} ${shape(`/api${path}`)}`);
    for (const [, method, path] of source.matchAll(AS_CALL)) tested.add(`${method.toUpperCase()} ${shape(`/api${path}`)}`);
  }
  return tested;
}

const routes = listRoutes(createApp()).filter((r) => r.path.includes('/:'));
const tested = testedRequests();
const key = (r) => `${r.method} ${r.path}`;
const isTested = (r) => tested.has(`${r.method} ${shape(r.path)}`);

describe('aislamiento: toda ruta con parámetro de recurso está en una tabla', () => {
  it('el barrido encuentra las rutas y los pedidos de las tablas (sanity check)', () => {
    expect(routes.length).toBeGreaterThan(35);
    expect(routes.map(key)).toEqual(expect.arrayContaining(['GET /api/students/:id', 'PATCH /api/appointments/:id']));
    expect(tested.has('PATCH /api/routines/:')).toBe(true);
    expect(tested.has('PATCH /api/appointments/:')).toBe(true);
  });

  it('cada ruta con parámetro se prueba cruzada, salvo las excepciones justificadas', () => {
    const missing = routes.filter((r) => !isTested(r) && !NOT_OWNED[key(r)]).map(key);
    expect(missing).toEqual([]);
  });

  it('las excepciones existen y de verdad no están en las tablas (si no, sobran)', () => {
    for (const exception of Object.keys(NOT_OWNED)) {
      const route = routes.find((r) => key(r) === exception);
      expect(route).toBeDefined();
      expect(isTested(route)).toBe(false);
    }
  });
});
