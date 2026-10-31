import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MessageComposer from '@/components/messages/conversation/MessageComposer';

const picture = (size = 1000, type = 'image/png') => {
  const file = new File(['x'], 'foto.png', { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};
const fileInput = (container) => container.querySelector('input[type="file"]');

describe('MessageComposer', () => {
  it('Enter envía el texto y limpia la caja', async () => {
    const onSend = vi.fn();
    render(<MessageComposer onSend={onSend} />);
    await userEvent.type(screen.getByLabelText('Mensaje'), 'Hola{Enter}');
    expect(onSend).toHaveBeenCalledWith({ body: 'Hola', file: null });
    expect(screen.getByLabelText('Mensaje')).toHaveValue('');
  });

  it('Shift+Enter hace salto de línea y no envía', async () => {
    const onSend = vi.fn();
    render(<MessageComposer onSend={onSend} />);
    await userEvent.type(screen.getByLabelText('Mensaje'), 'a{Shift>}{Enter}{/Shift}b');
    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Mensaje')).toHaveValue('a\nb');
  });

  it('el botón Enviar está deshabilitado sin texto ni foto', async () => {
    render(<MessageComposer onSend={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Mensaje'), '   ');
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
  });

  it('una foto de más de 5 MB muestra el aviso y no se manda', async () => {
    const onSend = vi.fn();
    const { container } = render(<MessageComposer onSend={onSend} />);
    await userEvent.upload(fileInput(container), picture(5 * 1024 * 1024 + 1));
    expect(screen.getByRole('alert')).toHaveTextContent('La foto supera 5 MB');
    expect(screen.queryByRole('button', { name: /Quitar/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
    expect(onSend).not.toHaveBeenCalled();
  });

  it('un archivo que no es JPG/PNG/WebP se rechaza', async () => {
    const { container } = render(<MessageComposer onSend={vi.fn()} />);
    await userEvent.upload(fileInput(container), picture(10, 'application/pdf'), { applyAccept: false });
    expect(screen.getByRole('alert')).toHaveTextContent('La foto tiene que ser JPG, PNG o WebP');
  });

  it('una foto válida se previsualiza, se puede quitar y se envía sin texto', async () => {
    const onSend = vi.fn();
    const { container } = render(<MessageComposer onSend={onSend} />);
    const file = picture();
    await userEvent.upload(fileInput(container), file);
    expect(screen.getByText('foto.png')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Quitar/ }));
    expect(screen.queryByText('foto.png')).not.toBeInTheDocument();

    await userEvent.upload(fileInput(container), file);
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(onSend).toHaveBeenCalledWith({ body: '', file });
    expect(screen.queryByText('foto.png')).not.toBeInTheDocument();
  });

  it('el contador aparece desde los 1800 caracteres', async () => {
    render(<MessageComposer onSend={vi.fn()} />);
    const field = screen.getByLabelText('Mensaje');
    expect(field).toHaveAttribute('maxlength', '2000');
    await userEvent.click(field);
    await userEvent.paste('a'.repeat(1799));
    expect(screen.queryByText(/\/2000/)).not.toBeInTheDocument();
    await userEvent.paste('a');
    expect(screen.getByText('1800/2000')).toBeInTheDocument();
  });
});
