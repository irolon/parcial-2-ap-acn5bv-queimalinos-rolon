import Button from '@/components/shared/ui/Button';
import Card from '@/components/shared/ui/Card';
import EmptyState from '@/components/shared/states/EmptyState';
import ErrorState from '@/components/shared/states/ErrorState';
import LoadingState from '@/components/shared/states/LoadingState';
import SessionRow from '@/components/sessions/SessionRow';
import { useSessionsInfinite } from '@/hooks/sessions/useSessions';

function Body({ query, studentId, viewer }) {
  if (query.isPending) return <LoadingState rows={2} />;
  if (query.isError && !query.data) {
    return <ErrorState message="No pudimos cargar las sesiones." onRetry={() => query.refetch()} />;
  }
  const sessions = query.data.pages.flatMap((page) => page.data);
  if (sessions.length === 0) {
    return <EmptyState title={viewer === 'student' ? 'Todavía no entrenaste' : 'Todavía no entrenó'} />;
  }
  return (
    <>
      <ul>
        {sessions.map((session) => (
          <SessionRow key={session.id} studentId={studentId} session={session} viewer={viewer} />
        ))}
      </ul>
      {query.hasNextPage && (
        <div className="mt-3 flex flex-col items-center gap-2">
          {query.isFetchNextPageError && (
            <p role="alert" className="text-sm text-hot">
              No pudimos cargar más sesiones.
            </p>
          )}
          <Button variant="ghost" size="sm" loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
            Cargar más
          </Button>
        </div>
      )}
    </>
  );
}

/**
 * Bloque "Últimas sesiones" del alumno: de a 20, con detalle y comentario.
 * `viewer` es quién mira: el entrenador (por defecto) en la ficha del alumno, que puede comentar cada sesión,
 * o `'student'`, el propio alumno en su Historial, con los textos en segunda persona y el comentario de solo lectura.
 */
export default function SessionsHistory({ studentId, viewer = 'trainer' }) {
  const query = useSessionsInfinite(studentId);
  return (
    <Card title="Últimas sesiones" className="min-w-0">
      <Body query={query} studentId={studentId} viewer={viewer} />
    </Card>
  );
}
