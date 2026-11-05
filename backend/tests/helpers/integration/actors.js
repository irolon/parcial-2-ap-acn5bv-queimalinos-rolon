import { api, expectStatus } from './api.js';
import { QA_PASSWORD, qaEmail, qaName } from './run-id.js';
import { trackTrainer } from './registry.js';

/** Registra un PT QA por la API y lo anota para el teardown. */
export async function createTrainer(label) {
  const email = qaEmail(`pt-${label}`);
  const res = await api()
    .post('/auth/register')
    .send({ name: qaName(`PT ${label}`), email, password: QA_PASSWORD });
  expectStatus(res, 201, 'POST /auth/register');
  trackTrainer(res.body.trainer.id);
  return { id: res.body.trainer.id, token: res.body.token, email };
}

/** Invita a un alumno por QR y lo da de alta con esa invitación. */
export async function inviteAndJoin(trainer, label) {
  const email = qaEmail(`st-${label}`);
  const invitation = await api(trainer.token)
    .post('/invitations')
    .send({
      student_name: qaName(`Alumno ${label}`),
      student_email: email,
      delivery_channel: 'qr',
    });
  expectStatus(invitation, 201, 'POST /invitations');

  const res = await api()
    .post('/students')
    .send({ token: invitation.body.data.token, password: QA_PASSWORD });
  expectStatus(res, 201, 'POST /students');
  return { id: res.body.student.id, token: res.body.token, email, trainerId: trainer.id };
}
