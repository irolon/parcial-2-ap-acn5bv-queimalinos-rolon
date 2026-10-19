/** Descarga un `data:` URL (o cualquier URL del mismo origen) con el nombre de archivo dado. */
export function downloadUrl(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
}

/** Baja el contenido de un `<canvas>` como PNG. */
export function downloadCanvasPng(canvas, filename) {
  if (!canvas) return;
  downloadUrl(canvas.toDataURL('image/png'), filename);
}
