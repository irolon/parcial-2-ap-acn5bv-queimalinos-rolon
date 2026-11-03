import { vi } from 'vitest';
import { jsonResponse, stubFetch } from '../shared/fetchMock';

export const conv = (id, name, last = null, unread = 0) => ({
  student: { id, name, avatar_url: null },
  last_message: last,
  unread_count: unread,
});
export const CONVERSATIONS = [
  conv('s-1', 'Ana Paz', { body: 'Listo!', has_image: false, sender_role: 'student', created_at: '2026-10-30T15:00:00+00:00' }, 3),
  conv('s-2', 'Ángel Díaz', { body: '', has_image: true, sender_role: 'trainer', created_at: '2026-10-20T15:00:00+00:00' }),
  conv('s-3', 'Bruno Sosa'),
];

export function stub(extra = {}) {
  return stubFetch(async (url, init) => {
    const path = url.replace('http://api.test/api', '');
    if (extra[path]) return extra[path](init);
    if (path === '/messages/conversations') return jsonResponse(200, { data: CONVERSATIONS });
    if (path === '/messages/broadcast') return jsonResponse(201, { data: { broadcast_id: 'b-1', sent: 2 } });
    if (path.endsWith('/read')) return jsonResponse(200, { data: { updated: 0 } });
    const id = path.split('/')[2];
    const name = CONVERSATIONS.find((c) => c.student.id === id)?.student.name ?? 'Otro';
    return jsonResponse(200, {
      data: [],
      meta: { next_before: null },
      counterpart: { id, name, avatar_url: null },
    });
  });
}

export function stubDesktop(matches) {
  vi.stubGlobal('matchMedia', () => ({ matches, addEventListener: () => {}, removeEventListener: () => {} }));
}

