import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readWorkout, resetWorkoutStore, writeWorkout } from '@/hooks/workout/workoutStore';
import { setCursor } from '@/utils/workout/workoutState/workoutState';
import { chatDay, cleanUpChat } from '../../../helpers/chat/chat';
import { contextMessage, renderAssistantPage, stubAssistant } from '../../../helpers/chat/assistantPage';
import { STUDENT } from '../../../helpers/routes/renderRoute';
import { allowSlowScreens } from '../../../helpers/shared/patience';
import { freshWorkout, withSets } from '../../../helpers/workout/workout';

allowSlowScreens();

beforeEach(() => {
  localStorage.clear();
  resetWorkoutStore();
});
afterEach(() => {
  cleanUpChat();
  resetWorkoutStore();
});

const APPLY = 'Aplicar a la sesión de hoy';
const PRESS = { id: 'e-1', name: 'Press banca' };
const SUGGESTIONS = [{ exercise_id: 'e-9', name: 'Press inclinado', reason: 'Otro ángulo.' }];
// La conversación de hoy: una consulta sobre Press banca (guardada con su ejercicio) y la respuesta con la sugerencia.
const TODAY = chatDay([
  contextMessage('u-1', 'user', '¿Con qué reemplazo el press?', { exercise: PRESS }),
  contextMessage('a-1', 'assistant', 'Probá inclinado.', { exercise: PRESS, suggestions: SUGGESTIONS }),
]);

async function openSuggestion(workout) {
  if (workout) writeWorkout(STUDENT.id, workout);
  stubAssistant({ day: TODAY });
  renderAssistantPage();
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Press inclinado' }));
  return user;
}

describe('AssistantPage: Aplicar', () => {
  it('reemplaza el ejercicio en la sesión de hoy, muestra "Listo…" y la caja pregunta por el nuevo', async () => {
    const user = await openSuggestion(freshWorkout());
    await user.click(screen.getByRole('button', { name: APPLY }));
    expect(readWorkout(STUDENT.id).exercises[0]).toMatchObject({ exerciseId: 'e-9', name: 'Press inclinado' });
    expect(screen.getByText('Listo: hoy hacés Press inclinado en lugar de Press banca.')).toBeInTheDocument();
    expect(screen.getByText('Preguntando sobre: Press inclinado (Push · día 3)')).toBeInTheDocument();
  });

  it('con series en el ejercicio: el texto de bloqueo, sin botón', async () => {
    await openSuggestion(withSets(freshWorkout(), [[0, 60, 10]]));
    expect(screen.getByText('Ya registraste series de Press banca: no se puede cambiar.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: APPLY })).not.toBeInTheDocument();
  });

  it('sin sesión en curso: sin botón', async () => {
    await openSuggestion(null);
    expect(screen.getByText('Otro ángulo.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: APPLY })).not.toBeInTheDocument();
  });

  it('pedida sobre Press banca con la sesión en Remo: queda como texto', async () => {
    await openSuggestion(setCursor(freshWorkout(), 1));
    expect(screen.getByText('Otro ángulo.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: APPLY })).not.toBeInTheDocument();
  });
});
