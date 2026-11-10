import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { env } from '../../src/config/env.js';
import { supabase } from '../../src/config/supabase.js';
import { api, expectStatus } from '../helpers/integration/api.js';
import { createTrainer, inviteAndJoin } from '../helpers/integration/actors.js';
import { uploadSession } from '../helpers/integration/fixtures.js';
import { qaName } from '../helpers/integration/run-id.js';

// Chat IA del alumno contra Supabase dev, con el webhook `student-ia` de n8n simulado por
// un servidor HTTP local (la prueba real con n8n y KIMI es aparte). Sin migración: usa
// chat_messages de 06-ai-and-agenda.sql.
const SECRET = 'it-chat-secret';
const INVENTED = '00000000-0000-4000-8000-000000000000';
const n8n = { received: [], reply: null };
let server;
const ORIGINAL = { url: env.N8N_STUDENT_AI_WEBHOOK_URL, secret: env.N8N_WEBHOOK_SECRET };

beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      const body = JSON.parse(raw);
      n8n.received.push({ headers: req.headers, body });
      const [status, payload] =
        req.headers['x-webhook-secret'] !== SECRET ? [401, { error: 'UNAUTHORIZED' }] : n8n.reply(body);
      res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(payload));
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  env.N8N_STUDENT_AI_WEBHOOK_URL = `http://127.0.0.1:${server.address().port}/webhook/student-ia`;
  env.N8N_WEBHOOK_SECRET = SECRET;
});

