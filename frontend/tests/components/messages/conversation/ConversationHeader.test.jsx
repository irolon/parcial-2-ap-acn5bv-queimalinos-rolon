import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import ConversationHeader from '@/components/messages/conversation/ConversationHeader';

const PHOTO = 'https://storage.test/avatars/trainers/t-1/a.jpg?token=1';

const renderHeader = (props) =>
  render(
    <MemoryRouter>
      <ConversationHeader studentId="s-1" viewerRole="student" {...props} />
    </MemoryRouter>,
  );

describe('ConversationHeader', () => {
  it('con foto del otro (el PT para el alumno) la dibuja', () => {
    const { container } = renderHeader({ counterpart: { id: 't-1', name: 'Laura Gómez', avatar_url: PHOTO } });
    expect(screen.getByRole('heading', { name: 'Laura Gómez' })).toBeVisible();
    expect(container.querySelector('img')).toHaveAttribute('src', PHOTO);
  });

  it('sin foto, iniciales', () => {
    const { container } = renderHeader({ counterpart: { id: 't-1', name: 'Laura Gómez', avatar_url: null } });
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('LG')).toBeInTheDocument();
  });
});
