import { Errors } from '../../shared/utils/errors.js';
import * as studentsRepo from '../../repositories/students/students.repository.js';

/**
 * Verifica que `user` pueda ver o tocar al alumno `studentId` y devuelve su
 * fila (ficha base). Es el único chequeo de ownership de /students/:id y
 * /students/:id/metrics (el backend usa la service_role: el RLS no aplica).
 *   - trainer: el alumno tiene que ser suyo.
 *   - student: solo él mismo.
 * Ajeno o inexistente → 403 en los dos casos, como routines: no revela qué
 * ids existen.
 */
export async function assertCanAccessStudent(user, studentId) {
  if (user.role === 'student' && user.id !== studentId) throw Errors.forbidden();
  if (user.role !== 'student' && user.role !== 'trainer') throw Errors.forbidden();

  const student = await studentsRepo.findStudentById(studentId);
  if (!student) throw Errors.forbidden();
  if (user.role === 'trainer' && student.trainer_id !== user.id) throw Errors.forbidden();
  return student;
}
