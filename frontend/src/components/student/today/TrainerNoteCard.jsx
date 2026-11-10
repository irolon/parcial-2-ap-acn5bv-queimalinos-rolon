import Avatar from '@/components/shared/ui/Avatar';
import Card from '@/components/shared/ui/Card';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { useCounterpart } from '@/hooks/messages/useConversations';
import { useSessionsInfinite } from '@/hooks/sessions/useSessions';
import { formatDayMonthAR } from '@/utils/dates';
import { latestTrainerNote, noteTitle } from '@/utils/sessions/trainerNote';

const aboutLabel = (session) =>
  [`Sobre tu sesión del ${formatDayMonthAR(session.started_at)}`, session.routine?.name].filter(Boolean).join(' · ');

/**
 * "Nota de Laura": el último comentario del entrenador/a en la primera página del historial (la misma consulta que
 * "Esta semana", sin pedido nuevo). Mientras carga o si falla no muestra nada: esos estados ya los da "Esta semana".
 * El nombre sale del `counterpart` de Mensajes; sin él, el título es genérico.
 */
export default function TrainerNoteCard() {
  const studentId = useAuthStore((state) => state.user?.id);
  const sessions = useSessionsInfinite(studentId);
  const trainer = useCounterpart(studentId).data;
  if (!sessions.data) return null;

  const note = latestTrainerNote(sessions.data.pages[0]?.data);
  const title = noteTitle(trainer?.name);
  if (!note) {
    return (
      <Card title={title}>
        <p className="font-body text-sm text-ink6">Tu entrenador/a todavía no comentó tus sesiones.</p>
      </Card>
    );
  }
  return (
    <Card title={title}>
      <div className="flex gap-3">
        {trainer?.name && <Avatar name={trainer.name} size={32} tone="accent" decorative />}
        <p className="line-clamp-4 min-w-0 font-body text-sm text-bone0" title={note.trainer_comment}>
          {note.trainer_comment}
        </p>
      </div>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.5px] text-ink6">{aboutLabel(note)}</p>
    </Card>
  );
}
