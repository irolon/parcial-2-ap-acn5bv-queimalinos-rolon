import { Errors } from '../../shared/utils/errors.js';
import { checkPassword, checkPushToken } from './auth.validation.js';

const isFilled = (v) => typeof v === 'string' && v.trim() !== '';

/**
 * Valida el body de PUT /auth/password (GX1). La nueva cumple las reglas del
 * registro; que sea distinta de la actual lo decide el service (necesita el
 * hash). refresh_token identifica la sesión de este dispositivo, la única que
 * sobrevive al cambio; push_token (opcional) es el push que se conserva.
 */
export function validateChangePassword(body) {
  const details = [];
  const { current_password, new_password, refresh_token, push_token } = body;

  if (!isFilled(current_password)) {
    details.push({ field: 'current_password', message: 'La contraseña actual es requerida' });
  }
  checkPassword(new_password, details, { field: 'new_password' });
  if (!isFilled(refresh_token)) {
    details.push({ field: 'refresh_token', message: 'refresh_token es requerido' });
  }
  checkPushToken(push_token, details);
  if (details.length > 0) throw Errors.validation('Error de validación', details);

  const result = { current_password, new_password, refresh_token: refresh_token.trim() };
  if (push_token !== undefined) result.push_token = push_token;
  return result;
}
