import { beforeEach, describe, expect, it } from 'vitest';
import { act } from '@testing-library/react';
import { resetWorkoutStore } from '@/hooks/workout/workoutStore';
import { loadWorkout } from '@/utils/workout/workoutStorage';
import { todayRoutine } from '../../../helpers/routines/studentRoutines';
import { STUDENT, renderActiveWorkout } from '../../../helpers/workout/activeWorkout';

beforeEach(() => {
  localStorage.clear();
  resetWorkoutStore();
});

const INCLINE = { id: 'e-9', name: 'Press inclinado' };

describe('useActiveWorkout: replace (Aplicar del asistente)', () => {
  it('reemplaza el ejercicio en la sesión y lo guarda', () => {
    const view = renderActiveWorkout();
    act(() => { view.result.current.start(todayRoutine()); });
    act(() => { view.result.current.replace(0, INCLINE); });
    expect(view.result.current.workout.exercises[0]).toMatchObject({ exerciseId: 'e-9', originalExerciseId: 'e-1' });
    expect(loadWorkout(STUDENT).exercises[0].name).toBe('Press inclinado');
  });

  it('con series en ese ejercicio devuelve la misma sesión', () => {
    const view = renderActiveWorkout();
    act(() => { view.result.current.start(todayRoutine()); });
    act(() => { view.result.current.register(60, 10); });
    const before = view.result.current.workout;
    let result;
    act(() => { result = view.result.current.replace(0, INCLINE); });
    expect(result).toBe(before);
  });

  it('sin sesión devuelve null', () => {
    const view = renderActiveWorkout();
    expect(view.result.current.replace(0, INCLINE)).toBeNull();
  });
});
