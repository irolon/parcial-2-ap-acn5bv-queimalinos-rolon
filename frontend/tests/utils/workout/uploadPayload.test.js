import { describe, expect, it } from 'vitest';
import {
  applyBatch, batches, mergeUnlocked, pendingSets, sessionBody, setBody,
} from '@/utils/workout/uploadPayload';
import { finishWorkout, setFeedback } from '@/utils/workout/workoutState';
import { at, finishedWorkout, freshWorkout, isoAt, setIds, withSets } from '../../helpers/workout/workout';

const FIRST_SESSION = { code: 'FIRST_SESSION', name: 'Primera sesión', category: 'milestone' };
const FIRST_PR = { code: 'FIRST_PR', name: 'Primer récord', category: 'pr' };

describe('sessionBody: POST /sessions con los campos y el orden de CreateSessionRequest del celular', () => {
  it('sin feedback: id, routine_id, started_at y finished_at (rpe y notes no viajan)', () => {
    const body = sessionBody(finishWorkout(freshWorkout(), at(3600)));
    expect(JSON.stringify(body)).toBe(
      '{"id":"session-1","routine_id":"r-1","started_at":"2026-11-01T13:00:00.000Z","finished_at":"2026-11-01T14:00:00.000Z"}',
    );
  });

  it('con feedback suma rpe y notes al final; si uno falta, solo va el otro', () => {
    const finished = finishWorkout(freshWorkout(), at(3600));
    expect(Object.keys(sessionBody(setFeedback(finished, { rpe: 7, notes: 'Bien' }))))
      .toEqual(['id', 'routine_id', 'started_at', 'finished_at', 'rpe', 'notes']);
    expect(sessionBody(setFeedback(finished, { rpe: 7, notes: '' }))).not.toHaveProperty('notes');
    expect(sessionBody(setFeedback(finished, { notes: 'Bien' }))).not.toHaveProperty('rpe');
  });

  it('un reloj que volvió atrás no deja finished_at antes de started_at (el backend la rechazaría)', () => {
    const state = { ...freshWorkout(), finishedAt: isoAt(-120) };
    expect(sessionBody(state).finished_at).toBe(state.startedAt);
  });

  it('sin terminar y sin rutina: finished_at y routine_id en null', () => {
    const body = sessionBody({ ...freshWorkout(), routineId: null });
    expect(body).toMatchObject({ routine_id: null, finished_at: null });
  });
});

describe('setBody: una serie como SessionSetDto del celular', () => {
  it('los ocho campos en orden, sin sustitución', () => {
    const [set] = withSets(freshWorkout(), [[0, 62.5, 8]]).sets;
    expect(JSON.stringify(setBody(set))).toBe(
      '{"id":"set-1","exercise_id":"e-1","original_exercise_id":null,"routine_exercise_id":"re-1",'
        + '"set_number":1,"actual_reps":8,"actual_kg":62.5,"executed_at":"2026-11-01T13:01:00.000Z"}',
    );
  });

  it('una serie sin peso (peso corporal) va con actual_kg 0, como el celular', () => {
    const [set] = withSets(freshWorkout(), [[0, null, 15]]).sets;
    expect(setBody(set).actual_kg).toBe(0);
  });
});

describe('pendingSets y batches', () => {
  it('las que faltan, por executedAt y después por id (como pendingSets del celular)', () => {
    const state = finishedWorkout(3);
    const shuffled = {
      ...state,
      sets: [
        { ...state.sets[2], executedAt: isoAt(1) },
        state.sets[1],
        { ...state.sets[0], executedAt: isoAt(5) },
      ],
    };
    expect(pendingSets(shuffled).map((set) => set.id)).toEqual(['set-003', 'set-002', 'set-001']);
    const sameTime = { ...state, sets: [state.sets[1], { ...state.sets[0], executedAt: state.sets[1].executedAt }] };
    expect(pendingSets(sameTime).map((set) => set.id)).toEqual(['set-001', 'set-002']);
  });

  it('saca las ya enviadas y las rechazadas', () => {
    const state = finishedWorkout(4);
    const upload = { ...state.upload, sentSetIds: ['set-001'], failed: [{ id: 'set-003', code: 'VALIDATION_ERROR' }] };
    expect(pendingSets({ ...state, upload }).map((set) => set.id)).toEqual(['set-002', 'set-004']);
  });

  it('lotes de a 100', () => {
    expect(batches(finishedWorkout(250).sets).map((batch) => batch.length)).toEqual([100, 100, 50]);
    expect(batches(finishedWorkout(100).sets).map((batch) => batch.length)).toEqual([100]);
    expect(batches([])).toEqual([]);
  });
});

describe('applyBatch', () => {
  const state = finishedWorkout(3);

  it('las saved pasan a enviadas (vuelven en minúscula) y las failed se ubican por index en el lote', () => {
    const upper = { ...state, sets: state.sets.map((set) => ({ ...set, id: set.id.toUpperCase() })) };
    const next = applyBatch(upper, upper.sets, {
      saved: [{ id: 'set-001', created: true }, { id: 'set-003', created: false }],
      failed: [{ id: null, index: 1, code: 'EXERCISE_NOT_FOUND', message: 'El ejercicio no existe' }],
      unlocked_achievements: [FIRST_PR],
    });
    expect(next.upload).toStrictEqual({
      sessionCreated: false,
      sentSetIds: ['SET-001', 'SET-003'],
      failed: [{ id: 'SET-002', code: 'EXERCISE_NOT_FOUND' }],
      unlocked: [FIRST_PR],
    });
  });

  it('sin index usable, la failed se busca por id; lo que no se reconoce se ignora', () => {
    const next = applyBatch(state, state.sets, {
      saved: [{ id: 'otra-serie', created: true }],
      failed: [{ id: 'set-002', code: 'SET_ID_CONFLICT' }],
    });
    expect(next.upload.sentSetIds).toEqual([]);
    expect(next.upload.failed).toEqual([{ id: 'set-002', code: 'SET_ID_CONFLICT' }]);
  });

  it('no repite enviadas ni rechazadas que ya estaban', () => {
    const before = { ...state, upload: { ...state.upload, sentSetIds: ['set-001'], failed: [{ id: 'set-002', code: 'X' }] } };
    const next = applyBatch(before, state.sets, {
      saved: [{ id: 'set-001' }, { id: 'set-003' }],
      failed: [{ index: 1, code: 'X' }],
    });
    expect(next.upload.sentSetIds).toEqual(setIds(1, 1).concat('set-003'));
    expect(next.upload.failed).toEqual([{ id: 'set-002', code: 'X' }]);
  });
});

describe('mergeUnlocked', () => {
  it('suma los nuevos sin repetir, por code o por id', () => {
    const withId = { id: 'a-1', code: 'STREAK_7', name: 'Racha de 7', category: 'streak' };
    expect(mergeUnlocked([FIRST_SESSION], [FIRST_SESSION, FIRST_PR])).toEqual([FIRST_SESSION, FIRST_PR]);
    expect(mergeUnlocked([withId], [{ id: 'a-1', name: 'Racha de 7' }])).toEqual([withId]);
    expect(mergeUnlocked([FIRST_SESSION], undefined)).toEqual([FIRST_SESSION]);
    expect(mergeUnlocked([], [null, 'x', FIRST_PR])).toEqual([FIRST_PR]);
  });
});
