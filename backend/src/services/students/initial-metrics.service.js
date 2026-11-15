import { insertMetric } from '../../repositories/body-metrics/body-metrics.repository.js';

/**
 * Alta del alumno (POST /students): si la invitación trae altura o peso, le crea la primera
 * medida (cargada por el PT: `recorded_by = 'trainer'`). Así entran al IMC, a los gráficos y
 * a la última medida de la ficha. Nunca lanza: si falla, se loguea y el alta sigue (el PT
 * la puede volver a cargar desde la ficha).
 */
export async function assignInitialMetrics(invitation, student) {
  const fields = {};
  if (invitation.student_height_cm != null) fields.height_cm = invitation.student_height_cm;
  if (invitation.student_weight_kg != null) fields.weight_kg = invitation.student_weight_kg;
  if (Object.keys(fields).length === 0) return null;
  try {
    return await insertMetric({ student_id: student.id, ...fields, recorded_by: 'trainer' });
  } catch (err) {
    console.warn('[invitations] primera medida no creada', {
      invitation_id: invitation.id,
      student_id: student.id,
      reason: err.code ?? err.message,
    });
    return null;
  }
}
