import {
  STATUS,
  canTransition,
  toAppointment,
  APPOINTMENT_DURATION_MIN,
  STUDENT_MAX_DAYS_AHEAD,
  LIST_MAX_DAYS,
  NOTES_MAX,
} from '../../../../src/models/agenda/appointment.model.js';
import { AVAILABILITY_MAX_SLOTS, FREE_MAX_DAYS } from '../../../../src/models/agenda/availability.model.js';

const { PENDING, CONFIRMED, CANCELLED } = STATUS;

describe('constantes', () => {
  it('coinciden con la spec', () => {
    expect([APPOINTMENT_DURATION_MIN, STUDENT_MAX_DAYS_AHEAD, LIST_MAX_DAYS, NOTES_MAX]).toEqual([60, 28, 62, 500]);
    expect([FREE_MAX_DAYS, AVAILABILITY_MAX_SLOTS]).toEqual([31, 50]);
  });
});

describe('canTransition', () => {
  it.each([
    ['trainer', PENDING, CONFIRMED, true],
    ['trainer', PENDING, CANCELLED, true],
    ['trainer', CONFIRMED, CANCELLED, true],
    ['trainer', CONFIRMED, CONFIRMED, false],
    ['trainer', CONFIRMED, PENDING, false],
    ['trainer', PENDING, PENDING, false],
    ['trainer', CANCELLED, PENDING, false],
    ['trainer', CANCELLED, CONFIRMED, false],
    ['trainer', CANCELLED, CANCELLED, false],
    ['student', PENDING, CANCELLED, true],
    ['student', CONFIRMED, CANCELLED, true],
    ['student', PENDING, CONFIRMED, false],
    ['student', CONFIRMED, CONFIRMED, false],
    ['student', CONFIRMED, PENDING, false],
    ['student', PENDING, PENDING, false],
    ['student', CANCELLED, PENDING, false],
    ['student', CANCELLED, CONFIRMED, false],
    ['student', CANCELLED, CANCELLED, false],
  ])('%s: %s a %s = %s', (role, from, to, expected) => {
    expect(canTransition(role, from, to)).toBe(expected);
  });

  it('un rol o estado desconocido nunca puede', () => {
    expect(canTransition('admin', PENDING, CONFIRMED)).toBe(false);
    expect(canTransition(undefined, PENDING, CANCELLED)).toBe(false);
    expect(canTransition('trainer', 'otro', CANCELLED)).toBe(false);
  });
});

describe('toAppointment', () => {
  const row = {
    id: 'a1',
    trainer_id: 't1',
    student_id: 's1',
    scheduled_at: '2026-11-06T21:00:00+00:00',
    duration_min: 60,
    status: PENDING,
    notes: null,
    created_at: '2026-10-31T12:00:00+00:00',
    student: { id: 's1', name: 'Lucía', avatar_url: null, email: 'no-se-expone@x.com' },
  };

  it('arma la forma pública con el alumno embebido y fecha ISO UTC', () => {
    expect(toAppointment(row)).toEqual({
      id: 'a1',
      trainer_id: 't1',
      student: { id: 's1', name: 'Lucía', avatar_url: null },
      scheduled_at: '2026-11-06T21:00:00.000Z',
      duration_min: 60,
      status: PENDING,
      notes: null,
      created_at: '2026-10-31T12:00:00+00:00',
    });
  });

  it('acepta el alumno bajo la clave students y tolera que falte', () => {
    const { student, ...rest } = row;
    expect(toAppointment({ ...rest, students: student }).student.name).toBe('Lucía');
    expect(toAppointment(rest).student).toEqual({ id: 's1', name: null, avatar_url: null });
  });
});
