import Conversation from '@/components/messages/conversation/Conversation';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { ROLES } from '@/routes/routeTable';

/** "Mensajes" del alumno: la conversación con su entrenador. */
export default function StudentMessagesPage() {
  const user = useAuthStore((s) => s.user);
  return (
    <div className="h-[calc(100dvh-9rem)] min-h-[420px]">
      <Conversation studentId={user.id} viewerRole={ROLES.STUDENT} />
    </div>
  );
}
