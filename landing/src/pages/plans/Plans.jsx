import { PageHeader } from '@/components/ui/PageHeader'
import { PlanCards } from '@/sections/plans/PlanCards'
import { Faq } from '@/sections/plans/Faq'
import { FinalCta } from '@/sections/home/FinalCta'

export default function Plans() {
  return (
    <>
      <PageHeader eyebrow="Planes" title="Empezá gratis. Pasate a Pro cuando crezcas." lead="Sin dólares ni conversiones: pagás en pesos." />
      <section aria-label="Planes y preguntas frecuentes">
        <div className="container-page">
          <PlanCards />
          <Faq />
        </div>
      </section>
      <FinalCta className="pt-20 pb-20 md:pt-28 md:pb-28" />
    </>
  )
}
