import { categoryIcon } from '@/components/achievements/categoryIcon';
import { progressLabel } from '@/utils/achievements/achievementProgress';

/**
 * Los logros que todavía no se desbloquearon, en gris y con su avance ("7/10 sesiones"). El avance va a la derecha del
 * nombre y, en una pantalla angosta, debajo de él, para que el nombre no se corte.
 */
export default function LockedAchievementList({ items }) {
  if (items.length === 0) return null;
  return (
    <ul aria-label="Logros por desbloquear" className="flex flex-col gap-2.5">
      {items.map((item) => {
        const { Icon } = categoryIcon(item.category);
        const progress = progressLabel(item);
        return (
          <li
            key={item.id}
            className="grid grid-cols-[18px_minmax(0,1fr)] items-center gap-x-3 gap-y-0.5 sm:grid-cols-[18px_minmax(0,1fr)_auto]"
          >
            <Icon size={18} className="text-ink5" aria-hidden="true" />
            <span className="truncate font-body text-sm text-ink6" title={item.description}>
              {item.name}
            </span>
            {progress && <span className="col-start-2 font-mono text-xs text-ink6 sm:col-start-3">{progress}</span>}
          </li>
        );
      })}
    </ul>
  );
}
