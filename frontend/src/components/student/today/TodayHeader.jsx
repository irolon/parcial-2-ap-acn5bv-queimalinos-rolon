import { Flame } from 'lucide-react';
import Pill from '@/components/shared/ui/Pill';
import { greetingDate } from '@/utils/dates';
import { plural } from '@/utils/shared/plural';

/** Encabezado de Hoy: el saludo, la fecha en Argentina y, si hay racha, la pastilla "Racha N días". */
export default function TodayHeader({ name, now, streakDays }) {
  const firstName = (name ?? '').trim().split(/\s+/)[0];
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-2xl font-bold tracking-[-0.5px] text-bone0">
          {firstName ? `Hola, ${firstName}` : 'Hola'}
        </h2>
        <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.5px] text-ink6">{greetingDate(now)}</p>
      </div>
      {streakDays > 0 && (
        <Pill tone="hot" size="md">
          <Flame size={13} aria-hidden="true" />
          Racha {plural(streakDays, 'día', 'días')}
        </Pill>
      )}
    </header>
  );
}
