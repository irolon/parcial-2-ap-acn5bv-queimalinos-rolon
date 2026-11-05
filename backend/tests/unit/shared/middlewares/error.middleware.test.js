import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import express from 'express';
import { env } from '../../../../src/config/env.js';
import { errorHandler } from '../../../../src/shared/middlewares/error.middleware.js';
import { startServer } from '../../../helpers/app/http.setup.js';

describe('errores del body (createApp)', () => {
  let http;
  beforeAll(async () => {
    http = await startServer();
  });
  afterAll(() => http.stop());

  it('JSON mal formado → 400 VALIDATION_ERROR con el formato del contrato', async () => {
    const res = await http.send('post', '/api/auth/login', { raw: '{"email": "a@b.c",' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'El cuerpo no es JSON válido', details: [] },
    });
  });

  it('body de más de 100 kB → 413 PAYLOAD_TOO_LARGE', async () => {
    const res = await http.send('post', '/api/auth/login', { json: { pad: 'x'.repeat(200 * 1024) } });
    expect(res.status).toBe(413);
    expect(res.body).toEqual({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'El cuerpo es demasiado grande', details: [] },
    });
  });
});

describe('error no controlado con NODE_ENV=production', () => {
  let server;
  let base;
  const original = env.NODE_ENV;

  beforeAll(async () => {
    env.NODE_ENV = 'production';
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const app = express();
    app.get('/boom', () => {
      throw new Error('detalle interno con secreto');
    });
    app.use(errorHandler);
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    env.NODE_ENV = original;
    console.error.mockRestore();
    await new Promise((resolve) => server.close(resolve));
  });

  it('responde 500 genérico, details vacío y sin stack', async () => {
    const res = await fetch(`${base}/boom`);
    const text = await res.text();
    expect(res.status).toBe(500);
    expect(JSON.parse(text)).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor', details: [] },
    });
    expect(text).not.toMatch(/secreto|stack|at /);
  });
});
