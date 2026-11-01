import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { errorResponse, jsonResponse, stubFetch } from '../../../../helpers/shared/fetchMock';
import { counterpart, ctx, msg, readCalls, setupConversation, show } from '../../../../helpers/messages/conversation';

setupConversation();

/** El primer GET anda; mientras `state.down` sea true los siguientes fallan. */
function flakyApi(state) {
  return stubFetch(async (url) => {
    if (url.endsWith('/read')) return jsonResponse(200, { data: { updated: 1 } });
    if (state.down) return errorResponse(500, 'SERVER_ERROR', 'Falló');
    return jsonResponse(200, {
      data: [msg('a', { read_at: 'x' })],
      meta: { next_before: null },
      counterpart,
    });
  });
}

describe('Conversation: poll fallido con datos en caché', () => {
  it('muestra un aviso arriba, deja el historial y el composer montado con el borrador', async () => {
    const state = { down: false };
    flakyApi(state);
    show('trainer');
    await userEvent.type(await screen.findByLabelText('Mensaje'), 'borrador a medio escribir');

    state.down = true;
    await ctx.queryClient.refetchQueries();

    expect(await screen.findByText('No pudimos actualizar la conversación.')).toBeInTheDocument();
    expect(screen.queryByText('No pudimos cargar la conversación.')).not.toBeInTheDocument();
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByLabelText('Mensaje')).toHaveValue('borrador a medio escribir');
  });

  it('Reintentar vuelve a pedir y, si anda, el aviso desaparece sin perder el borrador', async () => {
    const state = { down: false };
    flakyApi(state);
    show('trainer');
    await userEvent.type(await screen.findByLabelText('Mensaje'), 'texto');
    state.down = true;
    await ctx.queryClient.refetchQueries();
    await screen.findByText('No pudimos actualizar la conversación.');

    state.down = false;
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() =>
      expect(screen.queryByText('No pudimos actualizar la conversación.')).not.toBeInTheDocument(),
    );
    expect(screen.getByLabelText('Mensaje')).toHaveValue('texto');
  });

  it('sin datos (falla la primera carga) sigue el error de pantalla completa', async () => {
    stubFetch(async () => errorResponse(500, 'SERVER_ERROR', 'Falló'));
    show('trainer');
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar la conversación.');
    expect(screen.queryByLabelText('Mensaje')).not.toBeInTheDocument();
  });
});

describe('useAutoRead: reintenta si el POST /read falla', () => {
  it('con el POST caído libera el id y marca de nuevo al volver a la pestaña', async () => {
    const state = { readOk: false };
    const fetchMock = stubFetch(async (url) => {
      if (url.endsWith('/read')) {
        return state.readOk ? jsonResponse(200, { data: { updated: 1 } }) : errorResponse(500, 'SERVER_ERROR', 'Falló');
      }
      return jsonResponse(200, { data: [msg('a')], meta: { next_before: null }, counterpart });
    });
    show('trainer');
    await waitFor(() => expect(readCalls(fetchMock)).toHaveLength(1));
    await waitFor(() => expect(ctx.queryClient.isMutating()).toBe(0));

    state.readOk = true;
    document.dispatchEvent(new Event('visibilitychange'));
    await waitFor(() => expect(readCalls(fetchMock)).toHaveLength(2));

    document.dispatchEvent(new Event('visibilitychange')); // ya marcado: no repite
    expect(readCalls(fetchMock)).toHaveLength(2);
  });
});
