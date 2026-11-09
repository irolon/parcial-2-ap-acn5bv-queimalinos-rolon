import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import UserBlock from '@/components/shared/layout/UserBlock';
import { setupUser } from '../../../helpers/shared/user';

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderBlock(user, { onLogout = vi.fn(), onNavigate = vi.fn() } = {}) {
  render(
    <MemoryRouter initialEntries={['/inicio']}>
      <UserBlock user={user} onLogout={onLogout} onNavigate={onNavigate} />
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
  return { onLogout, onNavigate };
}

const TRAINER = { id: 't-1', name: 'Laura Pereyra', email: 'laura@fit.com', role: 'trainer' };
const STUDENT = { id: 's-1', name: 'Tomás Ruiz', email: 'tomas@fit.com', role: 'student' };

describe('UserBlock', () => {
  it('el PT va a /pt/cuenta con Configuración (y cierra el menú del celular)', async () => {
    const { onNavigate } = renderBlock(TRAINER);
    const settings = screen.getByRole('link', { name: 'Configuración' });
    expect(settings).toHaveAttribute('title', 'Configuración');
    await setupUser().click(settings);
    expect(screen.getByTestId('where')).toHaveTextContent('/pt/cuenta');
    expect(onNavigate).toHaveBeenCalled();
  });

  it('el alumno va a /alumno/perfil', async () => {
    renderBlock(STUDENT);
    await setupUser().click(screen.getByRole('link', { name: 'Configuración' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/alumno/perfil');
  });

  it('Cerrar sesión sigue llamando onLogout', async () => {
    const { onLogout } = renderBlock(TRAINER);
    await setupUser().click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
