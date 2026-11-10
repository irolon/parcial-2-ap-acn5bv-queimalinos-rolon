import { useStudentQuery } from '@/hooks/students/useStudents';
import { STUDENT_NOT_FOUND } from '@/utils/trainer-ai/aiErrors';
import { DEFAULT_FORM, formFromStudent, studentPrefill } from '@/utils/trainer-ai/aiForm';

/**
 * Formulario de la entrada desde la ficha (`?alumno=`), o `null` sin alumno. `status`:
 * - `loading`: todavía no llegó la ficha;
 * - `ready`: precargado con la ficha (`student` = `{ id, name, prefill }`);
 * - `gone`: 404, el alumno no está activo o no existe (error en el campo, se sigue sin él);
 * - `failed`: otro error (red, 5xx): se sigue sin la precarga pero con el alumno elegido (`student` = `{ id, name: null }`,
 *   el nombre lo busca `useStudentPick` entre los activos); el formulario avisa y la vuelve a pedir.
 */
export function useEntryForm(studentId) {
  const query = useStudentQuery(studentId);
  if (!studentId) return null;
  if (query.isPending) return { status: 'loading' };
  if (query.isError) {
    const empty = { form: DEFAULT_FORM, student: null };
    if (query.error?.status === 404) return { ...empty, status: 'gone', errors: { fields: { studentId: STUDENT_NOT_FOUND } } };
    // El alumno existe aunque su ficha no cargó: se genera para él y el backend completa con su ficha.
    return { form: { ...DEFAULT_FORM, studentId }, student: { id: studentId, name: null }, status: 'failed' };
  }
  const { id, name } = query.data;
  return { status: 'ready', form: formFromStudent(query.data), student: { id, name, prefill: studentPrefill(query.data) } };
}
