import AchievementBlock from '@/components/achievements/AchievementBlock';
import AchievementList from '@/components/achievements/AchievementList';
import ChallengeProgressList from '@/components/achievements/ChallengeProgressList';
import LockedAchievementList from '@/components/achievements/LockedAchievementList';
import { categoryIcon } from '@/components/achievements/categoryIcon';
import Card from '@/components/shared/ui/Card';
import {
  useAchievementProgressQuery,
  useStudentChallengesQuery,
  useStudentStreakQuery,
} from '@/hooks/achievements/useStudentGamification';
import { splitAchievements } from '@/utils/achievements/achievementProgress';
import { plural } from '@/utils/shared/plural';

const { Icon: StreakIcon } = categoryIcon('streak');

const days = (n) => plural(n, 'día', 'días');

function Streak({ streak }) {
  const current = streak.current_streak_days ?? 0;
  const record = streak.longest_streak_days ?? 0;
  if (current === 0 && record === 0) return <p className="font-body text-sm text-ink6">Todavía no tenés racha</p>;
  return (
    <p className={`flex items-center gap-2 font-display text-sm font-semibold ${current > 0 ? 'text-hot' : 'text-ink6'}`}>
      <StreakIcon size={18} className="shrink-0" aria-hidden="true" />
      Racha actual {days(current)} · Récord {days(record)}
    </p>
  );
}

// Los que ya desbloqueó, con su fecha, y debajo los que le faltan, en gris y con su avance.
function Achievements({ items }) {
  const { unlocked, locked } = splitAchievements(items);
  return (
    <div className="flex flex-col gap-3.5">
      <AchievementList items={unlocked} viewer="student" />
      <LockedAchievementList items={locked} />
    </div>
  );
}

/**
 * "Racha y logros" del propio alumno, para Mi progreso: su racha actual y su récord, sus logros (desbloqueados con su
 * fecha y bloqueados con su avance, de `/achievements/progress`) y sus desafíos (activos con barra, más el historial).
 * Reutiliza las listas del entrenador con `viewer="student"`; no tiene acciones (asignar, crear o borrar desafíos).
 * Cada bloque carga y falla por su cuenta, con su Reintentar.
 */
export default function MyAchievements({ studentId }) {
  const streak = useStudentStreakQuery(studentId);
  const progress = useAchievementProgressQuery(studentId);
  const challenges = useStudentChallengesQuery(studentId);
  return (
    <Card title="Racha y logros" role="region" aria-label="Racha y logros">
      <div className="flex flex-col gap-5">
        <AchievementBlock
          title="Tu racha"
          query={streak}
          loadingLabel="Cargando tu racha…"
          errorMessage="No pudimos cargar tu racha."
        >
          {(data) => <Streak streak={data} />}
        </AchievementBlock>
        <AchievementBlock
          title="Tus logros"
          query={progress}
          loadingLabel="Cargando tus logros…"
          errorMessage="No pudimos cargar tus logros."
        >
          {(data) => <Achievements items={data.achievements ?? []} />}
        </AchievementBlock>
        <AchievementBlock
          title="Tus desafíos"
          query={challenges}
          loadingLabel="Cargando tus desafíos…"
          errorMessage="No pudimos cargar tus desafíos."
        >
          {(items) => <ChallengeProgressList items={items} viewer="student" />}
        </AchievementBlock>
      </div>
    </Card>
  );
}
