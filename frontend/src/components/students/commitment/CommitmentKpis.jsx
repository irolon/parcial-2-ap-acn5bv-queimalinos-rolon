import ErrorState from '@/components/shared/states/ErrorState';
import LoadingState from '@/components/shared/states/LoadingState';
import Card from '@/components/shared/ui/Card';
import Stat from '@/components/shared/ui/Stat';

/**
 * Grilla de indicadores ya armados: `{ label, value, unit, accent, delta, context, hint }` (`delta` va en verde o
 * coral, como en `Stat`; `context` en gris; `hint`, una aclaración visible más chica debajo).
 */
export default function CommitmentKpis({ items }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(({ label, context, hint, ...stat }) => (
        <Card key={label} padding={16}>
          <Stat label={label} {...stat} />
          {context && <p className="mt-1 font-mono text-[11px] text-ink6">{context}</p>}
          {hint && <p className="mt-0.5 text-[10px] leading-snug text-ink6">{hint}</p>}
        </Card>
      ))}
    </div>
  );
}

/** Estados del bloque (cargando o error de asistencia/racha) o, con los datos, `children()`. */
export function CommitmentState({ commitment, loadingLabel, children }) {
  if (commitment.isError) {
    return <ErrorState message="No pudimos cargar los indicadores." onRetry={commitment.retry} />;
  }
  if (commitment.isPending) return <LoadingState rows={1} label={loadingLabel} />;
  return children();
}
