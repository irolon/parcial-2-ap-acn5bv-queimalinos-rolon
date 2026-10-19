export default function Stat({ label, value, unit, delta, accent = false, big = false }) {
  const positive = typeof delta === 'string' && delta.startsWith('+');
  return (
    <div>
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.8px] text-ink6">{label}</div>
      <div className="flex items-baseline gap-1">
        <div
          className={`font-display font-semibold leading-none tracking-[-1px] ${
            big ? 'text-[40px]' : 'text-2xl'
          } ${accent ? 'text-accentText' : 'text-bone0'}`}
        >
          {value}
        </div>
        {unit && <div className="font-mono text-[11px] text-ink6">{unit}</div>}
      </div>
      {delta && (
        <div className={`mt-1 font-mono text-[11px] ${positive ? 'text-good' : 'text-hot'}`}>{delta}</div>
      )}
    </div>
  );
}
