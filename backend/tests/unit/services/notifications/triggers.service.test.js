import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  mockData, mockHistory, mockNotify, triggers, arrange, SESSION, STUDENT_ID, TRAINER_ID, EX_A, EX_B,
} from '../../../helpers/notifications/triggers.setup.js';

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  arrange();
});

describe('triggers · onSessionModified', () => {
  const input = { studentId: STUDENT_ID, session: SESSION, substitutions: [{ from: EX_A, to: EX_B }] };

  it('avisa al entrenador con push y los nombres de los ejercicios', async () => {
    await triggers.onSessionModified(input);
    expect(mockNotify.notify).toHaveBeenCalledWith(expect.objectContaining({
      userId: TRAINER_ID, userRole: 'trainer', type: 'routine_modified', push: true,
      title: 'Lucía modificó su rutina',
      body: 'En la sesión del 27/10 sustituyó Press banca por Sentadilla',
      data: { student_id: STUDENT_ID, session_id: 's-1' },
    }));
  });

  it('una sola vez por sesión: si ya existe, no notifica', async () => {
    mockData.existsForSession.mockResolvedValue(true);
    await triggers.onSessionModified(input);
    expect(mockData.existsForSession).toHaveBeenCalledWith('routine_modified', TRAINER_ID, 's-1');
    expect(mockNotify.notify).not.toHaveBeenCalled();
  });

  it('un error no se propaga y se loguea', async () => {
    mockNotify.notify.mockRejectedValue(new Error('db'));
    await expect(triggers.onSessionModified(input)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith('[notifications] routine_modified', 'db');
  });
});

describe('triggers · onSessionClosed · récords', () => {
  const input = { studentId: STUDENT_ID, session: SESSION, unlocked: [] };
  beforeEach(() => {
    mockHistory.fetchSessionRecords.mockResolvedValue([{ session_id: 's-1', exercise_id: EX_A }]);
  });

  it('push al alumno y fila sin push al entrenador', async () => {
    await triggers.onSessionClosed(input);
    const calls = mockNotify.notify.mock.calls.map(([c]) => c);
    expect(calls).toHaveLength(2);
    const meta = { student_id: STUDENT_ID, session_id: 's-1', exercise_ids: [EX_A] };
    expect(calls[0]).toMatchObject({
      userId: STUDENT_ID, type: 'pr', push: true, data: meta, title: '¡Nuevo récord en Press banca!',
    });
    expect(calls[1]).toMatchObject({ userId: TRAINER_ID, type: 'pr', push: false, data: meta });
  });

  it('una sola vez por sesión', async () => {
    mockData.existsForSession.mockResolvedValue(true);
    await triggers.onSessionClosed(input);
    expect(mockData.existsForSession).toHaveBeenCalledWith('pr', STUDENT_ID, 's-1');
    expect(mockNotify.notify).not.toHaveBeenCalled();
  });

  it('sin récords no notifica', async () => {
    mockHistory.fetchSessionRecords.mockResolvedValue([]);
    await triggers.onSessionClosed(input);
    expect(mockNotify.notify).not.toHaveBeenCalled();
  });

  it('un error en récords no corta los logros ni se propaga', async () => {
    mockHistory.fetchSessionRecords.mockRejectedValue(new Error('rpc'));
    const unlocked = [{ code: 'first', name: 'Primera', category: 'x' }];
    await expect(triggers.onSessionClosed({ ...input, unlocked })).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith('[notifications] pr', 'rpc');
    expect(mockNotify.notify).toHaveBeenCalledTimes(2);
  });
});

describe('triggers · onSessionClosed · logros', () => {
  const one = [{ code: 'first', name: 'Primera', category: 'x' }];
  const two = [...one, { code: 'streak', name: 'Racha', category: 'y' }];

  it('un logro: fila alumno con push y fila entrenador sin push', async () => {
    await triggers.onSessionClosed({ studentId: STUDENT_ID, session: SESSION, unlocked: one });
    const calls = mockNotify.notify.mock.calls.map(([c]) => c);
    expect(calls[0]).toMatchObject({
      userId: STUDENT_ID, type: 'achievement', push: true, body: 'Tu primera sesión',
      data: { student_id: STUDENT_ID, achievement_code: 'first' },
    });
    expect(calls[1]).toMatchObject({ userId: TRAINER_ID, type: 'achievement', push: false });
    expect(mockNotify.pushOnly).not.toHaveBeenCalled();
  });

  it('varios: una fila por logro sin push + un push resumen sin fila', async () => {
    await triggers.onSessionClosed({ studentId: STUDENT_ID, session: SESSION, unlocked: two });
    const calls = mockNotify.notify.mock.calls.map(([c]) => c);
    expect(calls).toHaveLength(4);
    expect(calls.every((c) => c.push === false)).toBe(true);
    expect(mockNotify.pushOnly).toHaveBeenCalledWith(expect.objectContaining({
      userId: STUDENT_ID, userRole: 'student', title: 'Desbloqueaste 2 logros', body: 'Primera, Racha',
    }));
  });

  it('si falla un logro, los demás se notifican igual', async () => {
    mockNotify.notify.mockRejectedValueOnce(new Error('db')).mockResolvedValue({ id: 'n-1' });
    await expect(triggers.onSessionClosed({ studentId: STUDENT_ID, session: SESSION, unlocked: two }))
      .resolves.toBeUndefined();
    const calls = mockNotify.notify.mock.calls.map(([c]) => c);
    expect(calls.filter((c) => c.data.achievement_code === 'streak')).toHaveLength(2);
    expect(console.error).toHaveBeenCalledWith('[notifications] achievement first', 'db');
  });

  it('sin logros ni récords no notifica', async () => {
    await triggers.onSessionClosed({ studentId: STUDENT_ID, session: SESSION, unlocked: [] });
    expect(mockNotify.notify).not.toHaveBeenCalled();
    expect(mockData.findAchievementDescriptions).not.toHaveBeenCalled();
  });
});

describe('triggers · onSessionCommented', () => {
  const base = { session: SESSION, studentId: STUDENT_ID, previousComment: null };

  it('comentario nuevo: avisa al alumno con push', async () => {
    await triggers.onSessionCommented({ ...base, comment: 'Muy bien!' });
    expect(mockNotify.notify).toHaveBeenCalledWith(expect.objectContaining({
      userId: STUDENT_ID, userRole: 'student', type: 'comment', push: true,
      title: 'Tu entrenador comentó tu sesión del 27/10', body: 'Muy bien!', data: { session_id: 's-1' },
    }));
  });

  it.each(['', '   ', null])('comentario vacío (%p): no notifica', async (comment) => {
    await triggers.onSessionCommented({ ...base, comment });
    expect(mockNotify.notify).not.toHaveBeenCalled();
  });

  it('comentario sin cambios: no notifica', async () => {
    await triggers.onSessionCommented({ ...base, previousComment: 'Igual', comment: 'Igual' });
    expect(mockNotify.notify).not.toHaveBeenCalled();
  });

  it('un error no se propaga', async () => {
    mockNotify.notify.mockRejectedValue(new Error('db'));
    await expect(triggers.onSessionCommented({ ...base, comment: 'Hola' })).resolves.toBeUndefined();
  });
});

describe('triggers · onAchievementsFromJob', () => {
  const unlocked = [{ code: 'first', name: 'Primera' }, { code: 'streak', name: 'Racha' }];

  it('crea las filas de alumno y entrenador sin push ni resumen', async () => {
    await triggers.onAchievementsFromJob({ studentId: STUDENT_ID, unlocked });
    const calls = mockNotify.notify.mock.calls.map(([c]) => c);
    expect(calls).toHaveLength(4);
    expect(calls.every((c) => c.push === false && c.type === 'achievement')).toBe(true);
    expect(calls.map((c) => c.userId)).toEqual([STUDENT_ID, TRAINER_ID, STUDENT_ID, TRAINER_ID]);
    expect(calls[0].data).toEqual({ student_id: STUDENT_ID, achievement_code: 'first' });
    expect(mockNotify.pushOnly).not.toHaveBeenCalled();
  });

  it('sin logros no consulta; sin entrenador solo crea la del alumno; nunca lanza', async () => {
    await triggers.onAchievementsFromJob({ studentId: STUDENT_ID, unlocked: [] });
    expect(mockData.findStudentInfo).not.toHaveBeenCalled();
    mockData.findStudentInfo.mockResolvedValue({ id: STUDENT_ID, name: 'Lucía', trainer_id: null });
    await triggers.onAchievementsFromJob({ studentId: STUDENT_ID, unlocked: unlocked.slice(0, 1) });
    expect(mockNotify.notify).toHaveBeenCalledTimes(1);
    mockData.findStudentInfo.mockRejectedValue(new Error('db'));
    await expect(triggers.onAchievementsFromJob({ studentId: STUDENT_ID, unlocked })).resolves.toBeUndefined();
  });
});
