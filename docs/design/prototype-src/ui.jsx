// Shared UI primitives — chips, pills, buttons, charts, icons

// ─── Icons (inline SVG, 1.75 stroke) ─────────────────────────
const Icon = ({ d, size = 20, stroke = 'currentColor', fill = 'none', sw = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
);

const I = {
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12l5 5L20 7',
  arrow: 'M5 12h14M13 5l7 7-7 7',
  back: 'M19 12H5M12 19l-7-7 7-7',
  chev_r: 'M9 6l6 6-6 6',
  chev_d: 'M6 9l6 6 6-6',
  close: 'M6 6l12 12M18 6L6 18',
  play: 'M8 5v14l11-7z',
  pause: 'M6 4h4v16H6zM14 4h4v16h-4z',
  timer: <g><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6M12 2v3"/></g>,
  flame: 'M12 3s4 4 4 8a4 4 0 01-8 0c0-2 1-3 1-3s0 2 2 2c0-3 1-7 1-7z',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7l1-8z',
  dumbbell: <g><path d="M6 6v12M18 6v12M3 9v6M21 9v6M6 12h12"/></g>,
  chart: <g><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></g>,
  chat: 'M4 4h16v12H8l-4 4V4z',
  qr: <g><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3M20 14v3M14 20h7"/></g>,
  user: <g><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></g>,
  search: <g><circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/></g>,
  bell: <g><path d="M6 8a6 6 0 0112 0v5l2 3H4l2-3z"/><path d="M10 19a2 2 0 004 0"/></g>,
  more: <g><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></g>,
  mic: <g><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></g>,
  send: 'M4 12l16-8-6 16-3-7z',
  filter: 'M4 5h16l-6 8v6l-4 2v-8z',
  sparkle: <g><path d="M12 3v6M12 15v6M3 12h6M15 12h6M6 6l3 3M15 15l3 3M6 18l3-3M15 9l3-3"/></g>,
  swap: 'M7 7h11l-3-3M17 17H6l3 3',
  trophy: <g><path d="M7 4h10v5a5 5 0 01-10 0V4zM4 4h3v4a3 3 0 01-3-3zM17 4h3v1a3 3 0 01-3 3zM9 14v3h6v-3M7 21h10"/></g>,
  target: <g><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></g>,
  calendar: <g><rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 9h18M8 3v4M16 3v4"/></g>,
  home: 'M3 11l9-8 9 8v10h-6v-6h-6v6H3z',
  list: <g><path d="M3 6h18M3 12h18M3 18h18"/><circle cx="3" cy="6" r="1" fill="currentColor"/><circle cx="3" cy="12" r="1" fill="currentColor"/><circle cx="3" cy="18" r="1" fill="currentColor"/></g>,
  video: <g><rect x="3" y="6" width="13" height="12" rx="1"/><path d="M16 10l5-3v10l-5-3z"/></g>,
  weight: <g><path d="M5 8h14l-1 11H6z"/><path d="M9 8V6a3 3 0 016 0v2"/></g>,
  trend_up: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  broadcast: <g><circle cx="12" cy="12" r="2"/><path d="M16 8a5 5 0 010 8M8 8a5 5 0 000 8M19 5a9 9 0 010 14M5 5a9 9 0 000 14"/></g>,
};

// ─── Pill / Chip ─────────────────────────────────────────────
function Pill({ children, tone = 'neutral', size = 'sm', style, ...rest }) {
  const tones = {
    neutral: { bg: 'rgba(255,255,255,0.06)', color: FT.bone0, border: 'rgba(255,255,255,0.08)' },
    accent:  { bg: getAccent(), color: getAccentInk(), border: 'transparent' },
    hot:     { bg: 'rgba(255,92,58,0.14)', color: FT.hot, border: 'rgba(255,92,58,0.25)' },
    good:    { bg: 'rgba(74,226,144,0.14)', color: FT.good, border: 'rgba(74,226,144,0.25)' },
    cool:    { bg: 'rgba(54,198,255,0.14)', color: FT.cool, border: 'rgba(54,198,255,0.28)' },
    ghost:   { bg: 'transparent', color: FT.ink6, border: 'rgba(255,255,255,0.12)' },
    lightNeutral: { bg: '#F0EDE6', color: '#353331', border: 'transparent' },
    lightAccent:  { bg: '#141615', color: '#F5F2EC', border: 'transparent' },
    lightHot: { bg: 'rgba(255,92,58,0.12)', color: '#C53D1E', border: 'transparent' },
    lightGood: { bg: 'rgba(74,226,144,0.16)', color: '#1F7A42', border: 'transparent' },
  };
  const t = tones[tone] || tones.neutral;
  const sizes = { sm: { fs: 11, pad: '4px 8px', h: 22 }, md: { fs: 12, pad: '6px 10px', h: 26 } };
  const s = sizes[size];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      height: s.h, padding: s.pad, borderRadius: 99,
      fontFamily: FT.ff.mono, fontSize: s.fs, fontWeight: 500,
      letterSpacing: 0.3, textTransform: 'uppercase',
      background: t.bg, color: t.color,
      border: `1px solid ${t.border}`,
      ...style,
    }} {...rest}>{children}</span>
  );
}

