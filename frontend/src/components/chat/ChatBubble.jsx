import SuggestionChips from './SuggestionChips';

// Los mismos colores que las burbujas de Mensajes (`MessageBubble`).
const MINE = 'rounded-br-[4px] bg-accent text-accentInk';
const THEIRS = 'rounded-bl-[4px] border border-ink3 bg-ink2 text-bone0';

/**
 * Una burbuja de la conversación con el asistente: las del alumno a la derecha y las del asistente a la izquierda,
 * con sus sugerencias debajo (y "Aplicar", si corresponde: ver `SuggestionChips`).
 */
export default function ChatBubble({ message }) {
  const mine = message.role === 'user';
  const suggestions = message.suggestions ?? [];
  return (
    <div className={`flex max-w-[85%] flex-col ${mine ? 'items-end self-end' : 'items-start self-start'}`}>
      <div className={`max-w-full rounded-2xl px-3.5 py-2.5 font-body text-sm leading-[1.4] ${mine ? MINE : THEIRS}`}>
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
      {!mine && suggestions.length > 0 && <SuggestionChips message={message} suggestions={suggestions} />}
    </div>
  );
}
