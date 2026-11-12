import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readWorkout, resetWorkoutStore, writeWorkout } from '@/hooks/workout/workoutStore';
import { setCursor } from '@/utils/workout/workoutState/workoutState';
import { chatBox, chatReply, cleanUpChat, renderPanel, stubChat } from '../../../helpers/chat/chat';
import { STUDENT } from '../../../helpers/routes/renderRoute';
import { freshWorkout, withSets } from '../../../helpers/workout/workout';

const SUGGESTIONS = [{ exercise_id: 'e-9', name: 'Press inclinado', reason: 'Otro ángulo.' }];
const APPLY = 'Aplicar a la sesión de hoy';

beforeEach(() => {
  localStorage.clear();
  resetWorkoutStore();
});
afterEach(() => {
  cleanUpChat();
  resetWorkoutStore();
});

// Pregunta por Press banca (e-1) con la sesión en curso `workout` y abre el chip de la sugerencia.
async function askAndOpen(workout) {
  stubChat({ send: [chatReply({ response: 'Probá inclinado.', suggestions: SUGGESTIONS })] });
  renderPanel({ exercise: { exerciseId: 'e-1', name: 'Press banca' } });
  writeWorkout(STUDENT.id, workout);
  const user = userEvent.setup();
  await screen.findByText('Te quedan 20 consultas hoy');
  await user.type(chatBox(), '¿Con qué reemplazo el press banca?{Enter}');
  await screen.findByText('Probá inclinado.');
  await user.click(screen.getByRole('button', { name: 'Press inclinado' }));
  return user;
}

describe('AssistantPanel: Aplicar una sugerencia', () => {
  it('reemplaza el ejercicio en la sesión y muestra "Listo…"', async () => {
    const user = await askAndOpen(freshWorkout());
    await user.click(screen.getByRole('button', { name: APPLY }));
    expect(readWorkout(STUDENT.id).exercises[0]).toMatchObject({ name: 'Press inclinado', originalExerciseId: 'e-1' });
    expect(screen.getByText('Listo: hoy hacés Press inclinado en lugar de Press banca.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: APPLY })).not.toBeInTheDocument();
  });

  it('con series registradas: el texto de bloqueo, sin botón', async () => {
    await askAndOpen(withSets(freshWorkout(), [[0, 60, 10]]));
    expect(screen.getByText('Ya registraste series de Press banca: no se puede cambiar.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: APPLY })).not.toBeInTheDocument();
  });

  it('sin sesión en curso: solo el porqué, sin botón', async () => {
    await askAndOpen(null);
    expect(screen.getByText('Otro ángulo.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: APPLY })).not.toBeInTheDocument();
  });

  it('pedida en Press banca y después el cursor pasa a Remo: queda como texto', async () => {
    await askAndOpen(freshWorkout());
    expect(screen.getByRole('button', { name: APPLY })).toBeInTheDocument();
    act(() => writeWorkout(STUDENT.id, setCursor(readWorkout(STUDENT.id), 1)));
    expect(screen.queryByRole('button', { name: APPLY })).not.toBeInTheDocument();
  });
});
