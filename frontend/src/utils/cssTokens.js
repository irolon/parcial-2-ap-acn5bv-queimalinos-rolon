// Valores de `styles/tokens.css`, para lo que no se pinta con clases (canvas, SVG en data URI).
// En el navegador se leen de las variables CSS; en tests (sin la hoja) quedan estos.
const FALLBACKS = {
  ink0: '#0b0d0c',
  bone0: '#f5f2ec',
  accent: '#2952d9',
  accentInk: '#ffffff',
};

/** Color de un token del tema (`ink0`, `bone0`, `accent`, `accentInk`). */
export function tokenColor(name) {
  const value =
    typeof window === 'undefined'
      ? ''
      : getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim();
  return value || FALLBACKS[name];
}
