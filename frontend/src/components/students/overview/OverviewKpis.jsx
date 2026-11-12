import LoadingState from '@/components/shared/states/LoadingState';
import Card from '@/components/shared/ui/Card';
import Stat from '@/components/shared/ui/Stat';
import { deltaLabel } from '@/utils/students/overviewFormat';

const TONES = { good: 'text-good', bad: 'text-hot', neutral: 'text-ink6' };

function Kpi({ caption, tone = 'neutral', ...stat }) {
  return (
    <Card padding={18} data-kpi>
      <Stat big {...stat} />
      {caption && <div className={`mt-2 font-mono text-[11px] ${TONES[tone]}`}>{caption}</div>}
    </Card>
  );
}

function adherenceCaption({ pct, delta }) {
  if (pct == null) return { caption: 'Ningún alumno tiene plan asignado' };
  if (delta == null) return {};
  const tone = (delta > 0 && 'good') || (delta < 0 && 'bad') || 'neutral';
  return { caption: `${deltaLabel(delta)} vs. semana anterior`, tone };
}

/** Los 4 indicadores del Dashboard, con la semántica del Inicio del celular. Sin `overview`, cargando. */
export default function OverviewKpis({ overview }) {
  if (!overview) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} padding={18}>
            <LoadingState rows={1} label="Cargando el resumen…" />
          </Card>
        ))}
      </div>
    );
  }
  const { active_students: active, sessions_today: today, adherence_7d: adherence, at_risk: atRisk } = overview;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Kpi
        label="Alumnos activos"
        value={active.count}
        accent
        caption={active.new_7d > 0 ? `+${active.new_7d} en los últimos 7 días` : null}
        tone="good"
      />
      <Kpi
        label="Sesiones hoy"
        value={today.done}
        unit={`/${today.expected}`}
        caption={today.expected === 0 ? 'Hoy nadie tiene entrenamiento asignado' : null}
      />
      <Kpi
        label="Adherencia 7 días"
        value={adherence.pct ?? '—'}
        unit={adherence.pct == null ? null : '%'}
        {...adherenceCaption(adherence)}
      />
      <Kpi label="En riesgo" value={atRisk} hot={atRisk > 0} caption="7 días o más sin entrenar" />
    </div>
  );
}
