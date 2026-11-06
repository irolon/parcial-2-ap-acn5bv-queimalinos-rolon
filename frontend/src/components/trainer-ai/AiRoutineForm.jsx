import { useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import Button from '@/components/shared/ui/Button';
import Input from '@/components/shared/ui/Input';
import Select from '@/components/shared/ui/Select';
import Textarea from '@/components/shared/ui/Textarea';
import { useTemplatesQuery } from '@/hooks/routine-templates/useRoutineTemplates';
import { useStudentPrefill } from '@/hooks/trainer-ai/useStudentPrefill';
import { ROUTINE_GOAL_OPTIONS } from '@/utils/routines/routineForm';
import { LEVEL_OPTIONS } from '@/utils/students/studentOptions';
import { MAX_AI_TEXT, formFromStudent, studentPrefill, validateAiForm } from '@/utils/trainer-ai/aiForm';
import EquipmentChips from './EquipmentChips';
import StudentField from './StudentField';

const GOALS = [{ value: '', label: 'Elegí un objetivo' }, ...ROUTINE_GOAL_OPTIONS];
const LEVELS = [{ value: '', label: 'Elegí un nivel' }, ...LEVEL_OPTIONS.filter((o) => o.value)];
const PRIVACY = 'Esto se le manda a la IA: no pongas datos personales (nombre, DNI, teléfono).';
const counter = (text) => `${text.length}/${MAX_AI_TEXT}`;

function TemplateSelect({ value, error, onChange }) {
  const templates = useTemplatesQuery();
  const options = [{ value: '', label: 'Ninguna' }, ...(templates.data ?? []).map((t) => ({ value: t.id, label: t.name }))];
  return <Select label="Partir de una plantilla (opcional)" options={options} value={value} error={error} onChange={onChange} />;
}

/**
 * Parámetros de la propuesta. `initial` es el formulario (ver `aiForm`) y `student` el alumno elegido
 * (`{ id, name, prefill }`, `prefill` = lo que se precargó de su ficha, para vaciarlo si se cambia de alumno).
 * `errors` trae los del servidor (`fields`, `form`); los del cliente se calculan al enviar.
 * `onSubmit(form, student)` recibe el formulario ya validado.
 */
export default function AiRoutineForm({ initial, student: initialStudent, errors: serverErrors, onSubmit }) {
  const [form, setForm] = useState(initial);
  const [student, setStudent] = useState(initialStudent);
  const [errors, setErrors] = useState(serverErrors?.fields ?? {});
  const prefilled = useRef(initialStudent?.prefill ?? {});
  const picked = useRef(initialStudent?.id ?? null);
  const fetchStudent = useStudentPrefill();
  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((current) => Object.fromEntries(Object.entries(current).filter(([name]) => name !== field)));
  };
  const bind = (field) => ({ value: form[field], error: errors[field], onChange: (event) => set(field, event.target.value) });

  async function pickStudent(next) {
    picked.current = next?.id ?? null;
    setStudent(next);
    set('studentId', next?.id ?? '');
    if (!next) return;
    try {
      const detail = await fetchStudent(next.id);
      if (picked.current !== next.id) return;
      const previous = prefilled.current;
      prefilled.current = studentPrefill(detail);
      setForm((f) => formFromStudent(detail, f, previous));
    } catch {
      /* sin la ficha se completa a mano */
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    const found = validateAiForm(form);
    setErrors(found);
    if (Object.keys(found).length === 0) onSubmit(form, student && { ...student, prefill: prefilled.current });
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex max-w-3xl flex-col gap-5">
      {serverErrors?.form && <p role="alert" className="font-mono text-xs text-hot">{serverErrors.form}</p>}
      <StudentField student={student} error={errors.studentId} onPick={pickStudent} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Objetivo" options={GOALS} {...bind('goal')} />
        <Select label="Nivel" options={LEVELS} {...bind('level')} />
        <Input label="Días por semana" type="number" min={1} max={7} inputMode="numeric" {...bind('frequency')} />
        <Input label="Duración por sesión (min)" type="number" min={20} max={180} inputMode="numeric" {...bind('duration')} />
      </div>
      <EquipmentChips value={form.equipment} onChange={(value) => set('equipment', value)} />
      <div>
        <Textarea label="Lesiones" maxLength={MAX_AI_TEXT} placeholder="Ej.: lumbalgia, evitar peso muerto pesado" hint={counter(form.injuries)} {...bind('injuries')} />
        <p className="mt-2 rounded-md border border-hot/25 bg-hot/[0.08] px-3 py-2 font-body text-xs text-bone0">{PRIVACY}</p>
      </div>
      <Textarea label="Preferencias" maxLength={MAX_AI_TEXT} placeholder="Ej.: sesiones cortas, sin saltos" hint={counter(form.preferences)} {...bind('preferences')} />
      <TemplateSelect {...bind('baseTemplateId')} />
      <div className="flex justify-end">
        <Button type="submit">
          <Sparkles size={16} aria-hidden="true" /> Generar propuesta
        </Button>
      </div>
    </form>
  );
}
