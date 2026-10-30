import {
  dayName,
  toStudentRoutines,
  toTodayRoutine,
} from '../../../../src/models/routines/routine.model.js';

/**
 * Todo el suite corre con TZ=UTC (ver el script `test` en package.json) para
 * reproducir el VPS de producción. Sin eso, estos tests pasan en cualquier
 * máquina en horario argentino y el bug sobrevive hasta producción.
 *
 * Cambiar process.env.TZ en runtime NO sirve: Jest ya resolvió la zona al
 * crear el contexto del test. Tiene que venir del entorno del proceso.
 */
describe('routine.model · dayName', () => {
  it('el suite corre en UTC, como el VPS', () => {
    // Guard: si este test falla, los de abajo dan falsos positivos.
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('UTC');
  });

  it('devuelve el día de Buenos Aires aunque el server corra en UTC', () => {
    // Lunes 01:30 UTC = domingo 22:30 en Buenos Aires (UTC-3).
    // El alumno que abre la app un domingo a la noche tiene que ver el domingo.
    const lunesTempranoUTC = new Date('2026-08-24T01:30:00Z');
    expect(dayName(lunesTempranoUTC)).toBe('sunday');
  });
});

describe('routine.model · toStudentRoutines', () => {
  const row = {
    id: 'rt-1',
    trainer_id: 'trainer-1',
    student_id: 'st-1',
    name: 'Full body',
    goal: 'strength',
    days: ['monday', 'thursday'],
    active: true,
    created_at: '2026-10-01T10:00:00.123456+00:00',
    routine_exercises: [
      { id: 're-2', order_index: 1, sets: 3, reps: 10, exercise: { id: 'ex-2', name: 'Remo' } },
      { id: 're-1', order_index: 0, sets: 4, reps: 8, exercise: { id: 'ex-1', name: 'Press' } },
    ],
  };

  it('proyecta cada rutina con sus ejercicios ordenados y sin datos internos', () => {
    const [routine] = toStudentRoutines([row]);
    expect(routine).toMatchObject({
      routine_id: 'rt-1',
      name: 'Full body',
      goal: 'strength',
      days: ['monday', 'thursday'],
      created_at: '2026-10-01T10:00:00.123456+00:00',
    });
    expect(routine.exercises.map((e) => e.routine_exercise_id)).toEqual(['re-1', 're-2']);
    expect(routine).not.toHaveProperty('trainer_id');
    expect(routine).not.toHaveProperty('student_id');
  });

  it('sin filas devuelve una lista vacía', () => {
    expect(toStudentRoutines([])).toEqual([]);
    expect(toStudentRoutines(null)).toEqual([]);
  });
});

describe('routine.model · toTodayRoutine', () => {
  const row = {
    id: 'rt-1',
    name: 'Full body',
    goal: 'strength',
    days: ['monday'],
    routine_exercises: [
      { id: 're-1', order_index: 0, exercise: { id: 'ex-1' } },
      { id: 're-2', order_index: 1, exercise: { id: 'ex-2' } },
    ],
  };

  it('pone last_session_kg redondeado y null cuando no hay dato', () => {
    const result = toTodayRoutine(row, { 'ex-1': '82.55' });
    expect(result.exercises.map((e) => e.last_session_kg)).toEqual([82.6, null]);
  });

  it('sin mapa, todos null; sin fila, null', () => {
    expect(toTodayRoutine(row).exercises.every((e) => e.last_session_kg === null)).toBe(true);
    expect(toTodayRoutine(null)).toBeNull();
  });
});
