import { describe, expect, it } from 'vitest';
import {
  adjustRest, closeRest, finishWorkout, registerSet, removeSet, setCursor, skipRest, startWorkout,
} from '@/utils/workout/workoutState/workoutState';
import { todayRoutine } from '../../../helpers/routines/studentRoutines';
import { at, freshWorkout, sequentialIds, withSets } from '../../../helpers/workout/workout';

// Press banca a T0 + 60 s: el descanso (90 s) termina a T0 + 150 s y se anota en esa serie (set-1).
const resting = () => withSets(freshWorkout(), [[0, 60, 10]]);
const restOf = (state, id = 'set-1') => state.sets.find((set) => set.id === id).restSeconds;
const register = (state, seconds, id = 'set-2') => registerSet(state, { kg: 60, reps: 10 }, at(seconds), { newId: () => id });

describe('descanso real (restSeconds): se anota en la serie que disparó el descanso', () => {
  it('al registrar arranca abierto sobre esa serie, todavía sin dato', () => {
    const state = resting();
    expect(state.restSetId).toBe('set-1');
    expect(restOf(state)).toBeUndefined();
  });

  it('la serie siguiente lo cierra a esa hora, y abre el suyo', () => {
    const state = register(resting(), 130);
    expect(restOf(state)).toBe(70);
    expect(state.restSetId).toBe('set-2');
    expect(restOf(state, 'set-2')).toBeUndefined();
  });

  it('si ya había vencido cuenta hasta el fin, no hasta que volvió (pestaña olvidada)', () => {
    expect(restOf(register(resting(), 4000))).toBe(90);
  });

  it('Saltar lo cierra en ese momento y no lo vuelve a anotar después', () => {
    const skipped = skipRest(resting(), at(80));
    expect(restOf(skipped)).toBe(20);
    expect(skipped.restSetId).toBeNull();
    expect(restOf(register(skipped, 500))).toBe(20);
  });

  it('cuenta los ±15″: +15 lo alarga hasta su nuevo fin', () => {
    const longer = adjustRest(adjustRest(resting(), 15, at(70)), 15, at(80));
    expect(restOf(register(longer, 4000))).toBe(120);
    expect(restOf(skipRest(adjustRest(resting(), -15, at(70)), at(100)))).toBe(40);
  });

  it('cambiar de ejercicio no lo corta: lo cierra la serie del otro ejercicio', () => {
    const other = registerSet(setCursor(resting(), 1), { kg: 40, reps: 12 }, at(140), { newId: () => 'set-2' });
    expect(restOf(other)).toBe(80);
    expect(other.restSetId).toBe('set-2');
  });

  it('Terminar a mitad con el descanso abierto lo anota hasta ahora, o hasta su fin si venció (como el celular)', () => {
    const finished = finishWorkout(resting(), at(100));
    expect(restOf(finished)).toBe(40);
    expect(finished.restSetId).toBeNull();
    expect(finished.restEndsAt).toBeNull();
    expect(restOf(finishWorkout(resting(), at(4000)))).toBe(90);
  });

  it('Terminar con el plan completo no lo anota: en el celular la última serie no arranca descanso (null)', () => {
    // Press banca 4 × 10 y Remo 3 × 12: las 7 series del plan, la última (set-7) con su descanso abierto.
    const plan = [0, 0, 0, 0, 1, 1, 1].map((exercise) => [exercise, 60, 10]);
    const state = withSets(freshWorkout(), plan);
    expect(state.restSetId).toBe('set-7');
    const finished = finishWorkout(state, at(9000));
    expect(restOf(finished, 'set-7')).toBeUndefined();
    expect(restOf(finished, 'set-6')).toBe(60);
    expect(finished.restSetId).toBeNull();
  });

  it('si se borra la serie que lo disparó, se cierra (deja de correr) sin anotar nada en otra', () => {
    const state = withSets(freshWorkout(), [[0, 60, 10], [0, 60, 10]]);
    const removed = removeSet(state, 'set-2');
    expect(removed.restSetId).toBeNull();
    expect(removed.restEndsAt).toBeNull();
    expect(removed.sets.map((set) => set.restSeconds)).toEqual([60]);
    expect(closeRest(removed, at(200))).toBe(removed);
  });

  it('un ejercicio sin descanso (0 s) no abre ninguno', () => {
    const routine = todayRoutine();
    routine.exercises[0].rest_seconds = 0;
    const state = withSets(startWorkout(routine, { now: at(0), newId: () => 's' }), [[0, 60, 10], [0, 60, 10]]);
    expect(state.sets.map((set) => set.restSeconds)).toEqual([undefined, undefined]);
    expect(state.restSetId).toBeNull();
  });

  it('nunca pasa de 3600 s (tope del backend) ni baja de 0', () => {
    const long = adjustRest(resting(), 4000, at(60));
    expect(restOf(register(long, 99999))).toBe(3600);
    expect(restOf(skipRest({ ...resting(), sets: [{ ...resting().sets[0] }] }, at(0)))).toBe(0);
  });

  it('una sesión guardada antes de restSetId (localStorage viejo) sigue andando sin anotar nada', () => {
    const { restSetId, ...old } = resting();
    expect(restSetId).toBe('set-1');
    const next = registerSet(old, { kg: 60, reps: 10 }, at(130), { newId: sequentialIds('new') });
    expect(next.sets.map((set) => set.restSeconds)).toEqual([undefined, undefined]);
    expect(skipRest(old, at(80)).restEndsAt).toBeNull();
  });
});
