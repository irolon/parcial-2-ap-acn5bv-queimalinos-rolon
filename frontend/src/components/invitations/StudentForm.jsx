import { QrCode } from 'lucide-react';
import Button from '@/components/shared/ui/Button';
import Input from '@/components/shared/ui/Input';
import Select from '@/components/shared/ui/Select';
import {
  GOAL_OPTIONS,
  LEVEL_OPTIONS,
  PHONE_HINT,
  PHONE_PREFIX,
} from './studentFormOptions';

/**
 * Columna izquierda: datos del alumno. Formulario no controlado; para limpiarlo,
 * la página lo vuelve a montar con otra `key`.
 */
export default function StudentForm({ errors, submitting, onSubmit }) {
  const { fields } = errors;
  return (
    <section aria-labelledby="student-form-title">
      <p className="mb-2.5 font-mono text-[10px] tracking-[1px] text-ink6">
        DATOS DEL ALUMNO · PASO 1 DE 2
      </p>
      <h2
        id="student-form-title"
        className="mb-[18px] font-display text-2xl font-semibold tracking-[-0.6px] text-bone0"
      >
        Precargá lo que ya sabés
      </h2>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-3.5">
        <Input
          label="Nombre y apellido"
          name="student_name"
          autoComplete="off"
          placeholder="Tomás Rivera"
          error={fields.student_name}
        />
        <Input
          label="Email"
          name="student_email"
          type="email"
          autoComplete="off"
          placeholder="tomas@ejemplo.com"
          error={fields.student_email}
        />
        <Input
          label="Teléfono"
          name="student_phone"
          type="tel"
          autoComplete="off"
          defaultValue={PHONE_PREFIX}
          hint={PHONE_HINT}
          error={fields.student_phone}
        />
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <Select
            label="Objetivo (opcional)"
            name="goal"
            options={GOAL_OPTIONS}
            defaultValue=""
            error={fields.goal}
          />
          <Select
            label="Nivel (opcional)"
            name="level"
            options={LEVEL_OPTIONS}
            defaultValue=""
            error={fields.level}
          />
        </div>
        {errors.form && (
          <p
            role="alert"
            className="rounded-md border border-hot/25 bg-hot/[0.14] px-3 py-2.5 font-body text-sm text-hot"
          >
            {errors.form}
          </p>
        )}
        <Button type="submit" full loading={submitting} className="mt-1">
          <QrCode size={16} aria-hidden="true" />
          Generar QR
        </Button>
      </form>
    </section>
  );
}
