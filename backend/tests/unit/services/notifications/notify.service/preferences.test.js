import { jest } from '@jest/globals';
import {
  INPUT, mockFcm, mockNotifications, mockPrefs, mockTokens, notify, pushOnly, row,
} from '../../../../helpers/notifications/notify.setup.js';

const ALL_ON = { message: true, comment: true, appointment: true, pr: true, achievement: true, updated_at: 'X' };
const off = (type) => mockPrefs.findByStudent.mockResolvedValue({ ...ALL_ON, [type]: false });

beforeEach(() => {
  jest.resetAllMocks();
  mockNotifications.insert.mockResolvedValue(row);
  mockNotifications.setPushSent.mockResolvedValue({ ...row, push_sent_at: 'now' });
  mockFcm.isFcmEnabled.mockReturnValue(true);
  mockFcm.sendToToken.mockResolvedValue({ ok: true });
  mockTokens.findTokensForUser.mockResolvedValue(['t1']);
  mockPrefs.findByStudent.mockResolvedValue(null);
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('notify con preferencias', () => {
  it('comment apagado: guarda la fila, no manda push y push_sent_at queda null', async () => {
    off('comment');
    await expect(notify(INPUT)).resolves.toBe(row);
    expect(mockPrefs.findByStudent).toHaveBeenCalledWith('u-1');
    expect(mockNotifications.insert).toHaveBeenCalled();
    expect(mockTokens.findTokensForUser).not.toHaveBeenCalled();
    expect(mockFcm.sendToToken).not.toHaveBeenCalled();
    expect(mockNotifications.setPushSent).not.toHaveBeenCalled();
  });

  it('otro tipo apagado no afecta: comment sale', async () => {
    off('pr');
    const out = await notify(INPUT);
    expect(mockFcm.sendToToken).toHaveBeenCalledTimes(1);
    expect(out.push_sent_at).toBe('now');
  });

  it('sin fila (nunca entró a la pantalla): manda como hoy', async () => {
    const out = await notify(INPUT);
    expect(mockFcm.sendToToken).toHaveBeenCalledTimes(1);
    expect(out.push_sent_at).toBe('now');
  });

  it('si leer las preferencias falla: no manda, devuelve la fila y no lanza', async () => {
    mockPrefs.findByStudent.mockRejectedValue(new Error('prefs'));
    await expect(notify(INPUT)).resolves.toBe(row);
    expect(mockFcm.sendToToken).not.toHaveBeenCalled();
    expect(mockNotifications.setPushSent).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('[notifications] push', 'prefs');
  });

  it('trainer: no lee preferencias y manda', async () => {
    await notify({ ...INPUT, userRole: 'trainer', type: 'inactivity' });
    expect(mockPrefs.findByStudent).not.toHaveBeenCalled();
    expect(mockFcm.sendToToken).toHaveBeenCalledTimes(1);
  });
});

describe('pushOnly con preferencias', () => {
  it.each(['message', 'achievement'])('%s apagado: no manda', async (type) => {
    off(type);
    await pushOnly({ userId: 'u-1', userRole: 'student', title: 'T', data: { type } });
    expect(mockFcm.sendToToken).not.toHaveBeenCalled();
    expect(mockTokens.findTokensForUser).not.toHaveBeenCalled();
  });

  it('message prendido: manda', async () => {
    off('comment');
    await pushOnly({ userId: 'u-1', userRole: 'student', title: 'T', data: { type: 'message' } });
    expect(mockFcm.sendToToken).toHaveBeenCalledTimes(1);
  });

  it('si leer las preferencias falla: no manda y no lanza', async () => {
    mockPrefs.findByStudent.mockRejectedValue(new Error('prefs'));
    await expect(
      pushOnly({ userId: 'u-1', userRole: 'student', title: 'T', data: { type: 'message' } })
    ).resolves.toBeUndefined();
    expect(mockFcm.sendToToken).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('[notifications] push', 'prefs');
  });
});
