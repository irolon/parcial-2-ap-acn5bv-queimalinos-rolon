import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readAiSession, writeAiSession } from '@/utils/trainer-ai/proposalStore';
import { AI_STORAGE_KEY, SPLIT } from '../../helpers/trainer-ai/fixtures';

const SESSION = { form: { goal: 'strength' }, student: null, generationId: 'g-1', proposal: SPLIT.routine_proposal, assigned: {}, saved: null, editing: null };

beforeEach(() => sessionStorage.clear());

describe('proposalStore', () => {
  it('guarda y lee en sessionStorage por entrenador', () => {
    writeAiSession('t-1', SESSION);
    expect(JSON.parse(sessionStorage.getItem(AI_STORAGE_KEY('t-1')))).toEqual(SESSION);
    expect(readAiSession('t-1')).toEqual(SESSION);
    expect(readAiSession('t-2')).toBeNull();
  });

  it('una sesión con otra forma es como no tener nada (no rompe la pantalla)', () => {
    const block = SPLIT.routine_proposal.routines[0];
    const broken = [
      { ...SESSION, form: null },
      { ...SESSION, generationId: 3 },
      { ...SESSION, proposal: { rationale: 'x' } },
      { ...SESSION, proposal: { routines: [] } },
      { ...SESSION, proposal: { routines: [{ ...block, days: 'monday' }] } },
      { ...SESSION, proposal: { routines: [{ ...block, exercises: null }] } },
      { ...SESSION, proposal: { routines: [{ ...block, exercises: [null] }] } },
      { ...SESSION, proposal: { routines: [null] } },
      { ...SESSION, assigned: [] },
      [],
      'texto',
    ];
    for (const data of broken) {
      sessionStorage.setItem(AI_STORAGE_KEY('t-1'), JSON.stringify(data));
      expect(readAiSession('t-1')).toBeNull();
    }
  });

  it('un JSON roto, sin entrenador o sin sessionStorage es como no tener nada', () => {
    sessionStorage.setItem(AI_STORAGE_KEY('t-1'), '{roto');
    expect(readAiSession('t-1')).toBeNull();
    expect(readAiSession(undefined)).toBeNull();
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    expect(readAiSession('t-1')).toBeNull();
    spy.mockRestore();
  });
});
