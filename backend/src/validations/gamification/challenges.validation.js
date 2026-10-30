import { Errors } from '../../shared/utils/errors.js';
import { isUuid } from '../../shared/utils/validators.js';
import { GOAL_TYPES } from '../../models/gamification/gamification.model.js';

const fail = (details) => {
  throw Errors.validation('Error de validación', details);
};

/** Valida y baja a minúsculas un `:id` de desafío. */
export function validateChallengeIdParam(params) {
  if (!isUuid(params.id)) fail([{ field: 'id', message: 'id inválido' }]);
  return { ...params, id: params.id.toLowerCase() };
}

/** Campos de un desafío; con `partial` todos son opcionales (PATCH). */
function parseChallenge(body, partial) {
  const details = [];
  const out = {};
  const present = (key) => (partial ? body[key] !== undefined : true);

  if (present('name')) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (name.length < 1 || name.length > 100) {
      details.push({ field: 'name', message: 'name debe tener entre 1 y 100 caracteres' });
    } else out.name = name;
  }
  if (body.description !== undefined) {
    const d = body.description;
    if (d !== null && (typeof d !== 'string' || d.length > 1000)) {
      details.push({ field: 'description', message: 'description debe ser texto de hasta 1000 caracteres o null' });
    } else out.description = d;
  }
  if (present('goal_type')) {
    if (!GOAL_TYPES.includes(body.goal_type)) {
      details.push({ field: 'goal_type', message: `goal_type debe ser uno de: ${GOAL_TYPES.join(', ')}` });
    } else out.goal_type = body.goal_type;
  }
  if (present('goal_value')) {
    if (typeof body.goal_value !== 'number' || !Number.isFinite(body.goal_value) || body.goal_value <= 0) {
      details.push({ field: 'goal_value', message: 'goal_value debe ser un número mayor a 0' });
    } else out.goal_value = body.goal_value;
  }
  if (present('duration_days')) {
    const n = body.duration_days;
    if (!Number.isInteger(n) || n < 1 || n > 365) {
      details.push({ field: 'duration_days', message: 'duration_days debe ser un entero entre 1 y 365' });
    } else out.duration_days = n;
  }
  if (body.reward_achievement_id !== undefined) {
    const r = body.reward_achievement_id;
    if (r !== null && !isUuid(r)) {
      details.push({ field: 'reward_achievement_id', message: 'reward_achievement_id debe ser un uuid o null' });
    } else out.reward_achievement_id = r === null ? null : r.toLowerCase();
  }
  if (details.length > 0) fail(details);
  return out;
}

export const validateCreateChallenge = (body) => parseChallenge(body, false);

export function validateUpdateChallenge(body) {
  const out = parseChallenge(body, true);
  if (Object.keys(out).length === 0) {
    fail([{ field: 'body', message: 'Campos editables: name, description, goal_type, goal_value, duration_days, reward_achievement_id' }]);
  }
  return out;
}

/** Query de GET /challenges: `goal_type` opcional; `active_only` se acepta y se ignora. */
export function validateListChallengesQuery(query) {
  if (query.goal_type === undefined) return {};
  if (!GOAL_TYPES.includes(query.goal_type)) {
    fail([{ field: 'goal_type', message: `goal_type debe ser uno de: ${GOAL_TYPES.join(', ')}` }]);
  }
  return { goal_type: query.goal_type };
}

/** Body de POST /students/:id/challenges. */
export function validateSelfAssign(body) {
  if (!isUuid(body.challenge_id)) fail([{ field: 'challenge_id', message: 'challenge_id debe ser un uuid' }]);
  return { challenge_id: body.challenge_id.toLowerCase() };
}

/** Body de POST /challenges/:id/assignments: 1 a 50 ids únicos. */
export function validateBatchAssign(body) {
  const ids = body.student_ids;
  const bad = (message) => fail([{ field: 'student_ids', message }]);
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 50) bad('student_ids debe tener entre 1 y 50 ids');
  if (!ids.every(isUuid)) bad('student_ids debe contener solo uuids');
  const lower = ids.map((id) => id.toLowerCase());
  if (new Set(lower).size !== lower.length) bad('student_ids no puede tener repetidos');
  return { student_ids: lower };
}
