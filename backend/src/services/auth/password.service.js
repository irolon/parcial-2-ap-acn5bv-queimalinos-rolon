import { hashPassword, verifyPassword } from '../../shared/utils/password.js';
import { signAccessToken, hashToken } from '../../shared/utils/jwt.js';
import { env } from '../../config/env.js';
import { Errors } from '../../shared/utils/errors.js';
import { isActive } from '../../models/auth/refresh-token.model.js';
import * as credentialsRepo from '../../repositories/auth/credentials.repository.js';
import * as authRepo from '../../repositories/auth/auth.repository.js';
import * as pushTokensRepo from '../../repositories/notifications/push-tokens.repository.js';

/** VALIDATION_ERROR con un solo detalle, como los de las validations. */
const fieldError = (field, message) =>
  Errors.validation('Error de validación', [{ field, message }]);

/**
 * PUT /auth/password (GX1): alumno o PT cambian su clave con la actual.
 * Orden: el refresh_token tiene que ser de este usuario (es la sesión que se
 * conserva) → la actual tiene que coincidir → la nueva no puede ser la misma
 * → se guarda → se revocan las OTRAS sesiones y sus push tokens.
 * La actual incorrecta es 400 y no 401: el cliente web renovaría la sesión
 * ante un 401. Devuelve un access nuevo sin el claim must_change_password
 * (el refresh actual sigue valiendo).
 */
export async function changePassword(
  user,
  { current_password, new_password, refresh_token, push_token }
) {
  const keepTokenHash = hashToken(refresh_token);
  const stored = await authRepo.findRefreshToken(keepTokenHash);
  if (!isActive(stored) || stored.user_id !== user.id || stored.role !== user.role) {
    throw fieldError('refresh_token', 'La sesión de este dispositivo no es válida');
  }

  const currentHash = await credentialsRepo.findPasswordHash(user.id, user.role);
  if (!currentHash || !(await verifyPassword(current_password, currentHash))) {
    throw fieldError('current_password', 'La contraseña actual es incorrecta');
  }
  if (await verifyPassword(new_password, currentHash)) {
    throw fieldError('new_password', 'La nueva contraseña tiene que ser distinta de la actual');
  }

  const hash = await hashPassword(new_password);
  const { password_changed_at } = await credentialsRepo.setPassword(user.id, user.role, {
    hash,
    mustChange: false,
  });
  await authRepo.revokeAllForUserExcept(user.id, user.role, keepTokenHash);
  await pushTokensRepo.deleteAllForUserExcept({ id: user.id, role: user.role }, push_token);

  const token = signAccessToken({ sub: user.id, role: user.role, email: user.email });
  return { token, expires_in: env.JWT_EXPIRES_IN, password_changed_at };
}
