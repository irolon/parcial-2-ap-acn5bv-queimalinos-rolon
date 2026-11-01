import Avatar from '@/components/shared/ui/Avatar';
import { listTimeLabel } from '@/utils/messages/messageTime';
import { badgeText, previewText } from '@/utils/messages/messagePreview';

/** Fila de la lista del PT: avatar, nombre, vista previa, hora corta y no leídos. */
export default function ConversationRow({ conversation, active, onSelect }) {
  const { student, last_message: last, unread_count: unread } = conversation;
  const badge = badgeText(unread);
  return (
    <button
      type="button"
      onClick={() => onSelect(student.id)}
      aria-current={active ? 'true' : undefined}
      className={`flex w-full cursor-pointer items-center gap-3 border-l-2 px-3 py-3 text-left hover:bg-ink2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accentText ${
        active ? 'border-accent bg-ink3' : 'border-transparent'
      }`}
    >
      <Avatar name={student.name} size={40} decorative />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate font-display text-sm font-semibold text-bone0">{student.name}</span>
          {last && <span className="shrink-0 font-mono text-[10px] text-ink6">{listTimeLabel(last.created_at)}</span>}
        </span>
        <span className="flex items-center justify-between gap-2">
          <span className="truncate font-body text-[13px] text-ink6">{previewText(last, true)}</span>
          {badge && (
            <span className="shrink-0 rounded-full bg-accent px-1.5 text-center font-mono text-[10px] font-semibold leading-[18px] text-accentInk">
              <span aria-hidden="true">{badge}</span>
              <span className="sr-only">{unread} sin leer</span>
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
