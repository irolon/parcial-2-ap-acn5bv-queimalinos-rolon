import { Link } from 'react-router';
import { MessageSquare } from 'lucide-react';
import ErrorState from '@/components/shared/states/ErrorState';
import LoadingState from '@/components/shared/states/LoadingState';
import Avatar from '@/components/shared/ui/Avatar';
import Card from '@/components/shared/ui/Card';
import { FOCUS_RING } from '@/components/shared/layout/compact';
import { useCounterpart } from '@/hooks/messages/useConversations';
import { STUDENT_NAV } from '@/routes/routeTable';

const MESSAGES_PATH = `${STUDENT_NAV.base}/mensajes`;
// Con aspecto de Button ghost sm: es navegación, así que va como link.
const GHOST_LINK = `inline-flex h-8 shrink-0 items-center gap-2 rounded-lg border border-white/[0.14] px-3 font-display text-[13px] font-semibold text-bone0 transition-colors hover:bg-white/[0.06] ${FOCUS_RING}`;

function Trainer({ query }) {
  if (query.isPending) return <LoadingState rows={1} label="Cargando a tu entrenador/a…" />;
  if (query.isError && query.data === undefined) {
    return <ErrorState message="No pudimos cargar los datos de tu entrenador/a." onRetry={() => query.refetch()} />;
  }
  if (!query.data) return <p className="font-body text-sm text-ink6">Sin entrenador/a asignado/a</p>;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={query.data.name} size={40} decorative />
      <p className="truncate font-display text-sm font-semibold text-bone0">{query.data.name}</p>
    </div>
  );
}

/**
 * "Tu entrenador/a" en Mi perfil: quién lo entrena (el `counterpart` de su conversación) y el acceso a Mensajes. El
 * link no depende del nombre: se ve también mientras carga o si falla.
 */
export default function TrainerCard({ studentId }) {
  const query = useCounterpart(studentId);
  return (
    <Card title="Tu entrenador/a">
      <div className="flex flex-col gap-3">
        <Trainer query={query} />
        <Link to={MESSAGES_PATH} className={`${GHOST_LINK} self-start`}>
          <MessageSquare size={16} aria-hidden="true" />
          Mensaje
        </Link>
      </div>
    </Card>
  );
}
