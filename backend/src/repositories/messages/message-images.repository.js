import { supabase } from '../../config/supabase.js';
import { Errors } from '../../shared/utils/errors.js';
import { MESSAGE_IMAGES_BUCKET, SIGNED_URL_SECONDS } from '../../models/messages/message.model.js';

const bucket = () => supabase.storage.from(MESSAGE_IMAGES_BUCKET);

/** Sube la foto al bucket privado (solo el backend, con la service_role). */
export async function uploadImage(path, buffer, contentType) {
  const { error } = await bucket().upload(path, buffer, { contentType });
  if (error) throw Errors.internal(error.message);
}

/** Borra una foto (para deshacer una subida si falla la inserción del mensaje). */
export async function removeImage(path) {
  const { error } = await bucket().remove([path]);
  if (error) throw Errors.internal(error.message);
}

/** URLs firmadas de 1 h en un solo pedido → Map<path, url>. Los paths que fallan no entran. */
export async function signUrls(paths) {
  if (paths.length === 0) return new Map();
  const { data, error } = await bucket().createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (error) throw Errors.internal(error.message);
  return new Map(data.filter((d) => !d.error && d.signedUrl).map((d) => [d.path, d.signedUrl]));
}
