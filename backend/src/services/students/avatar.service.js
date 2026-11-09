import { Errors } from '../../shared/utils/errors.js';
import { detectImageType } from '../../shared/utils/files/image-type.js';
import * as avatarsRepo from '../../repositories/students/avatars.repository.js';
import * as studentsRepo from '../../repositories/students/students.repository.js';
import { avatarPath, isStudentAvatarPath } from '../../models/students/avatar.model.js';
import { assertCanAccessStudent } from './student-access.service.js';
import { signAvatars } from './avatar-urls.service.js';

/** Solo el propio alumno cambia su foto (el PT no: decisión 4 de la GX2). */
function assertSelf(user, studentId) {
  if (user.role !== 'student' || user.id !== studentId) throw Errors.forbidden();
}

/** Best-effort: una foto que no se pudo borrar queda huérfana en el bucket, nunca rompe la respuesta. */
async function removeQuietly(path, reason) {
  try {
    await avatarsRepo.remove(path);
  } catch (err) {
    console.error(`No se pudo borrar la foto de perfil (${reason}):`, err.message);
  }
}

/**
 * PUT /students/:id/avatar — sube la foto (tipo real por firma, nunca el Content-Type del
 * cliente), guarda su ruta en avatar_url y borra la anterior si era del bucket.
 * Si guardar la ruta falla, se borra la subida y sale el error original.
 */
export async function setAvatar(user, studentId, file) {
  assertSelf(user, studentId);
  if (!file) {
    throw Errors.validation('Error de validación', [{ field: 'image', message: 'Elegí una foto' }]);
  }
  const type = detectImageType(file.buffer);
  if (!type) throw Errors.imageTypeInvalid();
  const { avatar_url: prev } = await assertCanAccessStudent(user, studentId);

  const path = avatarPath(studentId, type.ext);
  await avatarsRepo.upload(path, file.buffer, type.mime);
  try {
    await studentsRepo.updateStudent(studentId, { avatar_url: path });
  } catch (err) {
    await removeQuietly(path, 'deshacer la subida');
    throw err;
  }
  if (isStudentAvatarPath(prev, studentId)) await removeQuietly(prev, 'la anterior');

  const [signed] = await signAvatars([{ avatar_url: path }]);
  return { avatar_url: signed.avatar_url };
}

/** DELETE /students/:id/avatar — saca la foto de la ficha y la borra del bucket. Idempotente. */
export async function removeAvatar(user, studentId) {
  assertSelf(user, studentId);
  const { avatar_url: prev } = await assertCanAccessStudent(user, studentId);
  if (!prev) return;
  await studentsRepo.updateStudent(studentId, { avatar_url: null });
  if (isStudentAvatarPath(prev, studentId)) await removeQuietly(prev, 'quitar');
}
