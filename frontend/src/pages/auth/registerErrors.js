const MESSAGES = {
  NETWORK_ERROR: 'No hay conexión con el servidor',
};

const FIELDS = ['name', 'email', 'password', 'specialty'];

/**
 * Traduce el error normalizado del registro a lo que muestra el formulario.
 * - `EMAIL_ALREADY_EXISTS` → mensaje en el campo email.
 * - `VALIDATION_ERROR` con detalles → un mensaje junto a cada campo.
 * - el resto → mensaje general.
 * @returns {{ form: string|null, fields: Record<string, string> }}
 */
export function toRegisterErrors(error) {
  const fields = {};
  if (error?.code === 'EMAIL_ALREADY_EXISTS') {
    return { form: null, fields: { email: 'Ya existe una cuenta con ese email' } };
  }
  if (error?.code === 'VALIDATION_ERROR' && Array.isArray(error.details)) {
    for (const { field, message } of error.details) {
      if (FIELDS.includes(field) && !fields[field]) fields[field] = message;
    }
    if (Object.keys(fields).length > 0) return { form: null, fields };
  }
  const form = MESSAGES[error?.code] ?? error?.message ?? 'No pudimos crear tu cuenta';
  return { form, fields };
}
