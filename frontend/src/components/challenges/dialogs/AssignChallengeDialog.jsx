import { useMemo, useRef, useState } from 'react';
import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';
import { useActiveStudentsQuery, useAssignChallenge } from '@/hooks/challenges/useChallenges';
import { useStudentsQuery } from '@/hooks/students/useStudents';
import { assignResultText } from '@/utils/challenges/assignResult';
import { fieldErrorsFrom } from '@/utils/fieldErrors';
import StudentMultiSelect, { MAX_SELECTED } from './StudentMultiSelect';

const NOTICE = 'rounded-md border px-3 py-2.5 font-body text-sm';

function StudentsList({ students, actives, selected, onChange }) {
  if (students.isError) return <p role="alert" className="font-body text-sm text-hot">No pudimos cargar tus alumnos</p>;
  if (actives.isError) {
    return (
      <p role="alert" className="flex flex-wrap items-center justify-between gap-2 font-body text-sm text-hot">
        No pudimos ver quiénes ya lo tienen
        <Button variant="ghost" size="sm" onClick={() => actives.refetch()} loading={actives.isFetching}>
          Reintentar
        </Button>
      </p>
    );
  }
  // Sin los "Ya lo tiene" no se puede elegir: un alumno tildado antes viajaría en el POST.
  if (students.isPending || actives.isPending) return <p className="font-body text-sm text-ink6">Cargando alumnos…</p>;
  if (students.data.length === 0) return <p className="font-body text-sm text-ink6">Todavía no tenés alumnos activos</p>;
  return (
    <StudentMultiSelect
      students={students.data}
      disabledIds={new Set(actives.data)}
      selected={selected}
      onChange={onChange}
    />
  );
}

/**
 * Asigna `challenge` a varios alumnos activos (hasta 50, un solo POST aunque se haga doble clic).
 * Al terminar muestra el aviso (`role="status"`) en el mismo diálogo y el botón "Listo".
 * `cancelLabel` es "Ahora no" cuando se abre recién creado el desafío.
 */
export default function AssignChallengeDialog({ challenge, onClose, cancelLabel = 'Cancelar' }) {
  const students = useStudentsQuery({ active: true });
  const actives = useActiveStudentsQuery(challenge.id);
  const assign = useAssignChallenge();
  const sending = useRef(false);
  const [selected, setSelected] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const byId = useMemo(() => new Map((students.data ?? []).map((s) => [s.id, s])), [students.data]);
  const canAssign = selected.length > 0 && selected.length <= MAX_SELECTED;

  async function handleAssign() {
    if (sending.current || !canAssign) return;
    sending.current = true;
    setError(null);
    try {
      setResult(await assign.mutateAsync({ id: challenge.id, studentIds: selected }));
    } catch (err) {
      sending.current = false;
      setError(fieldErrorsFrom(err, { fields: [], fallback: 'No pudimos asignar el desafío' }).form);
    }
  }

  const footer = result ? (
    <Button onClick={onClose}>Listo</Button>
  ) : (
    <>
      <Button variant="ghost" onClick={onClose} disabled={assign.isPending}>
        {cancelLabel}
      </Button>
      <Button onClick={handleAssign} disabled={!canAssign} loading={assign.isPending}>
        Asignar
      </Button>
    </>
  );

  return (
    <Dialog
      open
      dismissible={!assign.isPending}
      onOpenChange={(next) => !next && onClose()}
      title={`Asignar "${challenge.name}"`}
      footer={footer}
    >
      {result ? (
        <p role="status" className={`${NOTICE} border-good/25 bg-good/[0.14] text-good`}>
          {assignResultText(result, byId)}
        </p>
      ) : (
        <>
          {error && (
            <p role="alert" className={`${NOTICE} mb-3 border-hot/25 bg-hot/[0.14] text-hot`}>
              {error}
            </p>
          )}
          <StudentsList students={students} actives={actives} selected={selected} onChange={setSelected} />
        </>
      )}
    </Dialog>
  );
}
