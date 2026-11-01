import { afterEach, describe, expect, it, vi } from 'vitest';
import { within } from '@testing-library/react';
import { calls } from '../../../helpers/shared/fetchMock';
import { achievement, progressOf, unlocked } from '../../../helpers/achievements/gamification';
import { block, renderMine } from '../../../helpers/achievements/renderMine';
import { allowSlowScreens } from '../../../helpers/student/patience';

allowSlowScreens();

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const rows = (list) => within(list).getAllByRole('listitem').map((li) => li.textContent);

describe('MyAchievements: Tus logros', () => {
  it('los desbloqueados van con su fecha en hora argentina, el más nuevo primero', async () => {
    renderMine({
      progress: progressOf([
        unlocked('Primera sesión', '2026-10-01T15:00:00Z'),
        unlocked('Constante', '2026-10-31T01:30:00Z', { category: 'streak', criteria_type: 'streak' }),
      ]),
    });
    const list = await block('Tus logros').findByRole('list');
    expect(rows(list)).toEqual(['Constante30/10/2026', 'Primera sesión01/10/2026']);
  });

  it('los bloqueados van en gris con su avance, del más cerca al más lejos', async () => {
    renderMine({
      progress: progressOf([
        achievement('Lejos', { current: 1, target: 10 }),
        achievement('Cerca', { current: 7, target: 10 }),
        achievement('Constancia', { criteria_type: 'streak', current: 3, target: 7 }),
      ]),
    });
    const list = await block('Tus logros').findByRole('list', { name: 'Logros por desbloquear' });
    expect(rows(list)).toEqual(['Cerca7/10 sesiones', 'Constancia3/7 días', 'Lejos1/10 sesiones']);
    const row = within(list).getByText('Cerca').closest('li');
    expect(within(list).getByText('Cerca')).toHaveClass('text-ink6');
    expect(row.querySelector('svg')).toHaveClass('text-ink5');
  });

  it('cada tipo de criterio tiene su unidad, y el de desafío dice cómo se gana', async () => {
    renderMine({
      progress: progressOf([
        achievement('Sesiones', { current: 7, target: 10 }),
        achievement('Racha', { criteria_type: 'streak', current: 3, target: 7 }),
        achievement('Récords', { criteria_type: 'pr_count', current: 1, target: 5 }),
        achievement('Semanas', { criteria_type: 'full_week', current: 2, target: 4 }),
        achievement('Desafiante', { criteria_type: 'challenge', current: 0, target: 1 }),
      ]),
    });
    const list = await block('Tus logros').findByRole('list', { name: 'Logros por desbloquear' });
    const rowOf = (name) => within(within(list).getByText(name).closest('li'));
    expect(rowOf('Sesiones').getByText('7/10 sesiones')).toBeVisible();
    expect(rowOf('Racha').getByText('3/7 días')).toBeVisible();
    expect(rowOf('Récords').getByText('1/5 récords')).toBeVisible();
    expect(rowOf('Semanas').getByText('2/4 semanas completas')).toBeVisible();
    expect(rowOf('Desafiante').getByText('Se gana con un desafío')).toBeVisible();
  });

  it('los desbloqueados y los que faltan conviven en el bloque y ninguno aparece dos veces', async () => {
    renderMine({
      progress: progressOf([unlocked('Hecho', '2026-10-20T12:00:00Z'), achievement('Pendiente', { current: 7 })]),
    });
    const lists = await block('Tus logros').findAllByRole('list');
    expect(lists).toHaveLength(2);
    expect(rows(lists[0])).toEqual(['Hecho20/10/2026']);
    expect(rows(lists[1])).toEqual(['Pendiente7/10 sesiones']);
  });

  it('sin desbloqueados dice que todavía no desbloqueaste, y muestra igual lo que falta', async () => {
    renderMine({ progress: progressOf([achievement('Pendiente', { current: 7 })]) });
    const logros = block('Tus logros');
    expect(await logros.findByText('Todavía no desbloqueaste logros')).toBeVisible();
    expect(logros.getByRole('list', { name: 'Logros por desbloquear' })).toBeVisible();
  });

  it('con el catálogo vacío solo dice que todavía no desbloqueaste logros', async () => {
    renderMine({ progress: progressOf([]) });
    const logros = block('Tus logros');
    expect(await logros.findByText('Todavía no desbloqueaste logros')).toBeVisible();
    expect(logros.queryByRole('list')).toBeNull();
  });

  it('si la respuesta no trae el catálogo, no se cae y dice que todavía no desbloqueaste logros', async () => {
    renderMine({ progress: { streak: {}, facts: {}, assigned_days: [] } });
    expect(await block('Tus logros').findByText('Todavía no desbloqueaste logros')).toBeVisible();
    expect(block('Tus logros').queryByRole('alert')).toBeNull();
  });

  it('con todo desbloqueado no queda lista de bloqueados ni texto de vacío', async () => {
    renderMine({ progress: progressOf([unlocked('Hecho', '2026-10-20T12:00:00Z')]) });
    const logros = block('Tus logros');
    expect(await logros.findByText('Hecho')).toBeVisible();
    expect(logros.queryByRole('list', { name: 'Logros por desbloquear' })).toBeNull();
    expect(logros.queryByText('Todavía no desbloqueaste logros')).toBeNull();
  });

  it('pide solo la racha, el progreso de logros y los desafíos del propio alumno', async () => {
    const fetchMock = renderMine({ progress: progressOf([unlocked('Hecho', '2026-10-20T12:00:00Z')]) });
    await block('Tus logros').findByText('Hecho');
    const paths = calls(fetchMock).map(([path]) => path);
    expect(paths.sort()).toEqual([
      '/students/s-1/achievements/progress',
      '/students/s-1/challenges',
      '/students/s-1/streak',
    ]);
  });
});
