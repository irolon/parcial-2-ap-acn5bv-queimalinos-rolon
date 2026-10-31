import { timeLabel } from '@/utils/messages/messageTime';

const MINE = 'rounded-br-[4px] bg-accent text-accentInk';
const THEIRS = 'rounded-bl-[4px] border border-ink3 bg-ink2 text-bone0';
const LINK = 'cursor-pointer underline focus-visible:outline-2 focus-visible:outline-accentText';

function Ticks({ read }) {
  return (
    <span role="img" aria-label={read ? 'Leído' : 'Enviado'}>
      {read ? '✓✓' : '✓'}
    </span>
  );
}

function Failure({ message, onRetry, onDiscard }) {
  return (
    <span className="flex flex-wrap items-center justify-end gap-x-1.5 text-hot">
      No se envió{message.error ? ` · ${message.error}` : ''} ·
      <button type="button" onClick={() => onRetry(message)} className={LINK}>
        Reintentar
      </button>
      <button type="button" onClick={() => onDiscard(message)} className={LINK}>
        Descartar
      </button>
    </span>
  );
}

/**
 * Burbuja de un mensaje. Propias a la derecha (`accent`), ajenas a la izquierda (`ink2`).
 * `isLastMine` muestra ✓ / ✓✓; los temporales (`status`) muestran "Enviando…" o el fallo con Reintentar / Descartar.
 */
export default function MessageBubble({ message, mine, isLastMine, senderName, onOpenImage, onRetry, onDiscard }) {
  const { body, image_url: imageUrl, status } = message;
  const alt = `Foto enviada por ${senderName}`;
  return (
    <div className={`flex max-w-[70%] flex-col ${mine ? 'items-end self-end' : 'items-start self-start'}`}>
      <div className={`max-w-full rounded-2xl px-3.5 py-2.5 font-body text-sm leading-[1.4] ${mine ? MINE : THEIRS}`}>
        {imageUrl && (
          <button type="button" onClick={() => onOpenImage({ url: imageUrl, alt })} className="block cursor-pointer">
            <img src={imageUrl} alt={alt} className={`block w-full max-w-[240px] rounded-lg ${body ? 'mb-2' : ''}`} />
          </button>
        )}
        {body && <p className="whitespace-pre-wrap break-words">{body}</p>}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 px-1 font-mono text-[9px] text-ink6">
        {message.broadcast_id && <span className="text-cool">Envío masivo</span>}
        {status === 'sending' && <span>Enviando…</span>}
        {status === 'failed' && <Failure message={message} onRetry={onRetry} onDiscard={onDiscard} />}
        {!status && <span>{timeLabel(message.created_at)}</span>}
        {!status && mine && isLastMine && <Ticks read={Boolean(message.read_at)} />}
      </div>
    </div>
  );
}
