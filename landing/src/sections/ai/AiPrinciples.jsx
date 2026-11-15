import { FeatureCard } from '@/components/ui/FeatureCard'
import { Reveal } from '@/components/ui/Reveal'

export function AiPrinciples() {
  return (
    <Reveal className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      <FeatureCard icon="video" title="Parte de tu biblioteca">Propone con los ejercicios que vos cargaste, no con una lista genérica.</FeatureCard>
      <FeatureCard icon="user" title="Tiene en cuenta al alumno">Usa el perfil de cada uno para que el borrador arranque cerca de lo que necesita.</FeatureCard>
      <FeatureCard icon="check" title="Vos tenés la última palabra">Nada llega al alumno sin que lo revises. La IA es un borrador, no el entrenador.</FeatureCard>
    </Reveal>
  )
}
