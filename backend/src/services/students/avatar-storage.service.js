import { Errors } from '../../shared/utils/errors.js';
import { detectImageType } from '../../shared/utils/files/image-type.js';
import * as avatarsRepo from '../../repositories/students/avatars.repository.js';

/**
 * Pasos de Storage comunes a la foto del alumno (GX2) y a la del PT: validar el archivo,
 * subirlo y guardar su ruta (deshaciendo la subida si falla), y borrar sin romper.
 */

/** Tipo real por firma (nunca el Content-Type del cliente). Sin archivo → 400; otra cosa → 415. */
export function imageTypeOf(file) {
  if (!file) {
    throw Errors.validation('Error de validación', [{ field: 'image', message: 'Elegí una foto' }]);
  }
  const type = detectImageType(file.buffer);
  if (!type) throw Errors.imageTypeInvalid();
  return type;
}

/** Best-effort: una foto que no se pudo borrar queda huérfana en el bucket, nunca rompe la respuesta. */
export async function removeQuietly(path, reason) {
  try {
    await avatarsRepo.remove(path);
  } catch (err) {
    console.error(`No se pudo borrar la foto de perfil (${reason}):`, err.message);
  }
}

/** Sube la foto y llama a `save(path)`; si guardar falla, borra la subida y sale el error original. */
export async function uploadAndSave(path, file, mime, save) {
  await avatarsRepo.upload(path, file.buffer, mime);
  try {
    await save(path);
  } catch (err) {
    await removeQuietly(path, 'deshacer la subida');
    throw err;
  }
}
