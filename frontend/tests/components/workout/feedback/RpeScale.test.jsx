import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RpeScale from '@/components/workout/feedback/RpeScale';

function Harness({ initial = null, onChange }) {
  const [rpe, setRpe] = useState(initial);
  return (
    <>
      <h2 id="title">¿Qué tan dura fue?</h2>
      <RpeScale
        value={rpe}
        labelledBy="title"
        onChange={(next) => { setRpe(next); onChange?.(next); }}
      />
    </>
  );
}

const radio = (n) => screen.getByRole('radio', { name: `RPE ${n}` });

describe('RpeScale', () => {
  it('es un grupo de radios con los diez valores, de RPE 1 a RPE 10', () => {
    render(<Harness />);
    expect(screen.getByRole('radiogroup', { name: '¿Qué tan dura fue?' })).toBeInTheDocument();
    const radios = screen.getAllByRole('radio');
    expect(radios.map((item) => item.getAttribute('aria-label'))).toEqual(
      Array.from({ length: 10 }, (_, i) => `RPE ${i + 1}`),
    );
    radios.forEach((item) => expect(item).not.toBeChecked());
  });

  it('cada valor dice qué significa (su etiqueta es la descripción accesible y el tooltip)', () => {
    render(<Harness />);
    expect(radio(7)).toHaveAccessibleDescription('Difícil, te quedaban 2-3 reps');
    expect(radio(1)).toHaveAccessibleDescription('Muy fácil, como entrar en calor');
  });

  it('elegir un valor lo deja marcado y desmarca el anterior', async () => {
    const changes = [];
    render(<Harness onChange={(next) => changes.push(next)} />);
    const user = userEvent.setup();
    await user.click(radio(7));
    expect(radio(7)).toBeChecked();
    await user.click(radio(9));
    expect(radio(9)).toBeChecked();
    expect(radio(7)).not.toBeChecked();
    expect(changes).toEqual([7, 9]);
  });

  it('tocar el valor elegido lo desmarca', async () => {
    const changes = [];
    render(<Harness initial={7} onChange={(next) => changes.push(next)} />);
    await userEvent.setup().click(radio(7));
    expect(radio(7)).not.toBeChecked();
    expect(changes).toEqual([null]);
  });

  it('con el teclado, las flechas pasan al valor siguiente', async () => {
    render(<Harness initial={3} />);
    const user = userEvent.setup();
    radio(3).focus();
    await user.keyboard('{ArrowRight}');
    expect(radio(4)).toBeChecked();
    expect(radio(4)).toHaveFocus();
  });
});
