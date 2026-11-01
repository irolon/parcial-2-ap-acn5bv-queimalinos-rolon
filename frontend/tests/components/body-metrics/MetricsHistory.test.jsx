import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MetricsHistory from '@/components/body-metrics/MetricsHistory';
import { metric } from '../../helpers/students/fixtures';

const BY_TRAINER = metric({ id: 'm-pt', recorded_at: '2026-09-05T12:00:00Z', recorded_by: 'trainer' });
const BY_STUDENT = metric({ id: 'm-st', recorded_at: '2026-10-05T12:00:00Z', recorded_by: 'student' });
const METRICS = [BY_TRAINER, BY_STUDENT];

const deleteButton = (date) => screen.queryByRole('button', { name: `Borrar medida del ${date}` });
const rowOf = (date) => screen.getByText(date).closest('tr');

describe('MetricsHistory: quién puede borrar', () => {
  it('sin canDelete ofrece borrar todas las filas, como en la ficha del entrenador', () => {
    render(<MetricsHistory metrics={METRICS} onDelete={() => {}} />);
    expect(deleteButton('05/09/2026')).toBeVisible();
    expect(deleteButton('05/10/2026')).toBeVisible();
    expect(screen.getByRole('columnheader', { name: 'Acciones' })).toBeInTheDocument();
  });

  it('con canDelete solo las filas que lo permiten tienen el botón, las otras quedan sin acción', () => {
    render(<MetricsHistory metrics={METRICS} onDelete={() => {}} canDelete={(m) => m.recorded_by === 'student'} />);
    expect(deleteButton('05/10/2026')).toBeVisible();
    expect(deleteButton('05/09/2026')).toBeNull();
    expect(within(rowOf('05/09/2026')).queryByRole('button')).toBeNull();
    expect(within(rowOf('05/09/2026')).getByText('80 kg')).toBeVisible();
  });

  it('canDelete recibe la medida de cada fila', () => {
    const canDelete = vi.fn(() => true);
    render(<MetricsHistory metrics={METRICS} onDelete={() => {}} canDelete={canDelete} />);
    const asked = canDelete.mock.calls.map(([m]) => m.id);
    expect(asked).toEqual(expect.arrayContaining(['m-pt', 'm-st']));
  });

  it('si ninguna se puede borrar no hay botones ni columna de acciones', () => {
    render(<MetricsHistory metrics={[BY_TRAINER]} onDelete={() => {}} canDelete={() => false} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Acciones' })).toBeNull();
    expect(screen.getByRole('table', { name: 'Historial de medidas' })).toBeVisible();
  });

  it('el botón pide borrar con la medida de su fila', async () => {
    const onDelete = vi.fn();
    render(<MetricsHistory metrics={METRICS} onDelete={onDelete} canDelete={(m) => m.recorded_by === 'student'} />);
    await userEvent.setup().click(deleteButton('05/10/2026'));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(BY_STUDENT);
  });

  it('sin medidas dice que el historial está vacío', () => {
    render(<MetricsHistory metrics={[]} onDelete={() => {}} canDelete={() => true} />);
    expect(screen.getByText('El historial está vacío')).toBeVisible();
    expect(screen.queryByRole('table')).toBeNull();
  });
});
