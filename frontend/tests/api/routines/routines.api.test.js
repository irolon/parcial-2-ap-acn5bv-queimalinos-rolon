import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as routinesApi from '@/api/routines/routines.api';
import { configureClient } from '@/api/shared/client';
import { mineRoutine, routineExercise, todayRoutine } from '../../helpers/routines/studentRoutines';
import { bodyOf, calls, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

beforeEach(() => {
  configureClient({ getToken: () => 'access-1', refreshSession: vi.fn() });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('routines.api', () => {
  it('listRoutines hace GET /routines y devuelve data', async () => {
    const data = [{ id: 'r-1' }];
    const fetchMock = stubFetch(async () => jsonResponse(200, { data }));
    await expect(routinesApi.listRoutines()).resolves.toEqual(data);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/routines');
    expect(init.method).toBe('GET');
  });

  it('createRoutine hace POST /routines con el body y devuelve data', async () => {
    const data = { id: 'r-1' };
    const fetchMock = stubFetch(async () => jsonResponse(201, { data }));
    const body = { student_id: 's-1', name: 'Fuerza' };
    await expect(routinesApi.createRoutine(body)).resolves.toEqual(data);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/routines');
    expect(init.method).toBe('POST');
    expect(bodyOf(init)).toEqual(body);
  });
});

describe('routines.api: rutinas del alumno', () => {
  it('getTodayRoutine hace GET /routines/today y devuelve la rutina del día', async () => {
    const data = todayRoutine();
    const fetchMock = stubFetch(async () => jsonResponse(200, { data }));
    await expect(routinesApi.getTodayRoutine()).resolves.toEqual({ ...data, created_at: null });
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/routines/today');
    expect(init.method).toBe('GET');
  });

  it('getTodayRoutine devuelve null en un día sin rutina (el backend responde { data: null })', async () => {
    stubFetch(async () => jsonResponse(200, { data: null }));
    await expect(routinesApi.getTodayRoutine()).resolves.toBeNull();
  });

  it('getMyRoutines hace GET /routines/mine y devuelve las rutinas en el mismo orden', async () => {
    const data = [mineRoutine({ routine_id: 'r-new', name: 'Nueva' }), mineRoutine({ routine_id: 'r-old', name: 'Vieja' })];
    const fetchMock = stubFetch(async () => jsonResponse(200, { data }));
    const routines = await routinesApi.getMyRoutines();
    expect(routines.map((r) => r.routine_id)).toEqual(['r-new', 'r-old']);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/routines/mine');
    expect(init.method).toBe('GET');
  });

  it('getMyRoutines devuelve una lista vacía si el alumno no tiene rutinas', async () => {
    stubFetch(async () => jsonResponse(200, { data: [] }));
    await expect(routinesApi.getMyRoutines()).resolves.toEqual([]);
  });

  // /mine no calcula `last_session_kg` (solo /today): se completa para que las páginas usen una sola forma.
  it('getMyRoutines deja a cada ejercicio con last_session_kg (null) y conserva el resto de lo que manda el backend', async () => {
    const data = [mineRoutine()];
    stubFetch(async () => jsonResponse(200, { data }));
    const [routine] = await routinesApi.getMyRoutines();
    expect(routine).toEqual({
      routine_id: 'r-1',
      name: 'Push · día 3',
      goal: 'hypertrophy',
      days: ['monday', 'thursday'],
      created_at: '2026-10-20T12:00:00Z',
      exercises: data[0].exercises.map((exercise) => ({ ...exercise, last_session_kg: null })),
    });
    expect(routine.exercises[0].exercise).toEqual({
      id: 'e-1', name: 'Press banca', muscle_group: 'chest', equipment: 'barbell', video_url: null,
    });
  });

  it('un last_session_kg que sí viene (también en /mine) no se pisa, ni el 0', async () => {
    const exercises = [
      { ...routineExercise(), last_session_kg: 62.5 },
      { ...routineExercise({ routine_exercise_id: 're-2' }), last_session_kg: 0 },
    ];
    stubFetch(async () => jsonResponse(200, { data: [mineRoutine({ exercises })] }));
    const [routine] = await routinesApi.getMyRoutines();
    expect(routine.exercises.map((e) => e.last_session_kg)).toEqual([62.5, 0]);
  });

  it('acepta la rutina con `id` en lugar de `routine_id` y la devuelve con routine_id', async () => {
    const { routine_id: id, ...rest } = mineRoutine();
    stubFetch(async () => jsonResponse(200, { data: [{ id, ...rest }] }));
    const [routine] = await routinesApi.getMyRoutines();
    expect(routine.routine_id).toBe(id);
  });

  it('completa lo que falte: days y exercises vacíos, goal y created_at en null', async () => {
    stubFetch(async () => jsonResponse(200, { data: { routine_id: 'r-9', name: 'Sola' } }));
    await expect(routinesApi.getTodayRoutine()).resolves.toEqual({
      routine_id: 'r-9', name: 'Sola', goal: null, days: [], created_at: null, exercises: [],
    });
  });
});
