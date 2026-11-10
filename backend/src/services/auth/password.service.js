import {
  hashPassword,
  verifyPassword,
  generateTemporaryPassword,
} from '../../shared/utils/password.js';
import { signAccessToken, hashToken } from '../../shared/utils/jwt.js';
import { env } from '../../config/env.js';
import { Errors } from '../../shared/utils/errors.js';
import { isActive } from '../../models/auth/refresh-token.model.js';
import * as credentialsRepo from '../../repositories/auth/credentials.repository.js';
import * as authRepo from '../../repositories/auth/auth.repository.js';
import * as pushTokensRepo from '../../repositories/notifications/push-tokens.repository.js';
import { assertCanAccessStudent } from '../students/student-access.service.js';

/** VALIDATION_ERROR con un solo detalle, como los de las validations. */
const fieldError = (field, message) =>
  Errors.validation('Error de validación', [{ field, message }]);

/**
 * PUT /auth/password (GX1): alumno o PT cambian su clave con la actual.
 * Orden: el refresh_token tiene que ser de este usuario (es la sesión que se
 * conserva) → la actual tiene que coincidir → la nueva no puede ser la misma
 * → se revocan las OTRAS sesiones y sus push tokens → recién ahí se guarda.
 * Lo repetible va primero: si algo falla antes de guardar, la clave no
 * cambió y el reintento sigue aceptando la actual.
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
  await authRepo.revokeAllForUserExcept(user.id, user.role, keepTokenHash);
  await pushTokensRepo.deleteAllForUserExcept({ id: user.id, role: user.role }, push_token);
  const { password_changed_at } = await credentialsRepo.setPassword(user.id, user.role, {
    hash,
    mustChange: false,
  });

  const token = signAccessToken({ sub: user.id, role: user.role, email: user.email });
  return { token, expires_in: env.JWT_EXPIRES_IN, password_changed_at };
}

/**
 * POST /students/:id/password-reset (GX1): blanqueo sin mail. El PT dueño
 * genera una clave temporal que ve una sola vez; solo se guarda el hash.
 * Revoca las sesiones y borra los push tokens ANTES de guardar la clave
 * (mismo criterio que la baja, que revoca antes de marcarlo inactivo): si algo
 * falla, la temporal no quedó guardada sin que el PT la viera y el reintento
 * genera otra. Prende must_change_password, que obliga a elegir una nueva.
 * Ajeno o inexistente → 403 de assertCanAccessStudent (no revela qué ids existen).
 */
export async function resetStudentPassword(trainer, studentId) {
  if (trainer.role !== 'trainer') throw Errors.forbidden();
  const student = await assertCanAccessStudent(trainer, studentId);
  if (!student.active) throw Errors.studentInactive();

  const temporary = generateTemporaryPassword();
  const hash = await hashPassword(temporary);
  await authRepo.revokeAllForUser(studentId, 'student');
  await pushTokensRepo.deleteAllForUserExcept({ id: studentId, role: 'student' });
  await credentialsRepo.setPassword(studentId, 'student', { hash, mustChange: true });
  return { temporary_password: temporary };
}
