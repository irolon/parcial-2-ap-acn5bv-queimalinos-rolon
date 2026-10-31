import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import Avatar from '@/components/shared/ui/Avatar';
import { profileHref } from '@/routes/routeTable';

const ACTION =
  'rounded-md px-2 py-1 font-display text-xs font-medium text-bone0 hover:bg-ink2 focus-visible:outline-2 focus-visible:outline-accentText';

/** Encabezado: avatar y nombre del otro. El PT suma "Ver ficha"; `onBack` agrega "Volver" (paneles en mobile). */
export default function ConversationHeader({ counterpart, studentId, viewerRole, onBack }) {
  const name = counterpart?.name ?? '';
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-ink2 px-4 py-3">
      {onBack && (
        <button type="button" onClick={onBack} aria-label="Volver" className={`cursor-pointer ${ACTION}`}>
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
      )}
      <Avatar name={name} size={36} decorative />
      <h2 className="min-w-0 flex-1 truncate font-display text-sm font-semibold text-bone0">{name}</h2>
      {viewerRole === 'trainer' && (
        <Link to={profileHref(studentId)} className={ACTION}>
          Ver ficha
        </Link>
      )}
    </header>
  );
}
