import { Link } from 'react-router';
import Avatar from '@/components/shared/ui/Avatar';
import Card from '@/components/shared/ui/Card';
import Pill from '@/components/shared/ui/Pill';
import { STUDENTS_PATH, profileHref } from '@/routes/routeTable';
import { lastSessionLabel } from '@/utils/students/activity';
import { inactiveStudents } from '@/utils/students/studentFilters';

export default function InactivityAlerts({ students, now }) {
  const alerts = inactiveStudents(students, now);
  return (
    <Card
      title="Alertas de inactividad"
      extra={
        <Link to={`${STUDENTS_PATH}?estado=inactivos`} className="font-mono text-xs text-accentText hover:underline">
          Ver todos
        </Link>
      }
    >
      {alerts.length === 0 ? (
        <p className="font-body text-sm text-ink6">Todos tus alumnos entrenaron en la última semana</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {alerts.map((s) => (
            <li key={s.id}>
              <Link
                to={profileHref(s.id)}
                className="flex items-center gap-3 rounded-lg border border-hot/25 p-3 hover:bg-white/[0.04]"
              >
                <Avatar name={s.name} size={36} tone="hot" decorative />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-sm font-semibold text-bone0">{s.name}</span>
                  <span className="font-mono text-[11px] text-ink6">{lastSessionLabel(s, now)}</span>
                </span>
                <Pill tone="hot">Inactivo</Pill>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
