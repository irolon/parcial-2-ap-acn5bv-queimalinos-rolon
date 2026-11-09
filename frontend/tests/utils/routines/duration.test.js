import { describe, expect, it } from 'vitest';
import { SECONDS_PER_REP, estimateMinutes } from '@/utils/routines/duration';

// Como los guarda el editor: números como string del input.
const row = (sets, reps, rest_seconds) => ({ sets, reps, rest_seconds });

describe('estimateMinutes', () => {
  it('cuenta 3 s por repetición', () => {
    expect(SECONDS_PER_REP).toBe(3);
  });

  it('suma series × (repeticiones × 3 s + descanso) de cada ejercicio', () => {
    expect(estimateMinutes([row('4', '10', '90')])).toBe(8);
    expect(estimateMinutes([row('4', '10', '90'), row('3', '12', '60')])).toBe(13); // 480 s + 288 s = 12,8 min
  });

  it('redondea al minuto más cercano', () => {
    expect(estimateMinutes([row('1', '10', '60')])).toBe(2);
    expect(estimateMinutes([row('1', '10', '100')])).toBe(2);
    expect(estimateMinutes([row('1', '10', '120')])).toBe(3);
  });

  it('un campo vacío o inválido cuenta 0', () => {
    expect(estimateMinutes([row('', '10', '90')])).toBe(0);
    expect(estimateMinutes([row('4', '', '90')])).toBe(6);
    expect(estimateMinutes([row('4', '10', 'abc')])).toBe(2);
    expect(estimateMinutes([row('4', '-2', '90')])).toBe(6);
  });

  it('entre 1 y 59 s da 1 minuto', () => {
    expect(estimateMinutes([row('1', '10', '0')])).toBe(1);
    expect(estimateMinutes([row('1', '0', '1')])).toBe(1);
  });

  it('sin ejercicios o sin tiempo da 0', () => {
    expect(estimateMinutes([])).toBe(0);
    expect(estimateMinutes(undefined)).toBe(0);
    expect(estimateMinutes([row('', '', '')])).toBe(0);
  });
});
