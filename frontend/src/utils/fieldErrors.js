/** Estado inicial de los errores de un formulario. */
export const NO_FIELD_ERRORS = Object.freeze({ form: null, fields: Object.freeze({}) });

const DEFAULT_MESSAGES = {
  NETWORK_ERROR: 'No hay conexión con el servidor',
};

/**
 * Traduce un `ApiError` a lo que muestra un formulario.
 * - un código de `fieldCodes` → su mensaje en ese campo (`{ CODE: { field, message } }`);
 * - `VALIDATION_ERROR` con detalles de campos conocidos → un mensaje junto a cada campo;
 * - el resto → mensaje general: el de `messages`, el del backend o `fallback`.
 * @param {unknown} error
 * @param {{ fields: string[], fieldCodes?: Record<string, { field: string, message: string }>,
 *   messages?: Record<string, string>, fallback: string }} options
 * @returns {{ form: string|null, fields: Record<string, string> }}
 */
export function fieldErrorsFrom(error, { fields: known, fieldCodes = {}, messages = {}, fallback }) {
  const code = error?.code;
  const byCode = fieldCodes[code];
  if (byCode) return { form: null, fields: { [byCode.field]: byCode.message } };

  const fields = {};
  if (code === 'VALIDATION_ERROR' && Array.isArray(error.details)) {
    for (const { field, message } of error.details) {
      if (known.includes(field) && !fields[field]) fields[field] = message;
    }
    if (Object.keys(fields).length > 0) return { form: null, fields };
  }
  const form = messages[code] ?? DEFAULT_MESSAGES[code] ?? error?.message ?? fallback;
  return { form, fields };
}
