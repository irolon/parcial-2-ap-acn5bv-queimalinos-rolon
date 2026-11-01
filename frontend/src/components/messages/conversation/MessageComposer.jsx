import { useEffect, useRef, useState } from 'react';
import { Paperclip, Send } from 'lucide-react';
import { IMAGE_ACCEPT, checkImageFile } from '@/utils/messages/imageFile';
import ImagePreview from './ImagePreview';

const MAX_LENGTH = 2000;
const COUNTER_FROM = 1800;
const MAX_HEIGHT_PX = 140;
const ROUND_BTN =
  'flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accentText';

/**
 * Caja de envío: texto autoajustable (máx. 2000, contador desde 1800), foto (JPG/PNG/WebP, ≤ 5 MB) con "Quitar".
 * Enter envía; Shift+Enter hace salto de línea. `onSend({ body, file })` se llama sin esperar la respuesta.
 */
export default function MessageComposer({ onSend }) {
  const [text, setText] = useState('');
  const [picked, setPicked] = useState(null); // { file, url } con la foto elegida
  const [error, setError] = useState(null);
  const fieldRef = useRef(null);
  const fileRef = useRef(null);
  const file = picked?.file ?? null;
  const canSend = text.trim() !== '' || file !== null;
  const urlRef = useRef(null);

  // Cada foto elegida tiene su object URL: se libera al cambiarla, quitarla, enviarla o desmontar.
  const choose = (next) => {
    if (urlRef.current) URL.revokeObjectURL?.(urlRef.current);
    urlRef.current = next ? (URL.createObjectURL?.(next) ?? null) : null;
    setPicked(next ? { file: next, url: urlRef.current } : null);
  };
  useEffect(() => () => urlRef.current && URL.revokeObjectURL?.(urlRef.current), []);

  useEffect(() => {
    const el = fieldRef.current;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
    // Sin barra de scroll mientras el texto entra; recién al llegar al alto máximo aparece.
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT_PX ? 'auto' : 'hidden';
  }, [text]);

  const submit = () => {
    if (!canSend) return;
    onSend({ body: text.trim(), file });
    setText('');
    choose(null);
    setError(null);
  };

  const onKeyDown = (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    submit();
  };

  const onPick = (event) => {
    const chosen = event.target.files?.[0];
    event.target.value = '';
    if (!chosen) return;
    const problem = checkImageFile(chosen);
    setError(problem);
    choose(problem ? null : chosen);
  };

  return (
    <div className="shrink-0 border-t border-ink2 pb-3">
      {file && <ImagePreview file={file} url={picked.url} onRemove={() => choose(null)} />}
      {error && (
        <p role="alert" className="px-3 pt-2 font-mono text-[11px] text-hot">
          {error}
        </p>
      )}
      <div className="flex items-end gap-2 px-3 pt-2.5">
        <input ref={fileRef} type="file" accept={IMAGE_ACCEPT} onChange={onPick} className="hidden" tabIndex={-1} />
        <button
          type="button"
          aria-label="Adjuntar foto"
          onClick={() => fileRef.current.click()}
          className={`${ROUND_BTN} bg-ink3 text-bone0`}
        >
          <Paperclip size={18} aria-hidden="true" />
        </button>
        <textarea
          ref={fieldRef}
          rows={1}
          value={text}
          maxLength={MAX_LENGTH}
          aria-label="Mensaje"
          placeholder="Mensaje…"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          className="min-h-10 flex-1 resize-none rounded-[20px] border border-ink3 bg-ink2 px-3.5 py-2.5 font-body text-sm text-bone0 outline-none placeholder:text-ink5 focus:border-accentText"
        />
        <button
          type="button"
          aria-label="Enviar"
          onClick={submit}
          disabled={!canSend}
          className={`${ROUND_BTN} bg-accent text-accentInk disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <Send size={18} aria-hidden="true" />
        </button>
      </div>
      {text.length >= COUNTER_FROM && (
        <p className="px-4 pt-1 text-right font-mono text-[10px] text-ink6">
          {text.length}/{MAX_LENGTH}
        </p>
      )}
    </div>
  );
}
