import { describe, expect, it } from 'vitest';
import { formatClock, formatElapsed, kgLabel, kgText } from '@/utils/sessions/workoutFormat';

describe('kgText', () => {
  it('escribe el peso con coma decimal, sin ceros de más ni separador de miles', () => {
    expect(kgText(62.5)).toBe('62,5');
    expect(kgText(70)).toBe('70');
    expect(kgText(62.25)).toBe('62,25');
    expect(kgText(1000)).toBe('1000');
    expect(kgText(0.5)).toBe('0,5');
  });

  it('sin peso (peso corporal) es un texto vacío', () => {
    expect(kgText(null)).toBe('');
    expect(kgText(undefined)).toBe('');
  });
});

describe('kgLabel', () => {
  it('muestra el peso con su unidad', () => {
    expect(kgLabel(62.5)).toBe('62,5 kg');
    expect(kgLabel(70)).toBe('70 kg');
  });

  it('una serie sin peso es de peso corporal', () => {
    expect(kgLabel(null)).toBe('Peso corporal');
  });
});

describe('formatClock', () => {
  it('muestra minutos y segundos del descanso', () => {
    expect(formatClock(90)).toBe('1:30');
    expect(formatClock(5)).toBe('0:05');
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(600)).toBe('10:00');
  });

  it('no baja de cero ni muestra decimales', () => {
    expect(formatClock(-3)).toBe('0:00');
    expect(formatClock(59.4)).toBe('0:59');
  });
});

describe('formatElapsed', () => {
  const sec = (n) => n * 1000;

  it('muestra mm:ss mientras no pase la hora', () => {
    expect(formatElapsed(sec(22 * 60 + 14))).toBe('22:14');
    expect(formatElapsed(sec(5))).toBe('0:05');
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(sec(59 * 60 + 59))).toBe('59:59');
  });

  it('pasada la hora muestra h:mm:ss', () => {
    expect(formatElapsed(sec(3600))).toBe('1:00:00');
    expect(formatElapsed(sec(3600 + 2 * 60 + 3))).toBe('1:02:03');
    expect(formatElapsed(sec(10 * 3600 + 5 * 60 + 9))).toBe('10:05:09');
  });

  it('un reloj que va para atrás no da un tiempo negativo', () => {
    expect(formatElapsed(-5000)).toBe('0:00');
    expect(formatElapsed(Number.NaN)).toBe('0:00');
  });
});
