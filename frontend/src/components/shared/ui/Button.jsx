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

/**
 * Clases de `Button` para otro elemento (p. ej. un `Link` de react-router con aspecto de botón): mismo `variant`,
 * `size` y foco. Es el único lugar con esos estilos.
 */
export function buttonClass({ variant = 'primary', size = 'md', full = false, className = '' } = {}) {
  return [
    'inline-flex items-center justify-center gap-2 rounded-lg border font-display font-semibold',
    'tracking-[-0.1px] cursor-pointer transition-colors',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accentText',
    'disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTS[variant] ?? VARIANTS.primary,
    SIZES[size] ?? SIZES.md,
    full ? 'w-full' : '',
    className,
  ].join(' ');
}

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
  const classes = buttonClass({ variant, size, full, className });

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
