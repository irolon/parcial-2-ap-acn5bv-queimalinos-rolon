import { describe, expect, it, vi } from 'vitest';
import { uploadWorkout } from '@/utils/workout/uploadWorkout';
import { fakeApi, finishedWorkout, sentBatches, setIds } from '../../../helpers/workout/workout';

const CANCELLED = { status: null, code: 'CANCELLED', retryable: false };

// Descartar durante la subida: `shouldContinue()` se mira antes de cada pedido y, si dice que no, no sale ninguno más.
describe('uploadWorkout: shouldContinue', () => {
  it('sin cancelar sube todo (por defecto sigue siempre)', async () => {
    const shouldContinue = vi.fn(() => true);
    const result = await uploadWorkout({ api: fakeApi(), state: finishedWorkout(150), shouldContinue });
    expect(result.ok).toBe(true);
    expect(shouldContinue).toHaveBeenCalledTimes(3); // antes del POST y de cada lote
  });

  it('cancelada antes de empezar no manda nada', async () => {
    const api = fakeApi();
    const result = await uploadWorkout({ api, state: finishedWorkout(3), shouldContinue: () => false });
    expect(result).toMatchObject({ ok: false, cancelled: true, error: CANCELLED });
    expect(api.createSession).not.toHaveBeenCalled();
    expect(api.uploadSets).not.toHaveBeenCalled();
    expect(result.state.upload.sessionCreated).toBe(false);
  });

  it('cancelada mientras sale el POST: la sesión queda creada y no se manda ninguna serie', async () => {
    let keepGoing = true;
    const api = fakeApi({
      session: [(body) => {
        keepGoing = false; // se descarta mientras el POST está en vuelo
        return { ...body, unlocked_achievements: [] };
      }],
    });
    const onState = vi.fn();
    const result = await uploadWorkout({ api, state: finishedWorkout(3), onState, shouldContinue: () => keepGoing });
    expect(result).toMatchObject({ ok: false, cancelled: true, error: CANCELLED });
    expect(result.state.upload.sessionCreated).toBe(true);
    expect(onState).toHaveBeenCalledTimes(1);
    expect(api.uploadSets).not.toHaveBeenCalled();
  });

  it('cancelada después del primer lote: no salen los que faltan', async () => {
    let batchesSent = 0;
    const api = fakeApi();
    const shouldContinue = () => batchesSent < 1;
    api.uploadSets.mockImplementation(async (_id, list) => {
      batchesSent += 1;
      return { saved: list.map(({ id }) => ({ id, created: true })), failed: [], unlocked_achievements: [] };
    });
    const result = await uploadWorkout({ api, state: finishedWorkout(250), shouldContinue });
    expect(result).toMatchObject({ ok: false, cancelled: true });
    expect(sentBatches(api)).toEqual([setIds(1, 100)]);
    expect(result.state.upload.sentSetIds).toEqual(setIds(1, 100));
  });

  it('pasa `signal` a cada pedido', async () => {
    const api = fakeApi();
    const { signal } = new AbortController();
    await uploadWorkout({ api, state: finishedWorkout(150), signal });
    expect(api.createSession.mock.calls[0][1]).toEqual({ signal });
    expect(api.uploadSets.mock.calls.map(([, , options]) => options)).toEqual([{ signal }, { signal }]);
  });

  it('un pedido que falla (cortado por `signal`) cuando ya no hay que seguir vuelve como cancelada, no como error', async () => {
    let keepGoing = true;
    const aborted = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const api = fakeApi({ session: [() => { keepGoing = false; throw aborted; }] });
    const result = await uploadWorkout({ api, state: finishedWorkout(3), shouldContinue: () => keepGoing });
    expect(result).toMatchObject({ ok: false, cancelled: true, error: CANCELLED });
    expect(api.uploadSets).not.toHaveBeenCalled();
  });
});
