import { LineChart } from 'lucide-react';
import { MIN_POINTS } from '@/utils/progress/metrics';

/** Aviso cuando todavía no alcanzan los datos para dibujar el gráfico. */
export default function NotEnoughData({ count, exerciseName, rangeLimited = false, metricLimited = false }) {
  let text;
  if (exerciseName && metricLimited) text = 'Pocos datos de esta métrica: probá con otra';
  else if (exerciseName && rangeLimited) text = 'Pocos entrenamientos en este rango: probá con Todo';
  else if (exerciseName) text = `Llevás ${count} de ${MIN_POINTS} entrenamientos de ${exerciseName}: después del tercero vas a ver tu progresión acá`;
  else text = `Llevás ${count} de ${MIN_POINTS} semanas entrenadas: después de la tercera vas a ver tu volumen semanal acá`;
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <LineChart size={28} className="text-ink5" aria-hidden="true" />
      <p className="max-w-sm font-body text-sm text-ink6">{text}</p>
    </div>
  );
}
