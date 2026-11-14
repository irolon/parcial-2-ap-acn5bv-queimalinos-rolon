import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { setupUser } from '../../../helpers/shared/user';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { exercise } from '../../../helpers/exercises/fixtures';
import { PAGE_PATH, page, stubLibrary } from '../../../helpers/exercises/library';
import { TRAINER, renderRoute, setSession } from '../../../helpers/routes/renderRoute';

const dialog = () => within(screen.getByRole('dialog'));

async function openDetail(video_url) {
  stubLibrary({ list: [exercise({ id: 'ex-v', name: 'Remo', video_url })] });
  renderRoute(PAGE_PATH);
  await screen.findByText(/^\d+ EJERCICIOS$/);
  const user = setupUser();
  await user.click(page().getByRole('button', { name: /Remo/ }));
  await screen.findByRole('dialog', { name: 'Remo' });
}

beforeEach(() => {
  resetAuthStore();
  setSession(TRAINER);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ExerciseLibraryPage: video del detalle', () => {
  it.each([
    'https://www.youtube.com/watch?v=uEtiwYaT3d0',
    'https://youtu.be/uEtiwYaT3d0',
    'https://www.youtube.com/shorts/uEtiwYaT3d0',
  ])('embebe el reproductor de YouTube sin cookies para %s', async (url) => {
    await openDetail(url);

    const player = dialog().getByTitle('Video de Remo');
    expect(player.tagName).toBe('IFRAME');
    expect(player).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/uEtiwYaT3d0');
    expect(player).toHaveAttribute('loading', 'lazy');
    expect(player).toHaveAttribute('allow', 'encrypted-media; picture-in-picture; fullscreen');
    expect(player).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    expect(dialog().queryByRole('link', { name: 'Ver video' })).not.toBeInTheDocument();
    const fallback = dialog().getByRole('link', { name: 'Abrir en YouTube' });
    expect(fallback).toHaveAttribute('href', url);
    expect(fallback).toHaveAttribute('target', '_blank');
  });

  it('un link que no es de YouTube mantiene la miniatura y "Ver video" en otra pestaña', async () => {
    await openDetail('https://vimeo.com/123');

    expect(dialog().queryByTitle('Video de Remo')).not.toBeInTheDocument();
    expect(dialog().getByTestId('thumb-placeholder')).toBeInTheDocument();
    const link = dialog().getByRole('link', { name: 'Ver video' });
    expect(link).toHaveAttribute('href', 'https://vimeo.com/123');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('no muestra reproductor ni link si el video no es http/https', async () => {
    await openDetail('javascript:alert(1)');

    expect(dialog().queryByTitle('Video de Remo')).not.toBeInTheDocument();
    expect(dialog().queryByRole('link')).not.toBeInTheDocument();
  });

  it('sin video muestra solo la miniatura rayada', async () => {
    await openDetail(null);

    expect(dialog().getByTestId('thumb-placeholder')).toBeInTheDocument();
    expect(dialog().queryByRole('link')).not.toBeInTheDocument();
  });
});
