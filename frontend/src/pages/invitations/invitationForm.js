import { fieldErrorsFrom } from '@/utils/fieldErrors';

const PHONE_ERROR = 'Ingresá un teléfono válido: al menos 8 dígitos, con código de país';
const MIN_PHONE_DIGITS = 8;

const FIELDS = ['student_name', 'student_email', 'student_phone', 'goal', 'level', 'template_id', 'routine_days'];

const text = (data, name) => String(data.get(name) ?? '').trim();

/**
 * Arma el body de `POST /invitations` desde el formulario.
 * Siempre va por los dos canales (hay teléfono) y los opcionales vacíos no se mandan. Con plantilla inicial
 * van `template_id` y sus días (`routine_days`, aunque queden vacíos: el backend pide al menos uno).
 */
export function buildInvitationBody(formData) {
  const goal = text(formData, 'goal');
  const level = text(formData, 'level');
  const templateId = text(formData, 'template_id');
  return {
    student_name: text(formData, 'student_name'),
    student_email: text(formData, 'student_email'),
    student_phone: text(formData, 'student_phone'),
    ...(goal && { goal }),
    ...(level && { level }),
    ...(templateId && { template_id: templateId, routine_days: formData.getAll('routine_days').map(String) }),
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
 * - `TEMPLATE_NOT_FOUND` (la plantilla se borró después de cargar el select) → en la plantilla.
 * - `VALIDATION_ERROR` → cada detalle en su campo.
 * - el resto (sin red incluido) → mensaje general.
 */
export function toInvitationErrors(error) {
  return fieldErrorsFrom(error, {
    fields: FIELDS,
    fieldCodes: {
      STUDENT_EMAIL_EXISTS: { field: 'student_email', message: 'Ya existe un alumno con ese email' },
      TEMPLATE_NOT_FOUND: { field: 'template_id', message: 'Esa plantilla ya no existe; elegí otra' },
    },
    fallback: 'No pudimos generar la invitación',
  });
}
