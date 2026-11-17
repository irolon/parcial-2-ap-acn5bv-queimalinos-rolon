import { studentFeatures } from '@/data/student/student'
import { Icon } from '@/components/ui/Icon'
import { Reveal } from '@/components/ui/Reveal'

export function StudentFeatures() {
  return (
    <Reveal as="ul" className="mt-10 grid gap-x-7 gap-y-3 md:grid-cols-2 lg:grid-cols-3">
      {studentFeatures.map((f) => (
        <li key={f.title} className="flex items-start gap-3 border-t border-surface-1 py-3.5 text-[15px]">
          <Icon name={f.icon} className="size-5 text-info" />
          <span><b className="block font-semibold text-bone">{f.title}</b>{f.text}</span>
        </li>
      ))}
    </Reveal>
  )
}
