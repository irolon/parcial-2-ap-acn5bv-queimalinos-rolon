import { categoryIcon } from '@/components/achievements/categoryIcon';
import Block from '@/components/achievements/AchievementBlock';
import AchievementList from '@/components/achievements/AchievementList';
import ChallengeProgressList from '@/components/achievements/ChallengeProgressList';
import Card from '@/components/shared/ui/Card';
import {
  useStudentAchievementsQuery,
  useStudentChallengesQuery,
  useStudentStreakQuery,
} from '@/hooks/achievements/useStudentGamification';
import { durationLabel } from '@/utils/challenges/challengeFormat';

const { Icon: StreakIcon } = categoryIcon('streak');

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
