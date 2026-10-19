import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-accent text-accentInk border-transparent hover:bg-accentDim',
  ghost: 'bg-transparent text-bone0 border-white/[0.14] hover:bg-white/[0.06]',
  dark: 'bg-ink3 text-bone0 border-transparent hover:bg-ink4',
  danger: 'bg-hot text-white border-transparent hover:brightness-110',
};

const SIZES = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-11 px-[18px] text-sm',
  lg: 'h-14 px-6 text-base',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  full = false,
  loading = false,
  disabled = false,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  const classes = [
    'inline-flex items-center justify-center gap-2 rounded-lg border font-display font-semibold',
    'tracking-[-0.1px] cursor-pointer transition-colors',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accentText',
    'disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTS[variant] ?? VARIANTS.primary,
    SIZES[size] ?? SIZES.md,
    full ? 'w-full' : '',
    className,
  ].join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
