import { jest } from '@jest/globals';
import {
  mockStudentsRepo,
  mockAvatarsRepo,
  mockRoutinesRepo,
  mockBodyMetricsService,
  service,
  STUDENT_ROW,
} from '../../../../helpers/students/students-service.setup.js';

// GX2: avatar_url guarda la ruta en el bucket privado; las respuestas la firman.
const PATH_1 = 'students/s1/a.jpg';
const PATH_2 = 'students/s2/b.png';

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('students.service — avatares firmados en la lista (GX2)', () => {
  beforeEach(() => {
    mockStudentsRepo.findLastSessionDates.mockResolvedValue([]);
    mockStudentsRepo.findStreaks.mockResolvedValue([]);
    mockStudentsRepo.findActiveRoutineSchedules.mockResolvedValue(new Map());
    mockStudentsRepo.findFinishedSessionDates.mockResolvedValue(new Map());
  });

  it('firma toda la página en una llamada; el sin foto queda en null', async () => {
    mockStudentsRepo.findStudentsByTrainer.mockResolvedValue({
      data: [
        { id: 's1', avatar_url: PATH_1 },
        { id: 's2', avatar_url: PATH_2 },
        { id: 's3', avatar_url: null },
      ],
      total: 3,
    });
    mockAvatarsRepo.signPaths.mockResolvedValueOnce(
      new Map([[PATH_1, 'https://signed/1'], [PATH_2, 'https://signed/2']])
    );

    const { data } = await service.list('trainer-1', {});

    expect(mockAvatarsRepo.signPaths).toHaveBeenCalledTimes(1);
    expect(mockAvatarsRepo.signPaths).toHaveBeenCalledWith([PATH_1, PATH_2]);
    expect(data.map((s) => s.avatar_url)).toEqual(['https://signed/1', 'https://signed/2', null]);
    expect(data[0]).toHaveProperty('adherence_7d');
  });

  it('si Storage cae, la lista sale igual con avatar_url null (Review Focus 2)', async () => {
    mockStudentsRepo.findStudentsByTrainer.mockResolvedValue({ data: [{ id: 's1', avatar_url: PATH_1 }], total: 1 });
    mockAvatarsRepo.signPaths.mockRejectedValueOnce(new Error('storage caído'));

    const { data } = await service.list('trainer-1', {});

    expect(data[0].avatar_url).toBeNull();
  });
});

describe('students.service — avatar firmado en la ficha (GX2)', () => {
  const ROW = { ...STUDENT_ROW, avatar_url: 'students/student-1/a.jpg' };

  beforeEach(() => {
    mockBodyMetricsService.latestForStudent.mockResolvedValue(null);
    mockRoutinesRepo.findActiveRoutineSummary.mockResolvedValue(null);
    mockStudentsRepo.findLastSessionDates.mockResolvedValue([]);
    mockStudentsRepo.findStudentById.mockResolvedValue(ROW);
  });

  it('GET /students/:id firma avatar_url', async () => {
    mockAvatarsRepo.signPaths.mockResolvedValueOnce(new Map([[ROW.avatar_url, 'https://signed/me']]));

    const detail = await service.getById({ id: 'student-1', role: 'student' }, 'student-1');

    expect(mockAvatarsRepo.signPaths).toHaveBeenCalledWith([ROW.avatar_url]);
    expect(detail).toMatchObject({ id: 'student-1', avatar_url: 'https://signed/me', active_routine: null });
  });

  it('si Storage cae, la ficha sale igual con avatar_url null (Review Focus 2)', async () => {
    mockAvatarsRepo.signPaths.mockRejectedValueOnce(new Error('storage caído'));

    const detail = await service.getById({ id: 'student-1', role: 'student' }, 'student-1');

    expect(detail).toMatchObject({ id: 'student-1', avatar_url: null });
  });

  it('PATCH /students/:id devuelve la ficha con la foto firmada', async () => {
    mockStudentsRepo.updateStudent.mockResolvedValue({ ...ROW, name: 'Ana Pérez' });
    mockAvatarsRepo.signPaths.mockResolvedValueOnce(new Map([[ROW.avatar_url, 'https://signed/me']]));

    const detail = await service.update({ id: 'student-1', role: 'student' }, 'student-1', { name: 'Ana Pérez' });

    expect(detail).toMatchObject({ name: 'Ana Pérez', avatar_url: 'https://signed/me' });
  });
});
