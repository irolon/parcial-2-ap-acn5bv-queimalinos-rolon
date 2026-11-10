/** Forma del punto de una línea (`circle`, `square` o `diamond`) centrada en `cx, cy`, de "radio" `r`. */
export function Shape({ shape, cx, cy, r, ...rest }) {
  if (shape === 'square') return <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} {...rest} />;
  if (shape === 'diamond') {
    const d = r * 1.3;
    return <path d={`M${cx} ${cy - d}L${cx + d} ${cy}L${cx} ${cy + d}L${cx - d} ${cy}Z`} {...rest} />;
  }
  return <circle cx={cx} cy={cy} r={r} {...rest} />;
}

/** Punto de recharts con la forma de la línea (`dot` de `<Line>`); sin coordenadas no dibuja nada. */
export function SlotDot({ cx, cy, shape, color, r = 3.5 }) {
  if (cx === null || cx === undefined || cy === null || cy === undefined) return null;
  return (
    <Shape
      shape={shape}
      cx={cx}
      cy={cy}
      r={r}
      className="recharts-dot recharts-line-dot"
      data-shape={shape}
      fill={color}
      stroke="var(--color-ink1)"
      strokeWidth={1.5}
    />
  );
}

/** Muestra de la línea para la leyenda y los selectores: el trazo (continuo o punteado) con su punto al medio. */
export default function SlotMark({ color, dash, shape }) {
  return (
    <svg aria-hidden="true" width="22" height="10" viewBox="0 0 22 10" data-slot-mark={`${dash || 'none'}|${shape}`}>
      <line x1="1" y1="5" x2="21" y2="5" stroke={color} strokeWidth="2" strokeDasharray={dash || undefined} />
      <Shape shape={shape} cx={11} cy={5} r={3} fill={color} />
    </svg>
  );
}
