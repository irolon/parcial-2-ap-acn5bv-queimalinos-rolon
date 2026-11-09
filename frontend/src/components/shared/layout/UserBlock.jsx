import { LogOut, Settings } from 'lucide-react';
import { Link } from 'react-router';
import Avatar from '@/components/shared/ui/Avatar';
import Button from '@/components/shared/ui/Button';
import { MY_PROFILE_PATH, ROLES, TRAINER_ACCOUNT } from '@/routes/routeTable';
import { COMPACT_HIDDEN, COMPACT_SR_ONLY, FOCUS_RING } from './compact';

const SETTINGS_CLASSES =
  'inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.14] px-2.5 text-bone0 ' +
  `transition-colors hover:bg-white/[0.06] ${FOCUS_RING}`;

/** La cuenta del PT es Tu cuenta; la del alumno está en Mi perfil. */
const settingsPath = (role) => (role === ROLES.TRAINER ? TRAINER_ACCOUNT.path : MY_PROFILE_PATH);

/** Pie del sidebar: quién está logueado, Configuración (su cuenta) y el botón para salir. */
export default function UserBlock({ user, onLogout, onNavigate }) {
  return (
    <div className="border-t border-ink3 p-3">
      <div className="mb-2.5 flex items-center gap-2.5 md:max-lg:justify-center">
        <Avatar name={user?.name ?? ''} src={user?.avatar_url} size={32} decorative />
        <div className={`min-w-0 flex-1 ${COMPACT_HIDDEN}`}>
          <p className="truncate font-display text-xs font-semibold text-bone0">{user?.name}</p>
          <p className="truncate font-mono text-[10px] text-ink6">{user?.email}</p>
        </div>
      </div>
      <div className="flex gap-2 md:max-lg:flex-col">
        <Link
          to={settingsPath(user?.role)}
          onClick={onNavigate}
          aria-label="Configuración"
          title="Configuración"
          className={SETTINGS_CLASSES}
        >
          <Settings size={14} aria-hidden="true" />
        </Link>
        <Button variant="ghost" size="sm" onClick={onLogout} title="Cerrar sesión" className="min-w-0 flex-1">
          <LogOut size={14} aria-hidden="true" />
          <span className={COMPACT_SR_ONLY}>Cerrar sesión</span>
        </Button>
      </div>
    </div>
  );
}
