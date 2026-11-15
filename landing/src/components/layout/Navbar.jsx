import { NavLink } from 'react-router'
import { NAV_LINKS, APP_LOGIN_URL } from '@/data/shared/site'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/layout/Logo'

const linkCls = ({ isActive }) =>
  `inline-flex min-h-11 items-center whitespace-nowrap rounded-chip px-3 text-[15px] no-underline transition-colors ${
    isActive ? 'bg-surface-1 text-bone' : 'text-bone-3 hover:bg-bg-2 hover:text-bone'
  }`

export function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-surface-1 bg-bg-0/90 backdrop-blur-md">
      <div className="container-page flex min-h-16 flex-wrap items-center gap-x-6 gap-y-1 lg:min-h-[72px]">
        <Logo hideNameOnSmall />
        {/* En desktop va en línea; en tablet/celu pasa a una fila deslizable debajo */}
        <nav
          aria-label="Secciones"
          className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto pb-2 [scrollbar-width:none] lg:order-none lg:mx-0 lg:ml-3 lg:w-auto lg:pb-0"
        >
          {NAV_LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkCls}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex gap-1.5 md:gap-2.5">
          <Button href={APP_LOGIN_URL} className="min-h-11 px-3.5 text-sm md:min-h-12 md:px-6 md:text-[15px]">
            Iniciar sesión
          </Button>
        </div>
      </div>
    </header>
  )
}
