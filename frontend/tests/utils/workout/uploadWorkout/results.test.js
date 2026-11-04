import { describe, expect, it } from 'vitest';
import { uploadWorkout } from '@/utils/workout/uploadWorkout';
import {
  fakeApi, finishedWorkout, networkError, savedAll, sentBatches, setIds,
} from '../../../helpers/workout/workout';

const FIRST_SESSION = { code: 'FIRST_SESSION', name: 'Primera sesión', category: 'milestone' };
const FIRST_PR = { code: 'FIRST_PR', name: 'Primer récord', category: 'pr' };
const STREAK = { code: 'STREAK_3', name: 'Racha de 3', category: 'streak' };

// El servidor guarda el lote salvo la serie en `index`, que rechaza con `code`.
const rejectAt = (index, code) => (_id, list) => ({
  saved: list.filter((_, i) => i !== index).map(({ id }) => ({ id, created: true })),
  failed: [{ id: list[index].id, index, code, message: code }],
  unlocked_achievements: [],
});

describe('uploadWorkout: lotes de 100', () => {
  it('250 series van en tres lotes (100, 100 y 50) y 100 en uno solo', async () => {
    const big = fakeApi();
    await uploadWorkout({ api: big, state: finishedWorkout(250) });
    expect(sentBatches(big).map((ids) => ids.length)).toEqual([100, 100, 50]);

    const exact = fakeApi();
    await uploadWorkout({ api: exact, state: finishedWorkout(100) });
    expect(sentBatches(exact)).toEqual([setIds(1, 100)]);
  });

  it('sin series solo se crea la sesión (el backend no acepta un lote vacío)', async () => {
    const api = fakeApi();
    const result = await uploadWorkout({ api, state: finishedWorkout(0) });
    expect(result.ok).toBe(true);
    expect(api.createSession).toHaveBeenCalledTimes(1);
    expect(api.uploadSets).not.toHaveBeenCalled();
  });
});

describe('uploadWorkout: failed permanentes', () => {
  it('se juntan entre lotes con el id local y su code, y la subida termina igual', async () => {
    const api = fakeApi({ sets: [rejectAt(3, 'EXERCISE_NOT_FOUND'), rejectAt(0, 'VALIDATION_ERROR')] });
    const result = await uploadWorkout({ api, state: finishedWorkout(150) });

    expect(result.ok).toBe(true);
    expect(result.failed).toEqual([
      { id: 'set-004', code: 'EXERCISE_NOT_FOUND' },
      { id: 'set-101', code: 'VALIDATION_ERROR' },
    ]);
    expect(result.state.upload.sentSetIds).toHaveLength(148);
    expect(result.state.upload.sentSetIds).not.toContain('set-004');
  });

  it('no se reenvían en un reintento', async () => {
    const api = fakeApi({ sets: [rejectAt(3, 'EXERCISE_NOT_FOUND'), networkError()] });
    const first = await uploadWorkout({ api, state: finishedWorkout(150) });
    expect(first.ok).toBe(false);
    expect(first.failed).toEqual([{ id: 'set-004', code: 'EXERCISE_NOT_FOUND' }]);

    const second = await uploadWorkout({ api, state: first.state });
    expect(second.ok).toBe(true);
    expect(sentBatches(api).slice(2)).toEqual([setIds(101, 150)]);
    expect(sentBatches(api).flat().filter((id) => id === 'set-004')).toHaveLength(1);
    expect(second.failed).toEqual([{ id: 'set-004', code: 'EXERCISE_NOT_FOUND' }]);
  });

  it('una serie que el servidor no nombra (ni saved ni failed) deja la subida incompleta y se reintenta sola', async () => {
    const api = fakeApi({ sets: [(_id, list) => ({ saved: list.slice(1).map(({ id }) => ({ id })), failed: [] })] });
    const first = await uploadWorkout({ api, state: finishedWorkout(3) });
    expect(first.error).toMatchObject({ code: 'INCOMPLETE', retryable: true });

    const second = await uploadWorkout({ api, state: first.state });
    expect(second.ok).toBe(true);
    expect(sentBatches(api)).toEqual([setIds(1, 3), ['set-001']]);
  });
});

describe('uploadWorkout: logros desbloqueados', () => {
  it('se juntan los del POST y los de cada lote, sin repetir', async () => {
    const api = fakeApi({
      session: [(body) => ({ ...body, unlocked_achievements: [FIRST_SESSION] })],
      sets: [
        (_id, list) => savedAll(list, { unlocked_achievements: [FIRST_PR] }),
        (_id, list) => savedAll(list, { unlocked_achievements: [FIRST_PR, STREAK] }),
      ],
    });
    const result = await uploadWorkout({ api, state: finishedWorkout(150) });
    expect(result.unlocked).toEqual([FIRST_SESSION, FIRST_PR, STREAK]);
  });

  it('se conservan entre reintentos y no se duplican si el servidor los vuelve a mandar', async () => {
    const api = fakeApi({
      session: [(body) => ({ ...body, unlocked_achievements: [FIRST_SESSION] })],
      sets: [networkError(), (_id, list) => savedAll(list, { unlocked_achievements: [FIRST_SESSION, FIRST_PR] })],
    });
    const first = await uploadWorkout({ api, state: finishedWorkout(3) });
    expect(first.unlocked).toEqual([FIRST_SESSION]);

    const second = await uploadWorkout({ api, state: JSON.parse(JSON.stringify(first.state)) });
    expect(second.unlocked).toEqual([FIRST_SESSION, FIRST_PR]);
  });
});
