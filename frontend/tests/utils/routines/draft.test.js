import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearDraft, DRAFT_KEY, readDraft, restoreDraft, serializeDraft, writeDraft,
} from '@/utils/routines/draft';
import { EX_A, EX_B, exercisesById, stateWith } from '../../helpers/routines/fixtures';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('draft', () => {
  it('usa la clave por entrenador', () => {
    expect(DRAFT_KEY('t-9')).toBe('fittrainer.routine-draft.t-9');
  });

  it('serializeDraft no incluye key ni datos del ejercicio', () => {
    const raw = serializeDraft(stateWith([EX_A]));
    expect(raw).not.toContain('"key"');
    expect(JSON.parse(raw).exercises[0]).toMatchObject({ exercise_id: EX_A, sets: '3' });
  });

  it('ida y vuelta conserva el contenido con keys nuevas', () => {
    const state = stateWith([EX_A, EX_B], { templateId: 't-1', templateName: 'Base' });
    const { state: restored, missing } = restoreDraft(serializeDraft(state), exercisesById);
    expect(missing).toBe(0);
    expect(restored).toMatchObject({ name: 'Fuerza', goal: 'strength', days: ['monday'], templateId: 't-1', templateName: 'Base' });
    expect(restored.exercises.map((e) => e.exercise_id)).toEqual([EX_A, EX_B]);
    expect(restored.exercises.every((e) => e.key)).toBe(true);
  });

  it('un ejercicio borrado se descarta y se cuenta', () => {
    const raw = serializeDraft(stateWith([EX_A, EX_B]));
    const { state, missing } = restoreDraft(raw, new Map([[EX_A, {}]]));
    expect(missing).toBe(1);
    expect(state.exercises).toHaveLength(1);
  });

  it('JSON roto devuelve null', () => {
    expect(restoreDraft('{no es json', exercisesById)).toBeNull();
    expect(restoreDraft(null, exercisesById)).toBeNull();
  });

  it('write, read y clear con localStorage', () => {
    writeDraft('t-1', stateWith([EX_A]));
    expect(JSON.parse(readDraft('t-1')).name).toBe('Fuerza');
    clearDraft('t-1');
    expect(readDraft('t-1')).toBeNull();
  });

  it('nunca tira si localStorage falla', () => {
    const boom = () => { throw new Error('cuota'); };
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(boom);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(boom);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(boom);
    expect(() => writeDraft('t-1', stateWith())).not.toThrow();
    expect(readDraft('t-1')).toBeNull();
    expect(() => clearDraft('t-1')).not.toThrow();
  });
});
