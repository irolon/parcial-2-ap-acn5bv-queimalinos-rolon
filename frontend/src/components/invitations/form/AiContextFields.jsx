import { useState } from 'react';
import Textarea from '@/components/shared/ui/Textarea';
import EquipmentPicker from '@/components/students/dialogs/EquipmentPicker';
import { MAX_INJURIES, addEquipment } from '@/utils/students/studentForm';

const LABEL = 'mb-1.5 block font-mono text-[9px] uppercase tracking-[1px] text-ink6';

/**
 * Contexto para la IA (opcional): equipamiento y lesiones, con los mismos controles que "Contexto para la IA"
 * de la ficha. El formulario no es controlado: el equipamiento se escribe como `<input type="hidden">` (uno
 * `gym_equipment` por ítem, sumando lo que quedó escrito en "Agregar otro") para que `buildInvitationBody` lo lea.
 */
export default function AiContextFields({ errors = {} }) {
  const [equipment, setEquipment] = useState([]);
  const [draft, setDraft] = useState('');
  return (
    <fieldset className="flex min-w-0 flex-col gap-3.5">
      <legend className="mb-2.5 font-mono text-[10px] tracking-[1px] text-ink6">CONTEXTO PARA LA IA (OPCIONAL)</legend>
      <div>
        <span className={LABEL}>Equipamiento</span>
        <EquipmentPicker value={equipment} onChange={setEquipment} draft={draft} onDraftChange={setDraft} />
        {errors.gym_equipment && (
          <p role="alert" className="mt-1.5 font-mono text-[11px] text-hot">
            {errors.gym_equipment}
          </p>
        )}
        {addEquipment(equipment, draft).map((item) => (
          <input key={item} type="hidden" name="gym_equipment" value={item} />
        ))}
      </div>
      <Textarea
        label="Lesiones"
        name="injuries"
        maxLength={MAX_INJURIES}
        placeholder="Ej.: lumbalgia, evitar peso muerto pesado"
        hint="Hasta 1000 caracteres"
        error={errors.injuries}
      />
    </fieldset>
  );
}
