/**
 * Modelo de dominio: Turnos (appointments).
 * Tabla, columnas, límites, estados y transiciones. SIN acceso a datos.
 */

export const APPOINTMENTS_TABLE = 'appointments';

/** Duración de todos los turnos: los crea el backend y empiezan en hora en punto. */
export const APPOINTMENT_DURATION_MIN = 60;
/** Cuántos días hacia adelante puede pedir turno un alumno. */
export const STUDENT_MAX_DAYS_AHEAD = 28;
/** Máximo de días (inclusivos) de un rango de GET /appointments. */
export const LIST_MAX_DAYS = 62;
/** Largo máximo de la nota de un turno. */
export const NOTES_MAX = 500;

/** Mismos valores que el check de `appointments.status` en el schema. */
export const STATUS = { PENDING: 'pending', CONFIRMED: 'confirmed', CANCELLED: 'cancelled' };

/** Columnas del turno con el alumno embebido (PostgREST). */
export const APPOINTMENT_COLUMNS =
  'id, trainer_id, student_id, scheduled_at, duration_min, status, notes, created_at, student:students(id, name, avatar_url)';

// Transiciones permitidas por rol: estado actual → estados a los que puede pasar.
// Nadie reabre un cancelado, y el alumno nunca confirma.
const TRANSITIONS = {
  trainer: {
    [STATUS.PENDING]: [STATUS.CONFIRMED, STATUS.CANCELLED],
    [STATUS.CONFIRMED]: [STATUS.CANCELLED],
  },
  student: {
    [STATUS.PENDING]: [STATUS.CANCELLED],
    [STATUS.CONFIRMED]: [STATUS.CANCELLED],
  },
};

/** ¿Puede este rol pasar el turno de `from` a `to`? Todo lo que no está listado es false. */
export const canTransition = (role, from, to) =>
  TRANSITIONS[role]?.[from]?.includes(to) ?? false;

/** Fila de la base → turno público (spec §4). Acepta el alumno embebido como `student` o `students`. */
export function toAppointment(row) {
  const student = row.student ?? row.students ?? null;
  return {
    id: row.id,
    trainer_id: row.trainer_id,
    student: student
      ? { id: student.id, name: student.name, avatar_url: student.avatar_url ?? null }
      : { id: row.student_id, name: null, avatar_url: null },
    scheduled_at: new Date(row.scheduled_at).toISOString(),
    duration_min: row.duration_min,
    status: row.status,
    notes: row.notes ?? null,
    created_at: row.created_at,
  };
}
