import { APP_LOGIN_URL } from '@/data/shared/site'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { TrainerPanelMock } from '@/components/mockups/TrainerPanelMock'
import { ActiveSessionPhone } from '@/components/mockups/ActiveSessionPhone'

const checks = ['Web y app Android', 'Funciona sin conexión']

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative pt-10 pb-18 lg:pt-18 lg:pb-28">
      <div className="dot-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="container-page relative grid items-center gap-14 lg:grid-cols-[5fr_7fr] lg:gap-12">
        <div>
          <span className="inline-flex animate-rise items-center gap-2 rounded-pill border border-surface-2 bg-bg-2 px-3.5 py-1.5 text-[13px] font-medium text-bone-2">
            <span className="size-2 rounded-pill bg-success" />
            Para personal trainers independientes
          </span>
          <h1
            id="hero-title"
            className="mt-6 animate-rise text-[42px] leading-none tracking-[-0.035em] [animation-delay:.08s] md:text-[58px] xl:text-[66px]"
          >
            Tus alumnos entrenan con tu rutina, <em className="text-brand-text not-italic">no con un PDF.</em>
          </h1>
          <p className="mt-6 max-w-[520px] animate-rise text-[17px] text-muted [animation-delay:.16s] md:text-[19px]">
            Armá rutinas con ayuda de IA, invitá a tus alumnos por QR o WhatsApp y seguí su progreso sesión por sesión. En español y con precio en pesos.
          </p>
          <div className="mt-9 flex animate-rise flex-wrap gap-3 [animation-delay:.24s]">
            <Button href={APP_LOGIN_URL}>
              Iniciar sesión <Icon name="arrowRight" className="size-4" />
            </Button>
          </div>
          <ul className="mt-8 flex animate-rise flex-wrap gap-x-5 gap-y-2.5 text-sm [animation-delay:.32s]">
            {checks.map((c) => (
              <li key={c} className="inline-flex items-center gap-2">
                <Icon name="check" className="size-4 text-success" />
                {c}
              </li>
            ))}
          </ul>
        </div>

        {/* Composición: web del PT + celular del alumno */}
        <div className="relative mx-auto flex w-full max-w-[720px] justify-center md:block md:h-[600px]">
          <div className="hidden animate-rise [animation-delay:.45s] md:absolute md:top-3 md:right-0 md:block md:w-[93%]">
            <TrainerPanelMock />
          </div>
          <div className="w-[280px] max-w-full animate-rise [animation-delay:.7s] md:absolute md:bottom-0 md:-left-3 md:w-[258px]">
            <div className="animate-float">
              <ActiveSessionPhone />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
