import request from 'supertest';
import { createApp } from '../../../src/app.js';

// Una app por archivo de test (el módulo se carga una vez por archivo).
const app = createApp();
const METHODS = ['get', 'post', 'patch', 'put', 'delete'];

/** Cliente de la API con Bearer opcional: api(token).get('/students'). */
export function api(token) {
  const client = {};
  for (const method of METHODS) {
    client[method] = (path) => {
      const req = request(app)[method](`/api${path}`);
      return token ? req.set('Authorization', `Bearer ${token}`) : req;
    };
  }
  return client;
}

/** Corta con el cuerpo de la respuesta si el código no es el esperado. */
export function expectStatus(res, status, what) {
  if (res.status !== status) {
    throw new Error(`${what}: esperaba ${status} y vino ${res.status} ${JSON.stringify(res.body)}`);
  }
}
