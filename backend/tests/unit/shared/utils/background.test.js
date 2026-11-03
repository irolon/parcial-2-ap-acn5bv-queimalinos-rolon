import { describe, expect, it, jest } from '@jest/globals';
import { runInBackground } from '../../../../src/shared/utils/background.js';

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('runInBackground', () => {
  it('no espera a la función: vuelve antes de que termine', async () => {
    const fn = jest.fn(() => new Promise(() => {}));
    expect(runInBackground('x', fn)).toBeUndefined();
    await flush();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['un throw sincrónico', () => { throw new Error('boom'); }],
    ['una promesa rechazada', () => Promise.reject(new Error('boom'))],
  ])('%s se loguea y no se propaga', async (_n, fn) => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => runInBackground('push', fn)).not.toThrow();
    await flush();
    expect(log).toHaveBeenCalledWith('[push]', 'boom');
    log.mockRestore();
  });
});
