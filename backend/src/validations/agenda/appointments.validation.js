import { Errors } from '../../shared/utils/errors.js';
import { isUuid, isIsoDateTime } from '../../shared/utils/validators.js';
import { NOTES_MAX, STATUS } from '../../models/agenda/appointment.model.js';

const fail = (details) => {
  throw Errors.validation('Error de validación', details);
};

/** scheduled_at (ISO con zona) y notes opcional; acumula los errores en `details`. */
function checkCommon(body, details) {
  const out = {};
  if (!isIsoDateTime(body.scheduled_at)) {
    details.push({ field: 'scheduled_at', message: 'scheduled_at debe ser una fecha ISO 8601 con zona' });
  } else out.scheduled_at = new Date(body.scheduled_at).toISOString();
  out.notes = null;
  if (body.notes !== undefined && body.notes !== null) {
    if (typeof body.notes !== 'string' || body.notes.length > NOTES_MAX) {
      details.push({ field: 'notes', message: `notes debe ser un texto de hasta ${NOTES_MAX} caracteres` });
    } else out.notes = body.notes.trim() || null;
  }
  return out;
}

/** POST del alumno: { scheduled_at, notes? }. Hora en punto, futuro y disponibilidad los valida el service. */
export function validateStudentRequest(body) {
  const details = [];
  const out = checkCommon(body ?? {}, details);
  if (details.length > 0) fail(details);
  return out;
}

/** POST del entrenador: { student_id, scheduled_at, notes? }. */
export function validateTrainerCreate(body) {
  const details = [];
  const out = checkCommon(body ?? {}, details);
  if (!isUuid(body?.student_id)) details.push({ field: 'student_id', message: 'student_id inválido' });
  if (details.length > 0) fail(details);
  return { student_id: body.student_id.toLowerCase(), ...out };
}

/** PATCH: { status: 'confirmed' | 'cancelled' } (a 'pending' no se vuelve). */
export function validateStatusPatch(body) {
  const allowed = [STATUS.CONFIRMED, STATUS.CANCELLED];
  if (!allowed.includes(body?.status)) {
    fail([{ field: 'status', message: `status debe ser uno de: ${allowed.join(', ')}` }]);
  }
  return { status: body.status };
}

export function validateIdParam(params) {
  if (!isUuid(params?.id)) fail([{ field: 'id', message: 'id inválido' }]);
  return { id: params.id.toLowerCase() };
}
