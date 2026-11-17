import { Card } from '@/components/ui/Card'
import { IconTile } from '@/components/ui/IconTile'

export function FeatureCard({ icon, tone, title, children }) {
  return (
    <Card className="flex flex-col gap-2.5 p-6">
      <span className="mb-1.5"><IconTile name={icon} tone={tone} /></span>
      <h3 className="text-lg">{title}</h3>
      <p className="text-[15px] text-muted">{children}</p>
    </Card>
  )
}
