import { fieldErrorsFrom } from '@/utils/fieldErrors';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const INVALID_LINK = 'El link de invitación no es válido';

const ASK_NEW = 'Pedile una nueva a tu profe';

/** Mensaje de pantalla completa para errores de la invitación; `null` si el error es de otra clase. */
export function invitationErrorMessage(error) {
  if (error?.code === 'INVITATION_NOT_FOUND') return error.message || 'La invitación no existe';
  if (error?.code === 'INVITATION_EXPIRED' || error?.code === 'INVITATION_ALREADY_USED') {
    const base = error.message || 'Esta invitación ya no sirve';
    return /pedile una nueva/i.test(base) ? base : `${base}. ${ASK_NEW}`;
  }
  return null;
}

/** Errores del POST /students que se muestran junto al campo o arriba del formulario. */
export function toJoinErrors(error) {
  return fieldErrorsFrom(error, { fields: ['password'], fallback: 'No pudimos crear tu cuenta' });
}

/** Validación del formulario antes de enviar. */
export function validateJoin({ password, confirm }) {
  const fields = {};
  if (password.length < 8) fields.password = 'La contraseña debe tener 8 caracteres o más';
  if (confirm !== password) fields.confirm = 'Las contraseñas no coinciden';
  return fields;
}
