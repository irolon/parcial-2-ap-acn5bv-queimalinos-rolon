/**
 * Modelo de dominio: Student.
 * Estructura de datos pura + mapeo de filas. SIN lógica de negocio.
 */

/** Nombre de la tabla en la base de datos. */
export const STUDENTS_TABLE = 'students';

/** Objetivos y niveles válidos (mismos CHECK que la tabla students). */
export const STUDENT_GOALS = ['tonify', 'weight_loss', 'hypertrophy', 'strength'];
export const STUDENT_LEVELS = ['beginner', 'intermediate', 'advanced'];

/** Vista con la última sesión de cada alumno (ver database/schema/04-progress.sql). */
export const STUDENT_LAST_SESSION_VIEW = 'student_last_session';

/*
 * El listado y la ficha usan columnas DISTINTAS a propósito (tarjeta 7):
 * el listado necesita la última sesión, que la ficha no usa; la ficha necesita
 * gym_equipment, injuries y level (contexto de los asistentes IA del S4), que
 * el listado no muestra. Unificarlas trae de más en el listado o deja la ficha
 * sin un campo sin que nada falle a la vista. Nunca incluyen password_hash.
 */
export const STUDENT_LIST_COLUMNS = 'id, name, email, goal, active, avatar_url, created_at';

export const STUDENT_DETAIL_COLUMNS =
  'id, trainer_id, name, email, goal, birth_date, avatar_url, active, gym_equipment, injuries, level, created_at';

/** Mapea una fila cruda a la entidad pública Student, descartando el hash. */
export function toStudent(row) {
  if (!row) return null;
  const { password_hash: _passwordHash, ...student } = row;
  return student;
}
