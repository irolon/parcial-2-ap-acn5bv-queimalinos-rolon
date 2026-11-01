import { describe, expect, it, vi } from 'vitest';
import { uploadWorkout } from '@/utils/workout/uploadWorkout';
import {
  fakeApi, finishedWorkout, httpError, networkError, savedAll, sentBatches, setIds,
} from '../../../helpers/workout/workout';

describe('uploadWorkout: errores del POST /sessions', () => {
  it.each([
    [500, 'INTERNAL'], [502, 'HTTP_ERROR'], [503, 'SERVICE_UNAVAILABLE'], [408, 'HTTP_ERROR'], [429, 'RATE_LIMITED'],
  ])('%i: se corta y se puede reintentar; la sesión no queda creada', async (status, code) => {
    const api = fakeApi({ session: [httpError(status, code)] });
    const result = await uploadWorkout({ api, state: finishedWorkout(3) });
    expect(result.ok).toBe(false);
    expect(result.error).toMatchObject({ status, code, retryable: true });
    expect(result.state.upload.sessionCreated).toBe(false);
    expect(api.uploadSets).not.toHaveBeenCalled();
  });

  it.each([
    [400, 'VALIDATION_ERROR'], [401, 'UNAUTHORIZED'], [403, 'FORBIDDEN'], [404, 'NOT_FOUND'],
  ])('%i: error permanente, se devuelve tal cual y no se mandan series', async (status, code) => {
    const api = fakeApi({ session: [httpError(status, code)] });
    const result = await uploadWorkout({ api, state: finishedWorkout(3) });
    expect(result.error).toMatchObject({ status, code, retryable: false });
    expect(api.createSession).toHaveBeenCalledTimes(1);
    expect(api.uploadSets).not.toHaveBeenCalled();
  });

  it('409: el id es de otro alumno; permanente, sin cambiar el id ni mandar series', async () => {
    const api = fakeApi({ session: [httpError(409, 'SESSION_ID_CONFLICT')] });
    const state = finishedWorkout(3);
    const result = await uploadWorkout({ api, state });
    expect(result.error).toMatchObject({ status: 409, code: 'SESSION_ID_CONFLICT', retryable: false });
    expect(result.state).toBe(state);
    expect(api.createSession).toHaveBeenCalledTimes(1);
    expect(api.uploadSets).not.toHaveBeenCalled();
  });

  it('una respuesta 2xx sin la sesión (proxy, portal cautivo) no cuenta como creada', async () => {
    const api = fakeApi({ session: [null] });
    const result = await uploadWorkout({ api, state: finishedWorkout(3) });
    expect(result.error).toMatchObject({ status: null, code: 'BAD_RESPONSE', retryable: true });
    expect(result.state.upload.sessionCreated).toBe(false);
  });

  it('lo que no es un error HTTP (respuesta ilegible) se puede reintentar', async () => {
    const api = fakeApi({ session: [new TypeError("Cannot read properties of null (reading 'data')")] });
    const result = await uploadWorkout({ api, state: finishedWorkout(3) });
    expect(result.error).toMatchObject({ status: null, code: 'UNEXPECTED', retryable: true });
  });
});

describe('uploadWorkout: errores de las series', () => {
  it('404: la sesión no está; se vuelve a crear y se reenvían todas, también las confirmadas antes', async () => {
    const api = fakeApi({ sets: [(_id, list) => savedAll(list), httpError(404, 'SESSION_NOT_FOUND')] });
    const onState = vi.fn();
    const result = await uploadWorkout({ api, state: finishedWorkout(150), onState });

    expect(result.ok).toBe(true);
    expect(api.createSession).toHaveBeenCalledTimes(2);
    expect(api.createSession.mock.calls[1]).toEqual(api.createSession.mock.calls[0]);
    expect(sentBatches(api)).toEqual([setIds(1, 100), setIds(101, 150), setIds(1, 100), setIds(101, 150)]);
    expect(onState.mock.calls.map(([s]) => [s.upload.sessionCreated, s.upload.sentSetIds.length]))
      .toEqual([[true, 0], [true, 100], [false, 0], [true, 0], [true, 100], [true, 150]]);
    expect(result.state.upload.sentSetIds).toEqual(setIds(1, 150));
  });

  it('404 otra vez después de recrearla: se corta (una sola vuelta) con error permanente', async () => {
    const api = fakeApi({ sets: [httpError(404, 'SESSION_NOT_FOUND'), httpError(404, 'SESSION_NOT_FOUND')] });
    const result = await uploadWorkout({ api, state: finishedWorkout(3) });
    expect(result.error).toMatchObject({ status: 404, code: 'SESSION_NOT_FOUND', retryable: false });
    expect(api.createSession).toHaveBeenCalledTimes(2);
    expect(api.uploadSets).toHaveBeenCalledTimes(2);
    expect(result.state.upload.sessionCreated).toBe(true);
  });

  it('si al recrearla falla la red, el próximo intento arranca por el POST', async () => {
    const api = fakeApi({ session: [{ id: 'session-1' }, networkError()], sets: [httpError(404, 'SESSION_NOT_FOUND')] });
    const first = await uploadWorkout({ api, state: finishedWorkout(3) });
    expect(first.error.retryable).toBe(true);
    expect(first.state.upload).toMatchObject({ sessionCreated: false, sentSetIds: [] });

    const second = await uploadWorkout({ api, state: first.state });
    expect(second.ok).toBe(true);
    expect(api.createSession).toHaveBeenCalledTimes(3);
  });

  it.each([
    [400, 'VALIDATION_ERROR', false], [403, 'FORBIDDEN', false], [500, 'INTERNAL', true],
  ])('%i en un lote: corta con retryable %s y conserva lo confirmado', async (status, code, retryable) => {
    const api = fakeApi({ sets: [(_id, list) => savedAll(list), httpError(status, code)] });
    const result = await uploadWorkout({ api, state: finishedWorkout(150) });
    expect(result.error).toMatchObject({ status, code, retryable });
    expect(result.state.upload).toMatchObject({ sessionCreated: true, sentSetIds: setIds(1, 100) });
    expect(api.createSession).toHaveBeenCalledTimes(1);
  });

  it('una respuesta de lote sin cuerpo no confirma nada y se puede reintentar', async () => {
    const api = fakeApi({ sets: [undefined] });
    const result = await uploadWorkout({ api, state: finishedWorkout(3) });
    expect(result.error).toMatchObject({ code: 'BAD_RESPONSE', retryable: true });
    expect(result.state.upload.sentSetIds).toEqual([]);
  });
});
