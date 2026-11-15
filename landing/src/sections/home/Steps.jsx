import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { MiniRow } from '@/components/mockups/MiniRow'
import { QrMock } from '@/components/mockups/QrMock'

const bars = [45, 52, 58, 70, 78, 100]

function Step({ n, title, text, children }) {
  return (
    <Card className="flex flex-col gap-4 bg-bg-0 p-7">
      <span className="font-mono text-sm text-brand-text">{n}</span>
      <h3 className="text-2xl">{title}</h3>
      <p className="text-muted">{text}</p>
      <div className="mt-auto flex min-h-[190px] flex-col justify-center gap-2 rounded-panel border border-surface-1 bg-bg-2 p-4" aria-hidden="true">
        {children}
      </div>
    </Card>
  )
}

export function Steps() {
  return (
    <section aria-labelledby="steps-title" className="border-y border-surface-1 bg-bg-1 py-20 md:py-28">
      <div className="container-page">
        <SectionHeader id="steps-title" eyebrow="Cómo funciona" title="Tres pasos y tu alumno ya está entrenando." />
        <Reveal className="grid gap-5 md:grid-cols-3">
          {(visible) => (
            <>
              <Step n="01" title="Armá la rutina" text="Usá tu biblioteca de ejercicios, una plantilla o pedile un borrador al asistente con IA.">
                <span className="self-start rounded-pill bg-brand-text/14 px-2.5 py-1 text-xs text-brand-soft">Plantilla · Fuerza inicial</span>
                <MiniRow left="Sentadilla goblet" right="3 × 10" />
                <MiniRow left="Remo con mancuerna" right="3 × 12" />
                <MiniRow left="Plancha" right="3 × 40 s" />
              </Step>
              <Step n="02" title="Invitá por QR o WhatsApp" text="Tu alumno escanea el QR o toca el link, se baja la app y queda vinculado en un minuto.">
                <div className="flex items-center gap-4">
                  <QrMock />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <MiniRow left={<><Icon name="link" className="size-4 text-muted" />Link enviado</>} />
                    <MiniRow className="border-success/35" left={<><Icon name="check" className="size-4 text-success" />Lucía se unió</>} />
                  </div>
                </div>
              </Step>
              <Step n="03" title="Seguí su progreso" text="Cada serie que registra te llega con su RPE y sus comentarios. Vos ajustás la próxima semana.">
                <div className="flex justify-between text-xs text-muted">
                  <span>Volumen semanal</span>
                  <span className="font-mono text-success">+38 %</span>
                </div>
                <div className="flex h-[120px] items-end gap-2">
                  {bars.map((h, i) => (
                    <div
                      key={i}
                      className={`flex-1 origin-bottom rounded-t-md rounded-b-xs transition-transform duration-900 ease-[cubic-bezier(.2,.7,.2,1)] ${
                        i === bars.length - 1 ? 'bg-brand' : 'bg-surface-2'
                      }`}
                      style={{ height: `${h}%`, transform: `scaleY(${visible ? 1 : 0.04})`, transitionDelay: `${0.1 + i * 0.08}s` }}
                    />
                  ))}
                </div>
              </Step>
            </>
          )}
        </Reveal>
      </div>
    </section>
  )
}
