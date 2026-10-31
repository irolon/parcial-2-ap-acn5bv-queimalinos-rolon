import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as messagesApi from '@/api/messages/messages.api';
import { configureClient } from '@/api/shared/client';
import { bodyOf, calls, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

beforeEach(() => configureClient({ getToken: () => 'access-1' }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('messages.api', () => {
  it('getConversations y getUnreadCount desenvuelven data', async () => {
    const fetchMock = stubFetch(async (url) =>
      jsonResponse(200, { data: url.endsWith('/conversations') ? [{ unread_count: 2 }] : { count: 3 } }),
    );
    await expect(messagesApi.getConversations()).resolves.toEqual([{ unread_count: 2 }]);
    await expect(messagesApi.getUnreadCount()).resolves.toBe(3);
    expect(calls(fetchMock).map(([path]) => path)).toEqual(['/messages/conversations', '/messages/unread-count']);
  });

  it('getMessages sin cursor no manda query y devuelve data, meta y counterpart', async () => {
    const payload = { data: [], meta: { next_before: null }, counterpart: { id: 's-1' } };
    const fetchMock = stubFetch(async () => jsonResponse(200, payload));
    await expect(messagesApi.getMessages('s-1')).resolves.toEqual(payload);
    expect(calls(fetchMock)[0][0]).toBe('/messages/s-1');
  });

  it('getMessages reenvía next_before tal cual, codificando el + de la zona', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: [], meta: {} }));
    await messagesApi.getMessages('s-1', { before: '2026-10-31T14:00:00.123456+00:00' });
    expect(calls(fetchMock)[0][0]).toBe('/messages/s-1?before=2026-10-31T14%3A00%3A00.123456%2B00%3A00');
  });

  it('sendMessage arma un FormData con body e image', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(201, { data: { id: 'm-1' } }));
    const file = new File(['x'], 'foto.png', { type: 'image/png' });
    await expect(messagesApi.sendMessage('s-1', { body: 'Mirá', file })).resolves.toEqual({ id: 'm-1' });
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/messages/s-1');
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.body.get('body')).toBe('Mirá');
    expect(init.body.get('image')).toBeInstanceOf(File);
    expect(init.headers['Content-Type']).toBeUndefined();
  });

  it('sendMessage solo con foto no manda body', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(201, { data: {} }));
    await messagesApi.sendMessage('s-1', { file: new File(['x'], 'f.png', { type: 'image/png' }) });
    expect(calls(fetchMock)[0][1].body.has('body')).toBe(false);
  });

  it('markRead y broadcast', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: { updated: 2, sent: 2 } }));
    await expect(messagesApi.markRead('s-1')).resolves.toEqual({ updated: 2, sent: 2 });
    await messagesApi.broadcast({ studentIds: ['a', 'b'], body: 'Hola' });
    const [read, bc] = calls(fetchMock);
    expect(read[0]).toBe('/messages/s-1/read');
    expect(read[1].method).toBe('POST');
    expect(bc[0]).toBe('/messages/broadcast');
    expect(bodyOf(bc[1])).toEqual({ student_ids: ['a', 'b'], body: 'Hola' });
  });
});
