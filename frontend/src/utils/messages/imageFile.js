export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';

/** `null` si la foto sirve; si no, el aviso para mostrar antes de enviar (el servidor igual valida). */
export function checkImageFile(file) {
  if (!IMAGE_ACCEPT.split(',').includes(file.type)) return 'La foto tiene que ser JPG, PNG o WebP';
  if (file.size > MAX_IMAGE_BYTES) return 'La foto supera 5 MB';
  return null;
}
