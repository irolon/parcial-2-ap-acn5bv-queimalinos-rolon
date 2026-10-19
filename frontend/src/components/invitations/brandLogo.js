import { tokenColor } from '@/utils/cssTokens';

// Rayo de lucide `Zap` (viewBox 24), el mismo de `BrandMark`.
const ZAP_PATH =
  'M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z';

export const LOGO_SIZE = 44;

/** Espera a que el logo esté decodificado, para que el QR ya lo tenga dibujado al exportarlo. */
export async function whenLogoReady() {
  const image = new Image();
  image.src = brandLogoDataUrl();
  try {
    await image.decode?.();
  } catch {
    // Si no decodifica, se exporta igual con lo que haya.
  }
}

/**
 * Logo de marca como SVG en data URI, para dibujarlo en el centro del QR:
 * cuadrado accent con borde bone de 4 px y el rayo, como el prototipo.
 */
export function brandLogoDataUrl() {
  const bone = tokenColor('bone0');
  const accent = tokenColor('accent');
  const ink = tokenColor('accentInk');
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${LOGO_SIZE}" height="${LOGO_SIZE}" viewBox="0 0 44 44">`,
    `<rect width="44" height="44" rx="10" fill="${bone}"/>`,
    `<rect x="4" y="4" width="36" height="36" rx="7" fill="${accent}"/>`,
    `<g transform="translate(12 12) scale(0.8333)">`,
    `<path d="${ZAP_PATH}" fill="${ink}" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>`,
    '</g></svg>',
  ].join('');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
