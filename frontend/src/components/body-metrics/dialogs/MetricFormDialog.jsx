import { useState } from 'react';
import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';
import Input from '@/components/shared/ui/Input';
import { useCreateMetric } from '@/hooks/body-metrics/useBodyMetrics';
import { METRIC_FIELDS, buildMetricBody, latestByField, validateMetricBody } from '@/utils/body-metrics/metrics';
import { localInputValue } from '@/utils/dates';
import { NO_FIELD_ERRORS, fieldErrorsFrom } from '@/utils/fieldErrors';

const FORM_ID = 'metric-form';
const FUTURE_ERROR = 'La fecha no puede ser futura';
const LABELS = {
  weight_kg: 'Peso (kg)',
  height_cm: 'Talla (cm)',
  body_fat_pct: '% grasa',
  waist_cm: 'Cintura (cm)',
  hip_cm: 'Cadera (cm)',
  chest_cm: 'Pecho (cm)',
};

/**
 * Carga una medida. El `id` se genera una vez al abrir: reintentar tras un error de red manda el mismo
 * y el backend no duplica. La página lo monta con otra `key` en cada apertura.
 * La talla se precarga con la última cargada en el historial (`metrics`).
 * La fecha arranca en la hora de apertura; vacía toma la del guardado y lo futuro se valida al guardar (sin `max`).
 * `title` es el título del diálogo: "Cargar medida" para el entrenador y "Registrar medición" para el alumno.
 */
export default function MetricFormDialog({ studentId, metrics = [], title = 'Cargar medida', onClose }) {
  const [id] = useState(() => crypto.randomUUID());
  const [openedAt] = useState(() => localInputValue());
  const [errors, setErrors] = useState(NO_FIELD_ERRORS);
  const create = useCreateMetric(studentId);
  const saving = create.isPending;
  const { fields } = errors;
  const lastHeight = latestByField(metrics, 'height_cm').value;

  async function handleSubmit(event) {
    event.preventDefault();
    if (create.isPending) return;
    const data = new FormData(event.currentTarget);
    const now = localInputValue();
    const recordedAt = String(data.get('recorded_at') || '') || now;
    const body = buildMetricBody(Object.fromEntries(data), { id, recordedAt });
    const clientErrors = validateMetricBody(body);
    if (recordedAt > now) clientErrors.recorded_at = FUTURE_ERROR;
    if (Object.keys(clientErrors).length > 0) {
      const { form, ...byField } = clientErrors;
      setErrors({ form: form ?? null, fields: byField });
      return;
    }
    setErrors(NO_FIELD_ERRORS);
    try {
      await create.mutateAsync(body);
      onClose();
    } catch (error) {
      setErrors(
        fieldErrorsFrom(error, { fields: [...METRIC_FIELDS, 'recorded_at'], fallback: 'No pudimos guardar la medida' }),
      );
    }
  }

  return (
    <Dialog
      open
      dismissible={!saving}
      onOpenChange={(next) => !next && onClose()}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={saving}>
            Guardar
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={handleSubmit} className="grid grid-cols-2 gap-3.5">
        {errors.form && (
          <p
            role="alert"
            className="col-span-2 rounded-md border border-hot/25 bg-hot/[0.14] px-3 py-2.5 font-body text-sm text-hot"
          >
            {errors.form}
          </p>
        )}
        {METRIC_FIELDS.map((field) => (
          <Input
            key={field}
            label={LABELS[field]}
            name={field}
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            defaultValue={field === 'height_cm' ? (lastHeight ?? '') : ''}
            error={fields[field]}
          />
        ))}
        <Input
          className="col-span-2"
          label="Fecha y hora"
          name="recorded_at"
          type="datetime-local"
          defaultValue={openedAt}
          error={fields.recorded_at}
        />
      </form>
    </Dialog>
  );
}
