import ErrorState from '@/components/shared/states/ErrorState';
import LoadingState from '@/components/shared/states/LoadingState';

/**
 * Un bloque de la tarjeta de logros (racha, logros o desafíos) con su propia carga y su propio error con Reintentar,
 * así lo que falla o tarda no tapa a los demás. `children` recibe los datos de la consulta. Por defecto el error
 * muestra el mensaje del servidor y la carga dice "Cargando…"; `errorMessage` y `loadingLabel` los reemplazan. Un
 * refetch fallido (por ejemplo, después de guardar un entrenamiento) no tapa con el error los datos que ya había.
 */
export default function AchievementBlock({ title, query, errorMessage, loadingLabel, children }) {
  let body;
  if (query.isPending) body = <LoadingState rows={1} label={loadingLabel} />;
  else if (query.isError && query.data == null) {
    body = <ErrorState message={errorMessage ?? query.error?.message} onRetry={() => query.refetch()} />;
  } else body = children(query.data);
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="font-display text-xs font-semibold uppercase tracking-wide text-ink6">{title}</h3>
      {body}
    </section>
  );
}
