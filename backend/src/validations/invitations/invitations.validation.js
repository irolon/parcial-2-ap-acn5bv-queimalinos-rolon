import { Errors } from '../../shared/utils/errors.js';
import { GOALS, DELIVERY_CHANNELS, includesWhatsapp } from '../../models/invitations/invitation.model.js';
import { parseStudentContext } from '../students/student-context.validation.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isString = (v) => typeof v === 'string';
const trimmed = (v) => (isString(v) ? v.trim() : v);

/** Valida el body de POST /invitations. */
export function validateCreateInvitation(body) {
  const details = [];
  const name = trimmed(body.student_name);
  const email = trimmed(body.student_email);
  const { goal, delivery_channel: channel } = body;
  const phone = trimmed(body.student_phone);

  if (!isString(name) || name.length < 2 || name.length > 100) {
    details.push({ field: 'student_name', message: 'El nombre debe tener entre 2 y 100 caracteres' });
  }
  if (!isString(email) || !EMAIL_RE.test((email || '').trim())) {
    details.push({ field: 'student_email', message: 'Email con formato inválido' });
  }
  if (!GOALS.includes(goal)) {
    details.push({ field: 'goal', message: `goal debe ser uno de: ${GOALS.join(', ')}` });
  }
  if (!DELIVERY_CHANNELS.includes(channel)) {
    details.push({
      field: 'delivery_channel',
      message: `delivery_channel debe ser uno de: ${DELIVERY_CHANNELS.join(', ')}`,
    });
  }

  // El teléfono es obligatorio (y debe tener dígitos) si se envía por WhatsApp.
  let normalizedPhone = null;
  if (includesWhatsapp(channel)) {
    const digits = isString(phone) ? phone.replace(/\D/g, '') : '';
    if (digits.length < 8) {
      details.push({
        field: 'student_phone',
        message: 'student_phone es requerido y válido cuando el canal incluye WhatsApp',
      });
    } else {
      normalizedPhone = digits;
    }
  } else if (isString(phone) && phone !== '') {
    normalizedPhone = phone.replace(/\D/g, '') || null;
  }

  // Contexto para los asistentes IA (opcional): el trainer lo carga en el alta
  // y pasa al alumno al aceptar la invitación. null cuenta como ausente.
  const context = parseStudentContext(
    {
      gym_equipment: body.gym_equipment ?? undefined,
      injuries: body.injuries ?? undefined,
      level: body.level ?? undefined,
    },
    details
  );

  if (details.length > 0) throw Errors.validation('Error de validación', details);

  return {
    student_name: name,
    student_email: email.toLowerCase(),
    student_phone: normalizedPhone,
    goal,
    delivery_channel: channel,
    gym_equipment: context.gym_equipment ?? null,
    injuries: context.injuries ?? null,
    level: context.level ?? null,
  };
}

/** Valida el :token de GET /invitations/:token. */
export function validateTokenParam(params) {
  if (!isString(params.token) || params.token.trim() === '') {
    throw Errors.validation('Error de validación', [
      { field: 'token', message: 'token es requerido' },
    ]);
  }
  return { token: params.token.trim() };
}
