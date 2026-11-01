import Conversation from '@/components/messages/conversation/Conversation';
import { CONVERSATION_HEIGHT } from '@/components/messages/conversationHeight';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { ROLES } from '@/routes/routeTable';

/** "Mensajes" del alumno: la conversación con su entrenador. */
export default function StudentMessagesPage() {
  const user = useAuthStore((s) => s.user);
  return (
    <div className={CONVERSATION_HEIGHT}>
      <Conversation studentId={user.id} viewerRole={ROLES.STUDENT} />
    </div>
  );
}
