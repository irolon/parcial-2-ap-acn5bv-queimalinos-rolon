import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '@/App.jsx';

describe('App', () => {
  it('muestra el nombre de la marca', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'FitTrainer' })).toBeInTheDocument();
  });
});
