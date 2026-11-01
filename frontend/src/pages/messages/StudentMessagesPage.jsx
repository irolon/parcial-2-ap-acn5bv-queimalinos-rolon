import Conversation from '@/components/messages/conversation/Conversation';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { ROLES } from '@/routes/routeTable';

// AppShell no da un alto al <main>, así que la conversación necesita uno explícito:
// 100dvh menos topbar y padding del main (aprox. 9rem). Si cambia el layout, ajustar acá.
const CONVERSATION_HEIGHT = 'h-[calc(100dvh-9rem)] min-h-[420px]';

/** "Mensajes" del alumno: la conversación con su entrenador. */
export default function StudentMessagesPage() {
  const user = useAuthStore((s) => s.user);
  return (
    <div className={CONVERSATION_HEIGHT}>
      <Conversation studentId={user.id} viewerRole={ROLES.STUDENT} />
    </div>
  );
}
