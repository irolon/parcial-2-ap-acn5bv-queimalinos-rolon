import { Eyebrow } from '@/components/ui/Eyebrow'
import { Reveal } from '@/components/ui/Reveal'

export function SectionHeader({ eyebrow, title, lead, id, className = '' }) {
  return (
    <Reveal className={`mb-9 flex flex-col md:mb-12 ${className}`}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 id={id} className="mt-[18px] max-w-[860px] text-[34px] leading-[1.04] md:text-[44px] lg:text-[52px]">
        {title}
      </h2>
      {lead && <p className="mt-5 max-w-[640px] text-[17px] text-muted md:text-[19px]">{lead}</p>}
    </Reveal>
  )
}
