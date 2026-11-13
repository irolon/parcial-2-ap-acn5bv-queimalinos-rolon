import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuthStore } from '../../helpers/auth/authStore';
import { TRAINER, renderRoute, setSession } from '../../helpers/routes/renderRoute';
import { errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';
import { student } from '../../helpers/students/fixtures';
import { feedbackRow, inSessionRow, overview, recentSession } from '../../helpers/students/overview';
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
const kpi = (label) => within(main().getByText(label).closest('[data-kpi]'));

describe('DashboardPage', () => {
  it('muestra los indicadores del resumen, la actividad reciente y la alerta del alumno inactivo', async () => {
    const inactive = student({ name: 'Marcos Díaz', last_session_at: daysAgo(10) });
    stubStudents({
      list: [student({ name: 'Ana Paz', last_session_at: daysAgo(1) }), inactive],
      overview: overview({
        active_students: { count: 2, new_7d: 1 },
        sessions_today: { done: 1, expected: 2 },
        adherence_7d: { pct: 75, delta: -5 },
        at_risk: 1,
        recent: [recentSession({ student_id: 'st-ana', name: 'Ana Paz', routine_name: 'Pierna', rpe: 7 })],
      }),
    });
    renderRoute('/pt/dashboard');
    await screen.findByText('Alertas de inactividad');
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
    await main().findByText('Alumnos activos');
    expect(kpi('Alumnos activos').getByText('2')).toBeInTheDocument();
    expect(kpi('Alumnos activos').getByText('+1 en los últimos 7 días')).toBeInTheDocument();
    expect(kpi('Sesiones hoy').getByText('/2')).toBeInTheDocument();
    expect(kpi('Adherencia 7 días').getByText('−5% vs. semana anterior')).toBeInTheDocument();
    expect(kpi('En riesgo').getByText('1')).toBeInTheDocument();
    expect(main().getByText('Actividad · 7 días')).toBeInTheDocument();
    expect(main().getByText('Ninguna sesión terminada en los últimos 7 días')).toBeInTheDocument();
    expect(main().getByRole('link', { name: /Ana Paz.*Pierna/ })).toHaveAttribute('href', '/pt/alumnos/st-ana');
    expect(main().getByRole('link', { name: /Marcos Díaz/ })).toHaveAttribute(
      'href',
      `/pt/alumnos/${inactive.id}`,
    );
    expect(main().getByText('Hace 10 días')).toBeInTheDocument();
    expect(main().getByRole('link', { name: 'Ver todos' })).toHaveAttribute(
      'href',
      '/pt/alumnos?estado=inactivos',
    );
  });

  it('GX4: "En curso" arriba de la actividad reciente y "Feedback pendiente" con link a la ficha', async () => {
    stubStudents({
      list: [student({ name: 'Ana Paz', last_session_at: daysAgo(1) })],
      overview: overview({
        recent: [recentSession({ student_id: 'st-ana', name: 'Ana Paz' })],
        in_session: [inSessionRow({ student_id: 'st-lu', name: 'Lucía Gómez' })],
        lists: { today: [], at_risk: [], students: [], feedback_pending: [feedbackRow({ student_id: 'st-to', name: 'Tomás Rivera' })] },
      }),
    });
    renderRoute('/pt/dashboard');
    const live = await main().findByRole('link', { name: 'Lucía Gómez, entrenando ahora' });
    expect(live).toHaveAttribute('href', '/pt/alumnos/st-lu');
    const feedback = within(main().getByText('Feedback pendiente').parentElement.parentElement);
    expect(feedback.getByRole('link', { name: /Tomás Rivera/ })).toHaveAttribute('href', '/pt/alumnos/st-to');
  });

  it('GX4: sin sesiones por comentar lo dice', async () => {
    stubStudents({ list: [student({ last_session_at: daysAgo(1) })], overview: overview() });
    renderRoute('/pt/dashboard');
    expect(await main().findByText('Comentaste todas las sesiones de los últimos 7 días.')).toBeInTheDocument();
  });

  it('si falla el resumen muestra un solo error con Reintentar, sin tapar las alertas', async () => {
    let fail = true;
    stubStudents({
      list: [student({ name: 'Marcos Díaz', last_session_at: daysAgo(10) })],
      overview: () => (fail ? 500 : overview({ active_students: { count: 1, new_7d: 0 } })),
    });
    renderRoute('/pt/dashboard');
    expect(await main().findByRole('alert')).toHaveTextContent('No pudimos cargar el resumen.');
    expect(main().getByRole('link', { name: /Marcos Díaz/ })).toBeInTheDocument();
    expect(main().queryByText('Actividad reciente')).not.toBeInTheDocument();
    expect(main().queryByText('Feedback pendiente')).not.toBeInTheDocument();
    expect(main().getAllByRole('button', { name: 'Reintentar' })).toHaveLength(1);
    fail = false;
    await userEvent.click(main().getByRole('button', { name: 'Reintentar' }));
    await main().findByText('Alumnos activos');
    expect(kpi('Alumnos activos').getByText('1')).toBeInTheDocument();
    expect(main().queryByRole('alert')).not.toBeInTheDocument();
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

  it('sin inactivos lo dice sin afirmar que todos entrenaron', async () => {
    stubStudents({ list: [student({ last_session_at: daysAgo(2) })] });
    renderRoute('/pt/dashboard');
    expect(await screen.findByText('Nadie lleva más de 7 días sin entrenar')).toBeInTheDocument();
  });

  it('con un alumno nuevo que nunca entrenó no dice que todos entrenaron (B3)', async () => {
    stubStudents({ list: [student({ last_session_at: daysAgo(2) }), student({ id: 'nuevo', name: 'Nunca reciente', created_at: daysAgo(1), last_session_at: null })] });
    renderRoute('/pt/dashboard');
    await screen.findByText('Alertas de inactividad');
    expect(main().queryByText(/Todos tus alumnos entrenaron/)).not.toBeInTheDocument();
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
