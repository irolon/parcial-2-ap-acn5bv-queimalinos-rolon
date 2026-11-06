import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAiBlock } from '@/hooks/trainer-ai/useAiBlock';
import { useAiSession } from '@/hooks/trainer-ai/useAiSession';
import { AI_STORAGE_KEY, SPLIT } from '../../helpers/trainer-ai/fixtures';

const session = (generationId) => ({
  form: { goal: 'strength' }, student: null, generationId, proposal: SPLIT.routine_proposal, assigned: {}, saved: null, editing: null,
});
const store = (trainerId, data) => sessionStorage.setItem(AI_STORAGE_KEY(trainerId), JSON.stringify(data));
const params = (query) => new URLSearchParams(query);

beforeEach(() => sessionStorage.clear());

describe('useAiSession', () => {
  it('al cambiar de entrenador lee la sesión del nuevo y no le escribe la del anterior', () => {
    store('t-1', session('g-1'));
    store('t-2', session('g-2'));
    const { result, rerender } = renderHook(({ id }) => useAiSession(id), { initialProps: { id: 't-1' } });
    expect(result.current[0].generationId).toBe('g-1');
    rerender({ id: 't-2' });
    expect(result.current[0].generationId).toBe('g-2');
    act(() => result.current[1]((s) => ({ ...s, saved: { already: false } })));
    expect(JSON.parse(sessionStorage.getItem(AI_STORAGE_KEY('t-2'))).saved).toEqual({ already: false });
    expect(JSON.parse(sessionStorage.getItem(AI_STORAGE_KEY('t-1'))).saved).toBeNull();
  });
});

describe('useAiBlock', () => {
  it('vuelve a buscar el bloque cuando cambian `ia`, `bloque` o el entrenador', () => {
    store('t-1', session('g-1'));
    const { result, rerender } = renderHook(({ id, query }) => useAiBlock(id, params(query)), {
      initialProps: { id: 't-1', query: 'ia=g-1&bloque=0' },
    });
    expect(result.current.source.block.name).toBe('Empuje');
    rerender({ id: 't-1', query: 'ia=g-1&bloque=2' });
    expect(result.current.source.block.name).toBe('Core');
    rerender({ id: 't-1', query: '' });
    expect(result.current.source).toBeNull();
    rerender({ id: 't-2', query: 'ia=g-1&bloque=0' });
    expect(result.current.source).toBeNull();
  });

  it('`bloque` vacío o no numérico no carga el bloque 0', () => {
    store('t-1', session('g-1'));
    for (const query of ['ia=g-1&bloque=', 'ia=g-1&bloque=x', 'ia=g-1']) {
      expect(renderHook(() => useAiBlock('t-1', params(query))).result.current.source).toBeNull();
    }
  });

  it('`dismiss()` deja de tratarlo como bloque hasta que se abre otro', () => {
    store('t-1', session('g-1'));
    const { result, rerender } = renderHook(({ query }) => useAiBlock('t-1', params(query)), { initialProps: { query: 'ia=g-1&bloque=0' } });
    act(() => result.current.dismiss());
    expect(result.current.source).toBeNull();
    rerender({ query: 'ia=g-1&bloque=1' });
    expect(result.current.source.block.name).toBe('Piernas');
  });

  it('avisa qué otro bloque es el borrador que se perdería', () => {
    store('t-1', { ...session('g-1'), editing: 0 });
    const { result } = renderHook(() => useAiBlock('t-1', params('ia=g-1&bloque=1')));
    expect(result.current.source).toMatchObject({ draftIsBlock: false, draftBlockName: 'Empuje' });
  });
});
