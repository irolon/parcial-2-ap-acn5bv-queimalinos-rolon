import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WeekGrid from '@/components/agenda/WeekGrid';
import { weekOf } from '@/utils/agenda';
import { AVAILABILITY, NOW, WEEK, appt, freezeNow } from '../../helpers/agenda/fixtures';

beforeEach(freezeNow);
afterEach(() => vi.useRealTimers());

const week = weekOf(`${WEEK.from}T15:00:00Z`, new Date(NOW));

function setup(appointments, showCancelled = false, onSelect = vi.fn()) {
  render(
    <WeekGrid week={week} availability={AVAILABILITY} appointments={appointments} showCancelled={showCancelled} onSelect={onSelect} />,
  );
  return onSelect;
}

const block = (name) => screen.getByRole('button', { name });

describe('WeekGrid', () => {
  it('es una grilla con encabezados de día y de hora, y el día de hoy marcado', () => {
    setup([]);
    expect(screen.getByRole('table', { name: 'Agenda semanal' })).toBeInTheDocument();
    const today = screen.getByRole('columnheader', { name: 'MIÉ 04' });
    expect(today).toHaveAttribute('aria-current', 'date');
    expect(today).toHaveClass('text-accentText');
    expect(screen.getByRole('columnheader', { name: 'LUN 02' })).not.toHaveClass('text-accentText');
    expect(screen.getByRole('rowheader', { name: '09:00' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: '12:00' })).toBeInTheDocument();
    expect(screen.queryByRole('rowheader', { name: '13:00' })).not.toBeInTheDocument();
  });

  it('distingue las celdas disponibles de las no disponibles', () => {
    setup([]);
    const row = screen.getByRole('rowheader', { name: '09:00' }).parentElement;
    const cells = within(row).getAllByRole('cell');
    expect(cells[0]).toHaveClass('bg-ink2');
    expect(cells[5]).toHaveClass('bg-ink1'); // sábado
    expect(within(cells[0]).getByText('Disponible')).toBeInTheDocument();
    expect(within(cells[5]).queryByText('Disponible')).not.toBeInTheDocument();
  });

  it.each([
    ['pending', 'Lucía QA, pendiente, viernes 06/11 18:00', 'border-warn', 'PENDIENTE'],
    ['confirmed', 'Lucía QA, confirmado, viernes 06/11 18:00', 'border-good', 'CONFIRMADO'],
  ])('pinta el turno %s con el color de su estado', (status, name, border, tag) => {
    setup([appt({ status })]);
    expect(block(name)).toHaveClass(border);
    expect(block(name)).toHaveTextContent(new RegExp(tag, 'i'));
  });

  it('un lunes 00:00 de Argentina cae en la columna del lunes, no en el domingo anterior', () => {
    // 03:00Z = lunes 00:00 AR; la disponibilidad se amplía hasta la fila de las 00:00.
    setup([appt({ id: 'm', scheduled_at: '2026-11-02T03:00:00.000Z', student: { id: 's', name: 'Lunes' } })]);
    const cell = block('Lunes, pendiente, lunes 02/11 00:00').closest('[role="cell"]');
    const row = cell.parentElement;
    expect(within(row).getByRole('rowheader', { name: '00:00' })).toBeInTheDocument();
    expect(within(row).getAllByRole('cell').indexOf(cell)).toBe(0);
  });

  it('un turno de las 22:00 de Argentina (01:00Z del día siguiente) queda en su día y fila', () => {
    setup([appt({ id: 'n', scheduled_at: '2026-11-07T01:00:00.000Z', student: { id: 's', name: 'Noche' } })]);
    const cell = block('Noche, pendiente, viernes 06/11 22:00').closest('[role="cell"]');
    expect(within(cell.parentElement).getByRole('rowheader', { name: '22:00' })).toBeInTheDocument();
    expect(within(cell.parentElement).getAllByRole('cell').indexOf(cell)).toBe(4);
  });

  it('oculta los cancelados y los muestra, tachados y en gris, con el toggle', () => {
    const cancelled = appt({ id: 'c', status: 'cancelled' });
    const { unmount } = render(
      <WeekGrid week={week} availability={AVAILABILITY} appointments={[cancelled]} showCancelled={false} onSelect={vi.fn()} />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    unmount();
    setup([cancelled], true);
    const shown = block('Lucía QA, cancelado, viernes 06/11 18:00');
    expect(shown).toHaveClass('border-ink5');
    expect(within(shown).getByText('Lucía QA')).toHaveClass('line-through');
    expect(within(shown).getByText('Cancelado')).not.toHaveClass('line-through');
  });

  it('apila un cancelado y uno activo de la misma celda cuando el toggle está prendido', () => {
    const list = [appt({ id: 'c', status: 'cancelled' }), appt({ id: 'p', student: { id: 's2', name: 'Otro Alumno' } })];
    setup(list, true);
    const cell = block('Otro Alumno, pendiente, viernes 06/11 18:00').closest('[role="cell"]');
    expect(within(cell).getAllByRole('button')).toHaveLength(2);
  });

  it('con el toggle apagado la celda queda solo con el activo', () => {
    const list = [appt({ id: 'c', status: 'cancelled' }), appt({ id: 'p', student: { id: 's2', name: 'Otro Alumno' } })];
    setup(list, false);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('agrega filas cuando un turno cae fuera de la disponibilidad', () => {
    setup([appt({ scheduled_at: '2026-11-06T23:00:00.000Z' })]); // 20:00 AR
    expect(screen.getByRole('rowheader', { name: '20:00' })).toBeInTheDocument();
  });

  it('avisa qué turno se tocó', async () => {
    const onSelect = setup([appt()]);
    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(block(/Lucía QA/));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'a-1' }));
  });
});
