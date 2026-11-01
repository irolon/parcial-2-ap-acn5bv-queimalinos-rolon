import { describe, expect, it } from 'vitest';
import { adjustRest, restRemaining, restTotal, setCursor, skipRest, startRest } from '@/utils/workout/workoutState';
import { at, freshWorkout, isoAt, withSets } from '../../../helpers/workout/workout';

// Una serie de Press banca a T0 + 60 s: el descanso (90 s) termina a T0 + 150 s.
const resting = () => withSets(freshWorkout(), [[0, 60, 10]]);

describe('restRemaining: lo que queda se calcula contra `now`', () => {
  it('cuenta los segundos que faltan, redondeando para arriba', () => {
    const state = resting();
    expect(restRemaining(state, at(60))).toBe(90);
    expect(restRemaining(state, at(120))).toBe(30);
    expect(restRemaining(state, new Date(at(149).getTime() + 1))).toBe(1);
  });

  it('al llegar al fin queda en 0 y no baja de ahí', () => {
    const state = resting();
    expect(restRemaining(state, at(150))).toBe(0);
    expect(restRemaining(state, at(4000))).toBe(0);
  });

  it('sin descanso (o con una fecha ilegible) es null', () => {
    expect(restRemaining(freshWorkout(), at(60))).toBeNull();
    expect(restRemaining({ ...resting(), restEndsAt: 'no-es-fecha' }, at(60))).toBeNull();
  });

  it('Review Focus 2: guardado y vuelto a leer (recarga), el descanso sigue contando contra la hora nueva', () => {
    const reloaded = JSON.parse(JSON.stringify(resting()));
    expect(reloaded).toStrictEqual(resting());
    expect(restRemaining(reloaded, at(100))).toBe(50);
    expect(restRemaining(reloaded, at(200))).toBe(0);
  });
});

describe('startRest', () => {
  it('arranca el descanso del ejercicio a la vista desde `now`', () => {
    expect(startRest(freshWorkout(), at(10)).restEndsAt).toBe(isoAt(100));
    expect(startRest(setCursor(freshWorkout(), 1), at(10)).restEndsAt).toBe(isoAt(70));
  });

  it('guarda el total del descanso: pasar a un ejercicio con otro descanso no lo cambia', () => {
    const state = setCursor(resting(), 1);
    expect(state.restTotalSeconds).toBe(90);
    expect(restTotal(state)).toBe(90);
  });

  it('una sesión guardada sin el total (versión vieja) usa el descanso del ejercicio a la vista', () => {
    const old = resting();
    delete old.restTotalSeconds;
    expect(restTotal(old)).toBe(90);
    expect(restTotal(setCursor(old, 1))).toBe(60);
  });
});

describe('adjustRest', () => {
  it('+15 y −15 se suman a lo que queda ahora, con fin absoluto', () => {
    const state = resting();
    expect(adjustRest(state, 15, at(120)).restEndsAt).toBe(isoAt(165));
    expect(adjustRest(state, -15, at(120)).restEndsAt).toBe(isoAt(135));
  });

  it('el total se mueve igual, sin quedar por debajo de lo que queda', () => {
    const state = resting();
    expect(adjustRest(state, 15, at(120)).restTotalSeconds).toBe(105);
    expect(adjustRest(state, -15, at(120)).restTotalSeconds).toBe(75);
    expect(adjustRest(state, 15, at(500)).restTotalSeconds).toBe(105);
    expect(adjustRest(adjustRest(state, -60, at(60)), -60, at(60)).restTotalSeconds).toBe(0);
  });

  it('nunca deja menos de 0: el descanso queda terminado ("¡A la próxima serie!")', () => {
    const adjusted = adjustRest(resting(), -15, at(140));
    expect(adjusted.restEndsAt).toBe(isoAt(140));
    expect(restRemaining(adjusted, at(140))).toBe(0);
  });

  it('+15 sobre un descanso ya cumplido vuelve a contar 15 s desde ahora', () => {
    expect(adjustRest(resting(), 15, at(500)).restEndsAt).toBe(isoAt(515));
  });

  it('sin descanso en curso, o con un ajuste que no es número, no cambia nada', () => {
    const idle = freshWorkout();
    expect(adjustRest(idle, 15, at(10))).toBe(idle);
    const state = resting();
    expect(adjustRest(state, Number.NaN, at(100))).toBe(state);
  });
});

describe('skipRest', () => {
  it('saca el descanso en curso', () => {
    expect(skipRest(resting()).restEndsAt).toBeNull();
  });

  it('sin descanso devuelve el mismo estado', () => {
    const idle = freshWorkout();
    expect(skipRest(idle)).toBe(idle);
  });
});
