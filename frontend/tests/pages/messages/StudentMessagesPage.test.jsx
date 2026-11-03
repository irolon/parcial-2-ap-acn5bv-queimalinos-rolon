import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { resetAuthStore } from '../../helpers/auth/authStore';
import { calls, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';
import { STUDENT, renderRoute, setSession } from '../../helpers/routes/renderRoute';

beforeEach(() => {
  resetAuthStore();
  setSession(STUDENT);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const counterpart = { id: 't-1', name: 'Laura Pereyra', avatar_url: null };

describe('StudentMessagesPage', () => {
  it('abre la conversación del alumno con su PT y el badge refleja los no leídos', async () => {
    const fetchMock = stubFetch(async (url) => {
      if (url.endsWith('/read')) return jsonResponse(200, { data: { updated: 1 } });
      return jsonResponse(200, {
        data: [
          {
            id: 'm1',
            student_id: 's-1',
            sender_role: 'trainer',
            body: 'Buen laburo',
            image_url: null,
            broadcast_id: 'b-1',
            read_at: null,
            created_at: '2026-10-31T17:05:00+00:00',
          },
        ],
        meta: { next_before: null },
        counterpart,
      });
    }, { unread: 4 });
    renderRoute('/alumno/mensajes');
    expect(await screen.findByRole('heading', { level: 2, name: 'Laura Pereyra' })).toBeInTheDocument();
    expect(screen.getByText('Buen laburo')).toBeInTheDocument();
    expect(screen.getByText('Envío masivo')).toBeInTheDocument();
    expect(calls(fetchMock).some(([url]) => url === '/messages/s-1')).toBe(true);

    const nav = within(await screen.findByTestId('sidebar-fixed')).getByRole('navigation');
    const link = within(nav).getByRole('link', { name: /Mensajes/ });
    expect(await within(link).findByText('4')).toBeInTheDocument();
    expect(link).toHaveAttribute('aria-current', 'page');
  });
});
