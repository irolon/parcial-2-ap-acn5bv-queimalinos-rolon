import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetWorkoutStore, writeWorkout } from '@/hooks/workout/workoutStore';
import { chatBox, chatDay, chatPosts, cleanUpChat } from '../../../helpers/chat/chat';
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

const TODAY = chatDay([contextMessage('u-1', 'user', 'Hola hoy'), contextMessage('a-1', 'assistant', 'Buenas')], 19);
const YESTERDAY = { date: arDay(1), messages: [contextMessage('u-0', 'user', 'Pregunta de ayer', { date: arDay(1) })] };

describe('AssistantPage: hoy', () => {
  it('Hoy va primero en la lista, con la caja y los atajos del prototipo; un atajo carga su texto', async () => {
    stubAssistant({ day: TODAY, history: historyPage([YESTERDAY]) });
    renderAssistantPage();
    const list = screen.getByRole('navigation', { name: 'Consultas guardadas' });
    await within(list).findByText('Pregunta de ayer');
    await within(list).findByText('Hola hoy');
    const items = within(list).getAllByRole('button');
    expect(items.map((item) => item.textContent)).toEqual(['Hola hoyHOY', 'Pregunta de ayerAYER']);
    expect(items[0]).toHaveAttribute('aria-current', 'true');
    expect(within(items[0]).getByText('Hola hoy')).toHaveAttribute('title', 'Hola hoy');
    for (const text of ['¿Cuánto debería subir?', 'Calentamiento', 'Estiramiento post']) {
      expect(screen.getByRole('button', { name: text })).toBeInTheDocument();
    }
    await userEvent.setup().click(screen.getByRole('button', { name: 'Técnica correcta' }));
    expect(chatBox()).toHaveValue('Técnica correcta');
    expect(screen.getByText('Te quedan 19 consultas hoy')).toBeInTheDocument();
  });

  it('sin sesión en curso la consulta es general y viaja sin sesión ni ejercicio', async () => {
    const fetchMock = stubAssistant();
    renderAssistantPage();
    expect(screen.getByText('Consulta general: no tenés una sesión en curso')).toBeInTheDocument();
    const user = userEvent.setup();
    await screen.findByText('Te quedan 20 consultas hoy');
    await user.type(chatBox(), 'Hola{Enter}');
    await screen.findByText('Probá con press con mancuernas.');
    expect(chatPosts(fetchMock)).toEqual([{ message: 'Hola' }]);
  });

  it('con una sesión en curso en esta web pregunta sobre el ejercicio a la vista, con su sesión', async () => {
    writeWorkout(STUDENT.id, freshWorkout());
    const fetchMock = stubAssistant();
    renderAssistantPage();
    expect(screen.getByText('Preguntando sobre: Press banca (Push · día 3)')).toBeInTheDocument();
    const user = userEvent.setup();
    await screen.findByText('Te quedan 20 consultas hoy');
    await user.type(chatBox(), '¿Cuánto subo?{Enter}');
    await screen.findByText('Probá con press con mancuernas.');
    expect(chatPosts(fetchMock)).toEqual([{ message: '¿Cuánto subo?', session_id: 'session-1', current_exercise_id: 'e-1' }]);
    expect(screen.getByText('CONTEXTO · PRESS BANCA')).toBeInTheDocument();
  });

  it('sin ninguna consulta: el aviso de vacío y sin "Ver días anteriores"', async () => {
    const fetchMock = stubAssistant();
    renderAssistantPage();
    await screen.findByText('Te quedan 20 consultas hoy');
    await expect.poll(() => historyRequests(fetchMock)).toEqual(['/chat/history']);
    expect(screen.getByText('Todavía no le preguntaste nada al asistente.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver días anteriores' })).not.toBeInTheDocument();
  });

  it('"Nueva consulta" vuelve a Hoy y enfoca la caja', async () => {
    stubAssistant({ day: TODAY, history: historyPage([YESTERDAY]) });
    renderAssistantPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /Pregunta de ayer/ }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Nueva consulta' }));
    expect(await screen.findByText('Buenas')).toBeInTheDocument();
    await expect.poll(() => document.activeElement).toBe(chatBox());
  });
});
