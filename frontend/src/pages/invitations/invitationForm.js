import { fieldErrorsFrom } from '@/utils/fieldErrors';

const PHONE_ERROR = 'Ingresá un teléfono válido: al menos 8 dígitos, con código de país';
const MIN_PHONE_DIGITS = 8;

const FIELDS = ['student_name', 'student_email', 'student_phone', 'goal', 'level'];

const text = (data, name) => String(data.get(name) ?? '').trim();

/**
 * Arma el body de `POST /invitations` desde el formulario.
 * Siempre va por los dos canales (hay teléfono) y los opcionales vacíos no se mandan.
 */
export function buildInvitationBody(formData) {
  const goal = text(formData, 'goal');
  const level = text(formData, 'level');
  return {
    student_name: text(formData, 'student_name'),
    student_email: text(formData, 'student_email'),
    student_phone: text(formData, 'student_phone'),
    ...(goal && { goal }),
    ...(level && { level }),
    delivery_channel: 'both',
  };
}

/** Chequeos que no necesitan al backend. Devuelve `{ campo: mensaje }` (vacío si está todo bien). */
export function validateInvitationBody(body) {
  const digits = body.student_phone.replace(/\D/g, '');
  return digits.length < MIN_PHONE_DIGITS ? { student_phone: PHONE_ERROR } : {};
}

/**
 * Traduce el error de `POST /invitations` a lo que muestra el formulario.
 * - `STUDENT_EMAIL_EXISTS` → en el campo email.
 * - `VALIDATION_ERROR` → cada detalle en su campo.
 * - el resto (sin red incluido) → mensaje general.
 */
export function toInvitationErrors(error) {
  return fieldErrorsFrom(error, {
    fields: FIELDS,
    fieldCodes: {
      STUDENT_EMAIL_EXISTS: { field: 'student_email', message: 'Ya existe un alumno con ese email' },
    },
    fallback: 'No pudimos generar la invitación',
  });
}
