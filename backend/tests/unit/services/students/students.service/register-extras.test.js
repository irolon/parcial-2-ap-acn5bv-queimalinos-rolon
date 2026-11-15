import { jest } from '@jest/globals';
import {
  mockInvitationsRepo,
  mockStudentCreateRepo,
  mockIssueTokens,
  mockBodyMetricsRepo,
  service,
  VALID_INVITATION,
  CREATED_STUDENT,
} from '../../../../helpers/students/students-service.setup.js';

// Alta desde la invitación con los datos extra (frecuencia, nacimiento, altura y peso).
const WITH_EXTRAS = {
  ...VALID_INVITATION,
  student_weekly_frequency: 4,
  student_birth_date: '2002-03-15',
  student_height_cm: 178,
  student_weight_kg: 74.5,
};

describe('students.service — registerFromInvitation con datos extra', () => {
  let warn;
  beforeEach(() => {
    jest.clearAllMocks();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockInvitationsRepo.claimInvitation.mockResolvedValue(true);
    mockStudentCreateRepo.createStudent.mockResolvedValue(CREATED_STUDENT);
    mockIssueTokens.mockResolvedValue({ token: 'access', refresh_token: 'refresh' });
    mockBodyMetricsRepo.insertMetric.mockResolvedValue({ id: 'm-1' });
  });
  afterEach(() => warn.mockRestore());

  it('copia la frecuencia y el nacimiento al alumno', async () => {
    mockInvitationsRepo.findInvitationByToken.mockResolvedValue(WITH_EXTRAS);
    await service.registerFromInvitation({ token: 'tok', password: 'Password1' });
    expect(mockStudentCreateRepo.createStudent.mock.calls[0][0]).toMatchObject({
      weeklyFrequency: 4,
      birthDate: '2002-03-15',
    });
  });

  it('crea la primera medida con la altura y el peso de la invitación', async () => {
    mockInvitationsRepo.findInvitationByToken.mockResolvedValue(WITH_EXTRAS);
    await service.registerFromInvitation({ token: 'tok', password: 'Password1' });
    expect(mockBodyMetricsRepo.insertMetric).toHaveBeenCalledWith({
      student_id: 'student-1',
      height_cm: 178,
      weight_kg: 74.5,
      recorded_by: 'trainer',
    });
  });

  it('sin datos extra el alumno nace con null y no se crea medida', async () => {
    mockInvitationsRepo.findInvitationByToken.mockResolvedValue(VALID_INVITATION);
    await service.registerFromInvitation({ token: 'tok', password: 'Password1' });
    expect(mockStudentCreateRepo.createStudent.mock.calls[0][0]).toMatchObject({
      weeklyFrequency: null,
      birthDate: null,
    });
    expect(mockBodyMetricsRepo.insertMetric).not.toHaveBeenCalled();
  });

  it('si la medida falla, el alta sigue y devuelve los tokens', async () => {
    mockInvitationsRepo.findInvitationByToken.mockResolvedValue(WITH_EXTRAS);
    mockBodyMetricsRepo.insertMetric.mockRejectedValue(new Error('db caída'));
    const result = await service.registerFromInvitation({ token: 'tok', password: 'Password1' });
    expect(result).toEqual({ student: CREATED_STUDENT, token: 'access', refresh_token: 'refresh' });
    expect(mockInvitationsRepo.releaseInvitation).not.toHaveBeenCalled();
  });
});
