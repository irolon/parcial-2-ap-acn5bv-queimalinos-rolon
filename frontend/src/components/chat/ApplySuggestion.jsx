import { Repeat } from 'lucide-react';
import Button from '@/components/shared/ui/Button';

const NOTE = 'font-body text-xs leading-[1.4]';

/**
 * Debajo del porqué de una sugerencia: "Aplicar a la sesión de hoy" si se puede, "Listo: …" si la sesión ya la hace y
 * el aviso si el ejercicio ya tiene series. Sin sesión en curso (o si la consulta era de otro ejercicio o de otro día)
 * no muestra nada: el chip queda informativo. `check` es lo de `useApplySuggestion`.
 */
export default function ApplySuggestion({ suggestion, check }) {
  if (check.status === 'can') {
    return (
      <Button variant="ghost" size="sm" className="self-start" onClick={check.apply}>
        <Repeat size={14} aria-hidden="true" />
        Aplicar a la sesión de hoy
      </Button>
    );
  }
  if (check.status === 'applied') {
    return <p role="status" className={`${NOTE} text-good`}>{`Listo: hoy hacés ${suggestion.name} en lugar de ${check.planned}.`}</p>;
  }
  if (check.status === 'locked') {
    return <p className={`${NOTE} text-ink6`}>{`Ya registraste series de ${check.planned}: no se puede cambiar.`}</p>;
  }
  return null;
}
