import { describe, expect, it } from 'vitest';
import { dayInitial, dayTitle, daysAgoLabel, deltaLabel, lastDays, relativeTime } from '@/utils/students/overviewFormat';
import { daily } from '../../helpers/students/overview';

// Domingo 08/11/2026 15:00 en Argentina (18:00 UTC).
const NOW = new Date('2026-11-08T18:00:00Z');
const minutesAgo = (m) => new Date(NOW.getTime() - m * 60 * 1000).toISOString();

describe('deltaLabel', () => {
  it('suma el signo y el %, con el menos tipográfico; sin variación, vacío', () => {
    expect(deltaLabel(4)).toBe('+4%');
    expect(deltaLabel(-3)).toBe('−3%');
    expect(deltaLabel(0)).toBe('0%');
    expect(deltaLabel(null)).toBe('');
    expect(deltaLabel(undefined)).toBe('');
  });
});

describe('relativeTime', () => {
  it('menos de un minuto: hace un momento (también si el reloj quedó atrás)', () => {
    expect(relativeTime(minutesAgo(0.5), NOW)).toBe('hace un momento');
    expect(relativeTime(minutesAgo(-2), NOW)).toBe('hace un momento');
  });

  it('menos de una hora: los minutos', () => {
    expect(relativeTime(minutesAgo(12), NOW)).toBe('hace 12 min');
  });

  it('el mismo día argentino: las horas', () => {
    expect(relativeTime(minutesAgo(3 * 60 + 20), NOW)).toBe('hace 3 h');
    expect(relativeTime('2026-11-08T03:10:00Z', NOW)).toBe('hace 14 h'); // 00:10 en Argentina
  });

  it('el día argentino anterior: ayer', () => {
    expect(relativeTime('2026-11-08T02:50:00Z', NOW)).toBe('ayer'); // 23:50 del sábado en Argentina
  });

  it('antes: la fecha dd/mm argentina', () => {
    expect(relativeTime('2026-11-05T12:00:00Z', NOW)).toBe('05/11');
    expect(relativeTime('2026-11-01T01:00:00Z', NOW)).toBe('31/10');
  });
});

describe('lastDays', () => {
  it('se queda con las últimas 7 o las 14 filas, en orden', () => {
    const rows = daily([...Array(13).fill(0), 5]);
    expect(lastDays(rows, 7)).toEqual(rows.slice(7));
    expect(lastDays(rows, 14)).toEqual(rows);
    expect(lastDays(rows, 7).at(-1).count).toBe(5);
  });

  it('sin filas devuelve una lista vacía', () => {
    expect(lastDays(undefined, 7)).toEqual([]);
  });
});

describe('etiquetas del día', () => {
  it('inicial del día de la semana (miércoles = X)', () => {
    expect(['2026-11-02', '2026-11-04', '2026-11-08'].map(dayInitial)).toEqual(['L', 'X', 'D']);
  });

  it('título del tooltip: día abreviado y dd/mm', () => {
    expect(dayTitle('2026-11-05')).toBe('Jue 05/11');
    expect(dayTitle('2026-11-06')).toBe('Vie 06/11');
    expect(dayTitle('2026-11-04')).toBe('Mié 04/11');
  });
});

describe('daysAgoLabel', () => {
  it('el mismo día argentino, como relativeTime; si no, los días', () => {
    expect(daysAgoLabel(minutesAgo(12), NOW)).toBe('hace 12 min');
    expect(daysAgoLabel('2026-11-08T03:10:00Z', NOW)).toBe('hace 14 h');
    expect(daysAgoLabel('2026-11-08T02:50:00Z', NOW)).toBe('hace 1 d'); // 23:50 del sábado en Argentina
    expect(daysAgoLabel('2026-11-06T18:00:00Z', NOW)).toBe('hace 2 d');
  });
});
