import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import express from 'express';
import {
  mockMessagesRepo,
  mockImagesRepo,
  mockStudentsRepo,
  TRAINER,
  STUDENT,
  STUDENT_ID,
  OTHER_TRAINER_ID,
  studentRow,
  messageRow,
  PNG,
  PDF,
} from '../../../helpers/messages/messages.setup.js';

// Router, controller y services reales sobre un servidor mínimo; solo los repositorios están mockeados.
const { default: router } = await import('../../../../src/routes/messages/messages.routes.js');
const { errorHandler } = await import('../../../../src/shared/middlewares/error.middleware.js');
const { signAccessToken } = await import('../../../../src/shared/utils/jwt.js');

let server;
let base;
beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/messages', router);
  app.use(errorHandler);
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}/api/messages`;
});
afterAll(() => new Promise((resolve) => server.close(resolve)));

const token = (u) => signAccessToken({ sub: u.id, role: u.role, email: 'x@y.z' });
const auth = (u) => ({ Authorization: `Bearer ${token(u)}` });
const form = (fields = {}, file) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  if (file) f.append(file.field ?? 'image', new Blob([file.buffer], { type: 'image/png' }), 'foto.png');
  return f;
};

beforeEach(() => {
  jest.resetAllMocks();
  mockStudentsRepo.findStudentById.mockResolvedValue(studentRow());
  mockImagesRepo.signUrls.mockResolvedValue(new Map());
  mockMessagesRepo.insertMessage.mockImplementation(async (row) => messageRow(row));
});

describe('POST /:studentId (Review Focus 1)', () => {
  it('PDF con Content-Type image/png → 415 IMAGE_TYPE_INVALID y nada sube', async () => {
    const res = await fetch(`${base}/${STUDENT_ID}`, {
      method: 'POST',
      headers: auth(TRAINER),
      body: form({ body: 'hola' }, { buffer: PDF }),
    });
    expect(res.status).toBe(415);
    expect((await res.json()).error.code).toBe('IMAGE_TYPE_INVALID');
    expect(mockImagesRepo.uploadImage).not.toHaveBeenCalled();
    expect(mockMessagesRepo.insertMessage).not.toHaveBeenCalled();
  });

  it('texto + foto PNG real → 201 con el mensaje y sin image_path', async () => {
    mockImagesRepo.signUrls.mockImplementation(async (paths) => new Map(paths.map((p) => [p, `https://f/${p}`])));
    const res = await fetch(`${base}/${STUDENT_ID}`, {
      method: 'POST',
      headers: auth(STUDENT),
      body: form({ body: '  hola  ' }, { buffer: PNG }),
    });
    expect(res.status).toBe(201);
    const { data } = await res.json();
    expect(data).toMatchObject({ sender_role: 'student', body: 'hola' });
    expect(data.image_url).toMatch(/^https:\/\/f\//);
    expect(JSON.stringify(data)).not.toContain('image_path');
    expect(mockImagesRepo.uploadImage).toHaveBeenCalledTimes(1);
  });

  it('sin texto ni foto → 400 MESSAGE_EMPTY', async () => {
    const res = await fetch(`${base}/${STUDENT_ID}`, { method: 'POST', headers: auth(TRAINER), body: form({}) });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('MESSAGE_EMPTY');
  });

  it('archivo en un campo con otro nombre → 400', async () => {
    const res = await fetch(`${base}/${STUDENT_ID}`, {
      method: 'POST',
      headers: auth(TRAINER),
      body: form({ body: 'x' }, { buffer: PNG, field: 'file' }),
    });
    expect(res.status).toBe(400);
  });

  it('sin token → 401', async () => {
    const res = await fetch(`${base}/${STUDENT_ID}`, { method: 'POST', body: form({ body: 'x' }) });
    expect(res.status).toBe(401);
  });
});

