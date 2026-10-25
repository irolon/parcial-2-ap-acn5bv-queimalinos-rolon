import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { TRAINER, renderRoute, setSession } from '../../../helpers/routes/renderRoute';
import { metric, studentDetail } from '../../../helpers/students/fixtures';
import { loadProfile } from '../../../helpers/students/profile';
import { daysAgo, stubStudents } from '../../../helpers/students/students';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const main = () => within(screen.getByRole('main'));

describe('StudentProfilePage: ficha', () => {
  it('la topbar muestra el nombre y la última sesión', async () => {
    await loadProfile({ detail: studentDetail({ last_session_at: daysAgo(3) }) });
    expect(await screen.findByText('ALUMNOS › PERFIL · ÚLTIMA SESIÓN HACE 3 DÍAS')).toBeVisible();
  });

  it('sin sesiones, la topbar dice que nunca entrenó', async () => {
    await loadProfile({ detail: studentDetail() });
    expect(await screen.findByText('ALUMNOS › PERFIL · NUNCA ENTRENÓ')).toBeVisible();
  });

  it('muestra edad, nivel, objetivo y estado', async () => {
    const birth = new Date(Date.now() - 30.5 * 365.25 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    await loadProfile({ detail: studentDetail({ birth_date: birth, created_at: daysAgo(1) }) });
    expect(await main().findByText('30 años · Intermedio')).toBeVisible();
    expect(main().getByText('Ganar masa muscular')).toBeVisible();
    expect(main().getByText('Nuevo')).toBeVisible();
  });

  it('antropometría con la diferencia contra la medida anterior', async () => {
    const latest = metric({ recorded_at: '2026-10-10T10:00:00Z', weight_kg: 80.8, waist_cm: 90 });
    await loadProfile({
      detail: studentDetail({ latest_metrics: { ...latest, bmi: 25.5 } }),
      metrics: [metric({ recorded_at: '2026-09-10T10:00:00Z', weight_kg: 80, waist_cm: 91 }), latest],
    });
    expect(await main().findByText('+0,8 kg')).toBeVisible();
    expect(main().getByText('−1 cm')).toBeVisible();
    expect(main().getByText('25,5')).toBeVisible();
    expect(main().getByText('178')).toBeVisible();
  });

  it('sin medidas lo avisa', async () => {
    await loadProfile({ detail: studentDetail() });
    expect(await main().findByText('Todavía no hay medidas')).toBeVisible();
  });

  it('contexto para la IA: equipamiento con etiquetas y lesiones', async () => {
    await loadProfile({ detail: studentDetail() });
    expect(await main().findByText('Barra')).toBeVisible();
    expect(main().getByText('Rack propio')).toBeVisible();
    expect(main().getByText('Lumbalgia')).toBeVisible();
    expect(main().queryByText(/Sin completar/)).not.toBeInTheDocument();
  });

  it('contexto para la IA vacío avisa que falta completar', async () => {
    await loadProfile({ detail: studentDetail({ gym_equipment: null, injuries: null }) });
    expect(await main().findByText('Sin completar: la IA no va a poder personalizar')).toBeVisible();
  });

  it('rutina activa con nombre y días en español', async () => {
    const routine = { id: 'r-1', name: 'Fuerza A', days: ['monday', 'thursday'] };
    await loadProfile({ detail: studentDetail({ active_routine: routine }) });
    expect(await main().findByText('Fuerza A')).toBeVisible();
    expect(main().getByText('Lunes · Jueves')).toBeVisible();
  });

  it('sin rutina lo avisa', async () => {
    await loadProfile({ detail: studentDetail() });
    expect(await main().findByText('Sin rutina asignada')).toBeVisible();
  });

  it('un 403 muestra "No encontramos a este alumno" con link al panel', async () => {
    resetAuthStore();
    setSession(TRAINER);
    stubStudents({ detailError: 403 });
    renderRoute('/pt/alumnos/ajeno');
    expect(await screen.findByText('No encontramos a este alumno')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Volver a alumnos' })).toHaveAttribute('href', '/pt/alumnos');
  });
});