// ─── Button ──────────────────────────────────────────────────
function Btn({ children, variant = 'primary', size = 'md', full, icon, style, ...rest }) {
  const accent = getAccent();
  const variants = {
    primary: { bg: accent, color: getAccentInk(), border: 'transparent' },
    ghost:   { bg: 'transparent', color: FT.bone0, border: 'rgba(255,255,255,0.14)' },
    dark:    { bg: FT.ink3, color: FT.bone0, border: 'transparent' },
    danger:  { bg: FT.hot, color: '#fff', border: 'transparent' },
    lightPrimary: { bg: FT.ink0, color: '#F5F2EC', border: 'transparent' },
    lightGhost:   { bg: 'transparent', color: FT.ink0, border: 'rgba(0,0,0,0.12)' },
  };
  const v = variants[variant] || variants.primary;
  const sizes = {
    sm: { h: 32, fs: 13, pad: '0 12px' },
    md: { h: 44, fs: 14, pad: '0 18px' },
    lg: { h: 56, fs: 16, pad: '0 24px' },
  };
  const s = sizes[size];
  return (
    <button style={{
      height: s.h, padding: s.pad, fontSize: s.fs,
      width: full ? '100%' : 'auto',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      background: v.bg, color: v.color, border: `1px solid ${v.border}`,
      borderRadius: 12, fontFamily: FT.ff.display, fontWeight: 600,
      letterSpacing: -0.1, cursor: 'pointer', ...style,
    }} {...rest}>
      {icon && <Icon d={icon} size={16} sw={2} />}
      {children}
    </button>
  );
}

// ─── Sparkline / Line chart ──────────────────────────────────
function Sparkline({ data, width = 200, height = 40, color, fill = true, dots = false }) {
  const c = color || getAccent();
  if (!data || !data.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => [i * step, height - ((v - min) / span) * (height - 6) - 3]);
  const line = pts.map((p, i) => (i ? `L${p[0]},${p[1]}` : `M${p[0]},${p[1]}`)).join(' ');
  const area = line + ` L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {fill && <path d={area} fill={c} opacity={0.12} />}
      <path d={line} fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {dots && pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={2.5} fill={c} />)}
    </svg>
  );
}

// ─── Bar chart ───────────────────────────────────────────────
function BarChart({ data, width = 240, height = 80, color, labels, highlight }) {
  const c = color || getAccent();
  const max = Math.max(...data);
  const n = data.length;
  const barW = (width - (n - 1) * 4) / n;
  return (
    <svg width={width} height={height + (labels ? 16 : 0)} style={{ display: 'block' }}>
      {data.map((v, i) => {
        const h = (v / max) * height;
        const isHi = highlight === i;
        return (
          <g key={i}>
            <rect x={i * (barW + 4)} y={height - h} width={barW} height={h} rx={3}
                  fill={isHi ? c : 'rgba(255,255,255,0.12)'} />
            {labels && <text x={i * (barW + 4) + barW / 2} y={height + 12}
                             textAnchor="middle" fontSize="9" fontFamily={FT.ff.mono} fill={FT.ink6}>{labels[i]}</text>}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Stat block ──────────────────────────────────────────────
function Stat({ label, value, unit, delta, accent, big }) {
  return (
    <div>
      <div style={{ fontFamily: FT.ff.mono, fontSize: 10, textTransform: 'uppercase',
                    letterSpacing: 0.8, color: FT.ink6, marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <div style={{ fontFamily: FT.ff.display, fontSize: big ? 40 : 24, fontWeight: 600,
                      color: accent ? getAccentText() : FT.bone0, letterSpacing: -1, lineHeight: 1 }}>
          {value}
        </div>
        {unit && <div style={{ fontFamily: FT.ff.mono, fontSize: 11, color: FT.ink6 }}>{unit}</div>}
      </div>
      {delta && (
        <div style={{ fontFamily: FT.ff.mono, fontSize: 11, color: delta.startsWith('+') ? FT.good : FT.hot, marginTop: 4 }}>
          {delta}
        </div>
      )}
    </div>
  );
}

// ─── Placeholder image (subtly-striped) ──────────────────────
function Placeholder({ label = 'video', w = '100%', h = 120, radius = 12, dark = true }) {
  const stripe = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  const bg = dark ? FT.ink3 : FT.bone1;
  return (
    <div style={{
      width: w, height: h, borderRadius: radius, background: bg,
      backgroundImage: `repeating-linear-gradient(45deg, ${stripe} 0 8px, transparent 8px 16px)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FT.ff.mono, fontSize: 10, letterSpacing: 1,
      textTransform: 'uppercase', color: dark ? FT.ink6 : FT.bone3,
    }}>{label}</div>
  );
}

// ─── QR (stylized) ───────────────────────────────────────────
function QRCode({ size = 180, color = '#0B0D0C', bg = 'transparent' }) {
  // Deterministic pseudo-QR for display purposes
  const n = 21;
  const s = size / n;
  const cells = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const v = ((x * 73856 ^ y * 19349) % 7) > 3;
    if (v) cells.push([x, y]);
  }
  const finder = (cx, cy) => (
    <g key={`f${cx}${cy}`}>
      <rect x={cx*s} y={cy*s} width={7*s} height={7*s} fill={color}/>
      <rect x={(cx+1)*s} y={(cy+1)*s} width={5*s} height={5*s} fill={bg==='transparent'?'#fff':bg}/>
      <rect x={(cx+2)*s} y={(cy+2)*s} width={3*s} height={3*s} fill={color}/>
    </g>
  );
  return (
    <svg width={size} height={size} style={{ display: 'block', background: bg }}>
      {cells.map(([x,y], i) => {
        if ((x < 7 && y < 7) || (x > n-8 && y < 7) || (x < 7 && y > n-8)) return null;
        return <rect key={i} x={x*s} y={y*s} width={s} height={s} fill={color} rx={s*0.2}/>;
      })}
      {finder(0,0)}{finder(n-7,0)}{finder(0,n-7)}
    </svg>
  );
}

Object.assign(window, { Icon, I, Pill, Btn, Sparkline, BarChart, Stat, Placeholder, QRCode });
