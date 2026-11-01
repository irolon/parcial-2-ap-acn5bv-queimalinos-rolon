import { describe, expect, it } from 'vitest';
import { finishWorkout, setFeedback } from '@/utils/workout/workoutState';
import { at, freshWorkout, isoAt, withSets } from '../../../helpers/workout/workout';

describe('finishWorkout', () => {
  it('fija la hora de Terminar y corta el descanso', () => {
    const state = finishWorkout(withSets(freshWorkout(), [[0, 60, 10]]), at(3000));
    expect(state.finishedAt).toBe(isoAt(3000));
    expect(state.restEndsAt).toBeNull();
  });

  it('la hora queda fija: terminar otra vez (o reintentar horas después) no la cambia', () => {
    const finished = finishWorkout(freshWorkout(), at(3000));
    expect(finishWorkout(finished, at(20000))).toBe(finished);
  });
});

describe('setFeedback', () => {
  it('guarda el RPE y la nota recortada', () => {
    expect(setFeedback(freshWorkout(), { rpe: 7, notes: '  Me costó el press  ' }).feedback)
      .toStrictEqual({ rpe: 7, notes: 'Me costó el press' });
  });

  it('nota vacía o solo espacios es null; el RPE fuera de 1-10 o no entero también', () => {
    expect(setFeedback(freshWorkout(), { rpe: 11, notes: '   ' }).feedback).toStrictEqual({ rpe: null, notes: null });
    expect(setFeedback(freshWorkout(), { rpe: 0 }).feedback.rpe).toBeNull();
    expect(setFeedback(freshWorkout(), { rpe: 7.5 }).feedback.rpe).toBeNull();
    expect(setFeedback(freshWorkout(), { rpe: '8' }).feedback.rpe).toBe(8);
  });

  it('"Saltar" ({} o null) deja el feedback decidido y sin nada para mandar', () => {
    expect(setFeedback(freshWorkout(), {}).feedback).toStrictEqual({ rpe: null, notes: null });
    expect(setFeedback(freshWorkout(), null).feedback).toStrictEqual({ rpe: null, notes: null });
    expect(freshWorkout().feedback).toBeNull();
  });

  it('la nota se corta en 1000 caracteres sin partir un emoji', () => {
    const long = `${'a'.repeat(999)}💪 y más`;
    const { notes } = setFeedback(freshWorkout(), { notes: long }).feedback;
    expect(notes).toBe('a'.repeat(999));
    expect(setFeedback(freshWorkout(), { notes: 'b'.repeat(1500) }).feedback.notes).toHaveLength(1000);
  });

  it('una vez creada la sesión en el servidor no cambia (viaja en el POST y no hay PATCH)', () => {
    const state = freshWorkout();
    const created = { ...state, upload: { ...state.upload, sessionCreated: true } };
    expect(setFeedback(created, { rpe: 9 })).toBe(created);
  });
});
