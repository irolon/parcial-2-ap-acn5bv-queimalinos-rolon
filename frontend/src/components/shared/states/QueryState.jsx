import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import EmptyState from './EmptyState';

const isEmpty = (data) => data == null || (Array.isArray(data) && data.length === 0);

export default function QueryState({ query, empty = {}, errorMessage, children }) {
  if (query.isPending) return <LoadingState />;
  if (query.isError) {
    return <ErrorState message={errorMessage ?? query.error?.message} onRetry={() => query.refetch()} />;
  }
  if (isEmpty(query.data)) return <EmptyState {...empty} />;
  return children(query.data);
}
