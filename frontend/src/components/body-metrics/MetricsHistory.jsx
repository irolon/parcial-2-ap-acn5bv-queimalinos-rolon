import { Trash2 } from 'lucide-react';
import Card from '@/components/shared/ui/Card';
import { formatBmi, formatMetricDate, formatNumber } from '@/utils/body-metrics/metrics';

const cell = (value, unit) => (value == null ? '—' : `${formatNumber(value)} ${unit}`);
const TH = 'px-2 py-2 text-left font-mono text-[10px] font-normal uppercase tracking-[0.8px] text-ink6';
const TD = 'px-2 py-2 font-body text-sm text-bone0';

/**
 * Tabla de medidas de la más nueva a la más vieja; `onDelete(metric)` pide borrar una fila.
 * `canDelete(metric)` dice en cuáles se ofrece (por defecto, en todas: el entrenador borra cualquiera);
 * si en ninguna, la tabla no lleva la columna de acciones.
 */
export default function MetricsHistory({ metrics, onDelete, canDelete = () => true }) {
  const rows = [...metrics].reverse();
  const withActions = rows.some((m) => canDelete(m));
  return (
    <Card title="Historial de medidas">
      {rows.length === 0 ? (
        <p className="font-body text-sm text-ink6">El historial está vacío</p>
      ) : (
        <div className="overflow-x-auto">
          <table aria-label="Historial de medidas" className="w-full min-w-[420px] border-collapse">
            <thead>
              <tr>
                {['Fecha', 'Peso', 'IMC', '% grasa', 'Cintura'].map((h) => (
                  <th key={h} scope="col" className={TH}>
                    {h}
                  </th>
                ))}
                {withActions && (
                  <th scope="col" className="w-12">
                    <span className="sr-only">Acciones</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const date = formatMetricDate(m.recorded_at);
                return (
                  <tr key={m.id} className="border-t border-ink3">
                    <td className={TD}>{date}</td>
                    <td className={TD}>{cell(m.weight_kg, 'kg')}</td>
                    <td className={TD}>{m.bmi == null ? '—' : formatBmi(m.bmi)}</td>
                    <td className={TD}>{cell(m.body_fat_pct, '%')}</td>
                    <td className={TD}>{cell(m.waist_cm, 'cm')}</td>
                    {withActions && (
                      <td className="px-2 py-1">
                        {canDelete(m) && (
                          <button
                            type="button"
                            aria-label={`Borrar medida del ${date}`}
                            onClick={() => onDelete?.(m)}
                            className="inline-flex size-11 cursor-pointer items-center justify-center rounded-md text-ink6 hover:text-hot focus-visible:outline-2 focus-visible:outline-accentText"
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
