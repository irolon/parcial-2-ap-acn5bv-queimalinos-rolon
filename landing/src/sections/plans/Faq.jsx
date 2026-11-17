import { faqs } from '@/data/plans/plans'
import { Icon } from '@/components/ui/Icon'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHeader } from '@/components/ui/SectionHeader'

export function Faq() {
  return (
    <div className="mt-20 md:mt-28">
      <SectionHeader eyebrow="Preguntas frecuentes" title="Lo que todos preguntan antes de arrancar." />
      <Reveal className="flex max-w-[860px] flex-col">
        {faqs.map((f, i) => (
          <details key={f.q} open={i === 0} className="group border-t border-surface-1 last:border-b">
            <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 px-1 py-4 font-display text-lg font-semibold text-bone md:text-xl [&::-webkit-details-marker]:hidden">
              {f.q}
              <span className="grid size-8 shrink-0 place-items-center rounded-pill border border-surface-2 transition-transform duration-250 group-open:rotate-45 group-open:bg-surface-1" aria-hidden="true">
                <Icon name="plus" className="size-4" />
              </span>
            </summary>
            <p className="max-w-[720px] px-1 pb-6 text-muted">{f.a}</p>
          </details>
        ))}
      </Reveal>
    </div>
  )
}
