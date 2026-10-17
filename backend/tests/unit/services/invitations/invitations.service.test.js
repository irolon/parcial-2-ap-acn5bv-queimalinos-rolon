import { jest } from '@jest/globals';

// Mock del repository (capa de datos). La ruta resuelve al mismo archivo que
// importa el service.
const mockRepo = {
  studentEmailExists: jest.fn(),
  createInvitation: jest.fn(),
  findInvitationByToken: jest.fn(),
};
jest.unstable_mockModule(
  '../../../../src/repositories/invitations/invitations.repository.js',
  () => mockRepo
);

const service = await import('../../../../src/services/invitations/invitations.service.js');

const BASE_BODY = {
  student_name: 'Pedro Gómez',
  student_email: 'pedro@mail.com',
  student_phone: '5491133334444',
  goal: 'hypertrophy',
  delivery_channel: 'both',
};

const createdRow = {
  id: 'inv-uuid-1',
  token: 'ignored-token',
  expires_at: '2026-06-22T10:00:00Z',
};

describe('invitations.service', () => {
  describe('createInvitation', () => {
    it('genera token, join_url, QR y link de WhatsApp con canal "both"', async () => {
      mockRepo.studentEmailExists.mockResolvedValue(false);
      mockRepo.createInvitation.mockResolvedValue(createdRow);

      const result = await service.createInvitation('trainer-1', BASE_BODY);

      expect(result.invitation_id).toBe('inv-uuid-1');
      expect(typeof result.token).toBe('string');
      expect(result.join_url).toContain(`token=${result.token}`);
      expect(result.qr_base64).toMatch(/^data:image\/png;base64,/);
      expect(result.whatsapp_share_url).toContain('https://wa.me/5491133334444');
      expect(result.expires_at).toBe(createdRow.expires_at);

      // El token persistido es el mismo que se generó (no el del row mockeado).
      expect(mockRepo.createInvitation.mock.calls[0][0].token).toBe(result.token);
    });

    it('guarda en la invitación el contexto para la IA (null si no vino)', async () => {
      mockRepo.studentEmailExists.mockResolvedValue(false);
      mockRepo.createInvitation.mockResolvedValue(createdRow);

      await service.createInvitation('trainer-1', {
        ...BASE_BODY,
        gym_equipment: ['barbell'],
        level: 'beginner',
      });

      expect(mockRepo.createInvitation.mock.calls[0][0]).toMatchObject({
        studentGymEquipment: ['barbell'],
        studentInjuries: null,
        studentLevel: 'beginner',
      });
    });

    it('con canal "qr" incluye QR pero no link de WhatsApp', async () => {
      mockRepo.studentEmailExists.mockResolvedValue(false);
      mockRepo.createInvitation.mockResolvedValue(createdRow);

      const result = await service.createInvitation('trainer-1', {
        ...BASE_BODY,
        delivery_channel: 'qr',
        student_phone: null,
      });

      expect(result.qr_base64).toBeDefined();
      expect(result.whatsapp_share_url).toBeUndefined();
    });

    it('lanza STUDENT_EMAIL_EXISTS si ya hay un alumno con ese email', async () => {
      mockRepo.studentEmailExists.mockResolvedValue(true);
      await expect(service.createInvitation('trainer-1', BASE_BODY)).rejects.toMatchObject({
        code: 'STUDENT_EMAIL_EXISTS',
        statusCode: 409,
      });
      expect(mockRepo.createInvitation).not.toHaveBeenCalled();
    });
  });

  describe('getByToken', () => {
    const validRow = {
      student_name: 'Pedro Gómez',
      student_email: 'pedro@mail.com',
      student_goal: 'hypertrophy',
      expires_at: new Date(Date.now() + 3_600_000).toISOString(),
      used_at: null,
      trainer: { id: 'trainer-1', name: 'Ignacio', specialty: 'Fuerza', avatar_url: null },
    };

    it('devuelve los datos precargados de una invitación válida', async () => {
      mockRepo.findInvitationByToken.mockResolvedValue(validRow);
      const result = await service.getByToken('tok');
      expect(result.goal).toBe('hypertrophy'); // student_goal → goal
      expect(result.trainer.name).toBe('Ignacio');
      expect(result.student_email).toBe('pedro@mail.com');
    });

    it('lanza INVITATION_NOT_FOUND si no existe', async () => {
      mockRepo.findInvitationByToken.mockResolvedValue(null);
      await expect(service.getByToken('tok')).rejects.toMatchObject({
        code: 'INVITATION_NOT_FOUND',
        statusCode: 404,
      });
    });

    it('lanza INVITATION_ALREADY_USED si ya fue usada', async () => {
      mockRepo.findInvitationByToken.mockResolvedValue({
        ...validRow,
        used_at: '2026-06-20T00:00:00Z',
      });
      await expect(service.getByToken('tok')).rejects.toMatchObject({
        code: 'INVITATION_ALREADY_USED',
        statusCode: 410,
      });
    });

    it('lanza INVITATION_EXPIRED si venció', async () => {
      mockRepo.findInvitationByToken.mockResolvedValue({
        ...validRow,
        expires_at: new Date(Date.now() - 1000).toISOString(),
      });
      await expect(service.getByToken('tok')).rejects.toMatchObject({
        code: 'INVITATION_EXPIRED',
        statusCode: 410,
      });
    });
  });
});
