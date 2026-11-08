import { createServer } from 'node:http';
import { env } from '../../src/config/env.js';
import { supabase } from '../../src/config/supabase.js';
import { api, expectStatus } from '../helpers/integration/api.js';
import { createTrainer, inviteAndJoin } from '../helpers/integration/actors.js';
import { qaName } from '../helpers/integration/run-id.js';

// Asistente IA del entrenador contra Supabase dev, con el webhook `trainer-ia` de n8n
// simulado por un servidor HTTP local (la prueba real con n8n y KIMI es aparte).
// Precondición: migración 2026-11-06-trainer-ai-templates.sql aplicada en dev.
const SECRET = 'it-trainer-ai-secret';
const n8n = { received: [], reply: null };
let server;
const ORIGINAL = { url: env.N8N_TRAINER_AI_WEBHOOK_URL, secret: env.N8N_WEBHOOK_SECRET };

/** Propuesta de 2 bloques (lunes / miércoles y viernes) con ejercicios de la biblioteca recibida. */
function splitProposal(library) {
  const item = (e) => ({ exercise_id: e.id, sets: 3, reps: 10, rest_seconds: 90, suggested_kg: null, notes: null });
  return {
    routines: [
      { name: 'Bloque A', days: ['monday'], exercises: [item(library[0])] },
      { name: 'Bloque B', days: ['wednesday', 'friday'], exercises: [item(library[1]), item(library[0])] },
    ],
    rationale: 'Split de prueba de integración',
  };
}

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
  env.N8N_TRAINER_AI_WEBHOOK_URL = `http://127.0.0.1:${server.address().port}/webhook/trainer-ia`;
  env.N8N_WEBHOOK_SECRET = SECRET;
});

