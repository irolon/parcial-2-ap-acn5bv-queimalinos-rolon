import { jest } from '@jest/globals';

// Datos extra de POST /invitations: se guardan en la invitación para copiarlos en el alta.
const mockRepo = {
  studentEmailExists: jest.fn(),
  createInvitation: jest.fn(),
  findInvitationByToken: jest.fn(),
};
jest.unstable_mockModule('../../../../../src/repositories/invitations/invitations.repository.js', () => mockRepo);
jest.unstable_mockModule('../../../../../src/services/routine-templates/routine-templates.service.js', () => ({
  getOwnedTemplate: jest.fn(),
}));

const service = await import('../../../../../src/services/invitations/invitations.service.js');

const BODY = {
  student_name: 'Pedro Gómez',
  student_email: 'pedro@mail.com',
  student_phone: null,
  delivery_channel: 'qr',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRepo.studentEmailExists.mockResolvedValue(false);
  mockRepo.createInvitation.mockResolvedValue({ id: 'inv-1', token: 't', expires_at: '2026-11-16T10:00:00Z' });
});

describe('invitations.service — createInvitation con datos extra', () => {
  it('guarda frecuencia, altura, peso y nacimiento en la invitación', async () => {
    await service.createInvitation('trainer-1', {
      ...BODY,
      weekly_frequency: 4,
      height_cm: 178,
      weight_kg: 74.5,
      birth_date: '2002-03-15',
    });
    expect(mockRepo.createInvitation.mock.calls[0][0]).toMatchObject({
      studentWeeklyFrequency: 4,
      studentHeightCm: 178,
      studentWeightKg: 74.5,
      studentBirthDate: '2002-03-15',
    });
  });

  it('sin datos extra los guarda en null', async () => {
    await service.createInvitation('trainer-1', BODY);
    expect(mockRepo.createInvitation.mock.calls[0][0]).toMatchObject({
      studentWeeklyFrequency: null,
      studentHeightCm: null,
      studentWeightKg: null,
      studentBirthDate: null,
    });
  });

  it('la respuesta no devuelve los datos extra', async () => {
    const result = await service.createInvitation('trainer-1', { ...BODY, weight_kg: 74.5 });
    expect(JSON.stringify(result)).not.toContain('74.5');
  });
});
