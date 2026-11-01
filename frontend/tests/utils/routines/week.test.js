import { describe, expect, it } from 'vitest';
import { nextTrainingDay, weekStrip, weekSummary } from '@/utils/routines/week';

// Argentina es UTC-3 todo el año: las 23:59 del domingo son las 02:59 UTC del lunes.
const WEDNESDAY = new Date('2026-10-28T18:00:00Z'); //  miércoles 28/10, 15:00 en Argentina
const SUNDAY_2359 = new Date('2026-11-02T02:59:00Z'); // domingo 1/11, 23:59
const MONDAY_0000 = new Date('2026-11-02T03:00:00Z'); // lunes 2/11, 00:00

const done = (startedAt, finishedAt = startedAt) => ({ started_at: startedAt, finished_at: finishedAt });
const flags = (strip, key) => strip.map((day) => day[key]);

describe('weekStrip', () => {
  it('devuelve los siete días de lunes a domingo con su inicial', () => {
    const strip = weekStrip({ now: WEDNESDAY });
    expect(strip.map((day) => day.weekday)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(strip.map((day) => day.label).join('')).toBe('LMXJVSD');
    expect(Object.keys(strip[0]).sort()).toEqual(['isToday', 'label', 'planned', 'trained', 'weekday']);
  });

  it('marca hoy, y solo hoy', () => {
    expect(flags(weekStrip({ now: WEDNESDAY }), 'isToday')).toEqual([false, false, true, false, false, false, false]);
  });

  it('marca los días de la rutina (vienen en inglés)', () => {
    const strip = weekStrip({ routineDays: ['monday', 'wednesday', 'friday'], now: WEDNESDAY });
    expect(flags(strip, 'planned')).toEqual([true, false, true, false, true, false, false]);
  });

  it('ignora los días que no conoce y no se rompe sin rutina', () => {
    expect(flags(weekStrip({ routineDays: ['otro'], now: WEDNESDAY }), 'planned')).toEqual(Array(7).fill(false));
    expect(flags(weekStrip({ now: WEDNESDAY }), 'planned')).toEqual(Array(7).fill(false));
  });

  it('marca como entrenados los días con una sesión terminada de esta semana', () => {
    const sessions = [
      done('2026-10-26T13:00:00Z', '2026-10-26T14:00:00Z'), // lunes
      done('2026-10-28T13:00:00Z', '2026-10-28T14:00:00Z'), // hoy
    ];
    expect(flags(weekStrip({ sessions, now: WEDNESDAY }), 'trained')).toEqual([true, false, true, false, false, false, false]);
  });

  it('una sesión sin terminar no cuenta como entrenada', () => {
    const sessions = [{ started_at: '2026-10-28T13:00:00Z', finished_at: null }];
    expect(flags(weekStrip({ sessions, now: WEDNESDAY }), 'trained')).toEqual(Array(7).fill(false));
  });

  it('varias sesiones el mismo día son un solo día entrenado', () => {
    const sessions = [done('2026-10-27T12:00:00Z'), done('2026-10-27T22:00:00Z')];
    expect(flags(weekStrip({ sessions, now: WEDNESDAY }), 'trained').filter(Boolean)).toHaveLength(1);
  });

  it('una sesión de otra semana no cuenta, ni de la anterior ni de la siguiente', () => {
    const sessions = [done('2026-10-20T13:00:00Z'), done('2026-11-04T13:00:00Z')];
    expect(flags(weekStrip({ sessions, now: WEDNESDAY }), 'trained')).toEqual(Array(7).fill(false));
  });

  it('una sesión sin fecha de inicio no cuenta (no se toma como si fuera de hoy)', () => {
    const sessions = [{ started_at: null, finished_at: '2026-10-28T14:00:00Z' }, { finished_at: '2026-10-28T14:00:00Z' }];
    expect(flags(weekStrip({ sessions, now: WEDNESDAY }), 'trained')).toEqual(Array(7).fill(false));
  });

  it('la sesión es del día en que empezó, aunque termine después de medianoche', () => {
    const night = done('2026-10-28T02:50:00Z', '2026-10-28T03:30:00Z'); // martes 23:50 → miércoles 00:30
    expect(flags(weekStrip({ sessions: [night], now: WEDNESDAY }), 'trained')).toEqual([false, true, false, false, false, false, false]);
  });
});

describe('weekStrip: bordes de la semana en Argentina', () => {
  const sundayNight = done('2026-11-02T02:00:00Z', '2026-11-02T02:50:00Z'); // domingo 1/11, 23:00 a 23:50

  it('el domingo 23:59 todavía es domingo y esa semana sigue abierta', () => {
    const strip = weekStrip({ sessions: [sundayNight], now: SUNDAY_2359 });
    expect(flags(strip, 'isToday')).toEqual([false, false, false, false, false, false, true]);
    expect(flags(strip, 'trained')).toEqual([false, false, false, false, false, false, true]);
  });

  it('el lunes 00:00 empieza otra semana y la sesión del domingo ya no cuenta', () => {
    const strip = weekStrip({ sessions: [sundayNight], now: MONDAY_0000 });
    expect(flags(strip, 'isToday')).toEqual([true, false, false, false, false, false, false]);
    expect(flags(strip, 'trained')).toEqual(Array(7).fill(false));
  });

  it('una sesión del lunes 00:00 en Argentina ya es de la semana nueva', () => {
    const strip = weekStrip({ sessions: [done('2026-11-02T03:00:00Z')], now: MONDAY_0000 });
    expect(flags(strip, 'trained')).toEqual([true, false, false, false, false, false, false]);
  });

  it('y todavía no es de la semana que cierra el domingo 23:59: el lunes 00:00 siguiente no marca nada', () => {
    const strip = weekStrip({ sessions: [done('2026-11-02T03:00:00Z')], now: SUNDAY_2359 });
    expect(flags(strip, 'trained')).toEqual(Array(7).fill(false));
  });

  it('el domingo 23:59 en Argentina, que en UTC ya es lunes, no se cuenta como lunes', () => {
    // 2026-10-26T02:59Z es el lunes en UTC pero el domingo 25/10, 23:59 en Argentina: semana anterior.
    const strip = weekStrip({ sessions: [done('2026-10-26T02:59:00Z')], now: WEDNESDAY });
    expect(flags(strip, 'trained')).toEqual(Array(7).fill(false));
    // un minuto después ya es el lunes 26/10 00:00 en Argentina.
    const monday = weekStrip({ sessions: [done('2026-10-26T03:00:00Z')], now: WEDNESDAY });
    expect(flags(monday, 'trained')).toEqual([true, false, false, false, false, false, false]);
  });
});

describe('nextTrainingDay', () => {
  const routine = (...days) => ({ routine_id: 'r', name: 'R', days, exercises: [] });

  it('da el próximo día de entrenamiento después de hoy, en español y en minúscula', () => {
    expect(nextTrainingDay([routine('monday', 'thursday')], WEDNESDAY)).toBe('jueves');
  });

  it('da el día con tilde tal cual se escribe', () => {
    expect(nextTrainingDay([routine('wednesday')], new Date('2026-10-27T15:00:00Z'))).toBe('miércoles');
    expect(nextTrainingDay([routine('saturday')], WEDNESDAY)).toBe('sábado');
  });

  it('da la vuelta a la semana', () => {
    const friday = new Date('2026-10-30T15:00:00Z');
    expect(nextTrainingDay([routine('monday')], friday)).toBe('lunes');
  });

  it('con varias rutinas junta sus días y elige el más cercano', () => {
    const routines = [routine('saturday'), routine('thursday', 'sunday')];
    expect(nextTrainingDay(routines, WEDNESDAY)).toBe('jueves');
  });

  it('hoy no cuenta: si el único día es hoy, el próximo es el de la semana que viene', () => {
    expect(nextTrainingDay([routine('wednesday')], WEDNESDAY)).toBe('miércoles');
    expect(nextTrainingDay([routine('wednesday', 'friday')], WEDNESDAY)).toBe('viernes');
  });

  it('el domingo 23:59 el próximo día es el lunes; a las 00:00 del lunes, el siguiente', () => {
    const routines = [routine('monday', 'tuesday')];
    expect(nextTrainingDay(routines, SUNDAY_2359)).toBe('lunes');
    expect(nextTrainingDay(routines, MONDAY_0000)).toBe('martes');
  });

  // Review Focus 3: un día de descanso (hay rutinas, hoy no toca) no se confunde con un alumno sin rutina asignada.
  it('un día de descanso tiene próximo día; un alumno sin rutinas asignadas no tiene ninguno', () => {
    expect(nextTrainingDay([routine('thursday')], WEDNESDAY)).toBe('jueves');
    expect(nextTrainingDay([], WEDNESDAY)).toBeNull();
    expect(nextTrainingDay(undefined, WEDNESDAY)).toBeNull();
  });

  it('rutinas sin días, o con días desconocidos, tampoco dan un próximo día', () => {
    expect(nextTrainingDay([routine(), routine('otro')], WEDNESDAY)).toBeNull();
    expect(nextTrainingDay([{ routine_id: 'r' }], WEDNESDAY)).toBeNull();
  });
});

describe('weekSummary', () => {
  const summary = (routineDays, sessions) => weekSummary(weekStrip({ routineDays, sessions, now: WEDNESDAY }));
  const MONDAY = done('2026-10-26T13:00:00Z');
  const TUESDAY = done('2026-10-27T13:00:00Z');

  it('cuenta los días entrenados contra los que tocan: "N de M entrenamientos"', () => {
    expect(summary(['monday', 'wednesday', 'friday'], [MONDAY])).toBe('1 de 3 entrenamientos');
    expect(summary(['monday', 'wednesday', 'friday'], [])).toBe('0 de 3 entrenamientos');
  });

  it('con un solo día planificado va en singular', () => {
    expect(summary(['monday'], [MONDAY])).toBe('1 de 1 entrenamiento');
  });

  it('un día entrenado que no tocaba suma igual', () => {
    expect(summary(['monday', 'wednesday'], [MONDAY, TUESDAY, done('2026-10-28T13:00:00Z')])).toBe('3 de 2 entrenamientos');
  });

  it('sin días planificados no dice "0 de 0"', () => {
    expect(summary([], [])).toBe('Sin entrenamientos planificados');
    expect(summary([], [MONDAY])).toBe('1 entrenamiento');
    expect(summary([], [MONDAY, TUESDAY])).toBe('2 entrenamientos');
  });
});
