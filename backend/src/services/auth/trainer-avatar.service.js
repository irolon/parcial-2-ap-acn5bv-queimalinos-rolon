import { Errors } from '../../shared/utils/errors.js';
import * as authRepo from '../../repositories/auth/auth.repository.js';
import { trainerAvatarPath, isTrainerAvatarPath } from '../../models/auth/trainer-avatar.model.js';
import { signAvatars } from '../students/avatar-urls.service.js';
import { imageTypeOf, removeQuietly, uploadAndSave } from '../students/avatar-storage.service.js';

/** Solo el propio PT (la ruta ya pide trainer; esto es la segunda barrera). */
function assertTrainer(user) {
  if (user?.role !== 'trainer') throw Errors.forbidden();
}

/** La foto guardada del PT logueado (ruta del bucket o null). 404 si la cuenta no existe. */
async function currentPath(trainerId) {
  const row = await authRepo.findTrainerById(trainerId);
  if (!row) throw Errors.notFound('Cuenta no encontrada');
  return row.avatar_url ?? null;
}

/**
 * PUT /auth/me/avatar — mismo flujo que la foto del alumno (GX2): tipo por firma, sube a
 * trainers/<id>/<uuid>.<ext>, guarda la ruta y borra la anterior si era suya. Devuelve la URL firmada.
 */
export async function setAvatar(user, file) {
  assertTrainer(user);
  const type = imageTypeOf(file);
  const prev = await currentPath(user.id);

  const path = trainerAvatarPath(user.id, type.ext);
  await uploadAndSave(path, file, type.mime, (p) => authRepo.updateTrainer(user.id, { avatar_url: p }));
  if (isTrainerAvatarPath(prev, user.id)) await removeQuietly(prev, 'la anterior');

  const [signed] = await signAvatars([{ avatar_url: path }]);
  return { avatar_url: signed.avatar_url };
}

/** DELETE /auth/me/avatar — saca la foto de la cuenta y la borra del bucket. Idempotente. */
export async function removeAvatar(user) {
  assertTrainer(user);
  const prev = await currentPath(user.id);
  if (!prev) return;
  await authRepo.updateTrainer(user.id, { avatar_url: null });
  if (isTrainerAvatarPath(prev, user.id)) await removeQuietly(prev, 'quitar');
}
