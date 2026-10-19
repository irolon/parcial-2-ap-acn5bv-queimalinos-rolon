import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from '@/components/shared/ui/Button';

describe('Button', () => {
  it('usa la variante primary y tamaño md por defecto', () => {
    render(<Button>Entrar</Button>);
    const btn = screen.getByRole('button', { name: 'Entrar' });
    expect(btn).toHaveClass('bg-accent', 'text-accentInk', 'h-11');
    expect(btn).toHaveAttribute('type', 'button');
  });

  it.each([
    ['ghost', 'border-white/[0.14]'],
    ['dark', 'bg-ink3'],
    ['danger', 'bg-hot'],
  ])('aplica la variante %s', (variant, cls) => {
    render(<Button variant={variant}>x</Button>);
    expect(screen.getByRole('button')).toHaveClass(cls);
  });

  it.each([
    ['sm', 'h-8'],
    ['lg', 'h-14'],
  ])('aplica el tamaño %s', (size, cls) => {
    render(<Button size={size}>x</Button>);
    expect(screen.getByRole('button')).toHaveClass(cls);
  });

  it('en loading queda deshabilitado, con aria-busy y no dispara onClick', async () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Enviar</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('disabled no dispara onClick y sin loading no tiene aria-busy', async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>x</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).not.toHaveAttribute('aria-busy');
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('dispara onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>x</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
