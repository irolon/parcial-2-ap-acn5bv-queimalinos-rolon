import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

const TITLES = {
  '/': 'FitTrainer — Para personal trainers independientes',
  '/entrenadores': 'Para entrenadores — FitTrainer',
  '/alumnos': 'Para alumnos — FitTrainer',
  '/ia': 'Asistentes con IA — FitTrainer',
  '/por-que': 'Por qué FitTrainer',
  '/planes': 'Planes y preguntas — FitTrainer',
}

export function Layout() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
    document.title = TITLES[pathname] ?? TITLES['/']
  }, [pathname])

  return (
    <div className="min-h-screen overflow-x-clip bg-bg-0">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-chip focus:bg-brand focus:px-4 focus:py-2 focus:text-white">
        Saltar al contenido
      </a>
      <Navbar />
      <main id="contenido">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
