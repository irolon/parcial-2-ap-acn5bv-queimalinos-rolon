import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import EmptyState from './EmptyState';

const isEmpty = (data) => data == null || (Array.isArray(data) && data.length === 0);

/**
 * El estado de una consulta: carga, error, vacío o los datos. El error de pantalla solo aparece si no hay datos que
 * mostrar: un refetch fallido (la consulta queda en `isError` pero conserva `data`) no tapa lo que ya se cargó.
 */
export default function QueryState({ query, empty = {}, errorMessage, loading, children }) {
  if (query.isPending) return loading ?? <LoadingState />;
  if (query.isError && query.data == null) {
    return <ErrorState message={errorMessage ?? query.error?.message} onRetry={() => query.refetch()} />;
  }
  if (isEmpty(query.data)) return <EmptyState {...empty} />;
  return children(query.data);
}
