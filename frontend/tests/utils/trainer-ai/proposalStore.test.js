import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAiSession, readAiSession, writeAiSession } from '@/utils/trainer-ai/proposalStore';
import { AI_STORAGE_KEY } from '../../helpers/trainer-ai/fixtures';

beforeEach(() => sessionStorage.clear());

describe('proposalStore', () => {
  it('guarda y lee en sessionStorage por entrenador', () => {
    writeAiSession('t-1', { generationId: 'g-1', assigned: {} });
    expect(JSON.parse(sessionStorage.getItem(AI_STORAGE_KEY('t-1')))).toEqual({ generationId: 'g-1', assigned: {} });
    expect(readAiSession('t-1')).toEqual({ generationId: 'g-1', assigned: {} });
    expect(readAiSession('t-2')).toBeNull();
    clearAiSession('t-1');
    expect(readAiSession('t-1')).toBeNull();
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
