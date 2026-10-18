// Design tokens — performance / athletic, datos al frente
// Paleta: ink (casi-negro tono frío), bone (off-white), acento neón lima
// Alumno = fondo oscuro. PT = SaaS oscuro con acento.

const FT = {
  // Inks (alumno dark mode)
  ink0: '#0B0D0C',      // base oscuro
  ink1: '#111413',      // surface
  ink2: '#181C1B',      // card
  ink3: '#232927',      // raised
  ink4: '#2F3634',      // border
  ink5: '#485150',      // subdued text on dark
  ink6: '#8C9593',      // secondary text on dark

  // Bone (PT light accents / alumno contrast text)
  bone0: '#F5F2EC',     // bg claro
  bone1: '#ECE7DE',
  bone2: '#D9D3C6',
  bone3: '#B5AE9D',

  // Accents (variables vía Tweaks — defaults)
  accent: '#2952D9',    // azul de marca
  accentDim: '#1B3AA8',
  accentInk: '#0B0D0C', // text sobre acento

  // Semánticos
  hot: '#FF5C3A',       // PR / alertas
  cool: '#36C6FF',      // info / info secundario
  good: '#4AE290',      // logros
  warn: '#FFB020',

  // Tipografías
  ff: {
    display: "'Space Grotesk', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
};

// Tweakable defaults — editables vía Tweaks panel
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#2952D9",
  "fontFamily": "grotesk"
}/*EDITMODE-END*/;

// Migración puntual: el acento pasó de lima a azul de marca.
try {
  if (localStorage.getItem('ft-accent-rev') !== '2') {
    const s = JSON.parse(localStorage.getItem('ft-tweaks') || '{}');
    s.accent = '#2952D9';
    localStorage.setItem('ft-tweaks', JSON.stringify(s));
    localStorage.setItem('ft-accent-rev', '2');
  }
} catch (e) {}

function getAccent() {
  try {
    const stored = localStorage.getItem('ft-tweaks');
    if (stored) return JSON.parse(stored).accent || TWEAK_DEFAULTS.accent;
  } catch (e) {}
  return TWEAK_DEFAULTS.accent;
}

// Luminancia relativa (WCAG) para decidir el color del texto sobre el acento
function _lum(hex) {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const c = [0, 2, 4].map(i => {
    const v = parseInt(n.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

// Texto/íconos SOBRE un fondo de acento
function getAccentInk() {
  return _lum(getAccent()) > 0.35 ? FT.ink0 : '#FFFFFF';
}

// Acento usado COMO texto/ícono sobre el fondo oscuro: si el contraste
// es bajo, se aclara hasta que sea legible.
function getAccentText(bg) {
  const a = getAccent();
  const base = bg || FT.ink0;
  const ratio = (x, y) => {
    const l1 = Math.max(_lum(x), _lum(y)), l2 = Math.min(_lum(x), _lum(y));
    return (l1 + 0.05) / (l2 + 0.05);
  };
  if (ratio(a, base) >= 4.5) return a;
  const h = a.replace('#', '');
  const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  let rgb = [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16));
  for (let k = 0; k < 24; k++) {
    rgb = rgb.map(v => Math.min(255, Math.round(v + (255 - v) * 0.09)));
    const hex = '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
    if (ratio(hex, base) >= 4.5) return hex;
  }
  return '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
}

// Lavado translúcido del acento, para fondos y bordes suaves
function accentWash(alpha) {
  const h = getAccent().replace('#', '');
  const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getFontFamily() {
  try {
    const stored = localStorage.getItem('ft-tweaks');
    if (stored) return JSON.parse(stored).fontFamily || TWEAK_DEFAULTS.fontFamily;
  } catch (e) {}
  return TWEAK_DEFAULTS.fontFamily;
}

const FONT_MAP = {
  grotesk: { display: "'Space Grotesk', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif" },
  serif:   { display: "'Instrument Serif', Georgia, serif", body: "'Inter', system-ui, sans-serif" },
  mono:    { display: "'JetBrains Mono', monospace", body: "'JetBrains Mono', monospace" },
};

// React hook to re-render on tweak change
function useTweaks() {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const h = () => setTick(t => t + 1);
    window.addEventListener('ft-tweaks-changed', h);
    return () => window.removeEventListener('ft-tweaks-changed', h);
  }, []);
  const accent = getAccent();
  const ff = FONT_MAP[getFontFamily()] || FONT_MAP.grotesk;
  return { accent, accentInk: getAccentInk(), accentText: getAccentText(), ff, tick };
}

Object.assign(window, { FT, TWEAK_DEFAULTS, getAccent, getAccentInk, getAccentText, accentWash, getFontFamily, FONT_MAP, useTweaks });
