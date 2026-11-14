import { describe, expect, it, vi } from 'vitest';
import { addExercise, moveExercise, replaceExercise, updateExercise, updateHeader } from '@/utils/routines/editorState';
import { fromRoutine } from '@/utils/routines/edit/fromRoutine';
import { saveEdits } from '@/utils/routines/edit/saveEdits';
import { EX_C } from '../../../helpers/routines/fixtures';
import { RE_A, RE_B, ROUTINE_ID, routineDetail } from '../../../helpers/routines/routineDetail';

const detail = routineDetail();

function fakeApi(overrides = {}) {
  const log = [];
  const step = (name, result) => vi.fn(async (...args) => {
    log.push([name, ...args.slice(1)]);
    return typeof result === 'function' ? result(...args) : result;
  });
  return {
    log,
    updateRoutine: step('header', {}),
    addRoutineExercises: step('add', (_id, list) => list.map((e, i) => ({ id: `new-${i}`, order_index: 10 + e.order })).reverse()),
    updateRoutineExercise: step('update', {}),
    removeRoutineExercise: step('remove', undefined),
    reorderRoutineExercises: step('order', {}),
    ...overrides,
  };
}

describe('saveEdits', () => {
  it('sin cambios no llama a la API', async () => {
    const api = fakeApi();
    await saveEdits(ROUTINE_ID, detail, fromRoutine(detail), api);
    expect(api.log).toEqual([]);
  });

  it('manda cabecera → altas → cambios → bajas → orden final, con los ids nuevos en su lugar', async () => {
    const api = fakeApi();
    let state = fromRoutine(detail);
    const [a, b] = state.exercises;
    state = updateHeader(state, 'name', 'Fuerza B');
    state = updateExercise(state, b.key, 'reps', '12');
    state = replaceExercise(state, a.key, EX_C);
    state = addExercise(state, EX_C);
    state = moveExercise(state, 2, 0);
    const { ids } = await saveEdits(ROUTINE_ID, detail, state, api);
    expect(api.log.map(([name]) => name)).toEqual(['header', 'add', 'update', 'remove', 'order']);
    expect(api.updateRoutine).toHaveBeenCalledWith(ROUTINE_ID, { name: 'Fuerza B' });
    expect(api.updateRoutineExercise).toHaveBeenCalledWith(ROUTINE_ID, RE_B, expect.objectContaining({ reps: 12 }));
    expect(api.removeRoutineExercise).toHaveBeenCalledWith(ROUTINE_ID, RE_A);
    // Altas en el orden de la pantalla: [nueva (order 0), reemplazo de A (order 1)]; el servidor las devuelve desordenadas.
    const [added] = api.addRoutineExercises.mock.calls;
    expect(added[1].map((e) => e.order)).toEqual([0, 1]);
    expect(api.reorderRoutineExercises).toHaveBeenCalledWith(ROUTINE_ID, ['new-0', 'new-1', RE_B]);
    expect(ids.get(state.exercises[1].key)).toBe('new-1');
  });

  it('si un paso falla, lanza el error con los ids que ya se guardaron y no sigue', async () => {
    const boom = Object.assign(new Error('Sin conexión'), { status: 0 });
    const api = fakeApi({ updateRoutineExercise: vi.fn(async () => { throw boom; }) });
    let state = fromRoutine(detail);
    state = updateExercise(addExercise(state, EX_C), state.exercises[0].key, 'reps', '5');
    const error = await saveEdits(ROUTINE_ID, detail, state, api).catch((e) => e);
    expect(error).toBe(boom);
    expect(error.savedIds.get(state.exercises[2].key)).toBe('new-0');
    expect(api.removeRoutineExercise).not.toHaveBeenCalled();
  });
});
