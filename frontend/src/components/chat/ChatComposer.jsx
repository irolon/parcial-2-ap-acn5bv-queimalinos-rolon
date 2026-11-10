import { useRef } from 'react';
import { Send } from 'lucide-react';
import { remainingText } from '@/utils/chat/chatProblem';

export const MAX_LENGTH = 500;
const SHORTCUTS = ['¿Con qué lo reemplazo?', '¿Cómo es la técnica?', 'Está ocupada la máquina'];
const SHORTCUT = [
  'cursor-pointer rounded-pill border border-white/[0.12] bg-white/[0.06] px-3 py-1.5 font-body text-xs text-bone0',
  'hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accentText',
].join(' ');
const SEND = [
  'flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent text-accentInk',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accentText',
].join(' ');
const FIELD = [
  'min-h-10 flex-1 resize-none rounded-[20px] border border-ink3 bg-ink2 px-3.5 py-2.5 font-body text-sm text-bone0',
  'outline-none placeholder:text-ink5 focus:border-accentText disabled:cursor-not-allowed disabled:opacity-60',
].join(' ');

/**
 * La caja de la consulta: atajos que cargan su texto (sin enviarlo), el texto (hasta 500; Enter envía y Shift+Enter
 * hace un salto de línea), Enviar y "Te quedan N consultas hoy" (`remaining`, si ya se sabe). Con `disabled` no se
 * puede escribir ni enviar; el texto queda.
 */
export default function ChatComposer({ value, onChange, onSend, disabled, remaining }) {
  const fieldRef = useRef(null);
  const canSend = !disabled && value.trim() !== '';

  const pickShortcut = (text) => {
    onChange(text);
    fieldRef.current?.focus();
  };
  const onKeyDown = (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (canSend) onSend();
  };

  return (
    <div className="shrink-0 border-t border-ink2 px-3 pb-3 pt-2.5">
      <div className="mb-2 flex flex-wrap gap-1.5">
        {SHORTCUTS.map((text) => (
          <button key={text} type="button" disabled={disabled} onClick={() => pickShortcut(text)} className={SHORTCUT}>
            {text}
          </button>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <textarea
          ref={fieldRef}
          rows={2}
          value={value}
          maxLength={MAX_LENGTH}
          disabled={disabled}
          aria-label="Consulta para el asistente"
          placeholder="Preguntá algo…"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          className={FIELD}
        />
        <button type="button" aria-label="Enviar consulta" disabled={!canSend} onClick={onSend} className={SEND}>
          <Send size={18} aria-hidden="true" />
        </button>
      </div>
      {Number.isInteger(remaining) && (
        <p className="mt-2 font-mono text-[10px] tracking-[0.3px] text-ink6">{remainingText(remaining)}</p>
      )}
    </div>
  );
}
