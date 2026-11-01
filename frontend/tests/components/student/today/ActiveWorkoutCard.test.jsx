import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActiveWorkoutCard from '@/components/student/today/ActiveWorkoutCard';
import { readWorkout, resetWorkoutStore, writeWorkout } from '@/hooks/workout/workoutStore';
import { WORKOUT_PATH } from '@/routes/routeTable';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { STUDENT, setSession } from '../../../helpers/routes/renderRoute';
import { renderInRouter } from '../../../helpers/student/render';
import { finishedWorkout, freshWorkout } from '../../../helpers/workout/workout';
import { allowSlowScreens } from '../../../helpers/student/patience';

allowSlowScreens();

beforeEach(() => {
  resetAuthStore();
  setSession(STUDENT);
  resetWorkoutStore();
});

describe('ActiveWorkoutCard', () => {
  it('sin sesión en curso no muestra nada', () => {
    const { container } = renderInRouter(<ActiveWorkoutCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it('con una sesión en curso deja volver a ella o descartarla, aunque Hoy no tenga rutina', async () => {
    writeWorkout('s-1', freshWorkout());
    const { pathname } = renderInRouter(<ActiveWorkoutCard />);
    expect(screen.getByText('Entrenamiento en curso')).toBeInTheDocument();
    expect(screen.getByText('Tenés un entrenamiento sin terminar')).toBeInTheDocument();
    expect(screen.getByText('En curso: Push · día 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Continuar entrenamiento' }));
    expect(pathname()).toBe(WORKOUT_PATH);
  });

  it('con la sesión terminada y sin guardar dice que está sin guardar y deja entrar a guardarla', async () => {
    writeWorkout('s-1', finishedWorkout(3));
    const { pathname } = renderInRouter(<ActiveWorkoutCard />);
    expect(screen.getByText('Tenés un entrenamiento sin guardar')).toBeInTheDocument();
    expect(screen.queryByText('Tenés un entrenamiento sin terminar')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continuar entrenamiento' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Descartar' })).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Terminar de guardar' }));
    expect(pathname()).toBe(WORKOUT_PATH);
    expect(readWorkout('s-1')).not.toBeNull();
  });
});
