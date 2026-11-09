import { supabase } from '../../config/supabase.js';
import { Errors } from '../../shared/utils/errors.js';
import { AVATARS_BUCKET } from '../../models/students/avatar.model.js';
import { SIGNED_URL_SECONDS } from '../../models/messages/message.model.js';

const bucket = () => supabase.storage.from(AVATARS_BUCKET);

/** Sube la foto al bucket privado (solo el backend, con la service_role). */
export async function upload(path, buffer, contentType) {
  const { error } = await bucket().upload(path, buffer, { contentType });
  if (error) throw Errors.internal(error.message);
}

/** Borra una foto (la anterior al reemplazarla, o la subida si falla guardar la ruta). */
export async function remove(path) {
  const { error } = await bucket().remove([path]);
  if (error) throw Errors.internal(error.message);
}

/** URLs firmadas de 1 h (igual que las fotos del chat) en un solo pedido → Map<path, url>. */
export async function signPaths(paths) {
  if (paths.length === 0) return new Map();
  const { data, error } = await bucket().createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (error) throw Errors.internal(error.message);
  return new Map(data.filter((d) => !d.error && d.signedUrl).map((d) => [d.path, d.signedUrl]));
}
