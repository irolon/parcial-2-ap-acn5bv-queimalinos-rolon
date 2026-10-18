import { LogOut } from 'lucide-react';
import Avatar from '@/components/shared/ui/Avatar';
import Button from '@/components/shared/ui/Button';
import { COMPACT_HIDDEN, COMPACT_SR_ONLY } from './compact';

/** Pie del sidebar: quién está logueado y el botón para salir. */
export default function UserBlock({ user, onLogout }) {
  return (
    <div className="border-t border-ink3 p-3">
      <div className="mb-2.5 flex items-center gap-2.5 md:max-lg:justify-center">
        <Avatar name={user?.name ?? ''} size={32} />
        <div className={`min-w-0 flex-1 ${COMPACT_HIDDEN}`}>
          <p className="truncate font-display text-xs font-semibold text-bone0">{user?.name}</p>
          <p className="truncate font-mono text-[10px] text-ink6">{user?.email}</p>
        </div>
      </div>
      <Button variant="ghost" size="sm" full onClick={onLogout} title="Cerrar sesión">
        <LogOut size={14} aria-hidden="true" />
        <span className={COMPACT_SR_ONLY}>Cerrar sesión</span>
      </Button>
    </div>
  );
}
