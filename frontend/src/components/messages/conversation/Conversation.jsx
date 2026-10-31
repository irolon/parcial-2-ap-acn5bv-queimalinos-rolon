import { useState } from 'react';
import QueryState from '@/components/shared/states/QueryState';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { useAutoRead } from '@/hooks/messages/useAutoRead';
import { useMessages } from '@/hooks/messages/useMessages';
import { useSendMessage } from '@/hooks/messages/useSendMessage';
import { useStickToBottom } from '@/hooks/messages/useStickToBottom';
import ConversationHeader from './ConversationHeader';
import ImageDialog from './ImageDialog';
import MessageComposer from './MessageComposer';
import MessageList from './MessageList';

/**
 * Conversación PT ↔ alumno, compartida por las dos pantallas.
 * `studentId` identifica la conversación; `viewerRole` ('trainer' | 'student') decide qué burbujas son propias
 * y si hay "Ver ficha". `onBack` (opcional) muestra "Volver". Usar `key={studentId}` al cambiar de conversación.
 */
export default function Conversation({ studentId, viewerRole, onBack }) {
  const ownName = useAuthStore((s) => s.user?.name) ?? 'vos';
  const thread = useMessages(studentId);
  const { send, retry, discard } = useSendMessage(studentId);
  const [image, setImage] = useState(null);
  const { messages } = thread;
  const scroll = useStickToBottom(messages.at(-1)?.id);
  useAutoRead(studentId, viewerRole, messages);

  const onSend = (content) => {
    scroll.stickNext();
    send(content);
  };

  return (
    <section
      aria-label="Conversación"
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-ink3 bg-ink0"
    >
      <QueryState query={thread} errorMessage="No pudimos cargar la conversación.">
        {() => (
          <>
            <ConversationHeader
              counterpart={thread.counterpart}
              studentId={studentId}
              viewerRole={viewerRole}
              onBack={onBack}
            />
            <MessageList
              messages={messages}
              viewerRole={viewerRole}
              counterpartName={thread.counterpart?.name ?? ''}
              ownName={ownName}
              hasMore={thread.hasMore}
              isFetchingOlder={thread.isFetchingOlder}
              attach={scroll.attach}
              onScroll={scroll.onScroll}
              onImageLoad={scroll.onImageLoad}
              onFetchOlder={thread.fetchOlder}
              onOpenImage={setImage}
              onRetry={retry}
              onDiscard={discard}
            />
            <MessageComposer onSend={onSend} />
            <ImageDialog image={image} onClose={() => setImage(null)} />
          </>
        )}
      </QueryState>
    </section>
  );
}
