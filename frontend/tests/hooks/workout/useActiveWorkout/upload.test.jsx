import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';
import {
  ACHIEVEMENT_PROGRESS_KEY, STUDENT_ACHIEVEMENTS_KEY, STUDENT_CHALLENGES_KEY, STUDENT_STREAK_KEY,
} from '@/hooks/achievements/useStudentGamification';
import { resetWorkoutStore } from '@/hooks/workout/workoutStore';
import { loadWorkout } from '@/utils/workout/workoutStorage';
import { bodyOf, calls } from '../../../helpers/shared/fetchMock';
import {
  STUDENT, renderActiveWorkout, stubUpload, train, uploadNow,
} from '../../../helpers/workout/activeWorkout';
import { at, isoAt } from '../../../helpers/workout/workout';

const sessionPosts = (fetchMock) => calls(fetchMock).filter(([path]) => path === '/sessions');

beforeEach(() => {
  localStorage.clear();
  resetWorkoutStore();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('useActiveWorkout: upload', () => {
  it('sube, borra la sesión del navegador, refresca lo que cambió y devuelve el resultado', async () => {
    const fetchMock = stubUpload();
    const view = renderActiveWorkout();
    train(view);
    act(() => { view.result.current.finish(); });
    const invalidate = vi.spyOn(view.client, 'invalidateQueries');
    const result = await uploadNow(view);

    expect(result).toMatchObject({ ok: true, failed: [], unlocked: [] });
    expect(result.state.sets).toHaveLength(2);
    expect(view.result.current.workout).toBeNull();
    expect(loadWorkout(STUDENT)).toBeNull();
    expect(calls(fetchMock).map(([path]) => path)).toEqual(['/sessions', `/sessions/${result.state.id}/sets`]);
    expect(bodyOf(calls(fetchMock)[1][1]).sets.map((set) => set.actual_kg)).toEqual([62.5, 0]);
    expect(invalidate.mock.calls.map(([filters]) => filters.queryKey)).toEqual([
      ['sessions', STUDENT],
      ['progress'],
      ['routines', 'today'],
      [...STUDENT_STREAK_KEY, STUDENT],
      [...STUDENT_ACHIEVEMENTS_KEY, STUDENT],
      [...STUDENT_CHALLENGES_KEY, STUDENT],
      [...ACHIEVEMENT_PROGRESS_KEY, STUDENT],
    ]);
  });

  it('si falla, la sesión queda guardada con lo que avanzó y Reintentar termina sin repetir el POST', async () => {
    const fetchMock = stubUpload({ sets: [503] });
    const view = renderActiveWorkout();
    train(view);
    const first = await uploadNow(view);

    expect(first).toMatchObject({ ok: false, error: { status: 503, retryable: true } });
    expect(view.result.current.workout.upload.sessionCreated).toBe(true);
    expect(loadWorkout(STUDENT)).toStrictEqual(view.result.current.workout);

    const second = await uploadNow(view);
    expect(second.ok).toBe(true);
    expect(sessionPosts(fetchMock)).toHaveLength(1);
    expect(view.result.current.workout).toBeNull();
  });

  it('finished_at es la hora de Terminar: un reintento horas después manda la misma', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(at(0));
    const fetchMock = stubUpload({ session: ['offline'] });
    const view = renderActiveWorkout();
    train(view);
    vi.setSystemTime(at(3600));
    act(() => { view.result.current.finish(); });
    expect((await uploadNow(view)).error).toMatchObject({ code: 'NETWORK_ERROR', retryable: true });

    vi.setSystemTime(at(3 * 3600));
    expect((await uploadNow(view)).ok).toBe(true);
    const finishedAts = sessionPosts(fetchMock).map(([, init]) => bodyOf(init).finished_at);
    expect(finishedAts).toEqual([isoAt(3600), isoAt(3600)]);
  });

  it('si no se tocó Terminar ni se pidió el feedback, los fija antes de subir (feedback = "Saltar")', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(at(0));
    const fetchMock = stubUpload({ sets: [503] });
    const view = renderActiveWorkout();
    train(view);
    vi.setSystemTime(at(1200));
    await uploadNow(view);

    const body = bodyOf(sessionPosts(fetchMock)[0][1]);
    expect(body.finished_at).toBe(isoAt(1200));
    expect(body).not.toHaveProperty('rpe');
    expect(view.result.current.workout).toMatchObject({ finishedAt: isoAt(1200), feedback: { rpe: null, notes: null } });
    expect(loadWorkout(STUDENT).feedback).toEqual({ rpe: null, notes: null });
  });

  it('con el feedback cargado, sube ese', async () => {
    const fetchMock = stubUpload();
    const view = renderActiveWorkout();
    train(view);
    act(() => { view.result.current.finish(); });
    act(() => { view.result.current.setFeedback({ rpe: 8, notes: 'Bien' }); });
    await uploadNow(view);
    expect(bodyOf(sessionPosts(fetchMock)[0][1])).toMatchObject({ rpe: 8, notes: 'Bien' });
  });

  it('sin sesión en curso devuelve null y no llama a la API', async () => {
    const fetchMock = stubUpload();
    const view = renderActiveWorkout();
    expect(await uploadNow(view)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
