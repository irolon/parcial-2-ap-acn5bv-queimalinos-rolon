import { instantiate } from '../routine-templates/routine-templates.service.js';
import { notify } from '../notifications/notify.service.js';
import { texts } from '../../models/notifications/texts.js';
import { shouldPush } from '../../models/notifications/push-policy.js';

/** Aviso al PT (in-app + push). Best-effort: si falla, se loguea y el alta sigue. */
async function notifyTrainer(trainerId, student) {
  try {
    const { title, body } = texts.initialRoutineFailed({ studentName: student.name });
    await notify({
      userId: trainerId,
      userRole: 'trainer',
      type: 'initial_routine_failed',
      title,
      body,
      data: { student_id: student.id },
      push: shouldPush('initial_routine_failed', 'trainer'),
    });
  } catch (err) {
    console.error('[notifications] initial_routine_failed', err.message);
  }
}

async function failed(invitation, student, reason) {
  console.warn('[invitations] rutina inicial no creada', {
    invitation_id: invitation.id,
    student_id: student.id,
    reason,
  });
  await notifyTrainer(invitation.trainer.id, student);
  return null;
}

/**
 * Alta del alumno (POST /students): si la invitación trae plantilla inicial, le crea
 * la rutina copiándola con `instantiate` (vale la versión de la plantilla al alta).
 * Nunca lanza: si no se puede crear, avisa al PT y devuelve null (el alta sigue).
 * Plantilla borrada después de invitar: la FK la deja en null, pero los días quedan
 * (POST /invitations exige routine_days con template_id, así que siempre hay días).
 */
export async function assignInitialRoutine(invitation, student) {
  if (!invitation.template_id) {
    return invitation.routine_days ? failed(invitation, student, 'TEMPLATE_DELETED') : null;
  }
  try {
    return await instantiate(invitation.trainer.id, invitation.template_id, {
      student_id: student.id,
      days: invitation.routine_days,
    });
  } catch (err) {
    return failed(invitation, student, err.code ?? err.message);
  }
}
