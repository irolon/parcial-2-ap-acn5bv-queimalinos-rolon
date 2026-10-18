import BrandMark from '@/components/shared/ui/BrandMark';
import NavItem from './NavItem';
import UserBlock from './UserBlock';
import { COMPACT_HIDDEN } from './compact';

/** Estructura común a los dos sidebars: logo, navegación, pie y usuario. */
export default function SidebarFrame({ subtitle, nav, footer, user, onLogout, onNavigate }) {
  return (
    <div className="flex h-full w-full flex-col border-r border-ink3 bg-ink1">
      <div className="flex items-center gap-2 px-[18px] pb-6 pt-[18px] md:max-lg:justify-center md:max-lg:px-0">
        <BrandMark />
        <div className={COMPACT_HIDDEN}>
          <p className="font-display text-[15px] font-bold tracking-[-0.3px] text-bone0">FitTrainer</p>
          <p className="font-mono text-[9px] tracking-[0.5px] text-ink6">{subtitle}</p>
        </div>
      </div>
      <nav aria-label="Navegación principal" className="flex-1 px-2.5 md:max-lg:px-3">
        <ul>
          {nav.items.map((item) => (
            <li key={item.path}>
              <NavItem
                to={`${nav.base}/${item.path}`}
                icon={item.icon}
                label={item.label}
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>
      </nav>
      {footer}
      <UserBlock user={user} onLogout={onLogout} />
    </div>
  );
}

/** "PRO · LAURA": primer nombre en mayúsculas. */
export function roleSubtitle(prefix, name = '') {
  const first = name.trim().split(/\s+/)[0] ?? '';
  return first ? `${prefix} · ${first.toLocaleUpperCase('es-AR')}` : prefix;
}
