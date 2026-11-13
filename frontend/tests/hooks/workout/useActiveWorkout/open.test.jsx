import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { resetWorkoutStore } from '@/hooks/workout/workoutStore';
import { todayRoutine } from '../../../helpers/routines/studentRoutines';
import { API_URL, bodyOf, calls, jsonResponse, stubFetch } from '../../../helpers/shared/fetchMock';
import { okUploadResponse, renderActiveWorkout, train, uploadNow } from '../../../helpers/workout/activeWorkout';

// fetch que registra todo (también el POST de apertura y el DELETE): contesta como el backend cuando sale bien.
const stubServer = () => stubFetch(async (url, init) => {
  const path = url.replace(API_URL, '');
  if (init.method === 'DELETE') return jsonResponse(204);
  return okUploadResponse(path, bodyOf(init));
}, { openSessions: false });
const requests = (fetchMock) => calls(fetchMock).map(([path, init]) => [init.method, path, bodyOf(init)]);
const opens = (fetchMock) => requests(fetchMock).filter(([method, path, body]) => method === 'POST' && path === '/sessions' && !body.finished_at);

beforeEach(() => {
  localStorage.clear();
  resetWorkoutStore();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('useActiveWorkout: sesión en curso en el servidor (GX4)', () => {
  it('start abre la sesión una sola vez: con una abierta no vuelve a abrir', async () => {
    const fetchMock = stubServer();
    const view = renderActiveWorkout();
    let created;
    act(() => { created = view.result.current.start(todayRoutine()); });
    await waitFor(() => expect(opens(fetchMock)).toHaveLength(1));
    expect(opens(fetchMock)[0][2]).toMatchObject({ id: created.id, started_at: created.startedAt });
    act(() => { view.result.current.start(todayRoutine()); });
    await act(async () => {});
    expect(opens(fetchMock)).toHaveLength(1);
    expect(view.result.current.workout.upload.sessionCreated).toBe(false);
  });

  it('con la sesión de la web offline no pide nada y empieza igual', async () => {
    const fetchMock = stubServer();
    const view = renderActiveWorkout();
    useAuthStore.setState({ token: null, status: 'offline' });
    act(() => { view.result.current.start(todayRoutine()); });
    await act(async () => {});
    expect(fetchMock).not.toHaveBeenCalled();
    expect(view.result.current.workout).not.toBeNull();
  });

  it('si la apertura falla, no pasa nada visible', async () => {
    stubFetch(async () => { throw new TypeError('Failed to fetch'); }, { openSessions: false });
    const view = renderActiveWorkout();
    act(() => { view.result.current.start(todayRoutine()); });
    await act(async () => {});
    expect(view.result.current.workout).not.toBeNull();
  });

  it('discard borra la abierta en el servidor, después de la apertura', async () => {
    const fetchMock = stubServer();
    const view = renderActiveWorkout();
    let created;
    act(() => { created = view.result.current.start(todayRoutine()); });
    act(() => { view.result.current.discard(); });
    expect(view.result.current.workout).toBeNull();
    await waitFor(() => expect(requests(fetchMock).map(([m, p]) => `${m} ${p}`)).toEqual([
      'POST /sessions', `DELETE /sessions/${created.id}`,
    ]));
  });

  it('la subida final sigue mandando POST /sessions con finished_at y las series', async () => {
    const fetchMock = stubServer();
    const view = renderActiveWorkout();
    train(view);
    act(() => { view.result.current.finish(); });
    const result = await uploadNow(view);
    expect(result.ok).toBe(true);
    const sent = requests(fetchMock).map(([m, p, body]) => [m, p, Boolean(body?.finished_at)]);
    expect(sent).toEqual([
      ['POST', '/sessions', false],
      ['POST', '/sessions', true],
      ['POST', `/sessions/${result.state.id}/sets`, false],
    ]);
  });
});
