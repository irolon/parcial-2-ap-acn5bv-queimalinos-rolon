import * as avatarsRepo from '../../repositories/students/avatars.repository.js';

/** Firma en best-effort: si Storage cae, la respuesta sale igual sin fotos (nunca un 500). */
async function signBestEffort(paths) {
  try {
    return await avatarsRepo.signPaths(paths);
  } catch (err) {
    console.error('No se pudieron firmar las fotos de perfil:', err.message);
    return new Map();
  }
}

/**
 * Reemplaza la ruta de `row[key]` por su URL firmada en todas las filas, con UNA llamada a
 * Storage (rutas repetidas se piden una vez). Sin ruta o sin firma → null. Devuelve filas
 * nuevas (no muta la entrada); las filas null pasan tal cual.
 */
export async function signAvatars(rows, key = 'avatar_url') {
  const paths = [...new Set(rows.filter((r) => r && r[key]).map((r) => r[key]))];
  const urls = await signBestEffort(paths);
  return rows.map((r) => (r ? { ...r, [key]: urls.get(r[key]) ?? null } : r));
}
