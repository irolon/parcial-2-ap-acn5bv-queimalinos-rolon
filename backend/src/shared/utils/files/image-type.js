/**
 * Detecta el tipo real de una imagen por sus primeros bytes (el Content-Type del
 * cliente no es de fiar). Devuelve null si no es JPEG, PNG ni WebP.
 */
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const startsWith = (buf, bytes, offset = 0) =>
  buf.length >= offset + bytes.length && bytes.every((b, i) => buf[offset + i] === b);

export function detectImageType(buffer) {
  if (!buffer || typeof buffer.length !== 'number') return null;
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return { mime: 'image/jpeg', ext: 'jpg' };
  if (startsWith(buffer, PNG_SIGNATURE)) return { mime: 'image/png', ext: 'png' };
  // WebP: "RIFF" + tamaño (4 bytes) + "WEBP".
  if (startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) && startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { mime: 'image/webp', ext: 'webp' };
  }
  return null;
}
