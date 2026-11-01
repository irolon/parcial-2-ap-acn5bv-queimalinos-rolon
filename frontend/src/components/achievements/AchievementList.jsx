import { categoryIcon } from '@/components/achievements/categoryIcon';
import { formatDateAR } from '@/utils/dates';

/**
 * Logros desbloqueados, el más nuevo primero. `viewer` es quién mira (`'trainer'` por defecto o `'student'`) y solo
 * cambia el texto del vacío: tercera persona para el entrenador y segunda para el alumno.
 */
export default function AchievementList({ items, viewer = 'trainer' }) {
  if (items.length === 0) {
    const text = viewer === 'student' ? 'Todavía no desbloqueaste logros' : 'Todavía no desbloqueó logros';
    return <p className="font-body text-sm text-ink6">{text}</p>;
  }
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map(({ id, unlocked_at: unlockedAt, achievement }) => {
        const { Icon, className } = categoryIcon(achievement.category);
        return (
          <li key={id} className="flex items-center gap-3">
            <Icon size={18} className={`shrink-0 ${className}`} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate font-body text-sm text-bone0" title={achievement.description}>
              {achievement.name}
            </span>
            <span className="font-mono text-xs text-ink6">{formatDateAR(unlockedAt)}</span>
          </li>
        );
      })}
    </ul>
  );
}
