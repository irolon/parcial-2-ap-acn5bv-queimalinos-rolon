import { useEffect, useId, useRef } from 'react';
import { Link } from 'react-router';
import { Check, Trophy } from 'lucide-react';
import Card from '@/components/shared/ui/Card';
import { FOCUS_RING } from '@/components/shared/layout/compact';
import { ROLES, STUDENT_NAV, homeFor } from '@/routes/routeTable';
import { formatKg } from '@/utils/progress/format';
import { plural } from '@/utils/shared/plural';
import { totals } from '@/utils/workout/workoutState';

const HISTORY_PATH = `${STUDENT_NAV.base}/historial`;
const LINK = `inline-flex h-11 items-center justify-center rounded-lg border px-[18px] font-display text-sm font-semibold ${FOCUS_RING}`;

/**
 * El resumen cuando el entrenamiento ya se guardó: "N series · X kg · Y min" (las que el servidor rechazó no
 * cuentan), los logros que se desbloquearon, cuántas series no se pudieron guardar y adónde seguir.
 * `result` es lo que devuelve `upload()`: `{ state, unlocked, failed }`.
 */
export default function WorkoutSummary({ result }) {
  const achievementsId = useId();
  const titleRef = useRef(null);
  const { sets, volumeKg, minutes } = totals(result.state);
  const rejected = result.failed.length;
  // Reemplaza a la pantalla de guardado: el foco va al título para que el lector de pantalla lo anuncie.
  useEffect(() => titleRef.current?.focus(), []);
  return (
    <Card padding={32} className="mx-auto w-full max-w-xl">
      <div className="flex flex-col items-center gap-4 text-center">
        <div aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-good/15 text-good">
          <Check size={28} />
        </div>
        <h2 ref={titleRef} tabIndex={-1} className="font-display text-2xl font-bold tracking-[-0.5px] text-bone0 outline-none">
          ¡Entrenamiento guardado!
        </h2>
        <p className="font-mono text-sm text-ink6">
          {`${plural(sets, 'serie', 'series')} · ${formatKg(volumeKg)} · ${minutes} min`}
        </p>
        {result.unlocked.length > 0 && (
          <section className="w-full rounded-lg border border-ink3 bg-ink2 p-4 text-left">
            <h3 id={achievementsId} className="mb-2 font-mono text-[10px] uppercase tracking-[1.5px] text-ink6">
              Logros desbloqueados
            </h3>
            <ul aria-labelledby={achievementsId} className="flex flex-col gap-2">
              {result.unlocked.map((achievement) => (
                <li key={achievement.id ?? achievement.code} className="flex items-center gap-2 font-display text-base font-semibold text-bone0">
                  <Trophy size={18} className="shrink-0 text-warn" aria-hidden="true" />
                  {achievement.name}
                </li>
              ))}
            </ul>
          </section>
        )}
        {rejected > 0 && (
          <p role="alert" className="font-body text-sm text-hot">
            {rejected === 1 ? '1 serie no se pudo guardar' : `${rejected} series no se pudieron guardar`}
          </p>
        )}
        <div className="mt-2 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to={HISTORY_PATH} replace className={`${LINK} border-white/[0.14] text-bone0 hover:bg-white/[0.06]`}>
            Ver historial
          </Link>
          <Link
            to={homeFor(ROLES.STUDENT)}
            replace
            className={`${LINK} border-transparent bg-accent text-accentInk hover:bg-accentDim`}
          >
            Volver a Hoy
          </Link>
        </div>
      </div>
    </Card>
  );
}
