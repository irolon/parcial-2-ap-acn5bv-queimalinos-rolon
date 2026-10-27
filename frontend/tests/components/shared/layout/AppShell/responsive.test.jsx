import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuthStore } from '../../../../helpers/auth/authStore';
import { TRAINER, renderRoute, setSession } from '../../../../helpers/routes/renderRoute';
import { stubStudents } from '../../../../helpers/students/students';

// jsdom no aplica media queries: se verifica el contrato de clases de cada breakpoint
// (qué se oculta o achica con `md:` y `lg:`) y el comportamiento real del panel de mobile.
beforeEach(() => {
  resetAuthStore();
  setSession(TRAINER);
  stubStudents(); // el dashboard pide la lista de alumnos
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function openDrawer() {
  renderRoute('/pt/dashboard');
  const user = userEvent.setup();
  const menuButton = await screen.findByRole('button', { name: 'Abrir menú' });
  await user.click(menuButton);
  return { user, menuButton, dialog: screen.getByRole('dialog', { name: 'Menú' }) };
}

describe('AppShell responsive', () => {
  it('escritorio: sidebar fijo oculto en mobile, 64 px en tablet y 220 px desde 1024', async () => {
    renderRoute('/pt/dashboard');
    const sidebar = await screen.findByTestId('sidebar-fixed');
    expect(sidebar).toHaveClass('hidden', 'md:flex', 'md:w-16', 'lg:w-[220px]');
    expect(
      within(sidebar).getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument();
  });

  it('tablet: el nombre del ítem sigue accesible y aparece como tooltip', async () => {
    renderRoute('/pt/dashboard');
    const sidebar = await screen.findByTestId('sidebar-fixed');
    const link = within(sidebar).getByRole('link', { name: 'Alumnos' });
    const [label, tooltip] = link.querySelectorAll('span');
    expect(label).toHaveClass('md:max-lg:sr-only');
    expect(tooltip).toHaveTextContent('Alumnos');
    expect(tooltip).toHaveClass('hidden', 'md:max-lg:group-hover:block');
  });

  it('mobile: el botón de menú solo existe < 768 y la búsqueda pasa a lupa', async () => {
    renderRoute('/pt/dashboard');
    const menuButton = await screen.findByRole('button', { name: 'Abrir menú' });
    expect(menuButton).toHaveClass('md:hidden');
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('topbar-search')).toHaveClass('hidden', 'md:flex');
    expect(screen.getByTestId('topbar-search-icon')).toHaveClass('md:hidden');
  });

  it('el menú abre el panel con el sidebar y mueve el foco adentro', async () => {
    const { menuButton, dialog } = await openDrawer();
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    expect(
      within(dialog).getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Cerrar menú' })).toHaveFocus();
  });

  it('Escape cierra el panel y devuelve el foco al botón de menú', async () => {
    const { user, menuButton } = await openDrawer();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(menuButton).toHaveFocus();
  });

  it('clic afuera cierra el panel', async () => {
    const { user } = await openDrawer();
    await user.click(screen.getByTestId('drawer-backdrop'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('elegir un ítem navega y cierra el panel', async () => {
    const { user, dialog } = await openDrawer();
    await user.click(within(dialog).getByRole('link', { name: 'Agenda' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: 'Agenda' })).toBeInTheDocument();
  });
});