describe('acceso a conversaciones ajenas (Review Focus 2)', () => {
  it('PT ajeno: GET, POST y read → 403 sin tocar mensajes', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(studentRow({ trainer_id: OTHER_TRAINER_ID }));
    const h = auth(TRAINER);
    const responses = await Promise.all([
      fetch(`${base}/${STUDENT_ID}`, { headers: h }),
      fetch(`${base}/${STUDENT_ID}`, { method: 'POST', headers: h, body: form({ body: 'x' }) }),
      fetch(`${base}/${STUDENT_ID}/read`, { method: 'POST', headers: h }),
    ]);
    expect(responses.map((r) => r.status)).toEqual([403, 403, 403]);
    expect(mockMessagesRepo.findPage).not.toHaveBeenCalled();
    expect(mockMessagesRepo.insertMessage).not.toHaveBeenCalled();
    expect(mockMessagesRepo.markRead).not.toHaveBeenCalled();
  });

  it('alumno en la conversación de otro → 403', async () => {
    const other = { id: '44444444-4444-4444-8444-444444444444', role: 'student' };
    const res = await fetch(`${base}/${STUDENT_ID}`, { headers: auth(other) });
    expect(res.status).toBe(403);
  });
});

describe('GET /:studentId', () => {
  it('devuelve { data, meta, counterpart } y valida la query', async () => {
    mockMessagesRepo.findPage.mockResolvedValue([messageRow()]);
    const ok = await fetch(`${base}/${STUDENT_ID}?limit=10`, { headers: auth(TRAINER) });
    expect(ok.status).toBe(200);
    const json = await ok.json();
    expect(Object.keys(json)).toEqual(['data', 'meta', 'counterpart']);
    expect(mockMessagesRepo.findPage).toHaveBeenCalledWith(STUDENT_ID, { before: null, limit: 10 });

    const bad = await fetch(`${base}/${STUDENT_ID}?limit=101`, { headers: auth(TRAINER) });
    expect(bad.status).toBe(400);
  });

  it('un studentId que no es uuid → 400', async () => {
    const res = await fetch(`${base}/nope`, { headers: auth(TRAINER) });
    expect(res.status).toBe(400);
  });
});

describe('POST /:studentId/read y /unread-count', () => {
  it('read → 200 { data: { updated } }', async () => {
    mockMessagesRepo.markRead.mockResolvedValue(3);
    const res = await fetch(`${base}/${STUDENT_ID}/read`, { method: 'POST', headers: auth(STUDENT) });
    expect(await res.json()).toEqual({ data: { updated: 3 } });
    expect(mockMessagesRepo.markRead).toHaveBeenCalledWith(STUDENT_ID, 'trainer');
  });

  it('unread-count no lo captura /:studentId', async () => {
    mockMessagesRepo.countUnread.mockResolvedValue(5);
    const res = await fetch(`${base}/unread-count`, { headers: auth(STUDENT) });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { count: 5 } });
  });
});

describe('GET /conversations y POST /broadcast', () => {
  it('conversations: un alumno recibe 403', async () => {
    const res = await fetch(`${base}/conversations`, { headers: auth(STUDENT) });
    expect(res.status).toBe(403);
  });

  it('conversations devuelve { data: [] } para un PT sin alumnos', async () => {
    mockStudentsRepo.findActiveStudentsByTrainer.mockResolvedValue([]);
    mockMessagesRepo.findLastByStudents.mockResolvedValue(new Map());
    mockMessagesRepo.countUnreadByStudents.mockResolvedValue(new Map());
    const res = await fetch(`${base}/conversations`, { headers: auth(TRAINER) });
    expect(await res.json()).toEqual({ data: [] });
  });

  const post = (u, body) =>
    fetch(`${base}/broadcast`, {
      method: 'POST',
      headers: { ...auth(u), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  const ids = ['a1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222'];

  it('201 { broadcast_id, sent } con todos propios', async () => {
    mockStudentsRepo.findActiveStudentsByIds.mockResolvedValue(ids.map((id) => ({ id })));
    const res = await post(TRAINER, { student_ids: ids, body: 'hola' });
    expect(res.status).toBe(201);
    const { data } = await res.json();
    expect(data.sent).toBe(2);
    expect(data.broadcast_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('un id ajeno entre propios → 403 y cero filas insertadas (Review Focus 3)', async () => {
    mockStudentsRepo.findActiveStudentsByIds.mockResolvedValue([{ id: ids[0] }]);
    const res = await post(TRAINER, { student_ids: ids, body: 'hola' });
    expect(res.status).toBe(403);
    expect(mockMessagesRepo.insertMany).not.toHaveBeenCalled();
  });

  it('un alumno no puede hacer broadcast y el body inválido da 400', async () => {
    expect((await post(STUDENT, { student_ids: ids, body: 'x' })).status).toBe(403);
    expect((await post(TRAINER, { student_ids: [], body: 'x' })).status).toBe(400);
  });
});
