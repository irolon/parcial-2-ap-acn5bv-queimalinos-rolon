import { Link } from 'react-router'
import { APP_LOGIN_URL } from '@/data/shared/site'
import { Logo } from '@/components/layout/Logo'

const linkCls = 'flex min-h-10 items-center text-[15px] text-muted no-underline hover:text-bone'

export function Footer() {
  return (
    <footer className="border-t border-surface-1 pt-14 pb-10">
      <div className="container-page grid grid-cols-2 gap-8 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="col-span-2 md:col-span-1">
          <Logo />
          <p className="mt-3.5 max-w-80 text-[15px] text-muted">
            La plataforma para personal trainers independientes y sus alumnos. Hecha en Argentina.
          </p>
        </div>
        <div>
          <h4 className="mb-2.5 text-sm">Producto</h4>
          <Link className={linkCls} to="/entrenadores">Para entrenadores</Link>
          <Link className={linkCls} to="/alumnos">Para alumnos</Link>
          <Link className={linkCls} to="/ia">Asistentes con IA</Link>
          <Link className={linkCls} to="/por-que">Por qué FitTrainer</Link>
        </div>
        <div>
          <h4 className="mb-2.5 text-sm">Cuenta</h4>
          <a className={linkCls} href={APP_LOGIN_URL}>Iniciar sesión</a>
          <Link className={linkCls} to="/planes">Planes y preguntas</Link>
        </div>
        <div>
          <h4 className="mb-2.5 text-sm">Legal</h4>
          <a className={linkCls} href="/terminos">Términos y condiciones</a>
          <a className={linkCls} href="/privacidad">Privacidad</a>
        </div>
      </div>
      <div className="container-page mt-10">
        <p className="font-mono text-xs text-muted">© {new Date().getFullYear()} FitTrainer</p>
      </div>
    </footer>
  )
}
