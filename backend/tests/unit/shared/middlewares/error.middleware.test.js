import { describe, it, expect } from '@jest/globals';
import { errorHandler } from '../../../../src/shared/middlewares/error.middleware.js';
import { AppError, Errors } from '../../../../src/shared/utils/errors.js';

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
