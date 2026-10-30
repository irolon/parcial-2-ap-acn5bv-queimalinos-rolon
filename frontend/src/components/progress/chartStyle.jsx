export const AXIS = { stroke: 'var(--color-ink6)', fontSize: 12, fontFamily: 'var(--font-mono)', tickLine: false };

export const GRID = { stroke: 'var(--color-ink3)', vertical: false };

/** Tooltip oscuro común; recibe las filas ya armadas. */
export function TooltipBox({ title, rows }) {
  return (
    <div className="rounded-lg border border-ink4 bg-ink2 px-3 py-2 font-mono text-xs text-bone0 shadow-lg">
      <div className="mb-1 text-ink6">{title}</div>
      {rows.map((r) => (
        <div key={r}>{r}</div>
      ))}
    </div>
  );
}
