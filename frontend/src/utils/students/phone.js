// Teléfono del alumno (GX2): mismo formato que valida el backend en PATCH /students/:id.
export const PHONE_ERROR = 'Usá entre 6 y 30 caracteres: números, espacios y + - ( )';

const PHONE_RE = /^[0-9 +()-]{6,30}$/;
const MIN_DIGITS = 6;

/** `null` si es válido o está vacío (es opcional); si no, `PHONE_ERROR`. */
export function validatePhone(value) {
  const phone = String(value ?? '').trim();
  if (!phone) return null;
  return PHONE_RE.test(phone) ? null : PHONE_ERROR;
}

/**
 * Link a WhatsApp con los dígitos tal cual (no agrega código de país).
 * `null` si el número no tiene al menos 6 dígitos.
 */
export function whatsappHref(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  return digits.length >= MIN_DIGITS ? `https://wa.me/${digits}` : null;
}
