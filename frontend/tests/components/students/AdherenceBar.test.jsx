import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdherenceBar from '@/components/students/AdherenceBar';
import { student } from '../../helpers/students/fixtures';

const renderBar = (adherence_7d) => render(<AdherenceBar student={student({ adherence_7d })} />);
const fill = () => screen.getByRole('meter', { name: 'Adherencia de los últimos 7 días' }).firstElementChild;

describe('AdherenceBar', () => {
  it('meter con el pct, el ancho y el texto', () => {
    renderBar({ assigned: 3, done: 2, pct: 67 });
    const meter = screen.getByRole('meter', { name: 'Adherencia de los últimos 7 días' });
    expect(meter).toHaveAttribute('aria-valuenow', '67');
    expect(meter).toHaveAttribute('aria-valuemin', '0');
    expect(meter).toHaveAttribute('aria-valuemax', '100');
    expect(fill()).toHaveStyle({ width: '67%' });
    expect(screen.getByText('67%')).toHaveAttribute('aria-hidden', 'true');
  });

  it.each([
    [85, 'bg-good'],
    [70, 'bg-good'],
    [55, 'bg-accent'],
    [49, 'bg-hot'],
  ])('%i%% pinta %s', (pct, cls) => {
    renderBar({ assigned: 4, done: 2, pct });
    expect(fill()).toHaveClass(cls);
  });

  it('el tooltip cuenta los días', () => {
    renderBar({ assigned: 3, done: 2, pct: 67 });
    expect(screen.getByTitle('2 de 3 días asignados entrenados en los últimos 7 días')).toBeInTheDocument();
  });

  it('pct mayor a 100 se acota', () => {
    renderBar({ assigned: 2, done: 3, pct: 120 });
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '100');
    expect(fill()).toHaveStyle({ width: '100%' });
  });

  it.each([[{ assigned: 0, done: 0, pct: null }], [undefined]])('sin plan muestra el texto sin barra (%o)', (adh) => {
    renderBar(adh);
    expect(screen.getByText('Sin plan')).toBeInTheDocument();
    expect(screen.queryByRole('meter')).toBeNull();
  });
});
