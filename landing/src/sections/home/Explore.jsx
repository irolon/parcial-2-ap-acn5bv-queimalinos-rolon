import { Link } from 'react-router'
import { Icon } from '@/components/ui/Icon'
import { IconTile } from '@/components/ui/IconTile'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHeader } from '@/components/ui/SectionHeader'

const items = [
  { to: '/entrenadores', icon: 'monitor', tone: 'brand', title: 'Para entrenadores', text: 'Panel de alumnos, biblioteca con video, editor de rutinas, agenda, mensajes y gráficos de progreso.', cta: 'Ver el panel', wide: true },
  { to: '/alumnos', icon: 'phone', tone: 'intensity', title: 'Para alumnos', text: 'La rutina del día, sesión activa sin conexión, mapa muscular, logros, rachas y desafíos.', cta: 'Ver la app', wide: true },
  { to: '/ia', icon: 'sparkle', tone: 'info', title: 'Asistentes con IA', text: 'Uno te arma rutinas; el otro responde las dudas de tus alumnos.', cta: 'Ver cómo ayudan' },
  { to: '/por-que', icon: 'chart', tone: 'warning', title: 'Por qué FitTrainer', text: 'Lo de antes contra lo de ahora: de WhatsApp y Excel a un sistema propio.', cta: 'Comparar' },
  { to: '/planes', icon: 'card', tone: 'success', title: 'Planes y preguntas', text: 'Los planes, en pesos y sin dólares. Y las dudas de siempre.', cta: 'Ver planes' },
]

export function Explore() {
  return (
    <section aria-labelledby="explore-title" className="py-20 md:py-28">
      <div className="container-page">
        <SectionHeader id="explore-title" eyebrow="Conocé FitTrainer" title="Elegí por dónde empezar." />
        <Reveal className="grid gap-5 md:grid-cols-2 lg:grid-cols-6">
          {items.map((it) => (
            <Link
              key={it.to}
              to={it.to}
              className={`flex min-h-60 flex-col gap-3 rounded-card border border-surface-1 bg-bg-1 p-7 text-bone-3 no-underline transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-brand-text hover:bg-bg-2 ${
                it.wide ? 'lg:col-span-3' : 'lg:col-span-2'
              }`}
            >
              <IconTile name={it.icon} tone={it.tone} size="lg" />
              <h3 className="text-2xl">{it.title}</h3>
              <p className="text-muted">{it.text}</p>
              <span className="mt-auto inline-flex items-center gap-2 text-[15px] font-semibold text-brand-text">
                {it.cta} <Icon name="arrowRight" className="size-4" />
              </span>
            </Link>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
