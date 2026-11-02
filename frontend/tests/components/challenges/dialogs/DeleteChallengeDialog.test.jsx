import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteChallengeDialog from '@/components/challenges/dialogs/DeleteChallengeDialog';
import { errorResponse, jsonResponse } from '../../../helpers/shared/fetchMock';
import { challenge, stubChallengesApi } from '../../../helpers/challenges/challenges';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function setup(remove) {
  stubChallengesApi({ remove });
  const queryClient = new QueryClient();
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <DeleteChallengeDialog challenge={challenge()} onClose={onClose} />
    </QueryClientProvider>,
  );
  return { invalidate, onClose };
}

const confirm = () => userEvent.click(screen.getByRole('button', { name: 'Borrar' }));
const invalidatedKeys = (invalidate) => invalidate.mock.calls.map(([filters]) => filters.queryKey);

describe('DeleteChallengeDialog', () => {
  it('al borrar cierra y refresca los desafíos', async () => {
    const { invalidate, onClose } = setup(async () => jsonResponse(204));
    await confirm();
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(invalidatedKeys(invalidate)).toContainEqual(['challenges']);
  });

  it('en el 409 avisa, queda abierto y refresca los desafíos (la card deja de ofrecer Borrar)', async () => {
    const { invalidate, onClose } = setup(async () => errorResponse(409, 'CHALLENGE_IN_USE', 'En uso'));
    await confirm();
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya está asignado a alumnos: no se puede borrar');
    expect(invalidatedKeys(invalidate)).toContainEqual(['challenges']);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('otro error avisa sin refrescar', async () => {
    const { invalidate } = setup(async () => errorResponse(500, 'INTERNAL', 'Se rompió'));
    await confirm();
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos borrar el desafío');
    expect(invalidatedKeys(invalidate)).toEqual([]);
  });
});
