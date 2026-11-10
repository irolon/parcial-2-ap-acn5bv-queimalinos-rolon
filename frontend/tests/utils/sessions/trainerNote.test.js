import { describe, expect, it } from 'vitest';
import { latestTrainerNote, noteTitle } from '@/utils/sessions/trainerNote';
import { sessionItem } from '../../helpers/sessions/sessions';

const at = (id, startedAt, trainerComment) => sessionItem({ id, started_at: startedAt, trainer_comment: trainerComment });

describe('latestTrainerNote', () => {
  it('devuelve la sesión más nueva con comentario, aunque la lista venga desordenada', () => {
    const sessions = [
      at('vieja', '2026-11-02T13:00:00Z', 'Bien la técnica'),
      at('nueva', '2026-11-05T13:00:00Z', 'Subí 2,5 kg en press'),
      at('sin', '2026-11-06T13:00:00Z', null),
    ];
    expect(latestTrainerNote(sessions).id).toBe('nueva');
  });

  it('saltea los comentarios vacíos o solo con espacios', () => {
    const sessions = [at('blanco', '2026-11-06T13:00:00Z', '   '), at('ok', '2026-11-04T13:00:00Z', 'Dale')];
    expect(latestTrainerNote(sessions).id).toBe('ok');
  });

  it('null sin comentarios o sin sesiones', () => {
    expect(latestTrainerNote([at('a', '2026-11-06T13:00:00Z', null)])).toBeNull();
    expect(latestTrainerNote([])).toBeNull();
    expect(latestTrainerNote(undefined)).toBeNull();
  });
});

describe('noteTitle', () => {
  it('usa el primer nombre del entrenador/a', () => {
    expect(noteTitle('Laura Gómez')).toBe('Nota de Laura');
    expect(noteTitle('  Laura   Gómez ')).toBe('Nota de Laura');
  });

  it('sin nombre es genérico', () => {
    expect(noteTitle(undefined)).toBe('Nota de tu entrenador/a');
    expect(noteTitle('   ')).toBe('Nota de tu entrenador/a');
  });
});
