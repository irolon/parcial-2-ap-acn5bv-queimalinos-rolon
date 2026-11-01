import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';
import { resetWorkoutStore } from '@/hooks/workout/workoutStore';
import { loadWorkout } from '@/utils/workout/workoutStorage';
import { todayRoutine } from '../../../helpers/routines/studentRoutines';
import { bodyOf, calls } from '../../../helpers/shared/fetchMock';
import {
  STUDENT, okUploadResponse, renderActiveWorkout, stubUpload,
} from '../../../helpers/workout/activeWorkout';
import { at, isoAt } from '../../../helpers/workout/workout';

const sessionPosts = (fetchMock) => calls(fetchMock).filter(([path]) => path === '/sessions');

function train(view) {
  act(() => { view.result.current.start(todayRoutine()); });
  act(() => { view.result.current.register(62.5, 10); });
  act(() => { view.result.current.register(null, 12); });
}

async function upload(view) {
  let result;
  await act(async () => { result = await view.result.current.upload(); });
  return result;
}

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
    const result = await upload(view);

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
      ['student-streak', STUDENT],
      ['student-achievements', STUDENT],
      ['student-challenges', STUDENT],
    ]);
  });

  it('si falla, la sesión queda guardada con lo que avanzó y Reintentar termina sin repetir el POST', async () => {
    const fetchMock = stubUpload({ sets: [503] });
    const view = renderActiveWorkout();
    train(view);
    const first = await upload(view);

    expect(first).toMatchObject({ ok: false, error: { status: 503, retryable: true } });
    expect(view.result.current.workout.upload.sessionCreated).toBe(true);
    expect(loadWorkout(STUDENT)).toStrictEqual(view.result.current.workout);

    const second = await upload(view);
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
    expect((await upload(view)).error).toMatchObject({ code: 'NETWORK_ERROR', retryable: true });

    vi.setSystemTime(at(3 * 3600));
    expect((await upload(view)).ok).toBe(true);
    const finishedAts = sessionPosts(fetchMock).map(([, init]) => bodyOf(init).finished_at);
    expect(finishedAts).toEqual([isoAt(3600), isoAt(3600)]);
  });

  it('si no se tocó Terminar, la fija antes de subir (nunca sube una sesión abierta)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(at(0));
    const fetchMock = stubUpload();
    const view = renderActiveWorkout();
    train(view);
    vi.setSystemTime(at(1200));
    await upload(view);
    expect(bodyOf(sessionPosts(fetchMock)[0][1]).finished_at).toBe(isoAt(1200));
  });

  it('dos toques seguidos a Reintentar hacen una sola subida', async () => {
    const fetchMock = stubUpload();
    const view = renderActiveWorkout();
    train(view);
    let results;
    await act(async () => {
      results = await Promise.all([view.result.current.upload(), view.result.current.upload()]);
    });
    expect(results[0]).toBe(results[1]);
    expect(sessionPosts(fetchMock)).toHaveLength(1);
  });

  it.each([
    ['la subida en curso termina bien', [], true],
    ['las series fallan después', [503], false],
  ])('descartar mientras sube no la resucita en el navegador (%s)', async (_, sets, ok) => {
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const fetchMock = stubUpload({ session: [(path, body) => gate.then(() => okUploadResponse(path, body))], sets });
    const view = renderActiveWorkout();
    train(view);
    let pending;
    await act(async () => {
      pending = view.result.current.upload();
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    });
    act(() => { view.result.current.discard(); });
    await act(async () => {
      release();
      await expect(pending).resolves.toMatchObject({ ok });
    });
    expect(view.result.current.workout).toBeNull();
    expect(loadWorkout(STUDENT)).toBeNull();
  });

  it('el avance de la subida no pisa lo que el alumno cambió mientras tanto (solo escribe `upload`)', async () => {
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const fetchMock = stubUpload({ session: [(path, body) => gate.then(() => okUploadResponse(path, body))], sets: [503] });
    const view = renderActiveWorkout();
    train(view);
    let pending;
    await act(async () => {
      pending = view.result.current.upload();
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    });
    act(() => { view.result.current.goTo(1); });
    await act(async () => {
      release();
      await pending;
    });
    expect(view.result.current.workout).toMatchObject({ cursor: 1, upload: { sessionCreated: true } });
    expect(loadWorkout(STUDENT)).toStrictEqual(view.result.current.workout);
  });

  it('sin sesión en curso devuelve null y no llama a la API', async () => {
    const fetchMock = stubUpload();
    const view = renderActiveWorkout();
    expect(await upload(view)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
