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
 * Pasa el teléfono a formato internacional argentino para wa.me (los alumnos son de AR).
 * Regla, sobre los dígitos solos:
 * - Empieza con 54 y tiene más de 10 dígitos: queda; si le falta el 9 de celular y lo que
 *   sigue al 54 son 10 dígitos, se agrega ("5411 2345 6789" → 5491123456789).
 * - Empieza con 0 (prefijo de larga distancia): se saca ("011 2345 6789" → 1123456789).
 * - Con 10 dígitos (área + número) se antepone 549 ("11 2345-6789" → 5491123456789).
 * - Cualquier otro caso queda como está ("2345678" → 2345678). No se quita el "15".
 */
function toWhatsappDigits(digits) {
  if (digits.startsWith('54') && digits.length > 10) {
    const rest = digits.slice(2);
    return !rest.startsWith('9') && rest.length === 10 ? `549${rest}` : digits;
  }
  const local = digits.startsWith('0') ? digits.slice(1) : digits;
  return local.length === 10 ? `549${local}` : digits;
}

/** Link a WhatsApp en formato internacional; `null` si el número no tiene al menos 6 dígitos. */
export function whatsappHref(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  return digits.length >= MIN_DIGITS ? `https://wa.me/${toWhatsappDigits(digits)}` : null;
}
