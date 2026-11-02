import Button from '@/components/shared/ui/Button';
import { TOUCH_SM } from './touch';

/** Navegación de semanas, toggle de cancelados y accesos a los diálogos de disponibilidad y nuevo turno. */
export default function AgendaToolbar({
  onPrev,
  onToday,
  onNext,
  showCancelled,
  onToggleCancelled,
  onOpenAvailability,
  onOpenNew,
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className={TOUCH_SM} aria-label="Semana anterior" onClick={onPrev}>‹</Button>
        <Button variant="ghost" size="sm" className={TOUCH_SM} onClick={onToday}>Hoy</Button>
        <Button variant="ghost" size="sm" className={TOUCH_SM} aria-label="Semana siguiente" onClick={onNext}>›</Button>
      </div>
      <label className="flex cursor-pointer items-center gap-2 font-body text-sm text-bone2">
        <input
          type="checkbox"
          checked={showCancelled}
          onChange={(e) => onToggleCancelled(e.target.checked)}
          className="h-4 w-4 accent-accent"
        />
        Mostrar cancelados
      </label>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="sm" className={TOUCH_SM} onClick={onOpenAvailability}>Disponibilidad</Button>
        <Button variant="primary" size="sm" className={TOUCH_SM} onClick={onOpenNew}>Nuevo turno</Button>
      </div>
    </div>
  );
}
