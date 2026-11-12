import { describe, expect, it } from 'vitest';
import { askedAbout, canApply, contextLabel, dayLabel, dayTitle } from '@/utils/chat/chatHistory';
import { replaceExercise, setCursor } from '@/utils/workout/workoutState/workoutState';
import { freshWorkout, withSets } from '../../helpers/workout/workout';

const TODAY = '2026-11-07';
const NOON = '2026-11-07T15:00:00.000Z';
const answer = (exerciseId, createdAt = NOON) => ({ id: 'a-1', role: 'assistant', created_at: createdAt, exercise_id: exerciseId });
const INCLINE = { exercise_id: 'e-9', name: 'Press inclinado', reason: 'Otro ángulo' };
const check = (message, workout, suggestion = INCLINE) => canApply({ message, suggestion, workout, today: TODAY });

describe('dayLabel, dayTitle, contextLabel', () => {
  it('HOY, AYER y dd/mm', () => {
    expect(dayLabel('2026-11-07', TODAY)).toBe('HOY');
    expect(dayLabel('2026-11-06', TODAY)).toBe('AYER');
    expect(dayLabel('2026-11-05', TODAY)).toBe('05/11');
    expect(dayLabel('2026-10-31', '2026-11-01')).toBe('AYER');
  });

  it('el título del día es la primera consulta del alumno', () => {
    const messages = [{ role: 'assistant', content: 'x' }, { role: 'user', content: 'Primera' }, { role: 'user', content: 'Otra' }];
    expect(dayTitle(messages)).toBe('Primera');
    expect(dayTitle([])).toBeNull();
  });

  it('el contexto lleva lo que haya, en mayúsculas', () => {
    expect(contextLabel({ routine_name: 'Push', exercise: { id: 'e-1', name: 'Press banca' } })).toBe('CONTEXTO · PUSH · PRESS BANCA');
    expect(contextLabel({ routine_name: null, exercise: { id: 'e-1', name: 'Press banca' } })).toBe('CONTEXTO · PRESS BANCA');
    expect(contextLabel({ routine_name: null, exercise: null })).toBeNull();
  });

  it('askedAbout: exercise_id (local) o el exercise del servidor', () => {
    expect(askedAbout({ exercise_id: 'e-1' })).toBe('e-1');
    expect(askedAbout({ exercise: { id: 'e-2', name: 'x' } })).toBe('e-2');
    expect(askedAbout({})).toBeNull();
  });
});

describe('canApply (decisión 7b)', () => {
  it('hoy, pedida sobre el ejercicio actual y sin series: se puede, con el índice y el planificado', () => {
    expect(check(answer('e-1'), freshWorkout())).toEqual({ status: 'can', index: 0, planned: 'Press banca', current: 'Press banca' });
  });

  it('sugerencia pedida en el ejercicio A con el cursor en B: no se puede aplicar', () => {
    expect(check(answer('e-1'), setCursor(freshWorkout(), 1)).status).toBe('none');
  });

  it('de ayer no se aplica', () => {
    expect(check(answer('e-1', '2026-11-06T15:00:00.000Z'), freshWorkout()).status).toBe('none');
  });

  it('sin sesión, sesión terminada o consulta sin ejercicio: no', () => {
    expect(check(answer('e-1'), null).status).toBe('none');
    expect(check(answer('e-1'), { ...freshWorkout(), finishedAt: NOON }).status).toBe('none');
    expect(check(answer(null), freshWorkout()).status).toBe('none');
  });

  it('con series en el ejercicio: bloqueado', () => {
    expect(check(answer('e-1'), withSets(freshWorkout(), [[0, 60, 10]])).status).toBe('locked');
  });

  it('la sugerencia que es el mismo ejercicio no se aplica', () => {
    expect(check(answer('e-1'), freshWorkout(), { ...INCLINE, exercise_id: 'e-1' }).status).toBe('none');
  });

  it('ya aplicada: "applied"; otra sugerencia de esa consulta sigue disponible (incluido volver al original)', () => {
    const swapped = replaceExercise(freshWorkout(), 0, { id: 'e-9', name: 'Press inclinado' });
    expect(check(answer('e-1'), swapped)).toMatchObject({ status: 'applied', index: 0, planned: 'Press banca' });
    expect(check(answer('e-1'), swapped, { exercise_id: 'e-10', name: 'Flexiones' }).status).toBe('can');
    expect(check(answer('e-1'), swapped, { exercise_id: 'e-1', name: 'Press banca' }).status).toBe('can');
  });

  it('bloqueado después de un reemplazo: `current` nombra el ejercicio que tiene las series, no el planificado', () => {
    const swapped = replaceExercise(freshWorkout(), 0, { id: 'e-9', name: 'Press inclinado' });
    const result = check(answer('e-1'), withSets(swapped, [[0, 20, 10]]), { exercise_id: 'e-10', name: 'Flexiones' });
    expect(result).toMatchObject({ status: 'locked', planned: 'Press banca', current: 'Press inclinado' });
  });
});
