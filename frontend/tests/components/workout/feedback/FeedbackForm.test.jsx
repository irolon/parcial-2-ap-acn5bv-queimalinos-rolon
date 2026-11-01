import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FeedbackForm from '@/components/workout/feedback/FeedbackForm';

const mount = () => {
  const handlers = { onSave: vi.fn(), onSkip: vi.fn() };
  render(<FeedbackForm {...handlers} />);
  return handlers;
};
const save = () => screen.getByRole('button', { name: 'Guardar' });
const notes = () => screen.getByLabelText('Nota (opcional)');

describe('FeedbackForm', () => {
  it('pregunta "¿Qué tan dura fue?" con RPE de 1 a 10 y una nota opcional', () => {
    mount();
    expect(screen.getByRole('heading', { name: '¿Qué tan dura fue?' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: '¿Qué tan dura fue?' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(10);
    expect(notes()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Saltar' })).toBeInTheDocument();
  });

  it('al aparecer lleva el foco a la pregunta, para que el lector de pantalla la anuncie', () => {
    mount();
    expect(screen.getByRole('heading', { name: '¿Qué tan dura fue?' })).toHaveFocus();
  });

  it('al elegir un RPE muestra su etiqueta, la de mobile', async () => {
    mount();
    const user = userEvent.setup();
    await user.click(screen.getByRole('radio', { name: 'RPE 7' }));
    expect(screen.getByRole('status')).toHaveTextContent('7 · Difícil, te quedaban 2-3 reps');
    await user.click(screen.getByRole('radio', { name: 'RPE 1' }));
    expect(screen.getByRole('status')).toHaveTextContent('1 · Muy fácil, como entrar en calor');
  });

  it('la nota tiene un contador de hasta 1000 caracteres', async () => {
    mount();
    const user = userEvent.setup();
    expect(screen.getByText('0/1000')).toBeInTheDocument();
    expect(notes()).toHaveAttribute('maxlength', '1000');
    await user.type(notes(), 'Buen ritmo');
    expect(screen.getByText('10/1000')).toBeInTheDocument();
  });

  it('no deja pasar de 1000 caracteres', async () => {
    mount();
    const user = userEvent.setup();
    await user.click(notes());
    await user.paste('a'.repeat(1200));
    expect(notes()).toHaveValue('a'.repeat(1000));
    expect(screen.getByText('1000/1000')).toBeInTheDocument();
  });

  it('Guardar espera a que haya un RPE o una nota (si no, es lo mismo que Saltar)', async () => {
    mount();
    const user = userEvent.setup();
    expect(save()).toBeDisabled();
    await user.type(notes(), '   ');
    expect(save()).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: 'RPE 5' }));
    expect(save()).toBeEnabled();
    await user.click(screen.getByRole('radio', { name: 'RPE 5' }));
    expect(save()).toBeDisabled();
  });

  it('Guardar manda el RPE y la nota', async () => {
    const { onSave } = mount();
    const user = userEvent.setup();
    await user.click(screen.getByRole('radio', { name: 'RPE 8' }));
    await user.type(notes(), 'Me costó la última');
    await user.click(save());
    expect(onSave).toHaveBeenCalledWith({ rpe: 8, notes: 'Me costó la última' });
  });

  it('se puede guardar solo la nota, sin RPE', async () => {
    const { onSave } = mount();
    const user = userEvent.setup();
    await user.type(notes(), 'Dormí mal');
    await user.click(save());
    expect(onSave).toHaveBeenCalledWith({ rpe: null, notes: 'Dormí mal' });
  });

  it('Saltar no manda nada', async () => {
    const { onSave, onSkip } = mount();
    const user = userEvent.setup();
    await user.click(screen.getByRole('radio', { name: 'RPE 8' }));
    await user.click(screen.getByRole('button', { name: 'Saltar' }));
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});
