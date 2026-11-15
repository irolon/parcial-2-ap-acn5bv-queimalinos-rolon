import { Eyebrow } from '@/components/ui/Eyebrow'

/** Encabezado de cada página interna. */
export function PageHeader({ eyebrow, title, lead }) {
  return (
    <section aria-labelledby="page-title" className="relative overflow-hidden pt-14 pb-10 md:pt-24 md:pb-16">
      <div className="dot-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="container-page relative">
        <Eyebrow className="animate-rise">{eyebrow}</Eyebrow>
        <h1
          id="page-title"
          className="mt-[18px] max-w-[900px] animate-rise text-[36px] leading-[1.02] tracking-[-0.03em] [animation-delay:.08s] md:text-[48px] lg:text-[60px]"
        >
          {title}
        </h1>
        {lead && (
          <p className="mt-5 max-w-[640px] animate-rise text-[17px] text-muted [animation-delay:.16s] md:text-[19px]">
            {lead}
          </p>
        )}
      </div>
    </section>
  )
}
