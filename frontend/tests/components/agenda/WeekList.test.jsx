import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WeekList from '@/components/agenda/WeekList';
import { weekOf } from '@/utils/agenda';
import { NOW, WEEK, appt } from '../../helpers/agenda/fixtures';

const week = weekOf(`${WEEK.from}T15:00:00Z`, new Date(NOW));
const day = (label) => screen.getByRole('region', { name: label });

describe('WeekList', () => {
  it('agrupa por día, con los turnos tocables y "Sin turnos" en el resto', async () => {
    const onSelect = vi.fn();
    render(<WeekList week={week} appointments={[appt()]} showCancelled={false} onSelect={onSelect} />);
    expect(within(day('MAR 03')).getByText('Sin turnos')).toBeInTheDocument();
    const friday = within(day('VIE 06'));
    expect(friday.getByText('18:00')).toBeInTheDocument();
    await userEvent.click(friday.getByRole('button', { name: 'Lucía QA, pendiente, viernes 06/11 18:00' }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'a-1' }));
  });

  it('respeta el toggle de cancelados', () => {
    const list = [appt({ status: 'cancelled' })];
    const { rerender } = render(<WeekList week={week} appointments={list} showCancelled={false} onSelect={vi.fn()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    rerender(<WeekList week={week} appointments={list} showCancelled onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: /cancelado/ })).toBeInTheDocument();
  });
});
