import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));
const mockMessagesRepo = { findMessagesBefore: jest.fn() };
jest.unstable_mockModule(src('repositories/chat/chat-messages.repository.js'), () => mockMessagesRepo);
const { getHistory } = await import(src('services/chat/history.service.js'));

const STUDENT_ID = '22222222-2222-4222-8222-222222222222';
/** 12:00 de Argentina del 07/11/2026. */
const NOW = new Date('2026-11-07T15:00:00Z');
const row = (id, role, created_at, extra = {}) => ({ id, role, content: id, created_at, suggestions: [], ...extra });

describe('chat · history.service · getHistory', () => {
  beforeEach(() => mockMessagesRepo.findMessagesBefore.mockReset().mockResolvedValue([]));

  it('sin before: lee antes del inicio de hoy (hoy queda afuera), con tope days × 20 × 2', async () => {
    await getHistory(STUDENT_ID, { days: 7 }, NOW);
    expect(mockMessagesRepo.findMessagesBefore).toHaveBeenCalledWith(STUDENT_ID, '2026-11-07T03:00:00.000Z', 280);
  });

  it('con before y days: lee antes del 00:00 AR de before', async () => {
    await getHistory(STUDENT_ID, { before: '2026-11-03', days: 1 }, NOW);
    expect(mockMessagesRepo.findMessagesBefore).toHaveBeenCalledWith(STUDENT_ID, '2026-11-03T03:00:00.000Z', 40);
  });

  it('un before futuro se toma como hoy: el historial nunca trae los mensajes de hoy', async () => {
    await getHistory(STUDENT_ID, { before: '2026-12-01', days: 7 }, NOW);
    expect(mockMessagesRepo.findMessagesBefore).toHaveBeenCalledWith(STUDENT_ID, '2026-11-07T03:00:00.000Z', 280);
  });

  it('aislamiento: solo pide los mensajes del alumno que consulta', async () => {
    await getHistory(STUDENT_ID, { days: 7 }, NOW);
    expect(mockMessagesRepo.findMessagesBefore.mock.calls.map((c) => c[0])).toEqual([STUDENT_ID]);
  });

  it('devuelve los días con cada mensaje como en today (contexto y sugerencias)', async () => {
    const context = { exercise_id: 'e1', exercise: { id: 'e1', name: 'Press banca' }, session: { routine: { name: 'Push' } } };
    const suggestions = [{ exercise_id: 'e2', name: 'Flexiones', reason: 'Sin equipo' }];
    mockMessagesRepo.findMessagesBefore.mockResolvedValue([
      row('a1', 'assistant', '2026-11-06T13:00:00.000Z', { ...context, suggestions }),
      row('u1', 'user', '2026-11-06T13:00:00.000Z', context),
    ]);
    await expect(getHistory(STUDENT_ID, { days: 7 }, NOW)).resolves.toEqual({
      days: [{
        date: '2026-11-06',
        messages: [
          { id: 'u1', role: 'user', content: 'u1', created_at: '2026-11-06T13:00:00.000Z', exercise: context.exercise, routine_name: 'Push', suggestions: [] },
          { id: 'a1', role: 'assistant', content: 'a1', created_at: '2026-11-06T13:00:00.000Z', exercise: context.exercise, routine_name: 'Push', suggestions },
        ],
      }],
      next_before: null,
    });
  });
});
