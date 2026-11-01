import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExercisePanel from '@/components/workout/session/ExercisePanel';
import { setCursor } from '@/utils/workout/workoutState';
import { PanelHarness, register, reps, weight } from '../../../../helpers/workout/exercisePanel';
import { freshWorkout } from '../../../../helpers/workout/workout';

describe('ExercisePanel: registrar la serie', () => {
  it('manda el peso y las reps tal como están en los campos y avisa "Serie registrada"', async () => {
    const spy = vi.fn();
    render(<PanelHarness spy={spy} />);
    await userEvent.setup().click(register());
    expect(spy).toHaveBeenCalledWith('62,5', '10');
    expect(screen.getByRole('status')).toHaveTextContent('Serie registrada · 62,5 kg × 10');
  });

  it('Enter en un campo también registra', async () => {
    const spy = vi.fn();
    render(<PanelHarness spy={spy} />);
    await userEvent.setup().type(reps(), '{Enter}');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('después de registrar pasa a la serie siguiente con los mismos valores y el foco sigue en el botón', async () => {
    render(<PanelHarness />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '+2,5 kg' }));
    await user.click(register());
    expect(screen.getByText('SERIE 2 DE 4 · SUGERIDO 62,5 KG × 10')).toBeInTheDocument();
    expect(weight()).toHaveValue('65');
    expect(register()).toHaveFocus();
  });

  it('una serie sin peso se avisa como peso corporal', async () => {
    render(<PanelHarness initial={setCursor(freshWorkout(), 1)} />);
    await userEvent.setup().click(register());
    expect(screen.getByRole('status')).toHaveTextContent('Serie registrada · Peso corporal × 12');
  });

  it('con las reps vacías no registra y avisa', async () => {
    const spy = vi.fn();
    render(<PanelHarness spy={spy} />);
    const user = userEvent.setup();
    await user.clear(reps());
    await user.click(register());
    expect(spy).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Escribí las repeticiones como un número entero.');
    await user.type(reps(), '9');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('con un peso ilegible no registra y avisa', async () => {
    const spy = vi.fn();
    render(<PanelHarness spy={spy} />);
    const user = userEvent.setup();
    await user.clear(weight());
    await user.type(weight(), ',');
    await user.click(register());
    expect(spy).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Escribí el peso como número, por ejemplo 62,5.');
  });

  it('al cambiar de ejercicio se vuelve a precargar y se borra el aviso de la serie registrada', async () => {
    render(<PanelHarness>{(setWorkout) => (
      <button type="button" onClick={() => setWorkout((current) => setCursor(current, current.cursor + 1))}>Siguiente</button>
    )}</PanelHarness>);
    const user = userEvent.setup();
    await user.click(register());
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByRole('heading', { name: 'Remo con barra' })).toBeInTheDocument();
    expect(weight()).toHaveValue('');
    expect(reps()).toHaveValue('12');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('si el motor no registra (tope de series) lo avisa en vez de callar', async () => {
    const onRegister = vi.fn(() => freshWorkout());
    render(<ExercisePanel workout={freshWorkout()} onRegister={onRegister} />);
    await userEvent.setup().click(register());
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos registrar la serie.');
  });
});
