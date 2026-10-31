import { Fragment } from 'react';
import { dayKey, dayLabel } from '@/utils/messages/messageTime';
import DaySeparator from './DaySeparator';
import MessageBubble from './MessageBubble';

function Older({ loading, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="cursor-pointer self-center rounded-md px-3 py-1 font-display text-xs font-medium text-accentText hover:bg-ink2 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-accentText"
    >
      {loading ? 'Cargando…' : 'Ver anteriores'}
    </button>
  );
}

/** Lista cronológica con separadores de día. `role="log"`: los mensajes nuevos se anuncian sin interrumpir. */
export default function MessageList({
  messages, viewerRole, counterpartName, ownName, hasMore, isFetchingOlder, attach, onScroll, onImageLoad,
  onFetchOlder, onOpenImage, onRetry, onDiscard,
}) {
  const lastMineId = messages.findLast((m) => m.sender_role === viewerRole)?.id;
  return (
    <div
      ref={attach}
      onScroll={onScroll}
      onLoadCapture={onImageLoad}
      role="log"
      aria-live="polite"
      aria-label="Mensajes"
      className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
    >
      {hasMore && <Older loading={isFetchingOlder} onClick={() => onFetchOlder()} />}
      {messages.length === 0 && (
        <p className="m-auto font-body text-sm text-ink6">Todavía no hay mensajes. Escribí el primero.</p>
      )}
      {messages.map((message, index) => {
        const newDay = index === 0 || dayKey(message.created_at) !== dayKey(messages[index - 1].created_at);
        const mine = message.sender_role === viewerRole;
        return (
          <Fragment key={message.id}>
            {newDay && <DaySeparator label={dayLabel(message.created_at)} />}
            <MessageBubble
              message={message}
              mine={mine}
              isLastMine={message.id === lastMineId}
              senderName={mine ? ownName : counterpartName}
              onOpenImage={onOpenImage}
              onRetry={onRetry}
              onDiscard={onDiscard}
            />
          </Fragment>
        );
      })}
    </div>
  );
}
