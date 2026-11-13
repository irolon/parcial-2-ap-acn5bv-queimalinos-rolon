import { describe, expect, it, vi } from 'vitest';
import { closeOnServer, openOnServer } from '@/utils/workout/openSession';
import { freshWorkout, httpError, networkError } from '../../helpers/workout/workout';

/** API falsa: `openSession` y `deleteSession` contestan `answers.open` / `answers.close` (un valor, un Error o una promesa). */
function fakeApi({ open, close } = {}) {
  const answer = (value) => (value instanceof Error ? Promise.reject(value) : Promise.resolve(value ?? null));
  return {
    openSession: vi.fn(() => (open instanceof Promise ? open : answer(open))),
    deleteSession: vi.fn(() => answer(close)),
  };
}

describe('openOnServer', () => {
  it('manda POST /sessions con el body de la sesión, sin finished_at', async () => {
    const api = fakeApi();
    const workout = freshWorkout();
    await openOnServer(workout, { api });
    expect(api.openSession).toHaveBeenCalledTimes(1);
    const [body] = api.openSession.mock.calls[0];
    expect(body).toMatchObject({ id: 'session-1', started_at: workout.startedAt });
    expect(body.finished_at ?? null).toBeNull();
  });

  it.each([
    ['un 5xx', httpError(503)],
    ['sin red', networkError()],
    ['algo que no es HTTP', new TypeError('boom')],
  ])('%s no se propaga', async (_name, error) => {
    const api = fakeApi({ open: error });
    await expect(openOnServer(freshWorkout(), { api })).resolves.toBeUndefined();
  });

  it('sin poder hablar con el servidor (p. ej. sesión offline) no pide nada', async () => {
    const api = fakeApi();
    await openOnServer(freshWorkout(), { api, shouldSend: () => false });
    expect(api.openSession).not.toHaveBeenCalled();
  });

  it('no cambia la sesión: la subida final vuelve a mandar el POST', async () => {
    const workout = freshWorkout();
    const before = structuredClone(workout);
    await openOnServer(workout, { api: fakeApi() });
    expect(workout).toEqual(before);
    expect(workout.upload.sessionCreated).toBe(false);
  });
});

describe('closeOnServer', () => {
  it('borra la sesión con DELETE /sessions/:id', async () => {
    const api = fakeApi();
    await closeOnServer('session-1', { api });
    expect(api.deleteSession).toHaveBeenCalledWith('session-1');
  });

  it('espera a que termine la apertura en vuelo antes de borrar', async () => {
    let release;
    const api = fakeApi({ open: new Promise((resolve) => { release = resolve; }) });
    const opening = openOnServer(freshWorkout(), { api });
    const closing = closeOnServer('session-1', { api });
    await Promise.resolve();
    expect(api.deleteSession).not.toHaveBeenCalled();
    release({});
    await Promise.all([opening, closing]);
    expect(api.deleteSession).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['404', httpError(404, 'SESSION_NOT_FOUND')],
    ['sin red', networkError()],
  ])('%s no se propaga', async (_name, error) => {
    await expect(closeOnServer('session-1', { api: fakeApi({ close: error }) })).resolves.toBeUndefined();
  });

  it('sin poder hablar con el servidor no pide nada', async () => {
    const api = fakeApi();
    await closeOnServer('session-1', { api, shouldSend: () => false });
    expect(api.deleteSession).not.toHaveBeenCalled();
  });
});
