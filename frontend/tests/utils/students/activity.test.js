import { describe, expect, it, vi } from 'vitest';
import {
  INACTIVITY_DAYS,
  STATUS_LABELS,
  activityStatus,
  countByStatus,
  daysSince,
  daysWithoutTraining,
  lastSessionLabel,
} from '@/utils/students/activity';
import { student } from '../../helpers/students/fixtures';

const NOW = new Date('2026-10-24T12:00:00Z');

/** ISO de un instante en hora local (mes 9 = octubre). */
const local = (day, hour, month = 9, year = 2026) => new Date(year, month, day, hour).toISOString();

describe('daysSince', () => {
  it('cuenta días de calendario locales, no bloques de 24 h', () => {
    const now = new Date(2026, 9, 24, 8);
    expect(daysSince(local(24, 1), now)).toBe(0);
    expect(daysSince(local(23, 23), now)).toBe(1);
    expect(daysSince(local(23, 9), now)).toBe(1);
    expect(daysSince(local(17, 23), now)).toBe(7);
  });

  it('un cambio de horario no corre el día', () => {
    vi.stubEnv('TZ', 'Europe/Madrid');
    try {
      expect(daysSince(local(27, 12, 2, 2027), new Date(2027, 2, 29, 11, 30))).toBe(2);
      expect(daysSince(local(24, 0, 9), new Date(2026, 9, 26, 23, 30))).toBe(2);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe('activityStatus', () => {
  it('la frontera de 7 días: 6 al día, 7 inactivo', () => {
    expect(INACTIVITY_DAYS).toBe(7);
    expect(activityStatus(student({ last_session_at: '2026-10-18T12:00:00Z' }), NOW)).toBe('active');
    expect(activityStatus(student({ last_session_at: '2026-10-17T12:00:00Z' }), NOW)).toBe('inactive');
  });

  it('el corte es por día de calendario: hace 7 días a última hora ya es inactivo', () => {
    const now = new Date(2026, 9, 24, 8);
    expect(activityStatus(student({ last_session_at: local(18, 1) }), now)).toBe('active');
    expect(activityStatus(student({ last_session_at: local(17, 23) }), now)).toBe('inactive');
  });

  it('dado de baja gana sobre todo', () => {
    expect(activityStatus(student({ active: false, last_session_at: '2026-10-24T10:00:00Z' }), NOW)).toBe('disabled');
  });

  it('sin sesión: nuevo si es reciente, inactivo si es viejo', () => {
    expect(activityStatus(student({ created_at: '2026-10-20T12:00:00Z' }), NOW)).toBe('new');
    expect(activityStatus(student({ created_at: '2026-10-17T12:00:00Z' }), NOW)).toBe('inactive');
  });
});

describe('lastSessionLabel', () => {
  it('etiqueta Hoy, Ayer, Hace N días y Nunca entrenó', () => {
    const at = (iso) => lastSessionLabel(student({ last_session_at: iso }), NOW);
    expect(at('2026-10-24T08:00:00Z')).toBe('Hoy');
    expect(at('2026-10-23T08:00:00Z')).toBe('Ayer');
    expect(at('2026-10-20T08:00:00Z')).toBe('Hace 4 días');
    expect(lastSessionLabel(student(), NOW)).toBe('Nunca entrenó');
  });

  it('ayer a las 23 visto hoy a las 8 es Ayer', () => {
    expect(lastSessionLabel(student({ last_session_at: local(23, 23) }), new Date(2026, 9, 24, 8))).toBe('Ayer');
  });

  it('expone las etiquetas de estado', () => {
    expect(STATUS_LABELS.active).toBe('Al día');
    expect(STATUS_LABELS.disabled).toBe('Dado de baja');
  });
});

describe('daysWithoutTraining', () => {
  it('cuenta desde la última sesión, o desde el alta si nunca entrenó', () => {
    expect(daysWithoutTraining(student({ last_session_at: '2026-10-20T12:00:00Z' }), NOW)).toBe(4);
    expect(daysWithoutTraining(student({ created_at: '2026-10-10T12:00:00Z' }), NOW)).toBe(14);
  });
});

describe('countByStatus', () => {
  it('cuenta cada estado', () => {
    const list = [
      student({ last_session_at: '2026-10-23T12:00:00Z' }),
      student({ last_session_at: '2026-10-01T12:00:00Z' }),
      student({ created_at: '2026-10-01T12:00:00Z' }),
      student({ created_at: '2026-10-23T12:00:00Z' }),
      student({ active: false }),
    ];
    expect(countByStatus(list, NOW)).toEqual({ active: 1, inactive: 2, new: 1, disabled: 1 });
    expect(countByStatus([], NOW)).toEqual({ active: 0, inactive: 0, new: 0, disabled: 0 });
  });
});
