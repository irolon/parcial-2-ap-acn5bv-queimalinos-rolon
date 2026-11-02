import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { mockMessagesRepo, mockStudentsRepo, TRAINER } from '../../../helpers/messages/messages.setup.js';

const { broadcast } = await import('../../../../src/services/messages/broadcast.service.js');

beforeEach(() => jest.resetAllMocks());

describe('broadcast', () => {
  it('inserta una fila por alumno con el mismo broadcast_id en un solo insert', async () => {
    mockStudentsRepo.findActiveStudentsByIds.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    const res = await broadcast(TRAINER.id, { studentIds: ['a', 'b'], body: 'hola' });
    expect(mockStudentsRepo.findActiveStudentsByIds).toHaveBeenCalledWith(TRAINER.id, ['a', 'b']);
    expect(mockMessagesRepo.insertMany).toHaveBeenCalledTimes(1);
    const rows = mockMessagesRepo.insertMany.mock.calls[0][0];
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.student_id)).toEqual(['a', 'b']);
    expect(new Set(rows.map((r) => r.broadcast_id)).size).toBe(1);
    expect(rows.every((r) => r.sender_role === 'trainer' && r.body === 'hola')).toBe(true);
    expect(res).toEqual({ broadcast_id: rows[0].broadcast_id, sent: 2 });
  });

  it('un id ajeno entre varios propios → 403 y cero filas insertadas (Review Focus 3)', async () => {
    // El repo solo devuelve los que son alumnos activos del PT: 'ajeno' no vuelve.
    mockStudentsRepo.findActiveStudentsByIds.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    await expect(
      broadcast(TRAINER.id, { studentIds: ['a', 'b', 'ajeno'], body: 'hola' })
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(mockMessagesRepo.insertMany).not.toHaveBeenCalled();
  });

  it('un alumno inactivo cuenta como no válido (el repo filtra por active)', async () => {
    mockStudentsRepo.findActiveStudentsByIds.mockResolvedValue([{ id: 'a' }]);
    await expect(broadcast(TRAINER.id, { studentIds: ['a', 'inactivo'], body: 'x' })).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(mockMessagesRepo.insertMany).not.toHaveBeenCalled();
  });
});