afterAll(async () => {
  env.N8N_STUDENT_AI_WEBHOOK_URL = ORIGINAL.url;
  env.N8N_WEBHOOK_SECRET = ORIGINAL.secret;
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(() => {
  n8n.received = [];
  // Sugiere la primera alternativa recibida y una inventada (que el backend descarta).
  n8n.reply = (body) => [
    200,
    {
      response: `Respuesta a: ${body.message}`,
      suggestions: [
        { exercise_id: body.alternatives[0].id, reason: 'Mismo músculo con tu equipamiento' },
        { exercise_id: INVENTED, reason: 'Inventado' },
      ],
    },
  ];
});

const messagesOf = async (studentId) => {
  const query = supabase.from('chat_messages').select('role, content, session_id').eq('student_id', studentId);
  const { data, error } = await query.order('created_at').order('role', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

describe('chat (integración)', () => {
  let pt;
  let student;
  let other;
  let benchId;
  let sessionId;

  beforeAll(async () => {
    pt = await createTrainer('chat');
    student = await inviteAndJoin(pt, 'chat');
    other = await inviteAndJoin(await createTrainer('chat-b'), 'chat-b');
    const patch = await api(pt.token)
      .patch(`/students/${student.id}`)
      .send({ gym_equipment: ['dumbbell'], injuries: 'Hombro derecho' });
    expectStatus(patch, 200, 'PATCH /students/:id');
    const exercises = supabase.from('exercises').select('id').eq('is_global', true);
    benchId = (await exercises.eq('name', 'Press banca plano').single()).data.id;
    ({ sessionId } = await uploadSession(student, { startedAt: new Date().toISOString() }));
  });

  it('envía: n8n recibe el secreto y el contexto sin datos personales; se guarda el par con la sesión', async () => {
    const res = await api(student.token)
      .post('/chat')
      .send({ message: '¿Con qué reemplazo el press de banca?', session_id: sessionId, current_exercise_id: benchId });
    expectStatus(res, 200, 'POST /chat');

    const { headers, body } = n8n.received[0];
    expect(headers['x-webhook-secret']).toBe(SECRET);
    expect(Object.keys(body).sort()).toEqual(['alternatives', 'exercise', 'history', 'message', 'student', 'todays_routine']);
    expect(body.exercise).toEqual({ name: 'Press banca plano', muscle_group: 'chest', equipment: 'barbell' });
    expect(Object.keys(body.student).sort()).toEqual(['goal', 'gym_equipment', 'injuries', 'level']);
    expect(body.student).toMatchObject({ gym_equipment: ['dumbbell'], injuries: 'Hombro derecho' });
    expect(body.alternatives.length).toBeGreaterThan(0);
    for (const e of body.alternatives) {
      expect(e.muscle_group).toBe('chest');
      expect(['dumbbell', 'bodyweight']).toContain(e.equipment);
    }
    const sent = JSON.stringify(body);
    for (const pii of [student.email, student.id, sessionId, qaName('Alumno chat')]) expect(sent).not.toContain(pii);

    const { data } = res.body;
    expect(data.response).toBe('Respuesta a: ¿Con qué reemplazo el press de banca?');
    expect(data.suggestions).toEqual([
      { exercise_id: body.alternatives[0].id, name: body.alternatives[0].name, reason: 'Mismo músculo con tu equipamiento' },
    ]);
    expect(data.remaining_today).toBe(19);
    expect(await messagesOf(student.id)).toEqual([
      { role: 'user', content: '¿Con qué reemplazo el press de banca?', session_id: sessionId },
      { role: 'assistant', content: data.response, session_id: sessionId },
    ]);
  });

  it('GET /chat/today devuelve la conversación en orden; el siguiente mensaje la manda como history', async () => {
    const today = await api(student.token).get('/chat/today');
    expectStatus(today, 200, 'GET /chat/today');
    expect(today.body.data.remaining_today).toBe(19);
    expect(today.body.data.messages.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(Object.keys(today.body.data.messages[0]).sort()).toEqual(['content', 'created_at', 'id', 'role']);

    const res = await api(student.token).post('/chat').send({ message: '¿Y otra opción?' });
    expectStatus(res, 200, 'segundo POST /chat');
    expect(n8n.received[0].body.history.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(n8n.received[0].body.exercise).toBeNull();
    expect(res.body.data.remaining_today).toBe(18);
  });

  it('sesión que todavía no subió (offline-first): 200 y el par queda sin sesión', async () => {
    const res = await api(student.token).post('/chat').send({ message: 'Está ocupada la máquina', session_id: randomUUID() });
    expectStatus(res, 200, 'POST /chat con sesión que no está en el servidor');
    expect((await messagesOf(student.id)).slice(-2).map((m) => m.session_id)).toEqual([null, null]);
  });

  it('sesión terminada → 400 SESSION_FINISHED sin llamar a n8n', async () => {
    const { sessionId: done } = await uploadSession(student, {
      startedAt: new Date(Date.now() - 3_600_000).toISOString(),
      finishedAt: new Date().toISOString(),
    });
    const res = await api(student.token).post('/chat').send({ message: 'hola', session_id: done });
    expectStatus(res, 400, 'POST /chat con sesión terminada');
    expect(res.body.error.code).toBe('SESSION_FINISHED');
    expect(n8n.received).toHaveLength(0);
  });

  describe('aislamiento entre alumnos', () => {
    it('otro alumno no ve la conversación ni puede usar la sesión ajena (404)', async () => {
      const today = await api(other.token).get('/chat/today');
      expectStatus(today, 200, 'GET /chat/today de otro alumno');
      expect(today.body.data).toEqual({ messages: [], remaining_today: 20 });

      const res = await api(other.token).post('/chat').send({ message: 'hola', session_id: sessionId });
      expectStatus(res, 404, 'POST /chat con sesión ajena');
      expect(res.body.error.code).toBe('SESSION_NOT_FOUND');
      expect(JSON.stringify(res.body)).not.toContain(student.id);
      expect(n8n.received).toHaveLength(0);
    });

    it('un PT no puede usar el chat del alumno (403)', async () => {
      expectStatus(await api(pt.token).get('/chat/today'), 403, 'GET /chat/today como PT');
      expectStatus(await api(pt.token).post('/chat').send({ message: 'hola' }), 403, 'POST /chat como PT');
    });
  });

  describe('fallas de la IA: no se guarda nada ni cuenta para el límite', () => {
    it('n8n caído (502) → 503 AI_UNAVAILABLE; { error } → 502 AI_INVALID_RESPONSE', async () => {
      const before = (await messagesOf(other.id)).length;
      n8n.reply = () => [502, { error: 'LLM_UNAVAILABLE' }];
      const down = await api(other.token).post('/chat').send({ message: 'hola' });
      expectStatus(down, 503, 'POST /chat con n8n caído');
      expect(down.body.error).toMatchObject({
        code: 'AI_UNAVAILABLE',
        message: 'El asistente no está disponible ahora. Seguí con tu entrenamiento.',
      });

      n8n.reply = () => [200, { error: 'INVALID_JSON' }];
      const invalid = await api(other.token).post('/chat').send({ message: 'hola' });
      expectStatus(invalid, 502, 'POST /chat con respuesta inválida');
      expect(invalid.body.error.code).toBe('AI_INVALID_RESPONSE');

      expect(await messagesOf(other.id)).toHaveLength(before);
      expect((await api(other.token).get('/chat/today')).body.data.remaining_today).toBe(20);
    });

    it('con 20 mensajes del alumno hoy → 429 CHAT_LIMIT_REACHED sin llamar a n8n', async () => {
      const rows = Array.from({ length: 20 }, (_, i) => ({ student_id: other.id, role: 'user', content: `m${i}` }));
      const { error } = await supabase.from('chat_messages').insert(rows);
      if (error) throw new Error(error.message);
      const res = await api(other.token).post('/chat').send({ message: 'una más' });
      expectStatus(res, 429, 'POST /chat pasado el límite');
      expect(res.body.error.code).toBe('CHAT_LIMIT_REACHED');
      expect(n8n.received).toHaveLength(0);
    });
  });
});
