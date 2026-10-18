import { Bell, Menu, Search } from 'lucide-react';
import Avatar from '@/components/shared/ui/Avatar';
import { ROLES } from '@/routes/routeTable';
import { FOCUS_RING } from './compact';

const iconBox =
  'flex size-9 shrink-0 items-center justify-center rounded-md border border-ink3 bg-ink2 text-ink6';

// Búsqueda y campana del entrenador: por ahora solo visuales.
function TrainerActions() {
  return (
    <div className="flex items-center gap-2.5">
      <div
        aria-hidden="true"
        data-testid="topbar-search"
        className="hidden h-9 w-[180px] items-center gap-2 rounded-md border border-ink3 bg-ink2 px-3 font-body text-xs text-ink6 md:flex lg:w-[220px]"
      >
        <Search size={14} />
        Buscar…
        <span className="ml-auto rounded-[4px] border border-ink3 px-[5px] py-0.5 font-mono text-[9px]">
          ⌘K
        </span>
      </div>
      <div aria-hidden="true" data-testid="topbar-search-icon" className={`${iconBox} md:hidden`}>
        <Search size={16} />
      </div>
      <div role="img" aria-label="Notificaciones" className={iconBox}>
        <Bell size={16} aria-hidden="true" />
      </div>
    </div>
  );
}

export default function Topbar({ title, subtitle, role, user, menuOpen, onMenu, menuButtonRef }) {
  return (
    <header className="flex h-[68px] shrink-0 items-center gap-3 border-b border-ink2 bg-ink1 px-4 md:gap-4 md:px-7">
      <button
        ref={menuButtonRef}
        type="button"
        onClick={onMenu}
        aria-label="Abrir menú"
        aria-expanded={menuOpen}
        aria-controls="mobile-drawer"
        className={`${iconBox} cursor-pointer hover:text-bone0 md:hidden ${FOCUS_RING}`}
      >
        <Menu size={18} aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-lg font-semibold tracking-[-0.3px] text-bone0">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 truncate font-mono text-[10px] tracking-[0.5px] text-ink6">{subtitle}</p>
        )}
      </div>
      {role === ROLES.TRAINER ? (
        <TrainerActions />
      ) : (
        <Avatar name={user?.name ?? ''} size={36} tone="accent" />
      )}
    </header>
  );
}
