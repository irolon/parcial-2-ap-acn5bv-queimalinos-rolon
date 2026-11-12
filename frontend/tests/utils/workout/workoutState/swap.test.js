import { describe, expect, it } from 'vitest';
import { finishWorkout, registerSet, replaceExercise } from '@/utils/workout/workoutState/workoutState';
import { setBody } from '@/utils/workout/uploadPayload';
import { at, freshWorkout, withSets } from '../../../helpers/workout/workout';

const INCLINE = { id: 'e-9', name: 'Press inclinado' };
const PLANNED = { id: 'e-1', name: 'Press banca' };

describe('replaceExercise (sustitución en la sesión de hoy, como replaceExercise del celular)', () => {
  it('cambia id y nombre, guarda el original y deja sin carga sugerida', () => {
    const state = replaceExercise(freshWorkout(), 0, INCLINE);
    expect(state.exercises[0]).toMatchObject({
      routineExerciseId: 're-1',
      exerciseId: 'e-9',
      name: 'Press inclinado',
      originalExerciseId: 'e-1',
      originalName: 'Press banca',
      suggestedKg: null,
      lastKg: null,
      sets: 4,
      reps: 10,
      restSeconds: 90,
    });
    expect(state.exercises[1]).toEqual(freshWorkout().exercises[1]);
  });

  it('reemplazar dos veces conserva el planificado como original', () => {
    const twice = replaceExercise(replaceExercise(freshWorkout(), 0, INCLINE), 0, { id: 'e-10', name: 'Flexiones' });
    expect(twice.exercises[0]).toMatchObject({ exerciseId: 'e-10', originalExerciseId: 'e-1', originalName: 'Press banca' });
  });

  it('volver al original deja originalExerciseId y originalName en null', () => {
    const back = replaceExercise(replaceExercise(freshWorkout(), 0, INCLINE), 0, PLANNED);
    expect(back.exercises[0]).toMatchObject({ exerciseId: 'e-1', name: 'Press banca', originalExerciseId: null, originalName: null });
  });

  it('con series registradas, terminada, el mismo ejercicio o un índice que no existe: no cambia nada', () => {
    const withOne = withSets(freshWorkout(), [[0, 60, 10]]);
    expect(replaceExercise(withOne, 0, INCLINE)).toBe(withOne);
    const finished = finishWorkout(freshWorkout(), at(60));
    expect(replaceExercise(finished, 0, INCLINE)).toBe(finished);
    const fresh = freshWorkout();
    expect(replaceExercise(fresh, 0, PLANNED)).toBe(fresh);
    expect(replaceExercise(fresh, 5, INCLINE)).toBe(fresh);
  });

  it('las series nuevas llevan la alternativa y el original; setBody manda original_exercise_id', () => {
    const swapped = replaceExercise(freshWorkout(), 0, INCLINE);
    const [set] = registerSet(swapped, { kg: 40, reps: 10 }, at(60), { newId: () => 'set-1' }).sets;
    expect(set).toMatchObject({ exerciseId: 'e-9', originalExerciseId: 'e-1', routineExerciseId: 're-1' });
    expect(setBody(set)).toMatchObject({ exercise_id: 'e-9', original_exercise_id: 'e-1', routine_exercise_id: 're-1' });
  });

  it('sin reemplazo la serie no lleva originalExerciseId y viaja con null', () => {
    const [set] = withSets(freshWorkout(), [[0, 60, 10]]).sets;
    expect(set).not.toHaveProperty('originalExerciseId');
    expect(setBody(set).original_exercise_id).toBeNull();
  });
});
