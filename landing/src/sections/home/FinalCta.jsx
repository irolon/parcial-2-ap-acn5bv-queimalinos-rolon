import { APP_LOGIN_URL, APP_SIGNUP_URL } from '@/data/shared/site'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Reveal } from '@/components/ui/Reveal'

export function FinalCta({ className = '' }) {
  return (
    <section aria-labelledby="cta-title" className={className}>
      <div className="container-page">
        <Reveal className="relative grid items-end gap-10 overflow-hidden rounded-card bg-brand px-6 py-12 md:grid-cols-[1fr_auto] md:px-14 md:py-18">
          <Icon name="dumbbell" strokeWidth={1.4} className="absolute -top-15 -right-15 size-80 text-white/8" />
          <div className="relative">
            <h2 id="cta-title" className="max-w-[700px] text-[34px] leading-[1.04] text-white md:text-[44px] lg:text-[52px]">
              Tu próximo alumno puede tener tu rutina en el celular hoy.
            </h2>
            <p className="mt-[18px] max-w-[560px] text-lg text-white/85">
              Creá tu cuenta de entrenador gratis. ¿Sos alumno? Pedile la invitación a tu entrenador.
            </p>
          </div>
          <div className="relative flex flex-wrap gap-3">
            <Button href={APP_SIGNUP_URL} variant="light">Empezá gratis</Button>
            <Button href={APP_LOGIN_URL} variant="onBrand">Ya tengo cuenta</Button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
