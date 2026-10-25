import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Card from '@/components/shared/ui/Card';
import { formatMetricDate, weightSeries } from '@/utils/body-metrics/metrics';

const AXIS = { stroke: 'var(--color-ink6)', fontSize: 11 };

/** Evolución del peso; con menos de dos pesos, un aviso en lugar del gráfico. */
export default function WeightChart({ metrics }) {
  const data = weightSeries(metrics);
  return (
    <Card title="Evolución del peso" extra={data.length >= 2 && <span className="font-mono text-xs text-ink6">kg</span>}>
      {data.length < 2 ? (
        <p className="font-body text-sm text-ink6">Cargá al menos dos pesos para ver la evolución</p>
      ) : (
        <div role="img" aria-label="Evolución del peso" className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--color-ink3)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatMetricDate} {...AXIS} />
              <YAxis domain={['dataMin - 2', 'dataMax + 2']} width={44} {...AXIS} />
              <Tooltip
                labelFormatter={formatMetricDate}
                formatter={(value) => [`${value} kg`, 'Peso']}
                contentStyle={{ background: 'var(--color-ink2)', border: '1px solid var(--color-ink4)' }}
              />
              <Line type="monotone" dataKey="weight" stroke="var(--color-accentText)" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
