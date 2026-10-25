import { describe, expect, it } from 'vitest';
import {
  INACTIVITY_DAYS,
  STATUS_LABELS,
  activityStatus,
  daysSince,
  daysWithoutTraining,
  lastSessionLabel,
} from '@/utils/students/activity';
import { student } from '../../helpers/students/fixtures';

const NOW = new Date('2026-10-24T12:00:00Z');

describe('daysSince', () => {
  it('cuenta días enteros transcurridos', () => {
    expect(daysSince('2026-10-24T01:00:00Z', NOW)).toBe(0);
    expect(daysSince('2026-10-23T11:00:00Z', NOW)).toBe(1);
    expect(daysSince('2026-10-23T13:00:00Z', NOW)).toBe(0);
  });

  it('no depende de la zona horaria del ISO', () => {
    expect(daysSince('2026-10-17T09:00:00-03:00', NOW)).toBe(7);
    expect(daysSince('2026-10-17T13:00:00-03:00', NOW)).toBe(6);
  });
});

describe('activityStatus', () => {
  it('la frontera de 7 días: 6 al día, 7 inactivo', () => {
    expect(INACTIVITY_DAYS).toBe(7);
    expect(activityStatus(student({ last_session_at: '2026-10-18T12:00:00Z' }), NOW)).toBe('active');
    expect(activityStatus(student({ last_session_at: '2026-10-17T12:00:00Z' }), NOW)).toBe('inactive');
  });

  it('6 días y 23 h sigue al día; con otra zona horaria cuenta el instante real', () => {
    expect(activityStatus(student({ last_session_at: '2026-10-17T13:00:00Z' }), NOW)).toBe('active');
    expect(activityStatus(student({ last_session_at: '2026-10-17T09:00:00-03:00' }), NOW)).toBe('inactive');
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
