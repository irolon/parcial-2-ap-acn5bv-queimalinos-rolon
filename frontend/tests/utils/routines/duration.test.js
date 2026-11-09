import { describe, expect, it } from 'vitest';
import { estimateMinutes } from '@/utils/routines/duration';
import { estimatedMinutes } from '@/utils/routines/todayPlan';

// Como los guarda el editor: números como string del input.
const row = (sets, reps, rest_seconds) => ({ sets, reps, rest_seconds });

describe('estimateMinutes', () => {
  it('suma series × (45 s de trabajo + descanso) de cada ejercicio', () => {
    expect(estimateMinutes([row('4', '10', '90')])).toBe(9); // 540 s
    expect(estimateMinutes([row('4', '10', '90'), row('3', '12', '60')])).toBe(14); // 540 s + 315 s = 14,25 min
  });

  it('da lo mismo que la rutina del día (Hoy y el celular) para la misma rutina', () => {
    const saved = [{ sets: 4, reps: 8, rest_seconds: 120 }, { sets: 3, reps: 12, rest_seconds: 60 }];
    const inEditor = saved.map((e) => row(String(e.sets), String(e.reps), String(e.rest_seconds)));
    expect(estimateMinutes(inEditor)).toBe(estimatedMinutes(saved));
  });

  it('redondea al minuto más cercano', () => {
    expect(estimateMinutes([row('1', '10', '60')])).toBe(2); // 105 s
    expect(estimateMinutes([row('1', '10', '100')])).toBe(2); // 145 s
    expect(estimateMinutes([row('1', '10', '120')])).toBe(3); // 165 s
  });

  it('el descanso vacío cuenta como el null que se guarda (90 s), igual que la rutina del día', () => {
    expect(estimateMinutes([row('4', '10', '')])).toBe(estimatedMinutes([{ sets: 4, reps: 10, rest_seconds: null }]));
    expect(estimateMinutes([row('4', '10', '  ')])).toBe(9); // 4 × (45 + 90) = 540 s
    expect(estimateMinutes([row('3', '10', ''), row('3', '10', ''), row('3', '10', ''), row('3', '10', '')])).toBe(27);
  });

  it('las series vacías y el descanso inválido o negativo cuentan 0', () => {
    expect(estimateMinutes([row('', '10', '90')])).toBe(0);
    expect(estimateMinutes([row('4', '10', 'abc')])).toBe(3); // 4 × 45 s
    expect(estimateMinutes([row('4', '10', '-30')])).toBe(3);
  });

  it('entre 1 y 59 s da 1 minuto', () => {
    expect(estimateMinutes([row('1', '10', '0')])).toBe(1); // 45 s
  });

  it('sin ejercicios o sin series da 0', () => {
    expect(estimateMinutes([])).toBe(0);
    expect(estimateMinutes(undefined)).toBe(0);
    expect(estimateMinutes([row('', '', '')])).toBe(0); // sin series no suma aunque el descanso cuente 90 s
  });
});
