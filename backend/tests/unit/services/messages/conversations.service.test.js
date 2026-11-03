import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { mockMessagesRepo, mockStudentsRepo, TRAINER, messageRow } from '../../../helpers/messages/messages.setup.js';

const { listConversations } = await import('../../../../src/services/messages/conversations.service.js');

const student = (id, name) => ({ id, name, avatar_url: null });

beforeEach(() => jest.resetAllMocks());

describe('listConversations', () => {
  it('ordena por último mensaje desc y después los vacíos por nombre', async () => {
    mockStudentsRepo.findActiveStudentsByTrainer.mockResolvedValue([
      student('z', 'Zoe'),
      student('v', 'Vera'),
      student('a', 'Ana'),
      student('b', 'Beto'),
    ]);
    mockMessagesRepo.findLastByStudents.mockResolvedValue(
      new Map([
        ['a', messageRow({ student_id: 'a', created_at: '2026-10-30T10:00:00.000Z' })],
        ['b', messageRow({ student_id: 'b', created_at: '2026-10-31T10:00:00.000Z' })],
      ])
    );
    mockMessagesRepo.countUnreadByStudents.mockResolvedValue(new Map([['a', 2]]));
    const res = await listConversations(TRAINER.id);
    expect(mockMessagesRepo.countUnreadByStudents).toHaveBeenCalledWith(['z', 'v', 'a', 'b'], 'student');
    expect(res.map((c) => c.student.name)).toEqual(['Beto', 'Ana', 'Vera', 'Zoe']);
    expect(res.map((c) => c.unread_count)).toEqual([0, 2, 0, 0]);
    expect(res[2].last_message).toBeNull();
  });

  it('arma last_message con el body completo y has_image', async () => {
    mockStudentsRepo.findActiveStudentsByTrainer.mockResolvedValue([student('a', 'Ana')]);
    const body = 'x'.repeat(200);
    mockMessagesRepo.findLastByStudents.mockResolvedValue(
      new Map([['a', messageRow({ student_id: 'a', sender_role: 'student', body, image_path: 'a/1.png' })]])
    );
    mockMessagesRepo.countUnreadByStudents.mockResolvedValue(new Map());
    const [item] = await listConversations(TRAINER.id);
    expect(item.last_message).toEqual({
      body,
      has_image: true,
      sender_role: 'student',
      created_at: '2026-10-31T12:00:00.000Z',
    });
    expect(JSON.stringify(item)).not.toContain('image_path');
  });

  it('solo trae alumnos activos y sin alumnos devuelve lista vacía', async () => {
    mockStudentsRepo.findActiveStudentsByTrainer.mockResolvedValue([]);
    mockMessagesRepo.findLastByStudents.mockResolvedValue(new Map());
    mockMessagesRepo.countUnreadByStudents.mockResolvedValue(new Map());
    await expect(listConversations(TRAINER.id)).resolves.toEqual([]);
    expect(mockStudentsRepo.findActiveStudentsByTrainer).toHaveBeenCalledWith(TRAINER.id);
  });
});
