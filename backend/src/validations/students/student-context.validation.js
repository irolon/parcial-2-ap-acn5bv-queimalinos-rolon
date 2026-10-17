import { STUDENT_LEVELS } from '../../models/students/student.model.js';

/*
 * Validación del contexto del alumno para los asistentes IA del S4
 * (gym_equipment, injuries, level). La comparten PATCH /students/:id y
 * POST /invitations, así las reglas no se desincronizan.
 */

const MAX_EQUIPMENT_ITEMS = 30;
const MAX_EQUIPMENT_LENGTH = 50;
const MAX_INJURIES_LENGTH = 1000;

const isString = (v) => typeof v === 'string';

/** gym_equipment: lista de textos no vacíos (o null). undefined si es inválido. */
function parseEquipment(value, details) {
  if (value === null) return null;
  const ok =
    Array.isArray(value) &&
    value.length <= MAX_EQUIPMENT_ITEMS &&
    value.every(
      (item) =>
        isString(item) && item.trim() !== '' && item.trim().length <= MAX_EQUIPMENT_LENGTH
    );
  if (!ok) {
    details.push({
      field: 'gym_equipment',
      message: `gym_equipment es una lista de hasta ${MAX_EQUIPMENT_ITEMS} textos de 1 a ${MAX_EQUIPMENT_LENGTH} caracteres`,
    });
    return undefined;
  }
  return value.map((item) => item.trim());
}

/** injuries: texto (o null; solo espacios → null). undefined si es inválido. */
function parseInjuries(value, details) {
  if (value === null) return null;
  if (!isString(value) || value.length > MAX_INJURIES_LENGTH) {
    details.push({
      field: 'injuries',
      message: `injuries debe ser un texto de hasta ${MAX_INJURIES_LENGTH} caracteres`,
    });
    return undefined;
  }
  return value.trim() || null;
}

/** level: uno del enum. undefined si es inválido. */
function parseLevel(value, details) {
  if (!STUDENT_LEVELS.includes(value)) {
    details.push({ field: 'level', message: `level debe ser uno de: ${STUDENT_LEVELS.join(', ')}` });
    return undefined;
  }
  return value;
}

/**
 * Valida los campos de contexto que vinieron en `body` y devuelve solo esos,
 * saneados. Un campo ausente no aparece en el resultado; los errores se
 * agregan a `details`.
 */
export function parseStudentContext(body, details) {
  const out = {};
  if (body.gym_equipment !== undefined) {
    const equipment = parseEquipment(body.gym_equipment, details);
    if (equipment !== undefined) out.gym_equipment = equipment;
  }
  if (body.injuries !== undefined) {
    const injuries = parseInjuries(body.injuries, details);
    if (injuries !== undefined) out.injuries = injuries;
  }
  if (body.level !== undefined) {
    const level = parseLevel(body.level, details);
    if (level !== undefined) out.level = level;
  }
  return out;
}
