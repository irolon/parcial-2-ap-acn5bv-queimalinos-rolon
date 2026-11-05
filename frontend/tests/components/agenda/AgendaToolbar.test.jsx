import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AgendaToolbar from '@/components/agenda/AgendaToolbar';

describe('AgendaToolbar', () => {
  it('en la vista angosta todos sus botones llegan a 44 px de toque', () => {
    const noop = vi.fn();
    render(
      <AgendaToolbar
        onPrev={noop}
        onToday={noop}
        onNext={noop}
        showCancelled={false}
        onToggleCancelled={noop}
        onOpenAvailability={noop}
        onOpenNew={noop}
      />,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(5);
    for (const b of buttons) expect(b).toHaveClass('h-8', 'max-md:h-11', 'max-md:min-w-11');
  });
});
