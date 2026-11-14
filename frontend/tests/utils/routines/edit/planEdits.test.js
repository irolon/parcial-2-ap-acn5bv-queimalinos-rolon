import { describe, expect, it } from 'vitest';
import { addExercise, moveExercise, removeExercise, replaceExercise, updateExercise, updateHeader } from '@/utils/routines/editorState';
import { fromRoutine } from '@/utils/routines/edit/fromRoutine';
import { planEdits } from '@/utils/routines/edit/planEdits';
import { EX_A, EX_B, EX_C } from '../../../helpers/routines/fixtures';
import { RE_A, RE_B, routineDetail } from '../../../helpers/routines/routineDetail';

const detail = routineDetail();
const loaded = () => fromRoutine(detail);
const keyOf = (state, index) => state.exercises[index].key;

describe('planEdits', () => {
  it('sin cambios no hay nada para mandar', () => {
    const plan = planEdits(detail, loaded());
    expect(plan).toMatchObject({ header: null, adds: [], updates: [], removes: [], reorder: false, empty: true });
  });

  it('la cabecera manda solo los campos que cambiaron (nombre recortado, nivel vacío = null, días ordenados)', () => {
    let state = updateHeader(loaded(), 'name', '  Fuerza B ');
    state = updateHeader(state, 'level', '');
    state = updateHeader(state, 'days', ['thursday', 'monday']);
    expect(planEdits(detail, state).header).toEqual({ name: 'Fuerza B', level: null });
    expect(planEdits(detail, updateHeader(loaded(), 'days', ['friday'])).header).toEqual({ days: ['friday'] });
  });

  it('un valor cambiado manda el PATCH de esa fila con todos sus campos', () => {
    const state = loaded();
    const plan = planEdits(detail, updateExercise(state, keyOf(state, 1), 'reps', '12'));
    expect(plan.updates).toEqual([
      { id: RE_B, body: { sets: 4, reps: 12, rest_seconds: 90, suggested_kg: null, tempo: null, notes: 'Lento' } },
    ]);
    expect(plan.empty).toBe(false);
  });

  it('un valor escrito igual que el guardado (60 vs "60,0") no cuenta como cambio', () => {
    const state = loaded();
    expect(planEdits(detail, updateExercise(state, keyOf(state, 0), 'suggested_kg', '60,0')).empty).toBe(true);
  });

  it('agregar manda el alta con su orden relativo y, si queda al final, sin reordenar', () => {
    const plan = planEdits(detail, addExercise(loaded(), EX_C));
    expect(plan.adds).toHaveLength(1);
    expect(plan.adds[0].body).toEqual({
      exercise_id: EX_C, sets: 3, reps: 10, rest_seconds: 90, suggested_kg: null, tempo: null, notes: null, order: 0,
    });
    expect(plan.reorder).toBe(false);
  });

  it('agregar en el medio pide reordenar', () => {
    const state = addExercise(loaded(), EX_C);
    expect(planEdits(detail, moveExercise(state, 2, 0)).reorder).toBe(true);
  });

  it('quitar manda la baja y no reordena', () => {
    const state = loaded();
    const plan = planEdits(detail, removeExercise(state, keyOf(state, 0)));
    expect(plan.removes).toEqual([RE_A]);
    expect(plan.reorder).toBe(false);
  });

  it('mover pide reordenar sin altas ni bajas', () => {
    const plan = planEdits(detail, moveExercise(loaded(), 0, 1));
    expect(plan).toMatchObject({ adds: [], removes: [], updates: [], reorder: true });
  });

  it('reemplazar es la baja de la fila vieja y el alta del nuevo con los mismos valores, en el mismo lugar', () => {
    const state = loaded();
    const plan = planEdits(detail, replaceExercise(state, keyOf(state, 0), EX_C));
    expect(plan.removes).toEqual([RE_A]);
    expect(plan.adds[0]).toMatchObject({ key: keyOf(state, 0) });
    expect(plan.adds[0].body).toMatchObject({ exercise_id: EX_C, sets: 4, reps: 8, rest_seconds: 90, suggested_kg: 60 });
    expect(plan.reorder).toBe(true);
  });

  it('una fila con un id que ya no está en la rutina se vuelve a dar de alta', () => {
    const state = loaded();
    const other = routineDetail({ exercises: [detail.exercises[0]] });
    const plan = planEdits(other, state);
    expect(plan.adds.map((a) => a.body.exercise_id)).toEqual([EX_B]);
    expect(plan.removes).toEqual([]);
    expect(plan.reorder).toBe(false);
    expect(planEdits(other, moveExercise(state, 0, 1)).reorder).toBe(true);
    expect(EX_A).toBeTruthy();
  });
});
