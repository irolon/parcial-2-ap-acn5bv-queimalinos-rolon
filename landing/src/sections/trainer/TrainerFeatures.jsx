import { trainerFeatures } from '@/data/trainer/trainer'
import { FeatureCard } from '@/components/ui/FeatureCard'
import { Reveal } from '@/components/ui/Reveal'

export function TrainerFeatures() {
  return (
    <Reveal className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {trainerFeatures.map((f) => (
        <FeatureCard key={f.title} icon={f.icon} title={f.title}>{f.text}</FeatureCard>
      ))}
    </Reveal>
  )
}
