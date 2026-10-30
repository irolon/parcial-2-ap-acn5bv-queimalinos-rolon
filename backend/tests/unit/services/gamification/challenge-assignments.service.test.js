import { beforeEach, describe, expect, it } from '@jest/globals';
import {
  assignments,
  mockChallenges as repo,
  mockStudentChallenges as sc,
  mockAccess,
  TRAINER,
  STUDENT,
  challengeRow,
  assignmentRow,
  resetMocks,
} from '../../../helpers/gamification/challenges.setup.js';
import { Errors } from '../../../../src/shared/utils/errors.js';

beforeEach(resetMocks);

describe('listForStudent', () => {
  it('devuelve la forma pública con progress_pct', async () => {
    sc.findByStudent.mockResolvedValue([assignmentRow()]);
    const [item] = await assignments.listForStudent(TRAINER, 'st-1');
    expect(item).toEqual({
      id: 'sc-1',
      challenge: {
        id: 'ch-1',
        name: 'Desafío',
        description: null,
        goal_type: 'sessions_count',
        goal_value: 10,
        duration_days: 30,
        reward_achievement_id: null,
      },
      started_at: '2026-10-30T15:00:00Z',
      ends_at: '2026-11-29T15:00:00Z',
      current_progress: 4,
      goal_value: 10,
      progress_pct: 40,
      status: 'active',
      completed_at: null,
    });
  });

  it('progress_pct se topa en 100 y redondea a 1 decimal', async () => {
    sc.findByStudent.mockResolvedValue([
      assignmentRow({ current_progress: 15 }),
      assignmentRow({ current_progress: 1, challenge: challengeRow({ goal_value: 3 }) }),
    ]);
    const items = await assignments.listForStudent(TRAINER, 'st-1');
    expect(items.map((i) => i.progress_pct)).toEqual([100, 33.3]);
  });

  it('weight_target: 100 si está completado, null si no', async () => {
    const challenge = challengeRow({ goal_type: 'weight_target', goal_value: 70 });
    sc.findByStudent.mockResolvedValue([
      assignmentRow({ challenge, status: 'completed' }),
      assignmentRow({ challenge, status: 'active' }),
    ]);
    const items = await assignments.listForStudent(TRAINER, 'st-1');
    expect(items.map((i) => i.progress_pct)).toEqual([100, null]);
  });
});

describe('assignToStudent', () => {
  it('el alumno toma un desafío de su entrenador: ventana started_at a ends_at', async () => {
    repo.findById.mockResolvedValue(challengeRow());
    sc.insertAssignment.mockResolvedValue(assignmentRow());
    await assignments.assignToStudent(STUDENT, 'st-1', 'ch-1');
    const row = sc.insertAssignment.mock.calls[0][0];
    expect(row).toMatchObject({ student_id: 'st-1', challenge_id: 'ch-1' });
    expect(new Date(row.ends_at) - new Date(row.started_at)).toBe(30 * 86_400_000);
  });

  it('acepta un desafío global', async () => {
    repo.findById.mockResolvedValue(challengeRow({ trainer_id: null }));
    sc.insertAssignment.mockResolvedValue(assignmentRow());
    await expect(assignments.assignToStudent(STUDENT, 'st-1', 'ch-1')).resolves.toMatchObject({ id: 'sc-1' });
  });

  it('desafío de otro entrenador o inexistente → 404', async () => {
    repo.findById.mockResolvedValueOnce(challengeRow({ trainer_id: 'tr-2' })).mockResolvedValueOnce(null);
    await expect(assignments.assignToStudent(STUDENT, 'st-1', 'ch-1')).rejects.toMatchObject({ statusCode: 404 });
    await expect(assignments.assignToStudent(STUDENT, 'st-1', 'ch-1')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('sin duration_days → 400 en challenge_id', async () => {
    repo.findById.mockResolvedValue(challengeRow({ duration_days: null }));
    await expect(assignments.assignToStudent(TRAINER, 'st-1', 'ch-1')).rejects.toMatchObject({
      statusCode: 400,
      details: [{ field: 'challenge_id' }],
    });
  });

  it('ya activo → 409', async () => {
    repo.findById.mockResolvedValue(challengeRow());
    sc.insertAssignment.mockRejectedValue(Errors.challengeAlreadyActive());
    await expect(assignments.assignToStudent(TRAINER, 'st-1', 'ch-1')).rejects.toMatchObject({
      statusCode: 409,
      code: 'CHALLENGE_ALREADY_ACTIVE',
    });
  });

  it('sin acceso al alumno propaga el 403', async () => {
    mockAccess.assertCanAccessStudent.mockRejectedValue(Errors.forbidden());
    await expect(assignments.assignToStudent(TRAINER, 'st-x', 'ch-1')).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('assignToMany', () => {
  it('crea, saltea ajenos y ya activos', async () => {
    repo.findById.mockResolvedValue(challengeRow({ trainer_id: null }));
    sc.findActiveStudentIds.mockResolvedValue(['s1', 's2']);
    sc.insertAssignment
      .mockResolvedValueOnce(assignmentRow({ student_id: 's1' }))
      .mockRejectedValueOnce(Errors.challengeAlreadyActive());
    const result = await assignments.assignToMany(TRAINER, 'ch-1', ['s1', 's2', 's3']);
    expect(result.created).toHaveLength(1);
    expect(result.skipped).toEqual([
      { student_id: 's2', reason: 'already_active' },
      { student_id: 's3', reason: 'not_your_student' },
    ]);
  });

  it('desafío ajeno → 404 sin asignar', async () => {
    repo.findById.mockResolvedValue(challengeRow({ trainer_id: 'tr-2' }));
    await expect(assignments.assignToMany(TRAINER, 'ch-1', ['s1'])).rejects.toMatchObject({ statusCode: 404 });
    expect(sc.insertAssignment).not.toHaveBeenCalled();
  });

  it('otros errores de base se propagan', async () => {
    repo.findById.mockResolvedValue(challengeRow());
    sc.findActiveStudentIds.mockResolvedValue(['s1']);
    sc.insertAssignment.mockRejectedValue(Errors.internal('boom'));
    await expect(assignments.assignToMany(TRAINER, 'ch-1', ['s1'])).rejects.toMatchObject({ statusCode: 500 });
  });
});
