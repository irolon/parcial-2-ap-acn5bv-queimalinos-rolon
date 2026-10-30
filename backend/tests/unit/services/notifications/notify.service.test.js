import { jest } from '@jest/globals';
import { INPUT, mockFcm, mockNotifications, mockTokens, notify, pushOnly, row } from '../../../helpers/notifications/notify.setup.js';

beforeEach(() => {
  jest.resetAllMocks();
  mockNotifications.insert.mockResolvedValue(row);
  mockNotifications.setPushSent.mockResolvedValue({ ...row, push_sent_at: 'now' });
  mockFcm.isFcmEnabled.mockReturnValue(true);
  mockTokens.findTokensForUser.mockResolvedValue(['t1', 't2']);
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('notify', () => {
  it('guarda la fila con los campos mapeados', async () => {
    mockFcm.isFcmEnabled.mockReturnValue(false);
    expect(await notify(INPUT)).toBe(row);
    expect(mockNotifications.insert).toHaveBeenCalledWith({
      user_id: 'u-1', user_role: 'student', type: 'comment', title: 'T', body: 'B', data: { a: 1 },
    });
    expect(mockTokens.findTokensForUser).not.toHaveBeenCalled();
  });

  it('usa body null y data {} por defecto', async () => {
    mockFcm.isFcmEnabled.mockReturnValue(false);
    await notify({ userId: 'u-1', userRole: 'student', type: 'pr', title: 'T' });
    expect(mockNotifications.insert).toHaveBeenCalledWith(expect.objectContaining({ body: null, data: {} }));
  });

  it('push false: no envía', async () => {
    await notify({ ...INPUT, push: false });
    expect(mockFcm.sendToToken).not.toHaveBeenCalled();
    expect(mockTokens.findTokensForUser).not.toHaveBeenCalled();
  });

  it('si la BD falla, lanza', async () => {
    mockNotifications.insert.mockRejectedValue(new Error('db'));
    await expect(notify(INPUT)).rejects.toThrow('db');
  });

  it('envía a todos los tokens y marca push_sent_at si alguno salió', async () => {
    mockFcm.sendToToken.mockResolvedValueOnce({ ok: false, reason: 'other', status: 500 }).mockResolvedValueOnce({ ok: true });
    const out = await notify(INPUT);
    expect(mockTokens.findTokensForUser).toHaveBeenCalledWith('u-1', 'student');
    expect(mockFcm.sendToToken).toHaveBeenCalledTimes(2);
    expect(mockFcm.sendToToken).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      data: { ...INPUT.data, type: INPUT.type, notification_id: 'n-1' },
    }));
    expect(mockNotifications.insert).toHaveBeenCalledWith(expect.objectContaining({ data: INPUT.data }));
    expect(mockNotifications.setPushSent).toHaveBeenCalledWith('n-1', expect.any(String));
    expect(out.push_sent_at).toBe('now');
    expect(mockTokens.deleteTokens).toHaveBeenCalledWith([]);
  });

  it('borra los tokens unregistered e invalid, no los de error 500', async () => {
    mockTokens.findTokensForUser.mockResolvedValue(['a', 'b', 'c']);
    mockFcm.sendToToken
      .mockResolvedValueOnce({ ok: false, reason: 'unregistered', status: 404 })
      .mockResolvedValueOnce({ ok: false, reason: 'invalid', status: 400 })
      .mockResolvedValueOnce({ ok: false, reason: 'other', status: 500 });
    const out = await notify(INPUT);
    expect(mockTokens.deleteTokens).toHaveBeenCalledWith(['a', 'b']);
    expect(mockNotifications.setPushSent).not.toHaveBeenCalled();
    expect(out).toBe(row);
  });

  it('un fallo del lado del push no rompe y devuelve la fila', async () => {
    mockTokens.findTokensForUser.mockRejectedValue(new Error('tokens'));
    expect(await notify(INPUT)).toBe(row);
    expect(console.error).toHaveBeenCalledWith('[notifications] push', 'tokens');
  });

  it('si falla el borrado de tokens, conserva push_sent_at y no lanza', async () => {
    mockFcm.sendToToken
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, reason: 'unregistered', status: 404 });
    mockTokens.deleteTokens.mockRejectedValue(new Error('del'));
    const out = await notify(INPUT);
    expect(out.push_sent_at).toBe('now');
    expect(console.error).toHaveBeenCalledWith('[notifications] limpieza de tokens', 'del');
  });
});

describe('pushOnly', () => {
  it('envía sin insertar fila y borra los tokens muertos', async () => {
    mockTokens.findTokensForUser.mockResolvedValue(['a', 'b']);
    mockFcm.sendToToken
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, reason: 'unregistered', status: 404 });
    await pushOnly({ userId: 'u-1', userRole: 'student', title: 'T' });
    expect(mockTokens.findTokensForUser).toHaveBeenCalledWith('u-1', 'student');
    expect(mockNotifications.insert).not.toHaveBeenCalled();
    expect(mockTokens.deleteTokens).toHaveBeenCalledWith(['b']);
  });

  it('sin FCM no hace nada y un fallo no lanza', async () => {
    mockFcm.isFcmEnabled.mockReturnValue(false);
    await pushOnly({ userId: 'u-1', title: 'T' });
    expect(mockTokens.findTokensForUser).not.toHaveBeenCalled();
    mockFcm.isFcmEnabled.mockReturnValue(true);
    mockTokens.findTokensForUser.mockRejectedValue(new Error('db'));
    await expect(pushOnly({ userId: 'u-1', title: 'T' })).resolves.toBeUndefined();
  });
});
