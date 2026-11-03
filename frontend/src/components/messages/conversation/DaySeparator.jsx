/** Rótulo de día ("Hoy", "Ayer", "12 oct") entre mensajes. */
export default function DaySeparator({ label }) {
  return (
    <div className="my-1 self-center font-mono text-[9px] uppercase tracking-[1px] text-ink6">{label}</div>
  );
}
