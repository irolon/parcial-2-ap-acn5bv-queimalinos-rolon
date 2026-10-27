import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuthStore } from '../../helpers/auth/authStore';
import { TRAINER, renderRoute, setSession } from '../../helpers/routes/renderRoute';
import { errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';
import { student } from '../../helpers/students/fixtures';
import { daysAgo, stubStudents } from '../../helpers/students/students';

beforeEach(() => {
  resetAuthStore();
  setSession(TRAINER);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const main = () => within(screen.getByRole('main'));
const stat = (label) => within(main().getByText(label).parentElement);

describe('DashboardPage', () => {
  it('muestra los indicadores y la alerta del alumno inactivo', async () => {
    const inactive = student({ name: 'Marcos Díaz', last_session_at: daysAgo(10) });
    stubStudents({
      list: [
        student({ name: 'Ana Paz', last_session_at: daysAgo(1) }),
        inactive,
        student({ name: 'Nico Nuevo', created_at: daysAgo(1) }),
      ],
    });
    renderRoute('/pt/dashboard');
    await screen.findByText('Alertas de inactividad');
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
    expect(stat('Alumnos activos').getByText('3')).toBeInTheDocument();
    expect(stat('Inactivos > 7 días').getByText('1')).toBeInTheDocument();
    expect(stat('Nunca entrenaron').getByText('1')).toBeInTheDocument();
    expect(main().getByRole('link', { name: /Marcos Díaz/ })).toHaveAttribute(
      'href',
      `/pt/alumnos/${inactive.id}`,
    );
    expect(main().getByText('Hace 10 días')).toBeInTheDocument();
    expect(main().queryByText('Ana Paz')).not.toBeInTheDocument();
    expect(main().getByRole('link', { name: 'Ver todos' })).toHaveAttribute(
      'href',
      '/pt/alumnos?estado=inactivos',
    );
  });

  it('lista hasta 5 inactivos: más días sin entrenar primero, contando desde el alta si nunca entrenó', async () => {
    const trained = [9, 30, 12, 8].map((d, i) =>
      student({ name: `Con sesión ${i}`, last_session_at: daysAgo(d) }),
    );
    const never = [
      student({ name: 'Nunca reciente', created_at: daysAgo(8) }),
      student({ name: 'Nunca antiguo', created_at: daysAgo(40) }),
    ];
    stubStudents({ list: [...never, ...trained] });
    renderRoute('/pt/dashboard');
    await screen.findByText('Alertas de inactividad');
    const names = main()
      .getAllByRole('link', { name: /Con sesión|Nunca/ })
      .map((a) => a.textContent);
    expect(names).toHaveLength(5);
    expect(names[0]).toContain('Nunca antiguo');
    expect(names[1]).toContain('Con sesión 1');
    expect(names[4]).toContain('Con sesión 3');
    expect(main().queryByText('Nunca reciente')).not.toBeInTheDocument();
    expect(main().getByText('Nunca entrenó')).toBeInTheDocument();
  });

  it('sin inactivos lo celebra', async () => {
    stubStudents({ list: [student({ last_session_at: daysAgo(2) })] });
    renderRoute('/pt/dashboard');
    expect(
      await screen.findByText('Todos tus alumnos entrenaron en la última semana'),
    ).toBeInTheDocument();
  });

  it('sin alumnos invita a generar la primera invitación', async () => {
    stubStudents({ list: [] });
    const { pathname } = renderRoute('/pt/dashboard');
    await userEvent.click(await screen.findByRole('link', { name: 'Generá tu primera invitación' }));
    expect(pathname()).toBe('/pt/alumnos/nuevo');
  });

  it('con todos dados de baja no invita a la primera invitación', async () => {
    stubStudents({ list: [], disabled: [student({ active: false })] });
    renderRoute('/pt/dashboard');
    expect(await main().findByText('No hay alumnos activos')).toBeVisible();
    expect(main().queryByText('Todavía no tenés alumnos')).not.toBeInTheDocument();
  });

  it('ante un error permite reintentar', async () => {
    let fail = true;
    stubFetch(async () =>
      fail ? errorResponse(500, 'INTERNAL', 'Se cayó') : jsonResponse(200, { data: [] }),
    );
    renderRoute('/pt/dashboard');
    await screen.findByRole('alert');
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Generá tu primera invitación')).toBeInTheDocument();
  });
});
