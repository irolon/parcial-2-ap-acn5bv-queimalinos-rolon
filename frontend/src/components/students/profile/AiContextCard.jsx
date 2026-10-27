import Card from '@/components/shared/ui/Card';
import Pill from '@/components/shared/ui/Pill';
import { equipmentLabel } from '@/utils/exercises/exerciseOptions';

/** Equipamiento y lesiones que usa la IA para personalizar. `extra` = acción "Editar" (Task 6). */
export default function AiContextCard({ student, extra }) {
  const equipment = student.gym_equipment ?? [];
  const injuries = student.injuries?.trim();
  return (
    <Card title="Contexto para la IA" extra={extra}>
      {equipment.length === 0 && !injuries ? (
        <p className="font-body text-sm text-hot">Sin completar: la IA no va a poder personalizar</p>
      ) : (
        <div className="flex flex-col gap-3">
          <div>
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.8px] text-ink6">Equipamiento</div>
            {equipment.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {equipment.map((code) => (
                  <li key={code}>
                    <Pill>{equipmentLabel(code)}</Pill>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-body text-sm text-ink6">Sin cargar</p>
            )}
          </div>
          <div>
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.8px] text-ink6">Lesiones</div>
            <p className="font-body text-sm text-bone0">{injuries || 'Sin cargar'}</p>
          </div>
        </div>
      )}
    </Card>
  );
}
