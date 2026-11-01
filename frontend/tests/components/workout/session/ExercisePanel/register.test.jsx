import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExercisePanel from '@/components/workout/session/ExercisePanel';
import { removeSet, setCursor } from '@/utils/workout/workoutState';
import { PanelHarness, register, reps, weight } from '../../../../helpers/workout/exercisePanel';
import { freshWorkout } from '../../../../helpers/workout/workout';
import { allowSlowScreens } from '../../../../helpers/shared/patience';

allowSlowScreens();

// Lo que hace la página fuera del panel: pasar de ejercicio y borrar la última serie.
const around = (setWorkout) => (
  <>
    <button type="button" onClick={() => setWorkout((w) => setCursor(w, w.cursor + 1))}>Siguiente</button>
    <button type="button" onClick={() => setWorkout((w) => setCursor(w, w.cursor - 1))}>Anterior</button>
    <button type="button" onClick={() => setWorkout((w) => removeSet(w, w.sets.at(-1).id))}>Borrar última</button>
  </>
);
const status = () => screen.getByRole('status');

describe('ExercisePanel: registrar la serie', () => {
  it('manda el peso y las reps tal como están en los campos y avisa qué serie se registró', async () => {
    const spy = vi.fn();
    render(<PanelHarness spy={spy} />);
    await userEvent.setup().click(register());
    expect(spy).toHaveBeenCalledWith('62,5', '10');
    expect(status()).toHaveTextContent('Serie 1 registrada · 62,5 kg × 10');
  });

  it('un doble clic registra una sola serie; dos clics separados, dos', async () => {
    const spy = vi.fn();
    render(<PanelHarness spy={spy} />);
    const user = userEvent.setup();
    await user.dblClick(register());
    expect(spy).toHaveBeenCalledTimes(1);
    expect(status()).toHaveTextContent('Serie 1 registrada');
    await user.click(screen.getByRole('button', { name: '+1 rep' }));
    await user.click(register());
    expect(spy).toHaveBeenCalledTimes(2);
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
    expect(status()).toHaveTextContent('Serie 1 registrada · Peso corporal × 12');
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

  it('"1250" + Enter no registra 1000 kg sin avisar: dice que el peso no puede pasar de 1000 kg', async () => {
    const spy = vi.fn();
    render(<PanelHarness spy={spy} />);
    const user = userEvent.setup();
    await user.clear(weight());
    await user.type(weight(), '1250{Enter}');
    expect(spy).not.toHaveBeenCalled();
    expect(weight()).toHaveValue('1250');
    expect(screen.getByRole('alert')).toHaveTextContent('El peso no puede pasar de 1000 kg.');
  });

  it('al cambiar de ejercicio se vuelve a precargar y se borra el aviso de la serie registrada', async () => {
    render(<PanelHarness>{around}</PanelHarness>);
    const user = userEvent.setup();
    await user.click(register());
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByRole('heading', { name: 'Remo con barra' })).toBeInTheDocument();
    expect(weight()).toHaveValue('');
    expect(reps()).toHaveValue('12');
    expect(status()).toBeEmptyDOMElement();
  });

  it('si el motor no registra (tope de series) lo avisa en vez de callar', async () => {
    const onRegister = vi.fn(() => freshWorkout());
    render(<ExercisePanel workout={freshWorkout()} onRegister={onRegister} />);
    await userEvent.setup().click(register());
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos registrar la serie.');
  });
});

describe('ExercisePanel: el aviso de la serie registrada', () => {
  it('lleva el número de la serie que se acaba de registrar', async () => {
    render(<PanelHarness />);
    const user = userEvent.setup();
    await user.click(register());
    await user.click(register());
    expect(status()).toHaveTextContent('Serie 2 registrada · 62,5 kg × 10');
  });

  it('no reaparece al irse del ejercicio y volver', async () => {
    render(<PanelHarness>{around}</PanelHarness>);
    const user = userEvent.setup();
    await user.click(register());
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(screen.getByText('SERIE 2 DE 4 · SUGERIDO 62,5 KG × 10')).toBeInTheDocument();
    expect(status()).toBeEmptyDOMElement();
  });

  it('no sigue ahí si se borra esa serie, y el de la serie nueva sí aparece', async () => {
    render(<PanelHarness>{around}</PanelHarness>);
    const user = userEvent.setup();
    await user.click(register());
    await user.click(screen.getByRole('button', { name: 'Borrar última' }));
    expect(status()).toBeEmptyDOMElement();
    await user.click(register());
    expect(status()).toHaveTextContent('Serie 1 registrada · 62,5 kg × 10');
  });
});
