// Prepara los datos de la prueba de carga, todo por la API (como la suite de integración):
// un PT de QA, un pool de alumnos invitados, una rutina de los 7 días por alumno y una
// sesión abierta por alumno. Imprime el JSON que lee el escenario de k6.
//
// Uso (desde backend/, con el backend corriendo):
//   node load/setup-users.mjs > load/users.json
// Env: API_URL (default http://localhost:3001/api), LOAD_STUDENTS (default 10).
// Los emails son de QA (it.<corrida>.…@test.fittrainer.dev): `npm run test:integration:clean`
// los borra una vez que pasó 1 hora.
import { randomUUID } from 'node:crypto';

const API = process.env.API_URL ?? 'http://localhost:3001/api';
const STUDENTS = Number(process.env.LOAD_STUDENTS ?? 10);
const RUN = `load${Date.now().toString(36)}`;
const PASSWORD = 'Carga1234';
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

async function call(method, path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(json.error ?? json)}`);
  return json;
}

const email = (role) => `it.${RUN}.${role}@test.fittrainer.dev`;

const trainer = await call('POST', '/auth/register', { name: `IT · Carga ${RUN}`, email: email('pt'), password: PASSWORD });
const pt = trainer.token;
const exercises = (await call('GET', '/exercises', null, pt)).data.slice(0, 3).map((e) => e.id);
if (exercises.length === 0) throw new Error('No hay ejercicios globales para armar la rutina');

const students = [];
for (let i = 0; i < STUDENTS; i += 1) {
  const invitation = await call(
    'POST', '/invitations',
    { student_name: `IT · Alumno ${i}`, student_email: email(`al${i}`), delivery_channel: 'qr' },
    pt
  );
  const joined = await call('POST', '/students', { token: invitation.data.token, password: PASSWORD });
  const studentId = joined.student.id;
  await call(
    'POST', '/routines',
    {
      student_id: studentId,
      name: `IT · Rutina ${i}`,
      goal: 'hypertrophy',
      days: DAYS,
      exercises: exercises.map((id, order) => ({ exercise_id: id, sets: 3, reps: 10, order })),
    },
    pt
  );
  const sessionId = randomUUID();
  await call('POST', '/sessions', { id: sessionId, started_at: new Date().toISOString() }, joined.token);
  students.push({ token: joined.token, sessionId });
}

console.log(JSON.stringify({ run: RUN, trainerId: trainer.trainer.id, exercises, students }, null, 2));
