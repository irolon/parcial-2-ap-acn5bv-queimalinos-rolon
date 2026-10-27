import Avatar from '@/components/shared/ui/Avatar';
import Pill from '@/components/shared/ui/Pill';
import StudentStatusPill from '@/components/students/StudentStatusPill';
import { activityStatus } from '@/utils/students/activity';
import { ageFrom } from '@/utils/students/age';
import { goalLabel, levelLabel } from '@/utils/students/studentOptions';

/** Avatar, nombre, edad · nivel y pills de estado y objetivo. */
export default function ProfileHeader({ student, now }) {
  const age = ageFrom(student.birth_date, now);
  const details = [age !== null && `${age} años`, levelLabel(student.level)].filter(Boolean);
  const goal = goalLabel(student.goal);
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <Avatar name={student.name} size={72} decorative />
      <h2 className="font-display text-lg font-semibold text-bone0">{student.name}</h2>
      {details.length > 0 && <p className="font-body text-sm text-ink6">{details.join(' · ')}</p>}
      <div className="flex flex-wrap justify-center gap-2">
        <StudentStatusPill status={activityStatus(student, now)} showUpToDate />
        {goal && <Pill tone="neutral">{goal}</Pill>}
      </div>
    </div>
  );
}
