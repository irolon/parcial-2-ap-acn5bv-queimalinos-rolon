import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MessageBubble from '@/components/messages/conversation/MessageBubble';

const base = {
  id: 'm1',
  sender_role: 'trainer',
  body: 'Buen laburo',
  image_url: null,
  broadcast_id: null,
  read_at: null,
  created_at: '2026-10-31T17:05:00+00:00',
};
const show = (message, props = {}) =>
  render(
    <MessageBubble
      message={message}
      mine
      isLastMine
      senderName="Laura"
      onOpenImage={vi.fn()}
      onRetry={vi.fn()}
      onDiscard={vi.fn()}
      {...props}
    />,
  );

describe('MessageBubble', () => {
  it('muestra la hora en Buenos Aires y ✓ "Enviado" en la última propia', () => {
    show(base);
    expect(screen.getByText('14:05')).toBeInTheDocument();
    expect(screen.getByLabelText('Enviado')).toHaveTextContent('✓');
  });

  it('muestra ✓✓ "Leído" cuando tiene read_at', () => {
    show({ ...base, read_at: '2026-10-31T18:00:00+00:00' });
    expect(screen.getByLabelText('Leído')).toHaveTextContent('✓✓');
  });

  it('sin isLastMine no hay tildes', () => {
    show(base, { isLastMine: false });
    expect(screen.queryByLabelText('Enviado')).not.toBeInTheDocument();
  });

  it('muestra la etiqueta "Envío masivo" con broadcast_id (también a la ajena)', () => {
    show({ ...base, broadcast_id: 'b-1' }, { mine: false, isLastMine: false });
    expect(screen.getByText('Envío masivo')).toBeInTheDocument();
  });

  it('la foto tiene alt con el nombre y abre la versión grande al tocarla', async () => {
    const onOpenImage = vi.fn();
    show({ ...base, image_url: 'https://x/f.jpg' }, { onOpenImage });
    await userEvent.click(screen.getByAltText('Foto enviada por Laura'));
    expect(onOpenImage).toHaveBeenCalledWith({ url: 'https://x/f.jpg', alt: 'Foto enviada por Laura' });
  });

  it('un temporal enviándose dice "Enviando…" y no muestra hora ni tildes', () => {
    show({ ...base, id: 'tmp-1', status: 'sending' });
    expect(screen.getByText('Enviando…')).toBeInTheDocument();
    expect(screen.queryByText('14:05')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Enviado')).not.toBeInTheDocument();
  });

  it('un temporal fallido muestra el error y permite Reintentar y Descartar', async () => {
    const onRetry = vi.fn();
    const onDiscard = vi.fn();
    const tmp = { ...base, id: 'tmp-1', status: 'failed', error: 'La foto supera 5 MB' };
    show(tmp, { onRetry, onDiscard });
    expect(screen.getByText(/No se envió · La foto supera 5 MB/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(onRetry).toHaveBeenCalledWith(tmp);
    expect(onDiscard).toHaveBeenCalledWith(tmp);
  });
});
