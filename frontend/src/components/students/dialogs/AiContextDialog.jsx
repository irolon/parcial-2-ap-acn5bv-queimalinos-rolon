import { useState } from 'react';
import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';
import Textarea from '@/components/shared/ui/Textarea';
import EquipmentPicker from '@/components/students/dialogs/EquipmentPicker';
import { useUpdateStudent } from '@/hooks/students/useStudents';
import { fieldErrorsFrom } from '@/utils/fieldErrors';
import { MAX_INJURIES, STUDENT_FIELDS, buildContextBody } from '@/utils/students/studentForm';

const LABEL = 'mb-1.5 block font-mono text-[9px] uppercase tracking-[1px] text-ink6';

/** Equipamiento (chips) y lesiones que la IA usa para personalizar. */
export default function AiContextDialog({ student, onClose }) {
  const [equipment, setEquipment] = useState(student.gym_equipment ?? []);
  const [injuries, setInjuries] = useState(student.injuries ?? '');
  const [errors, setErrors] = useState({ form: null, fields: {} });
  const update = useUpdateStudent(student.id);
  const saving = update.isPending;

  async function handleSave() {
    if (saving) return;
    setErrors({ form: null, fields: {} });
    try {
      await update.mutateAsync(buildContextBody(equipment, injuries));
      onClose();
    } catch (error) {
      setErrors(fieldErrorsFrom(error, { fields: STUDENT_FIELDS, fallback: 'No pudimos guardar el contexto' }));
    }
  }

  return (
    <Dialog
      open
      dismissible={!saving}
      onOpenChange={(next) => !next && onClose()}
      title="Contexto para la IA"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {errors.form && (
          <p
            role="alert"
            className="rounded-md border border-hot/25 bg-hot/[0.14] px-3 py-2.5 font-body text-sm text-hot"
          >
            {errors.form}
          </p>
        )}
        <div>
          <span className={LABEL}>Equipamiento</span>
          <EquipmentPicker value={equipment} onChange={setEquipment} />
          {errors.fields.gym_equipment && (
            <p role="alert" className="mt-1.5 font-mono text-[11px] text-hot">
              {errors.fields.gym_equipment}
            </p>
          )}
        </div>
        <Textarea
          label="Lesiones"
          value={injuries}
          maxLength={MAX_INJURIES}
          placeholder="Ej.: lumbalgia, evitar peso muerto pesado"
          hint="Hasta 1000 caracteres"
          error={errors.fields.injuries}
          onChange={(event) => setInjuries(event.target.value)}
        />
      </div>
    </Dialog>
  );
}
