const MESSAGES = {
  INVALID_CREDENTIALS: 'Email o contraseña incorrectos',
  NETWORK_ERROR: 'No hay conexión con el servidor',
};

const FIELDS = ['email', 'password'];

/**
 * Traduce el error normalizado del login a lo que muestra el formulario.
 * - `VALIDATION_ERROR` con detalles → un mensaje junto a cada campo.
 * - `ACCOUNT_DISABLED` y el resto → el mensaje del backend.
 * @returns {{ form: string|null, fields: Record<string, string> }}
 */
export function toLoginErrors(error) {
  const fields = {};
  if (error?.code === 'VALIDATION_ERROR' && Array.isArray(error.details)) {
    for (const { field, message } of error.details) {
      if (FIELDS.includes(field) && !fields[field]) fields[field] = message;
    }
    if (Object.keys(fields).length > 0) return { form: null, fields };
  }
  const form = MESSAGES[error?.code] ?? error?.message ?? 'No pudimos iniciar sesión';
  return { form, fields };
}
