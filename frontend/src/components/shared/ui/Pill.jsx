const TONES = {
  neutral: 'bg-white/[0.06] text-bone0 border-white/[0.08]',
  accent: 'bg-accent text-accentInk border-transparent',
  hot: 'bg-hot/[0.14] text-hot border-hot/25',
  good: 'bg-good/[0.14] text-good border-good/25',
  cool: 'bg-cool/[0.14] text-cool border-cool/[0.28]',
  ghost: 'bg-transparent text-ink6 border-white/[0.12]',
};

const SIZES = {
  sm: 'h-[22px] px-2 py-1 text-[11px]',
  md: 'h-[26px] px-2.5 py-1.5 text-xs',
};

export default function Pill({ tone = 'neutral', size = 'sm', className = '', children, ...rest }) {
  const classes = [
    'inline-flex items-center gap-1 rounded-pill border font-mono font-medium uppercase tracking-[0.3px]',
    TONES[tone] ?? TONES.neutral,
    SIZES[size] ?? SIZES.sm,
    className,
  ].join(' ');
  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
}
