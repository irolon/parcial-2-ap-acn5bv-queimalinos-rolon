import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import WorkoutSummary from '@/components/workout/result/WorkoutSummary';
import { renderAt } from '../../../helpers/workout/router';
import { freshWorkout, isoAt, withSets } from '../../../helpers/workout/workout';
import { allowSlowScreens } from '../../../helpers/shared/patience';

allowSlowScreens();

// Press banca: 62,5 kg × 10 dos veces (1250 kg) y Remo con barra: 40 kg × 12 (480 kg); 54 minutos.
const finished = (upload = {}) => {
  const state = withSets(freshWorkout(), [[0, 62.5, 10], [0, 62.5, 10], [1, 40, 12]]);
  return { ...state, finishedAt: isoAt(54 * 60), upload: { ...state.upload, ...upload } };
};

const FIRST = { code: 'FIRST_SESSION', name: 'Primera sesión', category: 'milestone' };
const PR = { code: 'FIRST_PR', name: 'Primer récord', category: 'pr' };

function show({ state = finished(), unlocked = [], failed = [] } = {}) {
  return renderAt(<WorkoutSummary result={{ ok: true, state, unlocked, failed }} />);
}

describe('WorkoutSummary', () => {
  it('confirma "¡Entrenamiento guardado!" con "N series · X kg · Y min"', () => {
    show();
    expect(screen.getByRole('heading', { name: '¡Entrenamiento guardado!' })).toBeInTheDocument();
    expect(screen.getByText('3 series · 1730 kg · 54 min')).toBeInTheDocument();
  });

  it('al aparecer lleva el foco al título, para que el lector de pantalla lo anuncie', () => {
    show();
    expect(screen.getByRole('heading', { name: '¡Entrenamiento guardado!' })).toHaveFocus();
  });

  it('con una sola serie, en singular', () => {
    const state = { ...withSets(freshWorkout(), [[0, 50, 10]]), finishedAt: isoAt(600) };
    show({ state });
    expect(screen.getByText('1 serie · 500 kg · 10 min')).toBeInTheDocument();
  });

  it('el volumen lleva coma decimal', () => {
    const state = { ...withSets(freshWorkout(), [[0, 62.5, 5]]), finishedAt: isoAt(600) };
    show({ state });
    expect(screen.getByText('1 serie · 312,5 kg · 10 min')).toBeInTheDocument();
  });

  it('las series que el servidor rechazó no cuentan', () => {
    const state = finished({ failed: [{ id: 'set-3', code: 'EXERCISE_NOT_FOUND' }] });
    show({ state, failed: state.upload.failed });
    expect(screen.getByText('2 series · 1250 kg · 54 min')).toBeInTheDocument();
  });

  it('lista los logros desbloqueados', () => {
    show({ unlocked: [FIRST, PR] });
    const list = screen.getByRole('list', { name: 'Logros desbloqueados' });
    expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Primera sesión',
      'Primer récord',
    ]);
  });

  it('sin logros no muestra la sección', () => {
    show();
    expect(screen.queryByText('Logros desbloqueados')).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('avisa cuántas series no se pudieron guardar', () => {
    show({ failed: [{ id: 'a', code: 'X' }, { id: 'b', code: 'X' }] });
    expect(screen.getByRole('alert')).toHaveTextContent('2 series no se pudieron guardar');
  });

  it('con una sola serie rechazada, en singular', () => {
    show({ failed: [{ id: 'a', code: 'X' }] });
    expect(screen.getByRole('alert')).toHaveTextContent('1 serie no se pudo guardar');
  });

  it('sin series rechazadas no muestra el aviso', () => {
    show();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('ofrece ir al historial o volver a Hoy', () => {
    show();
    expect(screen.getByRole('link', { name: 'Ver historial' })).toHaveAttribute('href', '/alumno/historial');
    expect(screen.getByRole('link', { name: 'Volver a Hoy' })).toHaveAttribute('href', '/alumno/hoy');
  });
});
