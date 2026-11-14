import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Switch from '@/components/shared/forms/Switch';
import { setupUser } from '../../../helpers/shared/user';

const renderSwitch = (props = {}) => {
  const onChange = vi.fn();
  render(<Switch id="sw-message" label="Mensajes" detail="Cuando te escribe" checked onChange={onChange} {...props} />);
  return { onChange, toggle: screen.getByRole('switch', { name: 'Mensajes' }) };
};

describe('Switch', () => {
  it('es un botón role="switch" con el label como nombre y el detalle como descripción', () => {
    const { toggle } = renderSwitch();
    expect(toggle.tagName).toBe('BUTTON');
    expect(toggle).toHaveAttribute('type', 'button');
    expect(toggle).toHaveAccessibleDescription('Cuando te escribe');
  });

  it('aria-checked refleja checked', () => {
    const { toggle } = renderSwitch({ checked: false });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('click llama onChange con el valor contrario', async () => {
    const { toggle, onChange } = renderSwitch();
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await setupUser().click(toggle);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('click en el texto también lo cambia', async () => {
    const { onChange } = renderSwitch({ checked: false });
    await setupUser().click(screen.getByText('Mensajes'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('con foco, la barra espaciadora llama onChange', async () => {
    const { toggle, onChange } = renderSwitch();
    const user = setupUser();
    await user.tab();
    expect(toggle).toHaveFocus();
    await user.keyboard(' ');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('disabled no llama onChange', async () => {
    const { toggle, onChange } = renderSwitch({ disabled: true });
    expect(toggle).toBeDisabled();
    await setupUser().click(toggle);
    expect(onChange).not.toHaveBeenCalled();
  });
});
