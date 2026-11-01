import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';
import { resetWorkoutStore } from '@/hooks/workout/workoutStore';
import { restRemaining } from '@/utils/workout/workoutState';
import { loadWorkout, saveWorkout } from '@/utils/workout/workoutStorage';
import { mineRoutine, todayRoutine } from '../../../helpers/routines/studentRoutines';
import { STUDENT, renderActiveWorkout } from '../../../helpers/workout/activeWorkout';
import { at, freshWorkout, isoAt, withSets } from '../../../helpers/workout/workout';

const blowUp = () => { throw new DOMException('no disponible', 'QuotaExceededError'); };

beforeEach(() => {
  localStorage.clear();
  resetWorkoutStore();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('useActiveWorkout: la sesión en curso', () => {
  it('al montar retoma la sesión guardada: el primer render ya la tiene', () => {
    const saved = withSets(freshWorkout(), [[0, 60, 10]]);
    saveWorkout(STUDENT, saved);
    expect(renderActiveWorkout().result.current.workout).toStrictEqual(saved);
  });

  it('sin sesión guardada es null', () => {
    expect(renderActiveWorkout().result.current.workout).toBeNull();
  });

  it('start crea la sesión, la guarda y la ve otra página que use el hook', () => {
    const today = renderActiveWorkout();
    let created;
    act(() => { created = today.result.current.start(todayRoutine()); });
    expect(created).toMatchObject({ routineId: 'r-1', cursor: 0, sets: [], restEndsAt: null });
    expect(today.result.current.workout).toBe(created);
    expect(loadWorkout(STUDENT)).toStrictEqual(created);
    expect(renderActiveWorkout().result.current.workout).toBe(created);
  });

  it('Review Focus 4: start con una sesión abierta no la pisa, devuelve la abierta', () => {
    const { result } = renderActiveWorkout();
    let first;
    let second;
    act(() => { first = result.current.start(todayRoutine()); });
    act(() => { result.current.register(60, 10); });
    act(() => { second = result.current.start(mineRoutine({ routine_id: 'r-2', name: 'Pull' })); });
    expect(second.id).toBe(first.id);
    expect(second.sets).toHaveLength(1);
    expect(loadWorkout(STUDENT)).toMatchObject({ id: first.id, routineId: 'r-1' });
  });

  it('una rutina sin ejercicios no crea nada', () => {
    const { result } = renderActiveWorkout();
    let created;
    act(() => { created = result.current.start(todayRoutine({ exercises: [] })); });
    expect(created).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it('cada acción queda guardada en localStorage', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(at(0));
    const { result } = renderActiveWorkout();
    const step = (action, check) => {
      act(() => action(result.current));
      expect(loadWorkout(STUDENT)).toStrictEqual(result.current.workout);
      check(result.current.workout);
    };
    step((w) => w.start(todayRoutine()), (w) => expect(w.startedAt).toBe(isoAt(0)));
    vi.setSystemTime(at(60));
    step((w) => w.register('62.5', '10'), (w) => expect(w.restEndsAt).toBe(isoAt(150)));
    step((w) => w.adjustRest(15), (w) => expect(w.restEndsAt).toBe(isoAt(165)));
    step((w) => w.adjustRest(-15), (w) => expect(w.restEndsAt).toBe(isoAt(150)));
    step((w) => w.skipRest(), (w) => expect(w.restEndsAt).toBeNull());
    step((w) => w.next(), (w) => expect(w.cursor).toBe(1));
    step((w) => w.next(), (w) => expect(w.cursor).toBe(1));
    step((w) => w.prev(), (w) => expect(w.cursor).toBe(0));
    step((w) => w.goTo(1), (w) => expect(w.cursor).toBe(1));
    step((w) => w.remove(w.workout.sets[0].id), (w) => expect(w.sets).toEqual([]));
    vi.setSystemTime(at(1800));
    step((w) => w.finish(), (w) => expect(w.finishedAt).toBe(isoAt(1800)));
    step((w) => w.setFeedback({ rpe: 8, notes: ' Bien ' }), (w) => expect(w.feedback).toEqual({ rpe: 8, notes: 'Bien' }));
  });

  it('Review Focus 2: recargar la página deja las series, el ejercicio a la vista y el descanso contra la hora nueva', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(at(0));
    const before = renderActiveWorkout();
    act(() => { before.result.current.start(todayRoutine()); });
    vi.setSystemTime(at(60));
    act(() => { before.result.current.register(62.5, 10); });
    act(() => { before.result.current.goTo(1); });
    const snapshot = before.result.current.workout;
    before.unmount();

    resetWorkoutStore(); // la recarga: se pierde la memoria y queda localStorage
    vi.setSystemTime(at(100));
    const after = renderActiveWorkout().result.current.workout;
    expect(after).toStrictEqual(snapshot);
    expect(after.cursor).toBe(1);
    expect(restRemaining(after, new Date())).toBe(50);
  });

  it('si localStorage falla, la sesión sigue en memoria y entre páginas', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blowUp);
    const today = renderActiveWorkout();
    act(() => { today.result.current.start(todayRoutine()); });
    act(() => { today.result.current.register(60, 10); });
    expect(today.result.current.workout.sets).toHaveLength(1);
    expect(localStorage.length).toBe(0);
    expect(renderActiveWorkout().result.current.workout.sets).toHaveLength(1);
  });

  it('si no se puede leer localStorage, arranca sin sesión y sin romperse', () => {
    saveWorkout(STUDENT, freshWorkout());
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blowUp);
    expect(renderActiveWorkout().result.current.workout).toBeNull();
  });

  it('sin studentId (sin sesión iniciada) no hace nada', async () => {
    const { result } = renderActiveWorkout(null);
    expect(result.current.workout).toBeNull();
    let started;
    act(() => { started = result.current.start(todayRoutine()); });
    act(() => { result.current.register(60, 10); result.current.next(); result.current.discard(); });
    expect(started).toBeNull();
    expect(result.current.workout).toBeNull();
    await expect(result.current.upload()).resolves.toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it('cada alumno tiene la suya: cambiar de alumno cambia de sesión', () => {
    saveWorkout('s-2', { ...freshWorkout(), id: 'session-de-s2' });
    const { result, rerender } = renderActiveWorkout();
    act(() => { result.current.start(todayRoutine()); });
    rerender({ id: 's-2' });
    expect(result.current.workout.id).toBe('session-de-s2');
    act(() => { result.current.discard(); });
    expect(loadWorkout('s-2')).toBeNull();
    expect(loadWorkout(STUDENT)).not.toBeNull();
  });

  it('discard la borra de memoria y de localStorage', () => {
    const { result } = renderActiveWorkout();
    act(() => { result.current.start(todayRoutine()); });
    act(() => { result.current.discard(); });
    expect(result.current.workout).toBeNull();
    expect(loadWorkout(STUDENT)).toBeNull();
  });

  it('otra pestaña registra 2 series mientras el alumno está en otra página: al volver, Siguiente no las pisa', () => {
    const today = renderActiveWorkout();
    act(() => { today.result.current.start(todayRoutine()); });
    today.unmount(); // se fue a Historial: nadie usa el hook
    const elsewhere = withSets(loadWorkout(STUDENT), [[0, 60, 10], [0, 62.5, 8]]);
    localStorage.setItem('ft.workout.s-1', JSON.stringify(elsewhere));
    window.dispatchEvent(new StorageEvent('storage', { key: 'ft.workout.s-1' }));

    const back = renderActiveWorkout();
    expect(back.result.current.workout.sets).toHaveLength(2);
    act(() => { back.result.current.next(); });
    expect(loadWorkout(STUDENT)).toMatchObject({ cursor: 1, sets: [{ id: 'set-1' }, { id: 'set-2' }] });
  });

  it('si otra pestaña cambia o descarta la sesión, se adopta lo que dejó', () => {
    const { result } = renderActiveWorkout();
    const other = withSets(freshWorkout(), [[0, 60, 10]]);
    const fromOtherTab = (write) => act(() => {
      write();
      window.dispatchEvent(new StorageEvent('storage', { key: 'ft.workout.s-1' }));
    });
    fromOtherTab(() => localStorage.setItem('ft.workout.s-1', JSON.stringify(other)));
    expect(result.current.workout).toStrictEqual(other);
    fromOtherTab(() => localStorage.removeItem('ft.workout.s-1'));
    expect(result.current.workout).toBeNull();
  });
});
