import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { MessageSquare } from 'lucide-react';
import BroadcastDialog from '@/components/messages/BroadcastDialog';
import Conversation from '@/components/messages/conversation/Conversation';
import { CONVERSATION_HEIGHT } from '@/components/messages/conversationHeight';
import ConversationList from '@/components/messages/list/ConversationList';
import EmptyState from '@/components/shared/states/EmptyState';
import { useConversations } from '@/hooks/messages/useConversations';
import { useIsDesktop } from '@/hooks/shared/useIsDesktop';
import { ROLES } from '@/routes/routeTable';
import { studentsLabel } from '@/utils/messages/studentsLabel';

const NOTICE_MS = 5000;

/** "Mensajes" del PT: lista de conversaciones a la izquierda, la conversación elegida (`?alumno=<id>`) a la derecha. */
export default function MessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const studentId = searchParams.get('alumno');
  const isDesktop = useIsDesktop();
  const query = useConversations();
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [notice, setNotice] = useState(null);

  // Aviso "Enviado a N alumnos": la web no tiene sistema de toasts, se muestra acá y se va solo.
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const students = useMemo(() => (query.data ?? []).map((c) => c.student), [query.data]);
  const select = (id) => setSearchParams({ alumno: id }, { replace: true });
  const back = () => setSearchParams({}, { replace: true });
  const showList = isDesktop || !studentId;
  const showConversation = isDesktop || Boolean(studentId);

  return (
    <div className="flex flex-col gap-3">
      <div role="status">
        {notice && (
          <p className="rounded-md border border-ink3 bg-ink2 px-4 py-2 font-body text-sm text-bone0">{notice}</p>
        )}
      </div>
      <div className={`flex gap-4 ${CONVERSATION_HEIGHT}`}>
        {showList && (
          <div className="w-full min-w-0 md:w-[280px] md:shrink-0">
            <ConversationList
              query={query}
              activeId={studentId}
              onSelect={select}
              onBroadcast={() => setBroadcastOpen(true)}
            />
          </div>
        )}
        {showConversation && (
          <div className="min-w-0 flex-1">
            {studentId ? (
              <Conversation
                key={studentId}
                studentId={studentId}
                viewerRole={ROLES.TRAINER}
                onBack={isDesktop ? undefined : back}
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-ink3 bg-ink0">
                <EmptyState icon={MessageSquare} title="Elegí un alumno para ver la conversación" />
              </div>
            )}
          </div>
        )}
      </div>
      <BroadcastDialog
        open={broadcastOpen}
        onOpenChange={setBroadcastOpen}
        students={students}
        onSent={(n) => setNotice(`Enviado a ${studentsLabel(n)}`)}
      />
    </div>
  );
}
