import { describe, expect, it, vi } from 'vitest';
import { uploadWorkout } from '@/utils/workout/uploadWorkout';
import {
  fakeApi, finishedWorkout, httpError, networkError, savedAll, sentBatches, setIds,
} from '../../../helpers/workout/workout';

// Lo que se guardó en localStorage entre un intento y el otro (como una recarga de la página).
const reloaded = (state) => JSON.parse(JSON.stringify(state));
const progress = (onState) => onState.mock.calls.map(([state]) => [state.upload.sessionCreated, state.upload.sentSetIds.length]);

// Review Focus 1: la subida se corta a la mitad y el reintento termina sin repetir la sesión ni las series ya enviadas.
describe('uploadWorkout: subida cortada y reintento', () => {
  it('sale todo bien: sesión, lotes en orden y un aviso por cada paso confirmado', async () => {
    const api = fakeApi();
    const onState = vi.fn();
    const result = await uploadWorkout({ api, state: finishedWorkout(250), onState });

    expect(result).toMatchObject({ ok: true, failed: [], unlocked: [] });
    expect(api.createSession).toHaveBeenCalledTimes(1);
    expect(sentBatches(api)).toEqual([setIds(1, 100), setIds(101, 200), setIds(201, 250)]);
    expect(api.uploadSets.mock.calls.every(([id]) => id === 'session-1')).toBe(true);
    expect(progress(onState)).toEqual([[true, 0], [true, 100], [true, 200], [true, 250]]);
    expect(result.state).toBe(onState.mock.calls.at(-1)[0]);
  });

  it('se corta después del POST /sessions: el reintento no vuelve a crear la sesión', async () => {
    const api = fakeApi({ sets: [networkError()] });
    const onState = vi.fn();
    const first = await uploadWorkout({ api, state: finishedWorkout(150), onState });

    expect(first.ok).toBe(false);
    expect(first.error).toMatchObject({ status: 0, code: 'NETWORK_ERROR', retryable: true });
    expect(first.state.upload).toMatchObject({ sessionCreated: true, sentSetIds: [] });
    expect(onState).toHaveBeenLastCalledWith(first.state);

    const second = await uploadWorkout({ api, state: reloaded(first.state), onState });
    expect(second.ok).toBe(true);
    expect(api.createSession).toHaveBeenCalledTimes(1);
    // El lote que no tuvo respuesta se reenvía (es idempotente); después, el resto.
    expect(sentBatches(api)).toEqual([setIds(1, 100), setIds(1, 100), setIds(101, 150)]);
    expect(second.state.upload.sentSetIds).toEqual(setIds(1, 150));
  });

  it('se corta después del primer lote: el reintento manda solo las series que faltan', async () => {
    const api = fakeApi({ sets: [(_id, list) => savedAll(list), httpError(503, 'SERVICE_UNAVAILABLE')] });
    const first = await uploadWorkout({ api, state: finishedWorkout(250) });

    expect(first.error).toMatchObject({ status: 503, retryable: true });
    expect(first.state.upload.sentSetIds).toEqual(setIds(1, 100));

    const second = await uploadWorkout({ api, state: reloaded(first.state) });
    expect(second.ok).toBe(true);
    expect(api.createSession).toHaveBeenCalledTimes(1);
    expect(sentBatches(api)).toEqual([setIds(1, 100), setIds(101, 200), setIds(101, 200), setIds(201, 250)]);
    const confirmed = second.state.upload.sentSetIds;
    expect(confirmed).toEqual(setIds(1, 250));
    expect(new Set(confirmed).size).toBe(250);
  });

  it('se corta en el POST /sessions: el reintento repite el mismo POST (idempotente por id)', async () => {
    const api = fakeApi({ session: [networkError()] });
    const first = await uploadWorkout({ api, state: finishedWorkout(5) });

    expect(first.error.retryable).toBe(true);
    expect(first.state.upload.sessionCreated).toBe(false);
    expect(api.uploadSets).not.toHaveBeenCalled();

    const second = await uploadWorkout({ api, state: reloaded(first.state) });
    expect(second.ok).toBe(true);
    const [[firstBody], [secondBody]] = api.createSession.mock.calls;
    expect(secondBody).toEqual(firstBody);
  });

  it('una sesión ya subida entera no manda nada más', async () => {
    const api = fakeApi();
    const done = await uploadWorkout({ api, state: finishedWorkout(3) });
    const again = await uploadWorkout({ api, state: done.state });

    expect(again.ok).toBe(true);
    expect(api.createSession).toHaveBeenCalledTimes(1);
    expect(api.uploadSets).toHaveBeenCalledTimes(1);
  });

  it('no modifica el estado que recibe', async () => {
    const state = finishedWorkout(120);
    const before = JSON.stringify(state);
    await uploadWorkout({ api: fakeApi({ sets: [(_id, list) => savedAll(list), networkError()] }), state });
    expect(JSON.stringify(state)).toBe(before);
  });
});
