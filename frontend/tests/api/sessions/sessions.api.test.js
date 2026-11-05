import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, configureClient } from '@/api/shared/client';
import { createSession, uploadSets } from '@/api/sessions/sessions.api';
import { bodyOf, calls, errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

beforeEach(() => configureClient({ getToken: () => 'access-1', refreshSession: vi.fn() }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const SESSION = {
  id: '5f6e1a52-0000-4000-8000-000000000001',
  routine_id: 'r-1',
  started_at: '2026-11-01T13:00:00.000Z',
  finished_at: '2026-11-01T14:00:00.000Z',
  rpe: 7,
  notes: null,
};
const SETS = [
  {
    id: 'set-1',
    exercise_id: 'e-1',
    routine_exercise_id: 're-1',
    set_number: 1,
    actual_reps: 10,
    actual_kg: 60,
    executed_at: '2026-11-01T13:10:00.000Z',
  },
];

describe('sessions.api: subir un entrenamiento', () => {
  it('createSession hace POST /sessions con el body tal cual y devuelve la sesión con sus logros', async () => {
    const data = { ...SESSION, student_id: 's-1', has_modifications: false, unlocked_achievements: [{ code: 'FIRST_SESSION' }] };
    const fetchMock = stubFetch(async () => jsonResponse(201, { data }));
    await expect(createSession(SESSION)).resolves.toEqual(data);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/sessions');
    expect(init.method).toBe('POST');
    expect(bodyOf(init)).toEqual(SESSION);
  });

  it('createSession también resuelve con el 200 de un reintento', async () => {
    const data = { ...SESSION, unlocked_achievements: [] };
    stubFetch(async () => jsonResponse(200, { data }));
    await expect(createSession(SESSION)).resolves.toEqual(data);
  });

  it('uploadSets hace POST /sessions/:id/sets con { sets } y devuelve saved, failed y logros', async () => {
    const data = {
      saved: [{ id: 'set-1', created: true }],
      failed: [{ id: 'set-2', index: 1, code: 'EXERCISE_NOT_FOUND', message: 'No existe' }],
      unlocked_achievements: [{ code: 'FIRST_PR', name: 'Primer récord', category: 'pr' }],
    };
    const fetchMock = stubFetch(async () => jsonResponse(200, { data }));
    await expect(uploadSets(SESSION.id, SETS)).resolves.toEqual(data);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe(`/sessions/${SESSION.id}/sets`);
    expect(init.method).toBe('POST');
    expect(bodyOf(init)).toEqual({ sets: SETS });
  });

  it('uploadSets escapa el id de la sesión en la URL', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: { saved: [], failed: [], unlocked_achievements: [] } }));
    await uploadSets('a/b', SETS);
    expect(calls(fetchMock)[0][0]).toBe('/sessions/a%2Fb/sets');
  });

  it('sin red tira un ApiError de status 0, para que la subida se reintente', async () => {
    stubFetch(async () => {
      throw new TypeError('Failed to fetch');
    });
    const error = await createSession(SESSION).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
  });

  it('un error del servidor llega como ApiError con su status y su código', async () => {
    stubFetch(async () => errorResponse(404, 'SESSION_NOT_FOUND', 'Sesión no encontrada'));
    const error = await uploadSets(SESSION.id, SETS).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect([error.status, error.code]).toEqual([404, 'SESSION_NOT_FOUND']);
  });
});
