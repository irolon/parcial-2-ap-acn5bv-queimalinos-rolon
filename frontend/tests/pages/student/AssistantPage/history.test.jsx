import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetWorkoutStore, writeWorkout } from '@/hooks/workout/workoutStore';
import { cleanUpChat } from '../../../helpers/chat/chat';
import {
  arDay, contextMessage, historyPage, historyRequests, renderAssistantPage, stubAssistant,
} from '../../../helpers/chat/assistantPage';
import { STUDENT } from '../../../helpers/routes/renderRoute';
import { allowSlowScreens } from '../../../helpers/shared/patience';
import { freshWorkout } from '../../../helpers/workout/workout';

allowSlowScreens();

beforeEach(() => {
  localStorage.clear();
  resetWorkoutStore();
});
afterEach(() => {
  cleanUpChat();
  resetWorkoutStore();
});

const PRESS = { id: 'e-1', name: 'Press banca' };
const SUGGESTIONS = [{ exercise_id: 'e-9', name: 'Press inclinado', reason: 'Otro ángulo.' }];
const dayOf = (daysAgo, question, answer = 'Respuesta vieja', extra = {}) => {
  const date = arDay(daysAgo);
  return {
    date,
    messages: [
      contextMessage(`u-${daysAgo}`, 'user', question, { date, ...extra }),
      contextMessage(`a-${daysAgo}`, 'assistant', answer, { date, ...extra }),
    ],
  };
};
const YESTERDAY = dayOf(1, '¿Con qué reemplazo el press?', 'Probá inclinado.', {
  exercise: PRESS, routine: 'Push', suggestions: SUGGESTIONS,
});

describe('AssistantPage: días anteriores', () => {
  it('un día anterior se ve en solo lectura, con el contexto de la consulta', async () => {
    stubAssistant({ history: historyPage([YESTERDAY]) });
    renderAssistantPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /¿Con qué reemplazo el press\?/ }));
    const conversation = screen.getByRole('region', { name: 'Conversación' });
    expect(within(conversation).getByText('Probá inclinado.')).toBeInTheDocument();
    expect(within(conversation).getAllByText('CONTEXTO · PUSH · PRESS BANCA')).toHaveLength(1);
    expect(screen.getByText('Las consultas de días anteriores son de solo lectura.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('las sugerencias de un día anterior son solo texto, aunque haya una sesión en curso en ese ejercicio', async () => {
    writeWorkout(STUDENT.id, freshWorkout());
    stubAssistant({ history: historyPage([YESTERDAY]) });
    renderAssistantPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /¿Con qué reemplazo el press\?/ }));
    await user.click(screen.getByRole('button', { name: 'Press inclinado' }));
    expect(screen.getByText('Otro ángulo.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aplicar a la sesión de hoy' })).not.toBeInTheDocument();
  });

  it('"Ver días anteriores" pide los de antes del más viejo cargado y los suma a la lista', async () => {
    const older = dayOf(9, 'Pregunta vieja');
    const fetchMock = stubAssistant({
      history: (params) => (params.get('before') ? historyPage([older]) : historyPage([YESTERDAY], YESTERDAY.date)),
    });
    renderAssistantPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Ver días anteriores' }));
    const list = screen.getByRole('navigation', { name: 'Consultas guardadas' });
    expect(await within(list).findByText('Pregunta vieja')).toBeInTheDocument();
    const [, month, day] = older.date.split('-');
    expect(within(list).getByText(`${day}/${month}`)).toBeInTheDocument();
    expect(historyRequests(fetchMock)).toEqual(['/chat/history', `/chat/history?before=${YESTERDAY.date}`]);
    expect(screen.queryByRole('button', { name: 'Ver días anteriores' })).not.toBeInTheDocument();
  });

  it('si el historial falla lo dice (no "todavía no le preguntaste nada") y "Reintentar" lo vuelve a pedir', async () => {
    let calls = 0;
    stubAssistant({ history: () => (calls++ === 0 ? 'error' : historyPage([YESTERDAY])) });
    renderAssistantPage();
    expect(await screen.findByText('No pudimos cargar los días anteriores.')).toBeInTheDocument();
    expect(screen.queryByText('Todavía no le preguntaste nada al asistente.')).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }));
    const list = screen.getByRole('navigation', { name: 'Consultas guardadas' });
    expect(await within(list).findByText('¿Con qué reemplazo el press?')).toBeInTheDocument();
    expect(screen.queryByText('No pudimos cargar los días anteriores.')).not.toBeInTheDocument();
  });

  it('debajo de lg (375 px) la lista pasa a un Select "Día" que cambia la conversación', async () => {
    stubAssistant({ history: historyPage([YESTERDAY]) });
    renderAssistantPage();
    const select = screen.getByRole('combobox', { name: 'Día' });
    expect(select.closest('.lg\\:hidden')).not.toBeNull();
    expect(screen.getByRole('navigation', { name: 'Consultas guardadas' })).toHaveClass('hidden', 'lg:flex');
    await screen.findByRole('option', { name: 'AYER · ¿Con qué reemplazo el press?' });
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'HOY', 'AYER · ¿Con qué reemplazo el press?',
    ]);
    await userEvent.setup().selectOptions(select, YESTERDAY.date);
    expect(await screen.findByText('Probá inclinado.')).toBeInTheDocument();
    expect(screen.getByText('Las consultas de días anteriores son de solo lectura.')).toBeInTheDocument();
  });
});
