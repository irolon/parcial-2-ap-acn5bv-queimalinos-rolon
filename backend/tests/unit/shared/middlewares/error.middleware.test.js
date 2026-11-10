import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import express from 'express';
import { env } from '../../../../src/config/env.js';
import { errorHandler } from '../../../../src/shared/middlewares/error.middleware.js';
import { AppError, Errors } from '../../../../src/shared/utils/errors.js';
import { listen, startServer } from '../../../helpers/app/http.setup.js';

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

  const UNSUPPORTED = {
    error: {
      code: 'UNSUPPORTED_MEDIA_TYPE',
      message: 'Codificación del cuerpo no soportada',
      details: [],
    },
  };

  it('Content-Encoding no soportado → 415 UNSUPPORTED_MEDIA_TYPE', async () => {
    const res = await http.send('post', '/api/auth/login', {
      raw: '{}',
      headers: { 'content-encoding': 'br' },
    });
    expect(res.status).toBe(415);
    expect(res.body).toEqual(UNSUPPORTED);
  });

  it('charset no soportado → 415 UNSUPPORTED_MEDIA_TYPE', async () => {
    const res = await http.send('post', '/api/auth/login', {
      raw: '{}',
      headers: { 'content-type': 'application/json; charset=latin1' },
    });
    expect(res.status).toBe(415);
    expect(res.body).toEqual(UNSUPPORTED);
  });

  it('gzip corrupto → 400 VALIDATION_ERROR, nunca 500', async () => {
    const res = await http.send('post', '/api/auth/register', {
      raw: 'esto no es gzip',
      headers: { 'content-encoding': 'gzip' },
    });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'El cuerpo de la solicitud es inválido', details: [] },
    });
  });
});

/** App mínima cuyo único endpoint falla con `err`, para probar el errorHandler. */
const failingApp = (err) => {
  const app = express();
  app.get('/boom', (_req, _res, next) => next(err));
  app.use(errorHandler);
  return app;
};

describe('otros errores 4xx del body-parser', () => {
  it.each([
    ['request.aborted', 400],
    ['request.size.invalid', 400],
    ['parameters.too.many', 413],
  ])('%s (%i, expose) → 400 VALIDATION_ERROR, nunca 500', async (type, status) => {
    const http = await listen(failingApp(Object.assign(new Error('x'), { type, status, expose: true })));
    const res = await http.send('get', '/boom');
    await http.stop();
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'El cuerpo de la solicitud es inválido', details: [] },
    });
  });
});

describe('error no controlado con NODE_ENV=production', () => {
  let http;
  const original = env.NODE_ENV;

  beforeAll(async () => {
    env.NODE_ENV = 'production';
    jest.spyOn(console, 'error').mockImplementation(() => {});
    http = await listen(failingApp(new Error('detalle interno con secreto')));
  });

  afterAll(async () => {
    env.NODE_ENV = original;
    console.error.mockRestore();
    await http.stop();
  });

  it('responde 500 genérico, details vacío y sin stack', async () => {
    const res = await http.send('get', '/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor', details: [] },
    });
    expect(JSON.stringify(res.body)).not.toMatch(/secreto|stack|at /);
  });

  it('un error con type pero 5xx (stream.encoding.set) sigue siendo 500', async () => {
    const err = Object.assign(new Error('x'), { type: 'stream.encoding.set', status: 500, expose: false });
    const other = await listen(failingApp(err));
    const res = await other.send('get', '/boom');
    await other.stop();
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });
});

function fakeRes() {
  const res = { headers: {} };
  res.set = (h) => { Object.assign(res.headers, h); return res; };
  res.status = (s) => { res.statusCode = s; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
}

describe('error.middleware · errorHandler', () => {
  it('manda los headers del AppError (Retry-After del 429)', () => {
    const res = fakeRes();
    errorHandler(Errors.rateLimitExceeded(30), {}, res, () => {});
    expect(res.statusCode).toBe(429);
    expect(res.headers).toEqual({ 'Retry-After': '30' });
    expect(res.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('un AppError sin headers no setea nada', () => {
    const res = fakeRes();
    errorHandler(new AppError(404, 'NOT_FOUND', 'x'), {}, res, () => {});
    expect(res.headers).toEqual({});
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'x', details: [] } });
  });
});
