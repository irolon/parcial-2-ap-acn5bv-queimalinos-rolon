import { useState } from 'react';
import Select from '@/components/shared/ui/Select';
import { useStudentsQuery } from '@/hooks/students/useStudents';

const LABEL = 'mb-1.5 block font-mono text-[9px] uppercase tracking-[1px] text-ink6';

function StudentSelect({ value, error, onPick }) {
  const students = useStudentsQuery({ active: true });
  const options = [
    { value: '', label: 'Sin alumno (propuesta genérica)' },
    ...(students.data ?? []).map((s) => ({ value: s.id, label: s.name })),
  ];
  return (
    <Select
      label="Alumno"
      options={options}
      value={value}
      error={error}
      hint={students.isError ? 'No pudimos cargar tus alumnos' : 'Opcional: sin alumno se arma una propuesta genérica'}
      onChange={(event) => {
        const picked = (students.data ?? []).find((s) => s.id === event.target.value);
        onPick(picked ? { id: picked.id, name: picked.name } : null);
      }}
    />
  );
}

/**
 * Alumno de la propuesta: fijo con su nombre y "Cambiar" si vino de la ficha, o un selector con los activos.
 * `onPick({ id, name } | null)` avisa el elegido.
 */
export default function StudentField({ student, error, onPick }) {
  const [changing, setChanging] = useState(!student);
  if (changing || !student) return <StudentSelect value={student?.id ?? ''} error={error} onPick={onPick} />;
  return (
    <div>
      <span className={LABEL}>Alumno</span>
      <div className="flex h-[46px] items-center justify-between gap-3 rounded-md border border-ink3 bg-ink1 px-3.5">
        <span className="truncate font-body text-sm text-bone0">{student.name}</span>
        <button
          type="button"
          onClick={() => setChanging(true)}
          className="cursor-pointer font-mono text-[11px] uppercase text-ink6 underline hover:text-bone0 focus-visible:outline-2 focus-visible:outline-accentText"
        >
          Cambiar
        </button>
      </div>
      {error && <p role="alert" className="mt-1.5 font-mono text-[11px] text-hot">{error}</p>}
    </div>
  );
}
