import { supabase } from '../../config/supabase.js';
import { Errors } from '../../shared/utils/errors.js';
import { STUDENTS_TABLE } from '../../models/students/student.model.js';
import {
  CHALLENGE_COLUMNS,
  STUDENT_CHALLENGES_TABLE,
  STUDENT_CHALLENGE_COLUMNS,
} from '../../models/gamification/gamification.model.js';

const unwrap = ({ data, error }) => {
  if (error) throw Errors.internal(error.message);
  return data;
};

const WITH_CHALLENGE = `${STUDENT_CHALLENGE_COLUMNS}, challenge:challenges ( ${CHALLENGE_COLUMNS} )`;

/** Todas las asignaciones del alumno con el desafío embebido, la más nueva primero. */
export async function findByStudent(studentId) {
  return unwrap(
    await supabase
      .from(STUDENT_CHALLENGES_TABLE)
      .select(WITH_CHALLENGE)
      .eq('student_id', studentId)
      .order('started_at', { ascending: false })
      .order('id', { ascending: false })
  );
}

/**
 * Crea una asignación ({ student_id, challenge_id, started_at, ends_at }).
 * 23505 (índice parcial de activas) → CHALLENGE_ALREADY_ACTIVE.
 */
export async function insertAssignment(row) {
  const { data, error } = await supabase
    .from(STUDENT_CHALLENGES_TABLE)
    .insert(row)
    .select(WITH_CHALLENGE)
    .single();
  if (error && error.code === '23505') throw Errors.challengeAlreadyActive();
  return unwrap({ data, error });
}

/** Ids (de la lista) que son alumnos activos de este entrenador. */
export async function findActiveStudentIds(trainerId, studentIds) {
  const rows = unwrap(
    await supabase
      .from(STUDENTS_TABLE)
      .select('id')
      .eq('trainer_id', trainerId)
      .eq('active', true)
      .in('id', studentIds)
  );
  return rows.map((r) => r.id);
}
