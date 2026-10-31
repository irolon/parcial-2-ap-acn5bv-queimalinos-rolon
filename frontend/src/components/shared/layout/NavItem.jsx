import { NavLink } from 'react-router';
import { COMPACT_SR_ONLY, FOCUS_RING } from './compact';

const base = `group relative mb-0.5 flex items-center gap-2.5 rounded-sm px-2.5 py-[9px] font-display text-[13px] transition-colors md:max-lg:justify-center ${FOCUS_RING}`;

/** Ítem del sidebar. NavLink marca el activo con `aria-current="page"`. `badge` es un contador opcional. */
export default function NavItem({ to, icon: Icon, label, onNavigate, badge }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `${base} ${
          isActive
            ? 'bg-ink3 font-semibold text-bone0'
            : 'font-medium text-ink6 hover:bg-ink2 hover:text-bone0'
        }`
      }
    >
      <Icon size={16} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
      <span className={`flex-1 ${COMPACT_SR_ONLY}`}>{label}</span>
      {badge}
      {/* Tooltip del modo íconos */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-full top-1/2 z-30 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-sm border border-ink3 bg-ink2 px-2 py-1 font-display text-xs font-medium text-bone0 md:max-lg:group-hover:block md:max-lg:group-focus-visible:block"
      >
        {label}
      </span>
    </NavLink>
  );
}
