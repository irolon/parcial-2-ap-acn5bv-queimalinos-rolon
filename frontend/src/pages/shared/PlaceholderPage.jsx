import { Hammer } from 'lucide-react';
import Card from '@/components/shared/ui/Card';
import EmptyState from '@/components/shared/states/EmptyState';

/** Página de una sección que todavía no existe. El título va en la topbar. */
export default function PlaceholderPage({ title }) {
  return (
    <Card>
      <EmptyState
        icon={Hammer}
        title="Próximamente"
        text={`La sección ${title} está en construcción.`}
      />
    </Card>
  );
}
