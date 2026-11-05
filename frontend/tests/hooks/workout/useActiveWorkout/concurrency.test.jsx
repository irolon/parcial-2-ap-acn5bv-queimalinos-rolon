import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';
import { resetWorkoutStore } from '@/hooks/workout/workoutStore';
import { loadWorkout } from '@/utils/workout/workoutStorage';
import { bodyOf, calls } from '../../../helpers/shared/fetchMock';
import {
  STUDENT, heldResponse, renderActiveWorkout, stubUpload, train, uploadNow,
} from '../../../helpers/workout/activeWorkout';

const paths = (fetchMock) => calls(fetchMock).map(([path]) => path);

/** Arranca la subida y espera a que el POST /sessions esté en vuelo. Va envuelta: si no, `await` esperaría la subida. */
async function uploadInFlight(view, fetchMock) {
  let pending;
  await act(async () => {
    pending = view.result.current.upload();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });
  return { pending };
}

beforeEach(() => {
  localStorage.clear();
  resetWorkoutStore();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('useActiveWorkout: subidas, descartes y toques repetidos', () => {
  it('descartar mientras sube corta los pedidos que faltan y no la resucita', async () => {
    const held = heldResponse();
    const fetchMock = stubUpload({ session: [held.respond] });
    const view = renderActiveWorkout();
    train(view);
    const { pending } = await uploadInFlight(view, fetchMock);
    const invalidate = vi.spyOn(view.client, 'invalidateQueries');
    act(() => { view.result.current.discard(); });
    await act(async () => {
      held.release();
      await expect(pending).resolves.toMatchObject({ ok: false, cancelled: true, error: { code: 'CANCELLED' } });
    });

    expect(paths(fetchMock)).toEqual(['/sessions']); // las series ya no salen
    expect(view.result.current.workout).toBeNull();
    expect(loadWorkout(STUDENT)).toBeNull();
    // La sesión quedó creada en el servidor: se refresca lo que la muestra.
    expect(invalidate.mock.calls.map(([filters]) => filters.queryKey)).toContainEqual(['sessions', STUDENT]);
  });

  it('descartar mientras sube y empezar otra: la nueva se sube aparte, sin esperar a la vieja', async () => {
    const held = heldResponse();
    const fetchMock = stubUpload({ session: [held.respond] });
    const view = renderActiveWorkout();
    train(view);
    const { pending: old } = await uploadInFlight(view, fetchMock);
    const oldId = bodyOf(calls(fetchMock)[0][1]).id;
    act(() => { view.result.current.discard(); });
    train(view);

    const fresh = await uploadNow(view);
    expect(fresh.ok).toBe(true);
    expect(fresh.state.id).not.toBe(oldId);
    expect(paths(fetchMock)).toEqual(['/sessions', '/sessions', `/sessions/${fresh.state.id}/sets`]);

    await act(async () => {
      held.release();
      await expect(old).resolves.toMatchObject({ cancelled: true });
    });
    expect(paths(fetchMock)).not.toContain(`/sessions/${oldId}/sets`);
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
    expect(paths(fetchMock).filter((path) => path === '/sessions')).toHaveLength(1);
  });

  it('el avance de la subida no pisa lo que el alumno cambió mientras tanto (solo escribe `upload`)', async () => {
    const held = heldResponse();
    const fetchMock = stubUpload({ session: [held.respond], sets: [503] });
    const view = renderActiveWorkout();
    train(view);
    const { pending } = await uploadInFlight(view, fetchMock);
    act(() => { view.result.current.goTo(1); });
    await act(async () => {
      held.release();
      await pending;
    });
    expect(view.result.current.workout).toMatchObject({ cursor: 1, upload: { sessionCreated: true } });
    expect(loadWorkout(STUDENT)).toStrictEqual(view.result.current.workout);
  });
});
