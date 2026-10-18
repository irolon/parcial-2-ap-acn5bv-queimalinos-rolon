import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '@/App.jsx';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { resetAuthStore } from './helpers/auth/authStore';

beforeEach(() => resetAuthStore());
afterEach(() => window.history.replaceState(null, '', '/'));

describe('App', () => {
  it('al iniciar corre restore() y, sin sesión guardada, muestra el login', async () => {
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeInTheDocument();
    expect(useAuthStore.getState().status).toBe('anonymous');
    expect(window.location.pathname).toBe('/login');
  });
});
