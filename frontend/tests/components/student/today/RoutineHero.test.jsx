import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import RoutineHero from '@/components/student/today/RoutineHero';
import { resetWorkoutStore, writeWorkout } from '@/hooks/workout/workoutStore';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { STUDENT, setSession } from '../../../helpers/routes/renderRoute';
import { todayRoutine } from '../../../helpers/routines/studentRoutines';
import { renderInRouter } from '../../../helpers/student/render';
import { freshWorkout } from '../../../helpers/workout/workout';

const SUNDAY = new Date('2026-11-01T13:00:00Z');

beforeEach(() => {
  resetAuthStore();
  setSession(STUDENT);
  resetWorkoutStore();
});

describe('RoutineHero', () => {
  it('muestra el día, el nombre de la rutina y el resumen N ejercicios · M series · ~X min', () => {
    renderInRouter(<RoutineHero routine={todayRoutine()} now={SUNDAY} />);
    expect(screen.getByText('Hoy · Domingo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Push · día 3' })).toBeInTheDocument();
    // 4 × (90 + 45) + 3 × (60 + 45) = 855 s ≈ 14 min
    expect(screen.getByText('2 EJERCICIOS · 7 SERIES · ~14 MIN')).toBeInTheDocument();
  });

  it('el día sale de la fecha en Argentina, no de la zona del navegador', () => {
    renderInRouter(<RoutineHero routine={todayRoutine()} now={new Date('2026-11-02T03:00:00Z')} />);
    expect(screen.getByText('Hoy · Lunes')).toBeInTheDocument();
  });

  it('ofrece Empezar entrenamiento, sin Descartar', () => {
    renderInRouter(<RoutineHero routine={todayRoutine()} now={SUNDAY} />);
    expect(screen.getByRole('button', { name: 'Empezar entrenamiento' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Descartar' })).not.toBeInTheDocument();
  });

  it('con una sesión en curso ofrece Continuar entrenamiento y Descartar', () => {
    writeWorkout('s-1', freshWorkout());
    renderInRouter(<RoutineHero routine={todayRoutine()} now={SUNDAY} />);
    expect(screen.getByRole('button', { name: 'Continuar entrenamiento' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Empezar entrenamiento' })).not.toBeInTheDocument();
  });

  it('una rutina sin ejercicios no se puede empezar', () => {
    renderInRouter(<RoutineHero routine={todayRoutine({ exercises: [] })} now={SUNDAY} />);
    expect(screen.getByText('0 EJERCICIOS · 0 SERIES · ~0 MIN')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Empezar entrenamiento' })).toBeDisabled();
  });

  it('una rutina que viene con ejercicios en null no rompe la tarjeta', () => {
    renderInRouter(<RoutineHero routine={todayRoutine({ exercises: null })} now={SUNDAY} />);
    expect(screen.getByRole('button', { name: 'Empezar entrenamiento' })).toBeDisabled();
  });
});