afterAll(async () => {
  env.N8N_TRAINER_AI_WEBHOOK_URL = ORIGINAL.url;
  env.N8N_WEBHOOK_SECRET = ORIGINAL.secret;
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(() => {
  n8n.received = [];
  n8n.reply = (body) => [200, splitProposal(body.library)];
});

const countGenerations = async (trainerId) => {
  const { count, error } = await supabase
    .from('ai_routine_generations')
    .select('id', { count: 'exact', head: true })
    .eq('trainer_id', trainerId);
  if (error) throw new Error(error.message);
  return count;
};

describe('trainer-ai (integración)', () => {
  let ptA;
  let ptB;
  let student;
  let generationId;
  let templateIds;

  beforeAll(async () => {
    ptA = await createTrainer('ia-a');
    ptB = await createTrainer('ia-b');
    student = await inviteAndJoin(ptA, 'ia');
  });

  it('genera con el alumno: n8n recibe el secreto y el contexto sin datos personales', async () => {
    const res = await api(ptA.token)
      .post('/trainer-ai/generate-routine')
      .send({ student_id: student.id, goal: 'hypertrophy', level: 'beginner', frequency_per_week: 3 });
    expectStatus(res, 200, 'POST /trainer-ai/generate-routine');

    const { headers, body } = n8n.received[0];
    expect(headers['x-webhook-secret']).toBe(SECRET);
    expect(Object.keys(body).sort()).toEqual(['base_template', 'library', 'params', 'previous_templates']);
    expect(body.params).toMatchObject({ goal: 'hypertrophy', frequency_per_week: 3, session_duration_min: 60 });
    const sent = JSON.stringify(body);
    for (const pii of [student.email, student.id, qaName('Alumno ia')]) expect(sent).not.toContain(pii);

    generationId = res.body.data.generation_id;
    const [blockA, blockB] = res.body.data.routine_proposal.routines;
    expect(blockA.exercises[0].exercise_name).toEqual(expect.any(String));
    expect(blockB.days).toEqual(['wednesday', 'friday']);
  });

  it('guarda una plantilla por bloque y aparecen en GET /routine-templates como generadas por IA', async () => {
    const res = await api(ptA.token)
      .post('/trainer-ai/save-as-template')
      .send({ generation_id: generationId, template_name: qaName('Plan IA') });
    expectStatus(res, 201, 'POST /trainer-ai/save-as-template');
    expect(res.body.data.templates.map((t) => t.name)).toEqual([
      `${qaName('Plan IA')} · Bloque A`,
      `${qaName('Plan IA')} · Bloque B`,
    ]);
    templateIds = res.body.data.templates.map((t) => t.id);

    const list = await api(ptA.token).get('/routine-templates').query({ generated_by_ai: 'true' });
    expectStatus(list, 200, 'GET /routine-templates');
    const mine = list.body.data.filter((t) => templateIds.includes(t.id));
    expect(mine).toHaveLength(2);
    expect(mine.every((t) => t.generated_by_ai === true)).toBe(true);

    const { data: generation } = await supabase
      .from('ai_routine_generations')
      .select('was_used, routine_template_id, routine_template_ids')
      .eq('id', generationId)
      .single();
    expect(generation).toEqual({ was_used: true, routine_template_id: templateIds[0], routine_template_ids: templateIds });
  });

  it('guardar dos veces es 409 GENERATION_ALREADY_SAVED', async () => {
    const res = await api(ptA.token)
      .post('/trainer-ai/save-as-template')
      .send({ generation_id: generationId, template_name: qaName('Otra vez') });
    expectStatus(res, 409, 'segundo save-as-template');
    expect(res.body.error.code).toBe('GENERATION_ALREADY_SAVED');
  });

  it('dos save-as-template en paralelo: uno 201 y el otro 409 (la función SQL bloquea la fila)', async () => {
    const gen = await api(ptA.token).post('/trainer-ai/generate-routine').send({ goal: 'strength', level: 'beginner', frequency_per_week: 3 });
    expectStatus(gen, 200, 'generate para el guardado en paralelo');
    const save = (name) =>
      api(ptA.token).post('/trainer-ai/save-as-template').send({ generation_id: gen.body.data.generation_id, template_name: qaName(name) });
    const statuses = (await Promise.all([save('Paralelo 1'), save('Paralelo 2')])).map((r) => r.status);
    expect(statuses.sort()).toEqual([201, 409]);
  });

  describe('aislamiento: el PT B no ve ni usa nada del PT A', () => {
    const noForeignIds = (res) => {
      const text = JSON.stringify(res.body);
      for (const id of [generationId, student.id, ptA.id, ...templateIds]) expect(text).not.toContain(id);
    };

    it('no puede guardar la generación de A (404, sin ids ajenos)', async () => {
      const res = await api(ptB.token)
        .post('/trainer-ai/save-as-template')
        .send({ generation_id: generationId, template_name: qaName('Ajena') });
      expectStatus(res, 404, 'save-as-template ajeno');
      expect(res.body.error.code).toBe('GENERATION_NOT_FOUND');
      noForeignIds(res);
    });

    it('no puede generar con el alumno ni con la plantilla de A (404, sin llamar a n8n)', async () => {
      const withStudent = await api(ptB.token)
        .post('/trainer-ai/generate-routine')
        .send({ student_id: student.id, frequency_per_week: 3 });
      expectStatus(withStudent, 404, 'generate con alumno ajeno');
      expect(withStudent.body.error.code).toBe('STUDENT_NOT_FOUND');
      noForeignIds(withStudent);

      const withTemplate = await api(ptB.token)
        .post('/trainer-ai/generate-routine')
        .send({ goal: 'strength', level: 'beginner', frequency_per_week: 3, base_template_id: templateIds[0] });
      expectStatus(withTemplate, 404, 'generate con plantilla ajena');
      expect(withTemplate.body.error.code).toBe('TEMPLATE_NOT_FOUND');
      noForeignIds(withTemplate);
      expect(n8n.received).toHaveLength(0);
    });
  });

  describe('fallas de la IA: no se guarda nada', () => {
    const generate = () =>
      api(ptB.token).post('/trainer-ai/generate-routine').send({ goal: 'strength', level: 'beginner', frequency_per_week: 3 });

    it('respuesta inválida de n8n ({ error: INVALID_JSON }) → 502', async () => {
      n8n.reply = () => [200, { error: 'INVALID_JSON' }];
      const res = await generate();
      expectStatus(res, 502, 'generate con propuesta inválida');
      expect(res.body.error.code).toBe('AI_INVALID_RESPONSE');
      expect(await countGenerations(ptB.id)).toBe(0);
    });

    it('n8n caído (502 LLM_UNAVAILABLE) → 503', async () => {
      n8n.reply = () => [502, { error: 'LLM_UNAVAILABLE' }];
      const res = await generate();
      expectStatus(res, 503, 'generate con n8n caído');
      expect(res.body.error.code).toBe('AI_UNAVAILABLE');
      expect(await countGenerations(ptB.id)).toBe(0);
    });
  });
});
