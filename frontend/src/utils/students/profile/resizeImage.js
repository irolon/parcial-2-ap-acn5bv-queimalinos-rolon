// Foto de perfil del alumno (GX2): se achica en el navegador antes de subirla a /students/:id/avatar.
export const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp';
export const AVATAR_MAX_SIDE = 512;
export const AVATAR_QUALITY = 0.85;

const ACCEPTED = AVATAR_ACCEPT.split(',');
const invalidType = () => new Error('IMAGE_TYPE_INVALID');

/** Escala el lado mayor a `max` conservando la proporción; nunca agranda. */
export function fitWithin(width, height, max = AVATAR_MAX_SIDE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

async function decode(file) {
  try {
    return await createImageBitmap(file);
  } catch {
    throw invalidType();
  }
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(invalidType())), 'image/jpeg', AVATAR_QUALITY);
  });
}

/**
 * Achica la foto a 512 px de lado mayor y la pasa a JPEG 0,85.
 * Tipo no admitido o imagen que el navegador no decodifica (HEIC renombrado, archivo roto)
 * → rechaza con `Error('IMAGE_TYPE_INVALID')`.
 */
export async function resizeToJpeg(file) {
  if (!ACCEPTED.includes(file?.type)) throw invalidType();
  const bitmap = await decode(file);
  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw invalidType();
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  const blob = await canvasToBlob(canvas);
  return new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
}
