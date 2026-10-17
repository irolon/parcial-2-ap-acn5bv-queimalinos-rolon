import { mockRepo, service } from '../../../../helpers/routines/routines-service.setup.js';

describe('routines.service · mine', () => {
  it('pide las rutinas activas del alumno logueado', async () => {
    mockRepo.findActiveRoutinesForStudent.mockResolvedValueOnce([]);
    await service.mine('st-1');
    expect(mockRepo.findActiveRoutinesForStudent).toHaveBeenCalledWith('st-1');
  });

  it('sin rutinas activas devuelve []', async () => {
    mockRepo.findActiveRoutinesForStudent.mockResolvedValueOnce([]);
    expect(await service.mine('st-1')).toEqual([]);
  });

  it('devuelve varias rutinas en el orden del repository, con los ejercicios ordenados', async () => {
    mockRepo.findActiveRoutinesForStudent.mockResolvedValueOnce([
      {
        id: 'rt-2',
        name: 'Nueva',
        days: ['tuesday'],
        created_at: '2026-10-10T10:00:00+00:00',
        routine_exercises: [
          { id: 're-b', order_index: 1, exercise: { id: 'ex-2', name: 'Remo' } },
          { id: 're-a', order_index: 0, exercise: { id: 'ex-1', name: 'Press' } },
        ],
      },
      { id: 'rt-1', name: 'Vieja', days: ['monday'], created_at: '2026-10-01T10:00:00+00:00' },
    ]);

    const result = await service.mine('st-1');

    expect(result.map((r) => r.routine_id)).toEqual(['rt-2', 'rt-1']);
    expect(result[0].exercises.map((e) => e.exercise.name)).toEqual(['Press', 'Remo']);
    expect(result[1].exercises).toEqual([]);
  });
});
