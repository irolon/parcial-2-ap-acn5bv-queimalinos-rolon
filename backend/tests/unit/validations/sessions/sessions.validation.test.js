import {
  validateCreateSession,
  validateUpdateSession,
  validateSessionIdParam,
  validateSetsEnvelope,
} from '../../../../src/validations/sessions/sessions.validation.js';
import { Errors } from '../../../../src/shared/utils/errors.js';

const UUID = '3f1c2b9a-1d2e-4f5a-8b7c-9d0e1f2a3b4c';
const START = '2026-10-17T09:00:00-03:00';

const failsOn = (fn, field) => {
  try {
    fn();
  } catch (e) {
    expect(e).toMatchObject({ code: 'VALIDATION_ERROR', statusCode: 400 });
    expect(e.details.map((d) => d.field)).toContain(field);
    return;
  }
  throw new Error('no tiró');
};

describe('sessions.validation — validateCreateSession', () => {
  it('válido mínimo: el resto queda en null', () => {
    expect(validateCreateSession({ id: UUID, started_at: START })).toEqual({
      id: UUID, routine_id: null, started_at: START, finished_at: null, rpe: null, notes: null,
    });
  });

  it('ids en minúscula y campos opcionales', () => {
    const out = validateCreateSession({
      id: UUID.toUpperCase(), routine_id: UUID.toUpperCase(), started_at: START,
      finished_at: '2026-10-17T10:00:00-03:00', rpe: 7, notes: 'bien',
    });
    expect(out).toMatchObject({ id: UUID, routine_id: UUID, rpe: 7, notes: 'bien' });
  });

  it('rechaza id inválido, started_at sin zona y finished_at anterior', () => {
    failsOn(() => validateCreateSession({ id: 'x', started_at: START }), 'id');
    failsOn(() => validateCreateSession({ id: UUID, started_at: '2026-10-17T09:00:00' }), 'started_at');
    failsOn(() => validateCreateSession({ id: UUID }), 'started_at');
    failsOn(() => validateCreateSession({ id: UUID, started_at: '2026-10-17T09:00:00+25:00' }), 'started_at');
    failsOn(
      () => validateCreateSession({ id: UUID, started_at: START, finished_at: '2026-10-17T08:00:00-03:00' }),
      'finished_at'
    );
  });

  it('rechaza rpe fuera de 1–10 o no entero, y notes de 1001', () => {
    for (const rpe of [0, 11, 5.5]) {
      failsOn(() => validateCreateSession({ id: UUID, started_at: START, rpe }), 'rpe');
    }
    failsOn(() => validateCreateSession({ id: UUID, started_at: START, notes: 'a'.repeat(1001) }), 'notes');
    expect(validateCreateSession({ id: UUID, started_at: START, notes: 'a'.repeat(1000) }).notes).toHaveLength(1000);
  });
});

describe('sessions.validation — validateUpdateSession', () => {
  it('exige al menos un campo', () => {
    failsOn(() => validateUpdateSession({}), 'body');
  });

  it('devuelve solo lo enviado', () => {
    expect(validateUpdateSession({ rpe: 7 })).toEqual({ rpe: 7 });
    expect(validateUpdateSession({ finished_at: START, notes: 'ok' })).toEqual({
      finished_at: START, notes: 'ok',
    });
  });

  it('valida cada campo', () => {
    failsOn(() => validateUpdateSession({ rpe: 11 }), 'rpe');
    failsOn(() => validateUpdateSession({ finished_at: 'ayer' }), 'finished_at');
    failsOn(() => validateUpdateSession({ notes: 5 }), 'notes');
  });
});

describe('sessions.validation — validateSessionIdParam y envelope', () => {
  it('param: minúscula o error', () => {
    expect(validateSessionIdParam({ id: UUID.toUpperCase() })).toEqual({ id: UUID });
    failsOn(() => validateSessionIdParam({ id: 'x' }), 'id');
  });

  it('envelope: array de 1 a 100', () => {
    failsOn(() => validateSetsEnvelope({}), 'sets');
    failsOn(() => validateSetsEnvelope({ sets: [] }), 'sets');
    failsOn(() => validateSetsEnvelope({ sets: new Array(101).fill({}) }), 'sets');
    expect(validateSetsEnvelope({ sets: new Array(24).fill({}) }).sets).toHaveLength(24);
  });

  it('errores de sesión', () => {
    expect(Errors.sessionNotFound()).toMatchObject({ statusCode: 404, code: 'SESSION_NOT_FOUND' });
    expect(Errors.sessionIdConflict()).toMatchObject({ statusCode: 409, code: 'SESSION_ID_CONFLICT' });
  });
});
