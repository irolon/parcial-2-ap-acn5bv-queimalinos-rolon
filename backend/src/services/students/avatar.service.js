import { Errors } from '../../shared/utils/errors.js';
import * as studentsRepo from '../../repositories/students/students.repository/students.repository.js';
import { avatarPath, isStudentAvatarPath } from '../../models/students/avatar.model.js';
import { assertCanAccessStudent } from './student-access.service.js';
import { signAvatars } from './avatar-urls.service.js';
import { imageTypeOf, removeQuietly, uploadAndSave } from './avatar-storage.service.js';

/** Solo el propio alumno cambia su foto (el PT no: decisión 4 de la GX2). */
function assertSelf(user, studentId) {
  if (user.role !== 'student' || user.id !== studentId) throw Errors.forbidden();
}

/**
 * PUT /students/:id/avatar — sube la foto (tipo real por firma, nunca el Content-Type del
 * cliente), guarda su ruta en avatar_url y borra la anterior si era del bucket.
 * Si guardar la ruta falla, se borra la subida y sale el error original.
 */
export async function setAvatar(user, studentId, file) {
  assertSelf(user, studentId);
  const type = imageTypeOf(file);
  const { avatar_url: prev } = await assertCanAccessStudent(user, studentId);

  const path = avatarPath(studentId, type.ext);
  await uploadAndSave(path, file, type.mime, (p) => studentsRepo.updateStudent(studentId, { avatar_url: p }));
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
