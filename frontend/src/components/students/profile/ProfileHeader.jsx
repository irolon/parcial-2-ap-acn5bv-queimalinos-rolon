import { Phone } from 'lucide-react';
import Avatar from '@/components/shared/ui/Avatar';
import Pill from '@/components/shared/ui/Pill';
import StudentStatusPill from '@/components/students/StudentStatusPill';
import { activityStatus } from '@/utils/students/activity';
import { ageFrom } from '@/utils/students/age';
import { whatsappHref } from '@/utils/students/profile/phone';
import { goalLabel, levelLabel } from '@/utils/students/studentOptions';

/** El teléfono del alumno con link a WhatsApp (GX2); si no alcanza para un link, como texto. */
function PhoneLine({ phone }) {
  const href = whatsappHref(phone);
  const content = (
    <>
      <Phone size={14} aria-hidden="true" />
      {phone}
    </>
  );
  const classes = 'inline-flex items-center gap-1.5 font-body text-sm';
  if (!href) return <p className={`${classes} text-ink6`}>{content}</p>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Escribir por WhatsApp a ${phone}`}
      className={`${classes} rounded text-accentText underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accentText`}
    >
      {content}
    </a>
  );
}

/** Avatar (con su foto), nombre, edad · nivel, teléfono y pills de estado y objetivo. */
export default function ProfileHeader({ student, now }) {
  const age = ageFrom(student.birth_date, now);
  const details = [age !== null && `${age} años`, levelLabel(student.level)].filter(Boolean);
  const goal = goalLabel(student.goal);
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <Avatar name={student.name} src={student.avatar_url} size={72} decorative />
      <h2 className="font-display text-lg font-semibold text-bone0">{student.name}</h2>
      {details.length > 0 && <p className="font-body text-sm text-ink6">{details.join(' · ')}</p>}
      {student.phone && <PhoneLine phone={student.phone} />}
      <div className="flex flex-wrap justify-center gap-2">
        <StudentStatusPill status={activityStatus(student, now)} showUpToDate />
        {goal && <Pill tone="neutral">{goal}</Pill>}
      </div>
    </div>
  );
}
