import { afterEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { chatBox, chatReply, cleanUpChat, renderPanel, stubChat } from '../../../helpers/chat/chat';

afterEach(cleanUpChat);

const SUGGESTIONS = [
  { exercise_id: 'e-7', name: 'Press con mancuernas', reason: 'Usa las mancuernas que tenés.' },
  { exercise_id: 'e-8', name: 'Flexiones', reason: 'Sin equipamiento.' },
];

async function ask() {
  stubChat({ send: [chatReply({ response: 'Tenés dos opciones.', suggestions: SUGGESTIONS })] });
  renderPanel();
  const user = userEvent.setup();
  await screen.findByText('Te quedan 20 consultas hoy');
  await user.type(chatBox(), '¿Con qué lo reemplazo?{Enter}');
  await screen.findByText('Tenés dos opciones.');
  return user;
}

describe('AssistantPanel: sugerencias', () => {
  it('las sugerencias van como chips con el nombre del ejercicio, sin el porqué a la vista', async () => {
    await ask();
    const list = screen.getByRole('list', { name: 'Ejercicios sugeridos' });
    const chips = within(list).getAllByRole('button');
    expect(chips.map((chip) => chip.textContent)).toEqual(['Press con mancuernas', 'Flexiones']);
    chips.forEach((chip) => expect(chip).toHaveAttribute('aria-expanded', 'false'));
    expect(screen.queryByText('Usa las mancuernas que tenés.')).not.toBeInTheDocument();
  });

  it('tocar un chip muestra el porqué; tocarlo de nuevo lo esconde (solo informativo)', async () => {
    const user = await ask();
    const chip = screen.getByRole('button', { name: 'Press con mancuernas' });
    await user.click(chip);
    expect(chip).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Usa las mancuernas que tenés.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Flexiones' }));
    expect(screen.getByText('Sin equipamiento.')).toBeInTheDocument();
    expect(screen.queryByText('Usa las mancuernas que tenés.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Flexiones' }));
    expect(screen.queryByText('Sin equipamiento.')).not.toBeInTheDocument();
    expect(chatBox()).toHaveValue('');
  });

  it('una respuesta sin sugerencias no muestra la lista', async () => {
    stubChat();
    renderPanel();
    const user = userEvent.setup();
    await screen.findByText('Te quedan 20 consultas hoy');
    await user.type(chatBox(), 'Hola{Enter}');
    await screen.findByText('Probá con press con mancuernas.');
    expect(screen.queryByRole('list', { name: 'Ejercicios sugeridos' })).not.toBeInTheDocument();
  });
});
