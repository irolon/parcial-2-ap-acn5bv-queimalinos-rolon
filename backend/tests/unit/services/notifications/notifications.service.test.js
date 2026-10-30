import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

const readRepo = {
  findPage: jest.fn(), countUnread: jest.fn(), markRead: jest.fn(), markAllRead: jest.fn(),
};
const tokensRepo = { tokenExists: jest.fn(), upsertToken: jest.fn(), deleteTokenForUser: jest.fn() };
jest.unstable_mockModule(src('repositories/notifications/notifications-read.repository.js'), () => readRepo);
jest.unstable_mockModule(src('repositories/notifications/push-tokens.repository.js'), () => tokensRepo);

const service = await import(src('services/notifications/notifications.service.js'));

const USER = { id: 'u-1', role: 'student' };
const row = (n) => ({ id: `n-${n}`, created_at: `2026-10-30T10:0${n}:00Z` });

beforeEach(() => {
  jest.resetAllMocks();
});

describe('notifications.service.list', () => {
  it('página llena: next_before es el created_at del último; pasa filtros del usuario', async () => {
    readRepo.findPage.mockResolvedValue([row(3), row(2)]);
    readRepo.countUnread.mockResolvedValue(7);
    const out = await service.list(USER, { unread_only: true, limit: 2, before: 'B' });
    expect(readRepo.findPage).toHaveBeenCalledWith(USER, { unreadOnly: true, limit: 2, before: 'B' });
    expect(readRepo.countUnread).toHaveBeenCalledWith(USER);
    expect(out).toEqual({ data: [row(3), row(2)], meta: { unread_count: 7, next_before: row(2).created_at } });
  });

  it('página corta o vacía: next_before es null', async () => {
    readRepo.findPage.mockResolvedValue([row(1)]);
    readRepo.countUnread.mockResolvedValue(0);
    expect((await service.list(USER, { limit: 2 })).meta.next_before).toBeNull();
    readRepo.findPage.mockResolvedValue([]);
    expect((await service.list(USER, { limit: 2 })).meta.next_before).toBeNull();
  });
});

describe('notifications.service.markRead', () => {
  it('ajena o inexistente (0 filas) -> 404 NOTIFICATION_NOT_FOUND', async () => {
    readRepo.markRead.mockResolvedValue(0);
    await expect(service.markRead(USER, 'n-9')).rejects.toMatchObject({
      statusCode: 404, code: 'NOTIFICATION_NOT_FOUND',
    });
    expect(readRepo.markRead).toHaveBeenCalledWith(USER, 'n-9');
  });

  it('propia (también ya leída) resuelve', async () => {
    readRepo.markRead.mockResolvedValue(1);
    await expect(service.markRead(USER, 'n-1')).resolves.toBeUndefined();
  });

  it('markAllRead delega con el usuario', async () => {
    await service.markAllRead(USER);
    expect(readRepo.markAllRead).toHaveBeenCalledWith(USER);
  });
});

describe('notifications.service tokens', () => {
  it('token nuevo -> created true', async () => {
    tokensRepo.tokenExists.mockResolvedValue(false);
    const out = await service.registerToken(USER, { token: 't', platform: 'web' });
    expect(out).toEqual({ created: true, data: { token: 't', platform: 'web' } });
    expect(tokensRepo.upsertToken).toHaveBeenCalledWith(USER, 't', 'web', expect.any(String));
  });

  it('token existente (incluso de otro usuario) se reasigna -> created false', async () => {
    tokensRepo.tokenExists.mockResolvedValue(true);
    const out = await service.registerToken(USER, { token: 't', platform: 'android' });
    expect(out.created).toBe(false);
    expect(tokensRepo.upsertToken).toHaveBeenCalledWith(USER, 't', 'android', expect.any(String));
  });

  it('removeToken borra solo del usuario', async () => {
    await service.removeToken(USER, 't');
    expect(tokensRepo.deleteTokenForUser).toHaveBeenCalledWith(USER, 't');
  });
});
