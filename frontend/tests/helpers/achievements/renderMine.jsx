import { screen, within } from '@testing-library/react';
import MyAchievements from '@/components/achievements/MyAchievements';
import { renderWithClient } from '../challenges/renderWithClient';
import { stubGamification } from './gamification';

/** Monta "Racha y logros" del alumno `s-1` con las respuestas dadas (ver `stubGamification`) y devuelve el `fetch`. */
export function renderMine(data) {
  const fetchMock = stubGamification(data);
  renderWithClient(<MyAchievements studentId="s-1" />);
  return fetchMock;
}

/** Un bloque ("Tu racha", "Tus logros" o "Tus desafíos") para buscar solo adentro. */
export const block = (title) => within(screen.getByRole('heading', { name: title }).closest('section'));
