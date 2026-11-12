import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import OverviewKpis from '@/components/students/overview/OverviewKpis';
import { overview } from '../../../helpers/students/overview';

const kpi = (label) => within(screen.getByText(label).closest('[data-kpi]'));

const FULL = overview({
  active_students: { count: 23, new_7d: 2 },
  sessions_today: { done: 8, expected: 11 },
  adherence_7d: { pct: 87, delta: 4 },
  at_risk: 3,
});

describe('OverviewKpis', () => {
  it('muestra los 4 indicadores con su línea de contexto', () => {
    render(<OverviewKpis overview={FULL} />);
    expect(kpi('Alumnos activos').getByText('23')).toBeInTheDocument();
    expect(kpi('Alumnos activos').getByText('+2 en los últimos 7 días')).toHaveClass('text-good');
    expect(kpi('Sesiones hoy').getByText('8')).toBeInTheDocument();
    expect(kpi('Sesiones hoy').getByText('/11')).toBeInTheDocument();
    expect(kpi('Adherencia 7 días').getByText('87')).toBeInTheDocument();
    expect(kpi('Adherencia 7 días').getByText('%')).toBeInTheDocument();
    expect(kpi('Adherencia 7 días').getByText('+4% vs. semana anterior')).toHaveClass('text-good');
    expect(kpi('En riesgo').getByText('3')).toHaveClass('text-hot');
    expect(kpi('En riesgo').getByText('7 días o más sin entrenar')).toBeInTheDocument();
  });

  it('sin altas nuevas no muestra la línea; sin nadie en riesgo el número no va en coral', () => {
    render(<OverviewKpis overview={{ ...FULL, active_students: { count: 5, new_7d: 0 }, at_risk: 0 }} />);
    expect(kpi('Alumnos activos').queryByText(/en los últimos 7 días/)).not.toBeInTheDocument();
    expect(kpi('En riesgo').getByText('0')).not.toHaveClass('text-hot');
  });

  it('sin nadie con entrenamiento hoy lo dice', () => {
    render(<OverviewKpis overview={{ ...FULL, sessions_today: { done: 0, expected: 0 } }} />);
    expect(kpi('Sesiones hoy').getByText('Hoy nadie tiene entrenamiento asignado')).toBeInTheDocument();
  });

  it('adherencia en baja va en coral y sin variación en gris', () => {
    const { rerender } = render(<OverviewKpis overview={{ ...FULL, adherence_7d: { pct: 60, delta: -3 } }} />);
    expect(kpi('Adherencia 7 días').getByText('−3% vs. semana anterior')).toHaveClass('text-hot');
    rerender(<OverviewKpis overview={{ ...FULL, adherence_7d: { pct: 60, delta: 0 } }} />);
    expect(kpi('Adherencia 7 días').getByText('0% vs. semana anterior')).toHaveClass('text-ink6');
  });

  it('sin plan asignado la adherencia es "—" y lo explica', () => {
    render(<OverviewKpis overview={{ ...FULL, adherence_7d: { pct: null, delta: null } }} />);
    expect(kpi('Adherencia 7 días').getByText('—')).toBeInTheDocument();
    expect(kpi('Adherencia 7 días').queryByText('%')).not.toBeInTheDocument();
    expect(kpi('Adherencia 7 días').getByText('Ningún alumno tiene plan asignado')).toBeInTheDocument();
  });

  it('cargando muestra el esqueleto con su label', () => {
    render(<OverviewKpis />);
    expect(screen.getAllByRole('status')[0]).toHaveTextContent('Cargando el resumen…');
    expect(screen.queryByText('Alumnos activos')).not.toBeInTheDocument();
  });
});
