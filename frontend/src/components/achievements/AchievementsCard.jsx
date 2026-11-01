import { categoryIcon } from '@/components/achievements/categoryIcon';
import AchievementList from '@/components/achievements/AchievementList';
import ChallengeProgressList from '@/components/achievements/ChallengeProgressList';
import ErrorState from '@/components/shared/states/ErrorState';
import LoadingState from '@/components/shared/states/LoadingState';
import Card from '@/components/shared/ui/Card';
import {
  useStudentAchievementsQuery,
  useStudentChallengesQuery,
  useStudentStreakQuery,
} from '@/hooks/achievements/useStudentGamification';
import { durationLabel } from '@/utils/challenges/challengeFormat';

const { Icon: StreakIcon } = categoryIcon('streak');

/** Un bloque con su propia carga y error. */
function Block({ title, query, children }) {
  let body;
  if (query.isPending) body = <LoadingState rows={1} />;
  else if (query.isError) body = <ErrorState message={query.error?.message} onRetry={() => query.refetch()} />;
  else body = children(query.data);
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="font-display text-xs font-semibold uppercase tracking-wide text-ink6">{title}</h3>
      {body}
    </section>
  );
}

/** Racha, logros y desafíos de un alumno. */
export default function AchievementsCard({ studentId }) {
  const streak = useStudentStreakQuery(studentId);
  const achievements = useStudentAchievementsQuery(studentId);
  const challenges = useStudentChallengesQuery(studentId);
  return (
    <Card title="Logros y racha">
      <div className="flex flex-col gap-5">
        <Block title="Racha" query={streak}>
          {(s) => (
            <p className="flex items-center gap-2 font-display text-sm font-semibold text-hot">
              <StreakIcon size={18} className="shrink-0" aria-hidden="true" />
              Racha actual {durationLabel(s.current_streak_days)} · Mejor {durationLabel(s.longest_streak_days)}
            </p>
          )}
        </Block>
        <Block title="Logros" query={achievements}>
          {(items) => <AchievementList items={items} />}
        </Block>
        <Block title="Desafíos" query={challenges}>
          {(items) => <ChallengeProgressList items={items} />}
        </Block>
      </div>
    </Card>
  );
}
