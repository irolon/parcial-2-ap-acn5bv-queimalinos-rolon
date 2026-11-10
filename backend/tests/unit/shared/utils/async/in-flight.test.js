import { describe, expect, it } from '@jest/globals';
import {
  inFlightCount,
  settleInFlight,
  trackInFlight,
} from '../../../../../src/shared/utils/async/in-flight.js';
import { runInBackground } from '../../../../../src/shared/utils/async/background.js';

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('in-flight', () => {
  it('devuelve la misma promesa y la suelta al terminar', async () => {
    const d = deferred();
    expect(trackInFlight(d.promise)).toBe(d.promise);
    expect(inFlightCount()).toBe(1);
    d.resolve('ok');
    await settleInFlight();
    expect(inFlightCount()).toBe(0);
  });

  it('settleInFlight espera también a las rechazadas sin propagar el error', async () => {
    const d = deferred();
    const tracked = trackInFlight(d.promise);
    d.reject(new Error('boom'));
    await expect(settleInFlight()).resolves.toBeUndefined();
    await expect(tracked).rejects.toThrow('boom');
    expect(inFlightCount()).toBe(0);
  });

  it('espera a las tareas que se lanzan mientras se asientan las primeras', async () => {
    const order = [];
    const late = deferred();
    trackInFlight(
      Promise.resolve().then(() => {
        trackInFlight(late.promise.then(() => order.push('tardía')));
        order.push('primera');
      })
    );
    const settled = settleInFlight().then(() => order.push('asentado'));
    await new Promise((resolve) => setImmediate(resolve));
    late.resolve();
    await settled;
    expect(order).toEqual(['primera', 'tardía', 'asentado']);
  });

  it('runInBackground queda anotada hasta que termina', async () => {
    const d = deferred();
    runInBackground('x', () => d.promise);
    expect(inFlightCount()).toBe(1);
    d.resolve();
    await settleInFlight();
    expect(inFlightCount()).toBe(0);
  });
});
