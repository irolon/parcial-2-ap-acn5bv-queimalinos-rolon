import { describe, expect, it } from 'vitest';
import { progressLabel, splitAchievements } from '@/utils/achievements/achievementProgress';
import { achievement, unlocked } from '../../helpers/achievements/gamification';

const of = (criteriaType, current, target) => achievement('x', { criteria_type: criteriaType, current, target });
const names = (items) => items.map((item) => item.name ?? item.achievement.name);

describe('progressLabel', () => {
  it.each([
    ['sessions_count', 7, 10, '7/10 sesiones'],
    ['streak', 3, 7, '3/7 días'],
    ['pr_count', 1, 5, '1/5 sesiones con récord'],
    ['full_week', 2, 4, '2/4 semanas completas'],
  ])('%s con %i de %i dice "%s"', (type, current, target, expected) => {
    expect(progressLabel(of(type, current, target))).toBe(expected);
  });

  it('con un objetivo de 1 la unidad va en singular', () => {
    expect(progressLabel(of('sessions_count', 0, 1))).toBe('0/1 sesión');
    expect(progressLabel(of('streak', 0, 1))).toBe('0/1 día');
    expect(progressLabel(of('pr_count', 0, 1))).toBe('0/1 sesión con récord');
    expect(progressLabel(of('full_week', 0, 1))).toBe('0/1 semana completa');
  });

  it('el logro de desafío no se mide: se gana con un desafío', () => {
    expect(progressLabel(of('challenge', 0, 1))).toBe('Se gana con un desafío');
  });

  it('un tipo que no conoce, o un logro sin criterio, no inventa un avance', () => {
    expect(progressLabel(of('algo_nuevo', 0, 1))).toBeNull();
    expect(progressLabel(of(null, 0, 1))).toBeNull();
  });
});

describe('splitAchievements', () => {
  it('separa los desbloqueados de los bloqueados y ninguno aparece en los dos', () => {
    const { unlocked: done, locked } = splitAchievements([
      unlocked('Hecho', '2026-10-20T12:00:00Z'),
      achievement('Pendiente'),
    ]);
    expect(names(done)).toEqual(['Hecho']);
    expect(names(locked)).toEqual(['Pendiente']);
  });

  it('los desbloqueados van del más nuevo al más viejo y con la forma que lee AchievementList', () => {
    const { unlocked: done } = splitAchievements([
      unlocked('Viejo', '2026-09-01T12:00:00Z'),
      unlocked('Nuevo', '2026-10-31T01:30:00Z', { category: 'streak' }),
      unlocked('Medio', '2026-10-01T12:00:00Z'),
    ]);
    expect(names(done)).toEqual(['Nuevo', 'Medio', 'Viejo']);
    expect(done[0]).toMatchObject({
      id: 'a-Nuevo',
      unlocked_at: '2026-10-31T01:30:00Z',
      achievement: { name: 'Nuevo', description: 'Descripción de Nuevo', category: 'streak' },
    });
  });

  it('los bloqueados van del más cerca al más lejos de su objetivo', () => {
    const { locked } = splitAchievements([
      achievement('Lejos', { current: 1, target: 10 }),
      achievement('Cerca', { current: 9, target: 10 }),
      achievement('Medio', { criteria_type: 'streak', current: 3, target: 7 }),
    ]);
    expect(names(locked)).toEqual(['Cerca', 'Medio', 'Lejos']);
  });

  it('a igual avance se queda el orden del catálogo, y los que no avanzaron (el de desafío también) van al final', () => {
    const { locked } = splitAchievements([
      achievement('Mitad A', { current: 5, target: 10 }),
      achievement('Desafío', { criteria_type: 'challenge', current: 0, target: 1 }),
      achievement('Mitad B', { criteria_type: 'pr_count', current: 1, target: 2 }),
      achievement('Nada', { current: 0, target: 10 }),
    ]);
    expect(names(locked)).toEqual(['Mitad A', 'Mitad B', 'Desafío', 'Nada']);
  });

  it('un objetivo en 0 no rompe el orden', () => {
    const { locked } = splitAchievements([achievement('Raro', { current: 0, target: 0 }), achievement('Casi', { current: 9 })]);
    expect(names(locked)).toEqual(['Casi', 'Raro']);
  });

  it('no cambia la lista que recibe', () => {
    const items = [achievement('B', { current: 1 }), unlocked('A', '2026-10-01T12:00:00Z'), achievement('C', { current: 9 })];
    const before = JSON.parse(JSON.stringify(items));
    splitAchievements(items);
    expect(items).toEqual(before);
  });

  it('sin logros no hay ni desbloqueados ni bloqueados', () => {
    expect(splitAchievements([])).toEqual({ unlocked: [], locked: [] });
  });
});
