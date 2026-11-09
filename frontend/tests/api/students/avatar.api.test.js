import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as avatarApi from '@/api/students/avatar.api';
import { configureClient } from '@/api/shared/client';
import { calls, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

beforeEach(() => {
  configureClient({ getToken: () => 'access-1' });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('avatar.api', () => {
  it('uploadAvatar hace PUT multipart con image, sin Content-Type a mano, y devuelve la URL', async () => {
    const url = 'https://storage.test/avatars/s-1/a.jpg?token=x';
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: { avatar_url: url } }));
    const file = new File(['x'], 'avatar.jpg', { type: 'image/jpeg' });
    await expect(avatarApi.uploadAvatar('s-1', file)).resolves.toBe(url);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/students/s-1/avatar');
    expect(init.method).toBe('PUT');
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.body.get('image')).toBeInstanceOf(File);
    expect(init.body.get('image').name).toBe('avatar.jpg');
    expect(init.headers['Content-Type']).toBeUndefined();
  });

  it('removeAvatar hace DELETE /students/:id/avatar', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(204));
    await expect(avatarApi.removeAvatar('s-1')).resolves.toBeNull();
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/students/s-1/avatar');
    expect(init.method).toBe('DELETE');
  });
});
