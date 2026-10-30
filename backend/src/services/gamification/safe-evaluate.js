import { evaluateStudent } from './evaluate.service.js';

/**
 * Evalúa los logros del alumno sin poder romper el flujo que lo llama
 * (cierre de sesión): ante cualquier error lo loguea y devuelve [].
 */
export async function safeEvaluate(studentId) {
  try {
    const { unlocked } = await evaluateStudent(studentId);
    return unlocked;
  } catch (err) {
    console.error('[gamification] fallo al evaluar logros', err);
    return [];
  }
}
