import { categoryIcon } from '@/components/achievements/categoryIcon';
import { progressLabel } from '@/utils/achievements/achievementProgress';

/** Los logros que todavía no se desbloquearon, en gris y con su avance ("7/10 sesiones"). */
export default function LockedAchievementList({ items }) {
  if (items.length === 0) return null;
  return (
    <ul aria-label="Logros por desbloquear" className="flex flex-col gap-2.5">
      {items.map((item) => {
        const { Icon } = categoryIcon(item.category);
        const progress = progressLabel(item);
        return (
          <li key={item.id} className="flex items-center gap-3">
            <Icon size={18} className="shrink-0 text-ink5" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate font-body text-sm text-ink6" title={item.description}>
              {item.name}
            </span>
            {progress && <span className="font-mono text-xs text-ink6">{progress}</span>}
          </li>
        );
      })}
    </ul>
  );
}
