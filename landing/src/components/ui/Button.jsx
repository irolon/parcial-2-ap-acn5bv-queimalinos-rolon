import { Link } from 'react-router'

const base =
  'inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-pill border px-6 text-[15px] font-semibold no-underline transition-[background-color,border-color,color,transform] duration-200'

const variants = {
  primary: 'border-transparent bg-brand text-white hover:-translate-y-px hover:bg-brand-hover',
  ghost: 'border-surface-2 bg-transparent text-bone-2 hover:border-muted hover:text-bone',
  light: 'border-transparent bg-bone text-bg-0 hover:-translate-y-px hover:bg-white',
  onBrand: 'border-white/45 text-white hover:border-white',
}

/** `to` = ruta interna (react-router). `href` = link externo (registro / login de la app). */
export function Button({ to, href, variant = 'primary', className = '', children, ...props }) {
  const cls = `${base} ${variants[variant]} ${className}`
  if (to) return <Link to={to} className={cls} {...props}>{children}</Link>
  return <a href={href} className={cls} {...props}>{children}</a>
}
