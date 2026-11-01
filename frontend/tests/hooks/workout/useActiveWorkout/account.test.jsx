import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { resetWorkoutStore } from '@/hooks/workout/workoutStore';
import { loadWorkout } from '@/utils/workout/workoutStorage';
import { API_URL, calls, stubFetch } from '../../../helpers/shared/fetchMock';
import {
  STUDENT, okUploadResponse, renderActiveWorkout, signInAs, stubUpload, train, uploadNow,
} from '../../../helpers/workout/activeWorkout';

const OTHER = 's-2';

// Un POST /sessions que se queda en vuelo hasta `release()`; guarda el `signal` con el que salió.
function holdSessionPost() {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const seen = {};
  const fetchMock = stubFetch(async (url, init) => {
    const path = url.replace(API_URL, '');
    const body = JSON.parse(init.body);
    if (path !== '/sessions') return okUploadResponse(path, body);
    seen.signal = init.signal;
    await gate;
    return okUploadResponse(path, body);
  });
  return { fetchMock, seen, release: () => release() };
}

beforeEach(() => {
  localStorage.clear();
  resetWorkoutStore();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('useActiveWorkout: la subida es de la cuenta que la empezó', () => {
  it('si cierra sesión con el POST en vuelo: se corta, no sale ninguna serie y la sesión queda guardada', async () => {
    const { fetchMock, seen, release } = holdSessionPost();
    const view = renderActiveWorkout();
    train(view);
    let pending;
    act(() => { pending = view.result.current.upload(); });
    await vi.waitFor(() => expect(seen.signal).toBeDefined());

    act(() => { useAuthStore.setState({ user: null, token: null, refreshToken: null, status: 'anonymous' }); });
    expect(seen.signal.aborted).toBe(true);
    release();
    let result;
    await act(async () => { result = await pending; });

    expect(result).toMatchObject({ ok: false, cancelled: true });
    expect(calls(fetchMock).map(([path]) => path)).toEqual(['/sessions']);
    expect(loadWorkout(STUDENT)).toMatchObject({ id: result.state.id });
  });

  it('si entra otra cuenta a mitad de la subida, lo que falta no sale con su token', async () => {
    const { fetchMock, seen, release } = holdSessionPost();
    const view = renderActiveWorkout();
    train(view);
    let pending;
    act(() => { pending = view.result.current.upload(); });
    await vi.waitFor(() => expect(seen.signal).toBeDefined());

    act(() => { signInAs(OTHER); });
    release();
    await act(async () => { await pending; });

    expect(calls(fetchMock)).toHaveLength(1);
    expect(calls(fetchMock)[0][1].headers.Authorization).toBe(`Bearer access-${STUDENT}`);
    expect(loadWorkout(STUDENT)).not.toBeNull();
  });

  it('con otra cuenta adentro no sube nada; al volver el alumno, sube su sesión guardada', async () => {
    const fetchMock = stubUpload();
    const view = renderActiveWorkout();
    train(view);
    act(() => { signInAs(OTHER); });
    expect(await uploadNow(view)).toBeNull(); // como si no hubiera sesión: no sale ningún pedido
    expect(fetchMock).not.toHaveBeenCalled();

    act(() => { signInAs(STUDENT); });
    expect((await uploadNow(view)).ok).toBe(true);
    expect(loadWorkout(STUDENT)).toBeNull();
  });
});
