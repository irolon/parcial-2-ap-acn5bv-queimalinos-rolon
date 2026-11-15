import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// GET /invitations/:token es pública: la foto del PT sale firmada (o null), nunca la ruta del bucket.
const mockRepo = { studentEmailExists: jest.fn(), createInvitation: jest.fn(), findInvitationByToken: jest.fn() };
const mockAvatarsRepo = { signPaths: jest.fn() };
jest.unstable_mockModule('../../../../src/repositories/invitations/invitations.repository.js', () => mockRepo);
jest.unstable_mockModule('../../../../src/repositories/students/avatars.repository.js', () => mockAvatarsRepo);
jest.unstable_mockModule('../../../../src/services/routine-templates/routine-templates.service.js', () => ({
  getOwnedTemplate: jest.fn(),
}));

const service = await import('../../../../src/services/invitations/invitations.service.js');

const row = (avatar_url) => ({
  student_name: 'Pedro Gómez',
  student_email: 'pedro@mail.com',
  student_goal: 'hypertrophy',
  expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  used_at: null,
  trainer: { id: 't-1', name: 'Ignacio', specialty: 'Fuerza', avatar_url },
});

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockAvatarsRepo.signPaths.mockImplementation(async (paths) => new Map(paths.map((p) => [p, `https://signed/${p}`])));
});

describe('invitations.service · getByToken, foto del PT', () => {
  it('con foto: sale la URL firmada, no la ruta', async () => {
    mockRepo.findInvitationByToken.mockResolvedValue(row('trainers/t-1/a.jpg'));
    const out = await service.getByToken('tok');
    expect(out.trainer).toEqual({ id: 't-1', name: 'Ignacio', specialty: 'Fuerza', avatar_url: 'https://signed/trainers/t-1/a.jpg' });
  });

  it('sin foto: null y no se llama a Storage', async () => {
    mockRepo.findInvitationByToken.mockResolvedValue(row(null));
    const out = await service.getByToken('tok');
    expect(out.trainer.avatar_url).toBeNull();
    expect(mockAvatarsRepo.signPaths).toHaveBeenCalledWith([]);
  });

  it('si Storage falla, la invitación sale igual con la foto en null', async () => {
    mockRepo.findInvitationByToken.mockResolvedValue(row('trainers/t-1/a.jpg'));
    mockAvatarsRepo.signPaths.mockRejectedValue(new Error('storage'));
    const out = await service.getByToken('tok');
    expect(out.trainer.avatar_url).toBeNull();
    expect(out.student_email).toBe('pedro@mail.com');
  });

  it('sin trainer embebido (PT borrado): trainer queda null', async () => {
    mockRepo.findInvitationByToken.mockResolvedValue({ ...row(null), trainer: null });
    const out = await service.getByToken('tok');
    expect(out.trainer).toBeNull();
  });
});
