import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import {
  cancelUploads, readWorkout, resetWorkoutStore, subscribeWorkout, trackUpload, writeWorkout,
} from '@/hooks/workout/workoutStore';
import { loadWorkout, saveWorkout } from '@/utils/workout/workoutStorage';
import { freshWorkout, withSets } from '../../helpers/workout/workout';

const storageEvent = (key) => window.dispatchEvent(new StorageEvent('storage', { key }));

beforeEach(() => {
  localStorage.clear();
  resetWorkoutStore();
});
afterEach(() => vi.restoreAllMocks());

describe('workoutStore', () => {
  it('lee localStorage una sola vez por alumno y después responde desde memoria (misma referencia)', () => {
    saveWorkout('s-1', freshWorkout());
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    const first = readWorkout('s-1');
    expect(readWorkout('s-1')).toBe(first);
    expect(getItem).toHaveBeenCalledTimes(1);
    expect(readWorkout('s-2')).toBeNull();
  });

  it('writeWorkout guarda (o borra con null) y avisa a los suscriptos', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeWorkout(listener);
    const state = freshWorkout();
    writeWorkout('s-1', state);
    expect(readWorkout('s-1')).toBe(state);
    expect(loadWorkout('s-1')).toStrictEqual(state);
    writeWorkout('s-1', null);
    expect(loadWorkout('s-1')).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    writeWorkout('s-1', state);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('escucha a las otras pestañas aunque no haya nadie suscripto: la memoria nunca queda vieja', () => {
    const off = subscribeWorkout(vi.fn());
    writeWorkout('s-1', freshWorkout());
    off(); // el alumno se fue a una página sin el hook
    const twoSets = withSets(freshWorkout(), [[0, 60, 10], [0, 62.5, 8]]);
    saveWorkout('s-1', twoSets);
    storageEvent('ft.workout.s-1');
    expect(readWorkout('s-1')).toStrictEqual(twoSets);
  });

  it('escenario del revisor: otra pestaña registra 2 series sin nadie suscripto y al volver una acción no las pisa', () => {
    const off = subscribeWorkout(vi.fn());
    writeWorkout('s-1', freshWorkout());
    off();
    saveWorkout('s-1', withSets(freshWorkout(), [[0, 60, 10], [0, 62.5, 8]]));
    storageEvent('ft.workout.s-1');
    const back = subscribeWorkout(vi.fn()); // vuelve a Hoy
    const seen = readWorkout('s-1');
    writeWorkout('s-1', { ...seen, cursor: 1 }); // cualquier acción (Siguiente)
    expect(seen.sets).toHaveLength(2);
    expect(loadWorkout('s-1')).toMatchObject({ cursor: 1, sets: [{ id: 'set-1' }, { id: 'set-2' }] });
    back();
  });

  it('un cambio de otra pestaña recarga al alumno que ya estaba en memoria; las demás claves no', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeWorkout(listener);
    expect(readWorkout('s-1')).toBeNull();
    const other = withSets(freshWorkout(), [[0, 60, 10]]);
    saveWorkout('s-1', other);
    storageEvent('ft.workout.s-1');
    expect(readWorkout('s-1')).toStrictEqual(other);
    storageEvent('fittrainer.session');
    storageEvent('ft.workout.s-9');
    expect(listener).toHaveBeenCalledTimes(1);
    localStorage.clear();
    storageEvent(null);
    expect(readWorkout('s-1')).toBeNull();
    unsubscribe();
  });

  it('trackUpload: con la misma clave devuelve la subida en curso; con otra clave o ya terminada, arranca otra', async () => {
    let release;
    const run = vi.fn(() => new Promise((resolve) => { release = resolve; }));
    const first = trackUpload('s-1:w-1', run);
    expect(trackUpload('s-1:w-1', run)).toBe(first);
    const other = vi.fn(async () => 'otra sesión');
    await expect(trackUpload('s-1:w-2', other)).resolves.toBe('otra sesión');
    await vi.waitFor(() => expect(run).toHaveBeenCalledTimes(1));
    release('listo');
    await expect(first).resolves.toBe('listo');
    const second = trackUpload('s-1:w-1', run);
    expect(second).not.toBe(first);
    await vi.waitFor(() => expect(run).toHaveBeenCalledTimes(2));
    release('otra');
    await expect(second).resolves.toBe('otra');
  });

  it('cancelUploads dispara el `signal` de las subidas en curso y la próxima arranca de nuevo', async () => {
    let signal;
    const run = vi.fn((received) => { signal = received; return new Promise(() => {}); });
    const first = trackUpload('s-1:w-1', run);
    await vi.waitFor(() => expect(signal).toBeDefined());
    cancelUploads();
    expect(signal.aborted).toBe(true);
    expect(trackUpload('s-1:w-1', run)).not.toBe(first);
  });

  it('si cambia quién inició sesión (logout u otra cuenta), se cortan las subidas; si sigue el mismo, no', async () => {
    useAuthStore.setState({ user: { id: 's-1' }, token: 'a', refreshToken: 'r' });
    const signals = [];
    trackUpload('s-1:w-1', (signal) => { signals.push(signal); return new Promise(() => {}); });
    await vi.waitFor(() => expect(signals).toHaveLength(1));
    useAuthStore.setState({ token: 'renovado' });
    expect(signals[0].aborted).toBe(false);
    useAuthStore.setState({ user: null, token: null, refreshToken: null });
    expect(signals[0].aborted).toBe(true);
  });
});
