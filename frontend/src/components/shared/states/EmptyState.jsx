import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title = 'Todavía no hay nada', text }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <Icon size={28} className="text-ink5" aria-hidden="true" />
      <p className="font-display text-[15px] font-semibold text-bone0">{title}</p>
      {text && <p className="max-w-sm font-body text-sm text-ink6">{text}</p>}
    </div>
  );
}
