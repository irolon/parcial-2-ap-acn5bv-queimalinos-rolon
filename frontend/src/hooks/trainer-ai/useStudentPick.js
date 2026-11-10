import { useRef, useState } from 'react';
import { useStudentsQuery } from '@/hooks/students/useStudents';
import { useStudentPrefill } from '@/hooks/trainer-ai/useStudentPrefill';
import { clearPrefill, formFromStudent, studentPrefill } from '@/utils/trainer-ai/aiForm';

/** Nombre del alumno de la entrada cuya ficha no cargó mientras no aparezca entre los activos. */
export const ENTRY_STUDENT_NAME = 'el alumno de la ficha';
const UNLOADABLE = ['injuries', 'equipment'];

/**
 * Alumno elegido en el formulario del asistente y la precarga desde su ficha. `setForm` es el del formulario.
 * - `initialStudent`: `{ id, name, prefill }` ya precargado (o `null`). Con `name: null` (entrada con la ficha caída)
 *   el nombre sale de la lista de activos, o `ENTRY_STUDENT_NAME` mientras no esté.
 * - `pendingId`: alumno de la entrada cuya ficha no cargó; arranca en `failed` y `retry()` la vuelve a pedir.
 * - `initialUnloaded`: lo que no se pudo precargar de `initialStudent` en un pedido anterior (vuelta al formulario);
 *   si hay algo, también arranca en `failed`, con el aviso y "Reintentar".
 *
 * Al elegir (`pick`) se vacía en el acto lo precargado del anterior que el PT no tocó y se pide la ficha nueva:
 * mientras tanto `status` es `loading` (no se genera con datos de otro alumno); si falla, `failed`, y `retry()` la pide
 * de nuevo (`retrying`). Cuando llega se completa el formulario actual sin pisar lo que el PT editó desde que eligió
 * (`touch(field)`), así que reintentar no borra lo escrito. `arrivals` cambia cuando llega el alumno de la entrada.
 * `unloaded()`: con la ficha fallida (o lo `initialUnloaded` mientras no se elija otro alumno ni llegue su ficha), lo
 * que el backend completa con ella y el PT no tocó (ver `buildGenerateBody`).
 */
export function useStudentPick({ initialStudent, initialUnloaded = [], pendingId, setForm }) {
  const [student, setStudent] = useState(initialStudent);
  const [status, setStatus] = useState(pendingId || (initialStudent && initialUnloaded.length) ? 'failed' : 'idle');
  const unnamed = Boolean(student && !student.name);
  const actives = useStudentsQuery({ active: true, enabled: unnamed });
  const named = unnamed ? { ...student, name: actives.data?.find((s) => s.id === student.id)?.name ?? ENTRY_STUDENT_NAME } : student;
  const [arrivals, setArrivals] = useState(0);
  const prefilled = useRef(initialStudent?.prefill ?? {});
  const picked = useRef(initialStudent?.id ?? pendingId ?? null);
  const pendingEntry = useRef(Boolean(pendingId));
  const touched = useRef(new Set());
  const carried = useRef(initialUnloaded);
  const fetchStudent = useStudentPrefill();

  async function load(id, retrying = false) {
    setStatus(retrying ? 'retrying' : 'loading');
    try {
      const detail = await fetchStudent(id);
      if (picked.current !== id) return;
      prefilled.current = studentPrefill(detail);
      carried.current = [];
      setStudent({ id: detail.id, name: detail.name });
      setForm((f) => formFromStudent(detail, f, {}, [...touched.current]));
      setStatus('idle');
      if (pendingEntry.current) setArrivals((n) => n + 1);
      pendingEntry.current = false;
    } catch {
      if (picked.current === id) setStatus('failed');
    }
  }

  function pick(next) {
    picked.current = next?.id ?? null;
    pendingEntry.current = false;
    touched.current = new Set();
    carried.current = [];
    const previous = prefilled.current;
    prefilled.current = {};
    setStudent(next);
    setForm((f) => ({ ...clearPrefill(f, previous), studentId: next?.id ?? '' }));
    if (next) load(next.id);
    else setStatus('idle');
  }

  return {
    student: named,
    status,
    arrivals,
    loading: status === 'loading' || status === 'retrying',
    pick,
    retry: () => picked.current && load(picked.current, true),
    touch: (field) => touched.current.add(field),
    unloaded: () => (carried.current.length || status !== 'failed' ? carried.current : UNLOADABLE).filter((field) => !touched.current.has(field)),
    prefill: () => prefilled.current,
  };
}
