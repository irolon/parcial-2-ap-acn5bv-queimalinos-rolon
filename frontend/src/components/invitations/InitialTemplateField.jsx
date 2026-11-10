import { useState } from 'react';
import Select from '@/components/shared/ui/Select';
import DayPicker from '@/components/routines/editor/DayPicker';
import { useTemplatesQuery } from '@/hooks/routine-templates/useRoutineTemplates';
import { sortDays } from '@/utils/students/routineDays';
import { levelLabel } from '@/utils/students/studentOptions';

const dayCount = (n) => `${n} ${n === 1 ? 'día' : 'días'}`;
const optionLabel = (t) => [t.name, dayCount(t.days?.length ?? 0), levelLabel(t.level)].filter(Boolean).join(' · ');

function emptyLabel(query) {
  if (query.isPending) return 'Cargando plantillas…';
  if (query.isError) return 'No pudimos cargar tus plantillas';
  return 'Sin plantilla';
}

/**
 * Plantilla inicial (opcional) de la invitación: una plantilla del PT y sus días, precargados con los de la
 * plantilla. El formulario no es controlado: se escriben como `<input type="hidden">` (`template_id` y uno
 * `routine_days` por día) para que `buildInvitationBody` los lea. Si las plantillas no cargan, se invita igual.
 */
export default function InitialTemplateField({ errors = {} }) {
  const templates = useTemplatesQuery();
  const [templateId, setTemplateId] = useState('');
  const [days, setDays] = useState([]);
  const items = Array.isArray(templates.data) ? templates.data : [];

  function pick(event) {
    const id = event.target.value;
    setTemplateId(id);
    setDays(sortDays(items.find((t) => t.id === id)?.days ?? []));
  }

  const toggle = (day) =>
    setDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : sortDays([...current, day])));

  const options = [{ value: '', label: emptyLabel(templates) }, ...items.map((t) => ({ value: t.id, label: optionLabel(t) }))];
  return (
    <fieldset className="flex min-w-0 flex-col gap-2.5">
      <legend className="mb-2.5 font-mono text-[10px] tracking-[1px] text-ink6">PLANTILLA INICIAL (OPCIONAL)</legend>
      {templates.isSuccess && items.length === 0 ? (
        <p className="font-body text-sm text-ink6">Todavía no tenés plantillas</p>
      ) : (
        <Select
          label="Plantilla inicial"
          options={options}
          value={templateId}
          disabled={!templates.isSuccess}
          onChange={pick}
          error={errors.template_id}
        />
      )}
      {templateId && (
        <>
          <DayPicker value={days} onToggle={toggle} error={errors.routine_days} />
          <input type="hidden" name="template_id" value={templateId} />
          {days.map((day) => (
            <input key={day} type="hidden" name="routine_days" value={day} />
          ))}
        </>
      )}
    </fieldset>
  );
}
