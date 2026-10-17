import { Errors } from '../../shared/utils/errors.js';
import { STUDENT_GOALS } from '../../models/students/student.model.js';
import { parseStudentContext } from './student-context.validation.js';

const isString = (v) => typeof v === 'string';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Valida el body de POST /students (alta desde invitación).
 * El contrato pide solo: token y password (mínimo 8 caracteres).
 */
export function validateRegisterFromInvitation(body) {
  const details = [];

  if (!isString(body.token) || body.token.trim() === '') {
    details.push({ field: 'token', message: 'token es requerido' });
  }
  if (!isString(body.password) || body.password.length < 8) {
    details.push({ field: 'password', message: 'La contraseña debe tener al menos 8 caracteres' });
  }

  if (details.length > 0) throw Errors.validation('Error de validación', details);

  return { token: body.token.trim(), password: body.password };
}

/** Valida la query de GET /students (active, search, page, limit). */
export function validateListQuery(query) {
  const out = {};
  // Por defecto solo activos: un alumno dado de baja se pide con ?active=false.
  out.active = query.active === undefined ? true : query.active !== 'false';
  if (isString(query.search) && query.search.trim() !== '') out.search = query.search.trim();

  const page = Number.parseInt(query.page, 10);
  out.page = Number.isInteger(page) && page > 0 ? page : 1;

  const limit = Number.parseInt(query.limit, 10);
  out.limit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;

  return out;
}

/**
 * Valida :id de /students/:id. Lo pasa a minúsculas: Postgres devuelve los
 * UUID en minúsculas y compararlos contra uno en mayúsculas daría un 403 falso.
 */
export function validateStudentIdParam(params) {
  if (!isString(params.id) || !UUID_RE.test(params.id)) {
    throw Errors.validation('Error de validación', [{ field: 'id', message: 'id inválido' }]);
  }
  return { ...params, id: params.id.toLowerCase() };
}

/** Fecha YYYY-MM-DD que existe en el calendario y no es futura. */
function isValidPastDate(value) {
  if (!isString(value) || !DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;
  return value <= new Date().toISOString().slice(0, 10);
}

/**
 * Valida el body de PATCH /students/:id. Solo toma los campos editables;
 * el resto (email, trainer_id, password_hash…) se ignora. Exige al menos uno.
 */
export function validateUpdateStudent(body) {
  const details = [];
  const out = {};

  if (body.name !== undefined) {
    const name = isString(body.name) ? body.name.trim() : '';
    if (name.length < 2 || name.length > 100) {
      details.push({ field: 'name', message: 'name debe tener entre 2 y 100 caracteres' });
    } else out.name = name;
  }
  if (body.goal !== undefined) {
    if (!STUDENT_GOALS.includes(body.goal)) {
      details.push({ field: 'goal', message: `goal debe ser uno de: ${STUDENT_GOALS.join(', ')}` });
    } else out.goal = body.goal;
  }
  if (body.active !== undefined) {
    if (typeof body.active !== 'boolean') {
      details.push({ field: 'active', message: 'active debe ser true o false' });
    } else out.active = body.active;
  }
  if (body.birth_date !== undefined) {
    if (body.birth_date !== null && !isValidPastDate(body.birth_date)) {
      details.push({ field: 'birth_date', message: 'birth_date debe ser una fecha YYYY-MM-DD no futura' });
    } else out.birth_date = body.birth_date;
  }
  Object.assign(out, parseStudentContext(body, details));

  if (details.length > 0) throw Errors.validation('Error de validación', details);
  if (Object.keys(out).length === 0) {
    throw Errors.validation('Mandá al menos un campo para actualizar', [
      { field: 'body', message: 'Campos editables: name, goal, level, active, birth_date, gym_equipment, injuries' },
    ]);
  }
  return out;
}
