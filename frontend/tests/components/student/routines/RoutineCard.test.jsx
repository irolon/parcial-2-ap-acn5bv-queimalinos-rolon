import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RoutineCard from '@/components/student/routines/RoutineCard';
import { mineRoutine } from '../../../helpers/routines/studentRoutines';
import { renderInRouter } from '../../../helpers/student/render';
import { allowSlowScreens } from '../../../helpers/shared/patience';

allowSlowScreens();

describe('RoutineCard', () => {
  it('muestra el nombre, los días abreviados y la cantidad de ejercicios, y lleva al detalle', async () => {
    const { pathname } = renderInRouter(<RoutineCard routine={mineRoutine({ days: ['friday', 'monday', 'wednesday'] })} />);
    const link = screen.getByRole('link', { name: /Push · día 3/ });
    expect(screen.getByRole('heading', { level: 2, name: 'Push · día 3' })).toBeInTheDocument(); // debajo del h1 de la topbar
    expect(link).toHaveAttribute('href', '/alumno/rutinas/r-1');
    expect(link).toHaveTextContent('Lun · Mié · Vie');
    expect(link).toHaveTextContent('2 ejercicios');
    await userEvent.setup().click(link);
    expect(pathname()).toBe('/alumno/rutinas/r-1');
  });

  it('con un solo ejercicio va en singular', () => {
    renderInRouter(<RoutineCard routine={mineRoutine({ exercises: mineRoutine().exercises.slice(0, 1) })} />);
    expect(screen.getByRole('link')).toHaveTextContent('1 ejercicio');
    expect(screen.getByRole('link')).not.toHaveTextContent('1 ejercicios');
  });

  it('una rutina sin días o sin ejercicios no se rompe ni deja textos colgando', () => {
    renderInRouter(<RoutineCard routine={mineRoutine({ name: 'Pierna', days: null, exercises: null })} />);
    const link = screen.getByRole('link');
    expect(link).toHaveTextContent('0 ejercicios');
    expect(link).not.toHaveTextContent('·');
  });
});
